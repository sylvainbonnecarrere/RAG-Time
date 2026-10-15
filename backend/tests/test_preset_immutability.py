"""
Banc d'Essai TDD — US-BACK-03 : Trigger d'Immutabilité des Presets (TNR-18)
Valide le scellement in-place des presets si des document_chunks existent pour le tenant.
"""

import uuid

import pytest
from app.core.config import settings
from app.core.database import get_tenant_session
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


@pytest.mark.asyncio
async def test_preset_freeze_trigger_on_ingested_docs():
    """
    Scénario TNR-18 :
    1. Crée un tenant avec un preset par défaut.
    2. Modifie le preset TANT QU'IL N'Y A AUCUN CHUNK -> Doit réussir.
    3. Ajoute un document_chunk pour ce tenant.
    4. Tente de modifier embedding_model ou chunk_size -> Doit être rejeté avec CANNOT_MODIFY_FROZEN_PRESET.
    """
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    tenant_id = uuid.uuid4()
    preset_id = uuid.uuid4()

    async with async_session() as session:
        # Créer le tenant (table hors RLS)
        await session.execute(
            text("""
            INSERT INTO tenants (id, name, slug, category, system_prompt)
            VALUES (:id, 'Tenant Frozen Test', :slug, 'tech', 'Prompt Test');
            """),
            {"id": str(tenant_id), "slug": f"freeze-{uuid.uuid4().hex[:6]}"}
        )
        await session.commit()

    # Créer le preset sous le contexte du tenant
    async with get_tenant_session(tenant_id) as session:
        await session.execute(
            text("""
            INSERT INTO rag_presets (id, tenant_id, name, chunk_size, chunk_overlap, similarity_threshold, retrieval_top_k, embedding_model, embedding_dim)
            VALUES (:id, :tenant_id, 'Preset Initial', 512, 64, 0.700, 5, 'nomic-embed-text-v1.5', 768);
            """),
            {"id": str(preset_id), "tenant_id": str(tenant_id)}
        )

    # 1. Mise à jour autorisée car chunks_count == 0 (espace vierge)
    async with get_tenant_session(tenant_id) as session:
        await session.execute(
            text("""
            UPDATE rag_presets 
            SET chunk_size = 768, chunk_overlap = 96
            WHERE id = :id;
            """),
            {"id": str(preset_id)}
        )

    # 2. Insérer un document et un chunk pour alimenter l'espace sous le contexte tenant
    async with get_tenant_session(tenant_id) as session:
        doc_id = uuid.uuid4()
        version_id = uuid.uuid4()
        chunk_id = uuid.uuid4()

        await session.execute(
            text("""
            INSERT INTO documents (id, tenant_id, name, file_type, extraction_method)
            VALUES (:id, :tenant_id, 'Doc1.pdf', 'pdf', 'native_pdf');
            """),
            {"id": str(doc_id), "tenant_id": str(tenant_id)}
        )

        await session.execute(
            text("""
            INSERT INTO document_versions (id, document_id, version_number, sha256_checksum, file_size_bytes, storage_path)
            VALUES (:id, :doc_id, 1, :sha, 1024, '/storage/doc1.pdf');
            """),
            {"id": str(version_id), "doc_id": str(doc_id), "sha": "c" * 64}
        )

        dummy_vector = "[" + ",".join(["0.01"] * 768) + "]"
        await session.execute(
            text("""
            INSERT INTO document_chunks (id, document_id, version_id, tenant_id, chunk_index, content, sha256_hash, token_count, embedding)
            VALUES (:id, :doc_id, :ver_id, :tenant_id, 0, 'Contenu indexé', :sha, 10, CAST(:embedding AS vector));
            """),
            {
                "id": str(chunk_id),
                "doc_id": str(doc_id),
                "ver_id": str(version_id),
                "tenant_id": str(tenant_id),
                "sha": "d" * 64,
                "embedding": dummy_vector,
            }
        )

    # 3. Tenter de modifier le preset maintenant qu'il y a un chunk -> DOIT LEVER UNE EXCEPTION SQL CANNOT_MODIFY_FROZEN_PRESET
    async with get_tenant_session(tenant_id) as session:
        with pytest.raises(DBAPIError) as exc_info:
            await session.execute(
                text("""
                UPDATE rag_presets 
                SET chunk_size = 256
                WHERE id = :id;
                """),
                {"id": str(preset_id)}
            )
        assert "CANNOT_MODIFY_FROZEN_PRESET" in str(exc_info.value)

    await engine.dispose()
