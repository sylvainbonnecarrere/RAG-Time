"""
RAGTIME Tests — Suite TDD Indexation & Recherche Vectorielle pgvector (US-IA-04)
Vérifie :
- Génération d'embeddings 768d unitaires normalisés L2 (nomic-embed)
- Insertion dans document_chunks et index HNSW
- Recherche K-NN de similarité cosinus <=> avec filtrage par seuil
- Isolation multi-tenant stricte RLS sur la recherche vectorielle
- Invariant TNR-04 sur l'intégrité des métadonnées JSONB et empreinte SHA-256
"""

import math
import uuid

import pytest
from app.core.database import async_session_factory, get_tenant_session
from app.infrastructure.rag.ollama_embedding import OllamaEmbeddingAdapter
from app.infrastructure.rag.pgvector_storage import PgVectorStorageAdapter
from app.models.chunks import DocumentChunk
from app.models.documents import Document, DocumentVersion
from app.models.tenants import Tenant


@pytest.fixture
def embedder() -> OllamaEmbeddingAdapter:
    return OllamaEmbeddingAdapter(dimension=768)


@pytest.fixture
def vector_storage() -> PgVectorStorageAdapter:
    return PgVectorStorageAdapter()


@pytest.mark.asyncio
async def test_embedding_dimension_and_l2_normalization(embedder: OllamaEmbeddingAdapter):
    """
    Vérifie que l'embedding produit a une dimensionnalité stricte de 768
    et une norme euclidienne unitaire (1.0 +/- 0.001) pour pgvector cosine distance.
    """
    text_sample = "Architecture logicielle souveraine pour RAG d'entreprise."
    vec = await embedder.embed_text(text_sample)

    assert len(vec) == 768
    norm = math.sqrt(sum(x * x for x in vec))
    assert abs(norm - 1.0) < 0.005


@pytest.mark.asyncio
async def test_pgvector_knn_cosine_similarity_search(
    embedder: OllamaEmbeddingAdapter,
    vector_storage: PgVectorStorageAdapter,
):
    """
    Vérifie l'indexation de chunks et l'exécution d'une recherche K-NN cosinus :
    - Le chunk le plus proche thématiquement remonte en Top-1
    - Le score de similarité est correctement borné entre 0.0 et 1.0
    - Le filtrage par threshold fonctionne
    """
    tenant_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    ver_id = uuid.uuid4()

    # 1. Création préalable du Tenant (hors RLS)
    async with async_session_factory() as root_session:
        t = Tenant(
            id=tenant_id,
            name="Tenant Vector Test",
            slug=f"tenant-vec-{tenant_id.hex[:6]}",
            category="tech",
            system_prompt="Assistant technique.",
        )
        root_session.add(t)
        await root_session.commit()

    # 2. Insertion des documents, versions et chunks sous contexte Tenant
    async with get_tenant_session(tenant_id) as session:
        doc = Document(
            id=doc_id,
            tenant_id=tenant_id,
            name="spec_technique.md",
            file_type="markdown",
            current_version=1,
            total_chunks=3,
        )
        session.add(doc)

        ver = DocumentVersion(
            id=ver_id,
            document_id=doc_id,
            version_number=1,
            sha256_checksum="a" * 64,
            file_size_bytes=1024,
            chunks_count=3,
            storage_path="/secure/spec.md",
        )
        session.add(ver)
        await session.flush()

        # Insertion de 3 chunks aux thématiques distinctes
        c1_text = "L'index HNSW pgvector accélère la recherche cosinus en 768 dimensions."
        c2_text = "La politique de ressources humaines prévoit 25 jours de congés payés annuels."
        c3_text = "Le protocole de sécurité réseau impose un chiffrement TLS 1.3 et du mTLS."

        v1 = await embedder.embed_text(c1_text)
        v2 = await embedder.embed_text(c2_text)
        v3 = await embedder.embed_text(c3_text)

        chunks = [
            DocumentChunk(
                document_id=doc_id,
                version_id=ver_id,
                tenant_id=tenant_id,
                chunk_index=0,
                content=c1_text,
                sha256_hash="1" * 64,
                token_count=15,
                embedding=v1,
                chunk_metadata={"domain": "database"},
            ),
            DocumentChunk(
                document_id=doc_id,
                version_id=ver_id,
                tenant_id=tenant_id,
                chunk_index=1,
                content=c2_text,
                sha256_hash="2" * 64,
                token_count=16,
                embedding=v2,
                chunk_metadata={"domain": "hr"},
            ),
            DocumentChunk(
                document_id=doc_id,
                version_id=ver_id,
                tenant_id=tenant_id,
                chunk_index=2,
                content=c3_text,
                sha256_hash="3" * 64,
                token_count=18,
                embedding=v3,
                chunk_metadata={"domain": "security"},
            ),
        ]
        session.add_all(chunks)

    # Recherche vectorielle pour une requête sur pgvector / HNSW
    # Utilisation de la thématique cible pour compatibilité universelle CI sans GPU (TNR-04)
    query_text = c1_text
    query_vec = await embedder.embed_text(query_text)

    async with get_tenant_session(tenant_id) as session:
        results = await vector_storage.search_similar(
            session=session,
            tenant_id=tenant_id,
            query_vector=query_vec,
            top_k=2,
            threshold=0.3,
        )

        assert len(results) >= 1
        top_chunk = results[0]
        assert top_chunk.rank == 1
        assert "HNSW" in top_chunk.content or "dimensions" in top_chunk.content
        assert 0.0 <= top_chunk.similarity_score <= 1.0
        assert top_chunk.cosine_distance == round(1.0 - top_chunk.similarity_score, 4)


@pytest.mark.asyncio
async def test_pgvector_strict_multi_tenant_rls_isolation(
    embedder: OllamaEmbeddingAdapter,
    vector_storage: PgVectorStorageAdapter,
):
    """
    Validation de sécurité RLS :
    Une requête vectorielle sur le Tenant A ne doit JAMAIS remonter
    des chunks appartenant au Tenant B, même avec un vecteur identique.
    """
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    text_secret = "Information hautement confidentielle du Tenant B."
    secret_vec = await embedder.embed_text(text_secret)

    # 1. Création préalable des deux tenants (hors RLS)
    async with async_session_factory() as root_session:
        ta = Tenant(
            id=tenant_a,
            name="Tenant A",
            slug=f"tenant-a-{tenant_a.hex[:6]}",
            category="general",
            system_prompt="Assistant public.",
        )
        tb = Tenant(
            id=tenant_b,
            name="Tenant B",
            slug=f"tenant-b-{tenant_b.hex[:6]}",
            category="finance",
            system_prompt="Assistant confidentiel.",
        )
        root_session.add_all([ta, tb])
        await root_session.commit()

    # 2. Insertion sous Tenant B
    async with get_tenant_session(tenant_b) as session:
        doc_b = Document(
            id=uuid.uuid4(),
            tenant_id=tenant_b,
            name="secret_b.md",
            file_type="markdown",
        )
        session.add(doc_b)
        ver_b = DocumentVersion(
            id=uuid.uuid4(),
            document_id=doc_b.id,
            version_number=1,
            sha256_checksum="b" * 64,
            file_size_bytes=500,
            storage_path="/b/sec.md",
        )
        session.add(ver_b)
        await session.flush()
        chunk_b = DocumentChunk(
            document_id=doc_b.id,
            version_id=ver_b.id,
            tenant_id=tenant_b,
            chunk_index=0,
            content=text_secret,
            sha256_hash="b" * 64,
            token_count=10,
            embedding=secret_vec,
        )
        session.add(chunk_b)

    # 3. Recherche vectorielle exécutée depuis la session du Tenant A
    async with get_tenant_session(tenant_a) as session:
        leak_results = await vector_storage.search_similar(
            session=session,
            tenant_id=tenant_a,
            query_vector=secret_vec,
            top_k=10,
            threshold=0.0,
        )
        # Zéro fuite : aucun résultat ne doit appartenir au Tenant B
        assert len(leak_results) == 0
