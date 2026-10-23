-- ==============================================================================
-- RAGTIME — Script d'Initialisation Base de Données PostgreSQL 16 + pgvector
-- ==============================================================================
-- Documents de Référence : architecture/01-architecture.md, architecture/07-security-model.md
-- ==============================================================================

-- 1. Activation des Extensions Essentielles
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Configuration Optimale pour pgvector et HNSW
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';

-- 2.b Rôle Applicatif Souverain (Non-Superuser pour RLS Stricte)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ragtime_app') THEN
        CREATE ROLE ragtime_app WITH LOGIN PASSWORD 'ragtime_local_db_secret_pass' NOSUPERUSER NOBYPASSRLS;
    END IF;
END
$$;
GRANT ALL PRIVILEGES ON DATABASE ragtime_db TO ragtime_app;
GRANT ALL ON SCHEMA public TO ragtime_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ragtime_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ragtime_app;

-- 3. Table des Tenants (Domaines d'Isolation Cryptographique et Relationnelle)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'sante', 'juridique', 'tech', 'rh', 'finance', 'defense', 'sur_mesure'
    description TEXT NULL,
    system_prompt TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table des Presets RAG (Immuabilité TNR-05 & TNR-18, Multi-Stratégies)
CREATE TABLE IF NOT EXISTS rag_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    chunking_strategy VARCHAR(32) NOT NULL DEFAULT 'fixed_sliding', -- 'fixed_sliding', 'sentence', 'markdown_headers', 'semantic'
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

-- 5. Table des Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(32) NOT NULL, -- 'pdf', 'markdown', 'sql', 'html_url', 'txt'
    source_url TEXT NULL,
    extraction_method VARCHAR(64) NOT NULL DEFAULT 'native_parser', -- 'trafilatura_precision', 'trafilatura_recall', 'native_pdf', 'markdown_parser'
    description TEXT NULL,
    cleaning_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_version INT NOT NULL DEFAULT 1,
    total_chunks INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Historique des Versions Immuables (TNR-03)
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    sha256_checksum CHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    chunks_count INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'indexed', -- 'pending', 'extracting', 'chunking', 'embedding', 'indexed', 'failed'
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

-- 7. Table des Chunks pgvector avec Clé d'Étanchéité Multi-Tenant
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
    embedding vector(768) NOT NULL, -- nomic-embed-text-v1.5 768 dimensions
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Index de Performance HNSW & Partitionnement Tenant
CREATE INDEX IF NOT EXISTS idx_chunks_tenant_id ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_presets_tenant_id ON rag_presets(tenant_id);

-- Index Vectoriel HNSW avec métrique Cosine
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Index GIN pour métadonnées JSONB et recherche textuelle
CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin ON document_chunks USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_chunks_strategy ON document_chunks(strategy_used);

-- 9. Table des Logs d'Audit et Télémétrie MLOps
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

-- 10. Insertion des Domaines Par Défaut (Seeds)
INSERT INTO tenants (id, name, slug, category, description, system_prompt)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Finance & Fiscalité', 'finance-fiscalite', 'finance', 'Analyse des rapports annuels, règles comptables IFRS et fiscalité souveraine.', 'Tu es un expert fiscal et financier souverain. Réponds uniquement à partir des sources citées.'),
    ('22222222-2222-2222-2222-222222222222', 'Défense & Stratégie', 'defense-strategie', 'defense', 'Conformité OIV, doctrines opérationnelles et spécifications matérielles sensibles.', 'Tu es un analyste de défense et de renseignement. Rigueur absolue et zéro hallucination.'),
    ('33333333-3333-3333-3333-333333333333', 'Santé & Médical', 'sante-medical', 'sante', 'Essais cliniques, posologies, conformité ANSM et dossiers patients anonymisés.', 'Tu es un assistant médical d extraction de connaissances. Fais preuve de prudence et cite précisément les pages.')
ON CONFLICT (slug) DO NOTHING;

-- 11. Presets RAG Par Défaut pour chaque Tenant
INSERT INTO rag_presets (tenant_id, name, version, chunking_strategy, chunk_size, chunk_overlap, similarity_threshold, retrieval_top_k, rerank_enabled, embedding_model, embedding_dim)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Standard Équilibré', 1, 'fixed_sliding', 512, 64, 0.700, 5, true, 'nomic-embed-text-v1.5', 768),
    ('22222222-2222-2222-2222-222222222222', 'Haute Précision Militaire', 1, 'markdown_headers', 384, 48, 0.780, 4, true, 'nomic-embed-text-v1.5', 768),
    ('33333333-3333-3333-3333-333333333333', 'Médical Granulaire Phrastique', 1, 'sentence', 256, 32, 0.750, 6, true, 'nomic-embed-text-v1.5', 768)
ON CONFLICT DO NOTHING;

-- 12. Politiques Row-Level Security (RLS - US-BACK-02 & US-SEC-01)
-- Activation RLS stricte sur les tables multi-tenant (y compris table owner via FORCE)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE rag_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_presets FORCE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs FORCE ROW LEVEL SECURITY;

-- Création des politiques de filtrage par tenant_id
DROP POLICY IF EXISTS tenant_isolation_policy ON documents;
CREATE POLICY tenant_isolation_policy ON documents
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_policy ON document_chunks;
CREATE POLICY tenant_isolation_policy ON document_chunks
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_policy ON rag_presets;
CREATE POLICY tenant_isolation_policy ON rag_presets
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_policy ON query_logs;
CREATE POLICY tenant_isolation_policy ON query_logs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 13. Trigger d'Immutabilité du Preset sur Espace Alimenté (TNR-18 - US-BACK-03)
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

DROP TRIGGER IF EXISTS trg_freeze_preset_on_ingested_docs ON rag_presets;
CREATE TRIGGER trg_freeze_preset_on_ingested_docs
BEFORE UPDATE ON rag_presets
FOR EACH ROW
EXECUTE FUNCTION fn_freeze_preset_on_ingested_docs();

-- 14. Octroi des Droits sur les Tables et Séquences au Rôle Applicatif ragtime_app
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ragtime_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ragtime_app;
GRANT ragtime_app TO ragtime;


