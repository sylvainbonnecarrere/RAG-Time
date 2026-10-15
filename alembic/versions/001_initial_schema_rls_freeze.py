"""Initial schema, pgvector HNSW index, RLS policies and TNR-18 freeze trigger

Revision ID: 001_init_schema
Revises: 
Create Date: 2026-10-02 18:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_init_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extensions fondamentales
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # 1.b Configuration Rôle Applicatif Non-Superuser pour RLS
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ragtime_app') THEN
            CREATE ROLE ragtime_app WITH LOGIN PASSWORD 'ragtime_local_db_secret_pass' NOSUPERUSER NOBYPASSRLS;
        END IF;
    END
    $$;
    GRANT ALL PRIVILEGES ON DATABASE ragtime_db TO ragtime_app;
    GRANT ALL ON SCHEMA public TO ragtime_app;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ragtime_app;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ragtime_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ragtime_app;
    GRANT ragtime_app TO ragtime;
    """)

    # 2. Table des Tenants
    op.execute("""
    CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(128) NOT NULL,
        slug VARCHAR(64) UNIQUE NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'tech',
        description TEXT NULL,
        system_prompt TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """)

    # 3. Table des Presets RAG (Immuabilité TNR-05 & TNR-18, Multi-Stratégies)
    op.execute("""
    CREATE TABLE IF NOT EXISTS rag_presets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(128) NOT NULL,
        version INT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        chunking_strategy VARCHAR(32) NOT NULL DEFAULT 'fixed_sliding',
        chunk_size INT NOT NULL CHECK (chunk_size BETWEEN 128 AND 2048),
        chunk_overlap INT NOT NULL CHECK (chunk_overlap >= 0),
        similarity_threshold NUMERIC(4,3) NOT NULL CHECK (similarity_threshold BETWEEN 0.0 AND 1.0),
        retrieval_top_k INT NOT NULL CHECK (retrieval_top_k BETWEEN 1 AND 50),
        rerank_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        prefix_section_title BOOLEAN NOT NULL DEFAULT TRUE,
        embedding_model VARCHAR(64) NOT NULL DEFAULT 'nomic-embed-text-v1.5',
        embedding_dim INT NOT NULL DEFAULT 768,
        parent_preset_id UUID NULL REFERENCES rag_presets(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_overlap_size CHECK (chunk_overlap < (chunk_size / 2))
    );
    """)

    # 4. Table des Documents
    op.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        file_type VARCHAR(32) NOT NULL,
        source_url TEXT NULL,
        extraction_method VARCHAR(64) NOT NULL DEFAULT 'native_parser',
        description TEXT NULL,
        cleaning_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
        current_version INT NOT NULL DEFAULT 1,
        total_chunks INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """)

    # 5. Table des Versions de Documents (TNR-03)
    op.execute("""
    CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        sha256_checksum CHAR(64) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        chunks_count INT NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'indexed',
        storage_path TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
    );
    """)

    # 6. Table des Chunks pgvector
    op.execute("""
    CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        chunk_index INT NOT NULL,
        content TEXT NOT NULL,
        context_prefix TEXT NULL,
        strategy_used VARCHAR(32) NOT NULL DEFAULT 'fixed_sliding',
        section_title VARCHAR(255) NULL,
        sha256_hash CHAR(64) NOT NULL,
        token_count INT NOT NULL,
        page_number INT NULL,
        embedding vector(768) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """)

    # 7. Table des Logs de Requêtes / Audit
    op.execute("""
    CREATE TABLE IF NOT EXISTS query_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        preset_id UUID NULL REFERENCES rag_presets(id),
        query_text TEXT NOT NULL,
        response_preview TEXT NULL,
        ttft_ms NUMERIC(8,2) NOT NULL,
        total_time_ms NUMERIC(8,2) NOT NULL,
        tokens_generated INT NOT NULL DEFAULT 0,
        chunks_retrieved_count INT NOT NULL DEFAULT 0,
        top_similarity_score NUMERIC(4,3) NULL,
        avg_similarity_score NUMERIC(4,3) NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """)

    # 8. Index HNSW et GIN
    op.execute("CREATE INDEX IF NOT EXISTS idx_chunks_tenant_id ON document_chunks(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_presets_tenant_id ON rag_presets(tenant_id);")
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
    ON document_chunks 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin ON document_chunks USING gin (metadata);")

    # 9. Politiques Row-Level Security (RLS - US-BACK-02)
    # Activation RLS stricte sur les tables multi-tenant (y compris table owner via FORCE)
    op.execute("ALTER TABLE documents ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE documents FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE rag_presets ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE rag_presets FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE query_logs FORCE ROW LEVEL SECURITY;")

    # Création idempotente des politiques de filtrage par tenant_id
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON documents;")
    op.execute("""
    CREATE POLICY tenant_isolation_policy ON documents
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    """)

    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON document_chunks;")
    op.execute("""
    CREATE POLICY tenant_isolation_policy ON document_chunks
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    """)

    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON rag_presets;")
    op.execute("""
    CREATE POLICY tenant_isolation_policy ON rag_presets
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    """)

    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON query_logs;")
    op.execute("""
    CREATE POLICY tenant_isolation_policy ON query_logs
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    """)

    # 10. Trigger d'Immutabilité du Preset (TNR-18 - US-BACK-03)
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_freeze_preset_on_ingested_docs()
    RETURNS TRIGGER AS $$
    DECLARE
        v_chunk_count INT;
    BEGIN
        -- Vérifier s'il existe des document_chunks pour ce tenant
        SELECT count(*) INTO v_chunk_count
        FROM document_chunks
        WHERE tenant_id = OLD.tenant_id;

        IF v_chunk_count > 0 THEN
            -- Si altération in-place d'embedding, chunk_size ou chunk_overlap
            IF (OLD.embedding_model IS DISTINCT FROM NEW.embedding_model) OR
               (OLD.chunk_size IS DISTINCT FROM NEW.chunk_size) OR
               (OLD.chunk_overlap IS DISTINCT FROM NEW.chunk_overlap) THEN
                RAISE EXCEPTION 'CANNOT_MODIFY_FROZEN_PRESET: Espace alimente (% chunks). Invariant TNR-18 scelle.', v_chunk_count;
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("DROP TRIGGER IF EXISTS trg_freeze_preset_on_ingested_docs ON rag_presets;")
    op.execute("""
    CREATE TRIGGER trg_freeze_preset_on_ingested_docs
    BEFORE UPDATE ON rag_presets
    FOR EACH ROW
    EXECUTE FUNCTION fn_freeze_preset_on_ingested_docs();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_freeze_preset_on_ingested_docs ON rag_presets;")
    op.execute("DROP FUNCTION IF EXISTS fn_freeze_preset_on_ingested_docs();")
    
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON query_logs;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON rag_presets;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON document_chunks;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON documents;")

    op.execute("ALTER TABLE query_logs DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE rag_presets DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE documents DISABLE ROW LEVEL SECURITY;")

    op.execute("DROP TABLE IF EXISTS query_logs CASCADE;")
    op.execute("DROP TABLE IF EXISTS document_chunks CASCADE;")
    op.execute("DROP TABLE IF EXISTS document_versions CASCADE;")
    op.execute("DROP TABLE IF EXISTS documents CASCADE;")
    op.execute("DROP TABLE IF EXISTS rag_presets CASCADE;")
    op.execute("DROP TABLE IF EXISTS tenants CASCADE;")
