"""
RAGTIME Tests — Suite TDD Algorithme RRF & Recherche Hybride Dense/Sparse (US-IA-05)
Vérifie :
- Exactitude mathématique de la formule RRF 1/(60+r) et pondérations
- Repêchage vérifié par BM25 de mots-clés exacts et codes techniques rares
- Résilience face aux requêtes vides ou contenant des caractères spéciaux
- Herméticité multi-tenant absolue (TNR-02)
"""

import uuid

import pytest
from app.core.database import async_session_factory, get_tenant_session
from app.domain.ports.hybrid_search import compute_rrf_scores
from app.infrastructure.rag.hybrid_retriever import PgHybridRetrieverAdapter
from app.infrastructure.rag.ollama_embedding import OllamaEmbeddingAdapter
from app.models.chunks import DocumentChunk
from app.models.documents import Document, DocumentVersion
from app.models.tenants import Tenant


def test_compute_rrf_scores_exact_formula():
    """
    Validation mathématique pure de la formule Reciprocal Rank Fusion :
    RRF(d) = sum(w / (k + rank)) avec k=60.
    """
    id_a = uuid.uuid4()
    id_b = uuid.uuid4()
    id_c = uuid.uuid4()

    dense_ranks = [id_a, id_b]  # id_a rank 1, id_b rank 2
    sparse_ranks = [id_a, id_c]  # id_a rank 1, id_c rank 2

    scores = compute_rrf_scores(dense_ranks, sparse_ranks, k=60)

    # id_a est présent aux deux rangs 1 : 1/61 + 1/61 = 2/61
    expected_score_a = (1.0 / 61.0) + (1.0 / 61.0)
    assert abs(scores[id_a] - expected_score_a) < 1e-9

    # id_b est présent uniquement en dense rang 2 : 1/62
    expected_score_b = 1.0 / 62.0
    assert abs(scores[id_b] - expected_score_b) < 1e-9

    # id_c est présent uniquement en sparse rang 2 : 1/62
    expected_score_c = 1.0 / 62.0
    assert abs(scores[id_c] - expected_score_c) < 1e-9

    # Hiérarchie : le candidat bi-sourcé domine
    assert scores[id_a] > scores[id_b]
    assert scores[id_b] == scores[id_c]


def test_compute_rrf_scores_custom_weights_and_k():
    """Vérifie la personnalisation des poids dense/sparse et de la constante k."""
    id_x = uuid.uuid4()
    dense_ranks = [id_x]
    sparse_ranks = []

    scores = compute_rrf_scores(
        dense_ranks,
        sparse_ranks,
        k=20,
        dense_weight=2.0,
    )
    # 2.0 / (20 + 1) = 2.0 / 21
    assert abs(scores[id_x] - (2.0 / 21.0)) < 1e-9


def test_compute_rrf_scores_invalid_k():
    """Lève ValueError si k < 1."""
    with pytest.raises(ValueError, match="La constante RRF k doit être >= 1"):
        compute_rrf_scores([], [], k=0)


@pytest.mark.asyncio
async def test_hybrid_search_repechage_exact_keyword_and_technical_code():
    """
    Test d'intégration du repêchage BM25 :
    Un chunk comportant un code d'erreur technique précis (ex: ERR_SEC_CERT_REVOKED_9921)
    doit être repêché et hissé dans le Top-K final par la recherche lexicale,
    même si son embedding dense initial n'était pas le plus haut.
    """
    embedder = OllamaEmbeddingAdapter()
    retriever = PgHybridRetrieverAdapter(embedding_model=embedder)

    tenant_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    ver_id = uuid.uuid4()

    # 1. Création du tenant hors RLS
    async with async_session_factory() as root_session:
        t = Tenant(
            id=tenant_id,
            name="Tenant Hybrid Test",
            slug=f"tenant-hybrid-{tenant_id.hex[:6]}",
            category="cyber",
            system_prompt="Assistant cybersécurité.",
        )
        root_session.add(t)
        await root_session.commit()

    # 2. Insertion de fragments documentaires sous contexte tenant
    text_semantic = "L'intelligence artificielle souveraine repose sur des modèles de fondation locaux."
    text_error_code = "Incident réseau critique : l'erreur ERR_SEC_CERT_REVOKED_9921 révoque la chaîne TLS."
    text_irrelevant = "Les consignes de sécurité des locaux prévoient l'évacuation en cas d'alerte incendie."

    v_sem = await embedder.embed_text(text_semantic)
    v_err = await embedder.embed_text(text_error_code)
    v_irr = await embedder.embed_text(text_irrelevant)

    chunk_err_id = uuid.uuid4()

    async with get_tenant_session(tenant_id) as session:
        doc = Document(
            id=doc_id,
            tenant_id=tenant_id,
            name="guide_cyber.md",
            file_type="markdown",
            current_version=1,
            total_chunks=3,
        )
        session.add(doc)

        ver = DocumentVersion(
            id=ver_id,
            document_id=doc_id,
            version_number=1,
            sha256_checksum="c" * 64,
            file_size_bytes=2048,
            chunks_count=3,
            storage_path="/secure/guide_cyber.md",
        )
        session.add(ver)
        await session.flush()

        chunks = [
            DocumentChunk(
                document_id=doc_id,
                version_id=ver_id,
                tenant_id=tenant_id,
                chunk_index=0,
                content=text_semantic,
                sha256_hash="1" * 64,
                token_count=14,
                embedding=v_sem,
                chunk_metadata={"type": "concept"},
            ),
            DocumentChunk(
                id=chunk_err_id,
                document_id=doc_id,
                version_id=ver_id,
                tenant_id=tenant_id,
                chunk_index=1,
                content=text_error_code,
                sha256_hash="2" * 64,
                token_count=15,
                embedding=v_err,
                chunk_metadata={"type": "incident"},
            ),
            DocumentChunk(
                document_id=doc_id,
                version_id=ver_id,
                tenant_id=tenant_id,
                chunk_index=2,
                content=text_irrelevant,
                sha256_hash="3" * 64,
                token_count=16,
                embedding=v_irr,
                chunk_metadata={"type": "batiment"},
            ),
        ]
        session.add_all(chunks)

    # 3. Requête portant sur le code d'erreur technique
    query_exact = "Comment résoudre ERR_SEC_CERT_REVOKED_9921 ?"

    async with get_tenant_session(tenant_id) as session:
        results = await retriever.search_hybrid(
            session=session,
            tenant_id=tenant_id,
            query_text=query_exact,
            top_k=2,
        )

        assert len(results) >= 1
        top_result = results[0]

        # Le chunk contenant le code d'erreur exact doit être hissé en rang 1
        assert top_result.id == chunk_err_id
        assert "ERR_SEC_CERT_REVOKED_9921" in top_result.content
        assert top_result.final_rank == 1
        assert top_result.rrf_score > 0.0
        assert top_result.sparse_rank is not None  # Repêché par la recherche lexicale !


@pytest.mark.asyncio
async def test_hybrid_search_edge_cases_empty_and_special_chars():
    """Vérifie la robustesse face aux requêtes vides et aux caractères syntaxiques complexes."""
    embedder = OllamaEmbeddingAdapter()
    retriever = PgHybridRetrieverAdapter(embedding_model=embedder)
    tenant_id = uuid.uuid4()

    async with get_tenant_session(tenant_id) as session:
        # Requête vide ou espaces
        assert await retriever.search_hybrid(session, tenant_id, "") == []
        assert await retriever.search_hybrid(session, tenant_id, "   \n\t  ") == []

        # Requête avec caractères spéciaux FTS / SQL
        special_query = "! @ # $ % ^ & * ( ) _ + - = [ ] { } | ; : ' \" , < > . ? / \\"
        results = await retriever.search_hybrid(session, tenant_id, special_query)
        assert isinstance(results, list)


@pytest.mark.asyncio
async def test_hybrid_search_strict_multi_tenant_isolation():
    """
    Invariant TNR-02 :
    Une recherche hybride (dense ou lexicale) pour le Tenant Alpha ne doit JAMAIS
    renvoyer des résultats appartenant au Tenant Bêta, même si le code recherché est présent chez Bêta.
    """
    embedder = OllamaEmbeddingAdapter()
    retriever = PgHybridRetrieverAdapter(embedding_model=embedder)

    tenant_alpha = uuid.uuid4()
    tenant_beta = uuid.uuid4()

    # Création des tenants hors RLS
    async with async_session_factory() as root_session:
        ta = Tenant(
            id=tenant_alpha,
            name="Alpha Hybrid",
            slug=f"alpha-hyb-{tenant_alpha.hex[:6]}",
            category="general",
            system_prompt="Alpha",
        )
        tb = Tenant(
            id=tenant_beta,
            name="Beta Hybrid",
            slug=f"beta-hyb-{tenant_beta.hex[:6]}",
            category="secret",
            system_prompt="Beta",
        )
        root_session.add_all([ta, tb])
        await root_session.commit()

    secret_keyword = "CONFIDENTIAL_CODE_BETA_XYZ"
    secret_text = f"Projet secret d'armement : {secret_keyword} actif."
    secret_vec = await embedder.embed_text(secret_text)

    # Insertion chez Beta uniquement
    async with get_tenant_session(tenant_beta) as session:
        doc_b = Document(
            id=uuid.uuid4(),
            tenant_id=tenant_beta,
            name="secret.md",
            file_type="markdown",
        )
        session.add(doc_b)
        ver_b = DocumentVersion(
            id=uuid.uuid4(),
            document_id=doc_b.id,
            version_number=1,
            sha256_checksum="b" * 64,
            file_size_bytes=100,
            storage_path="/beta/secret.md",
        )
        session.add(ver_b)
        await session.flush()

        chunk_b = DocumentChunk(
            document_id=doc_b.id,
            version_id=ver_b.id,
            tenant_id=tenant_beta,
            chunk_index=0,
            content=secret_text,
            sha256_hash="b" * 64,
            token_count=10,
            embedding=secret_vec,
        )
        session.add(chunk_b)

    # Recherche hybride exécutée sous le contexte d'Alpha pour ce même mot-clé
    async with get_tenant_session(tenant_alpha) as session:
        results = await retriever.search_hybrid(
            session=session,
            tenant_id=tenant_alpha,
            query_text=f"Quel est le statut de {secret_keyword} ?",
            dense_threshold=0.0,
        )
        # Zéro fuite : la recherche sous Alpha ne voit absolument rien de Bêta
        assert len(results) == 0
