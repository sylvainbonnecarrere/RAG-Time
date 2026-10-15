"""
Banc d'Essai TDD — US-BACK-01 : Schéma Relationnel & Modèles SQLModel
Valide la conformité structurelle des modèles, les types, les contraintes et les index pgvector.
"""

import uuid

import pytest
from app.models.audit import QueryLog
from app.models.chunks import DocumentChunk
from app.models.documents import DocumentVersion
from app.models.presets import RagPresetCreate
from app.models.tenants import Tenant
from pydantic import ValidationError


def test_tenant_model_validation():
    """Valide l'instanciation et les champs obligatoires du modèle Tenant."""
    tenant = Tenant(
        name="Finance & Fiscalité",
        slug="finance-fiscalite",
        category="finance",
        system_prompt="Tu es un expert fiscal souverain.",
    )
    assert tenant.id is not None
    assert isinstance(tenant.id, uuid.UUID)
    assert tenant.is_active is True
    assert tenant.name == "Finance & Fiscalité"


def test_preset_overlap_constraint():
    """Vérifie la contrainte mathématique TNR-28 : chunk_overlap < chunk_size / 2."""
    # Doit lever une erreur si overlap >= size / 2
    with pytest.raises((ValidationError, ValueError)):
        RagPresetCreate(
            name="Invalide Preset",
            chunk_size=512,
            chunk_overlap=300,  # 300 >= 512 / 2 (256) -> Invalide !
            similarity_threshold=0.75,
            retrieval_top_k=5,
        )


def test_document_versioning_model():
    """Vérifie le modèle DocumentVersion pour TNR-03 (v+1 immuable)."""
    doc_id = uuid.uuid4()
    
    version = DocumentVersion(
        document_id=doc_id,
        version_number=1,
        sha256_checksum="a" * 64,
        file_size_bytes=1024,
        chunks_count=4,
        storage_path="/storage/docs/test.pdf",
    )
    assert version.version_number == 1
    assert len(version.sha256_checksum) == 64
    assert version.status == "indexed"


def test_document_chunk_model():
    """Vérifie le modèle DocumentChunk avec embedding vector(768)."""
    tenant_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    version_id = uuid.uuid4()
    
    # 768 dimensions pour nomic-embed-text
    dummy_embedding = [0.01] * 768
    
    chunk = DocumentChunk(
        document_id=doc_id,
        version_id=version_id,
        tenant_id=tenant_id,
        chunk_index=0,
        content="Extrait juridique de conformité.",
        sha256_hash="b" * 64,
        token_count=12,
        embedding=dummy_embedding,
        chunk_metadata={"page": 1, "section": "Article 1"},
    )
    assert chunk.chunk_index == 0
    assert len(chunk.embedding) == 768
    assert chunk.chunk_metadata["page"] == 1


def test_query_log_model():
    """Vérifie la structure du modèle QueryLog pour l'audit MLOps."""
    tenant_id = uuid.uuid4()
    log = QueryLog(
        tenant_id=tenant_id,
        query_text="Quelle est la règle fiscale IFRS 16 ?",
        ttft_ms=124.5,
        total_time_ms=850.2,
        tokens_generated=150,
        chunks_retrieved_count=4,
    )
    assert log.tenant_id == tenant_id
    assert log.tokens_generated == 150
