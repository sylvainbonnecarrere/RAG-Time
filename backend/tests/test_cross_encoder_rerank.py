"""
RAGTIME Tests — Suite TDD Re-ranking Cross-Encoder & Métriques Thermiques (US-IA-06)
Vérifie :
- Étalonnage thermique tripartite et quadripartite (TNR-31)
- Précision du Delta Top-1 conforme à TNR-25 (delta = -0.027)
- Formatage certifié des labels de citation [Document, p.X] (TNR-14)
- Re-ordonnancement contextuel précis par le Cross-Encoder
- Robustesse face aux cas limites (liste vide, 1 élément, requêtes vides)
"""

import re
import uuid

import pytest
from app.domain.ports.hybrid_search import HybridChunkResult
from app.domain.ports.reranker import (
    RerankedChunk,
    calculate_top1_deltas,
    classify_thermal_status,
    format_citation_label,
)
from app.infrastructure.rag.reranker import LocalCrossEncoderAdapter


def test_classify_thermal_status_thresholds():
    """
    Validation de la palette thermique quadripartite et tripartite (TNR-31) :
    - >= 0.85 : 'emerald'
    - 0.70 à 0.849 : 'cyan'
    - 0.60 à 0.699 : 'amber'
    - < 0.60 : 'rose'
    """
    assert classify_thermal_status(0.95) == "emerald"
    assert classify_thermal_status(0.85) == "emerald"
    assert classify_thermal_status(0.849) == "cyan"
    assert classify_thermal_status(0.70) == "cyan"
    assert classify_thermal_status(0.699) == "amber"
    assert classify_thermal_status(0.60) == "amber"
    assert classify_thermal_status(0.599) == "rose"
    assert classify_thermal_status(0.20) == "rose"

    # Robustesse aux bornes étendues
    assert classify_thermal_status(1.5) == "emerald"
    assert classify_thermal_status(-0.2) == "rose"


def test_format_citation_label_tnr_14():
    """
    Invariant TNR-14 :
    Le label de citation doit rigoureusement respecter le motif [Document, p.X].
    """
    pattern = r"^\[.+,\s*p\.\d+\]$"

    label1 = format_citation_label("Architecture_PgVector.pdf", 14)
    assert re.match(pattern, label1) is not None
    assert label1 == "[Architecture_PgVector.pdf, p.14]"

    label_default_page = format_citation_label("Rapport_SecOps.md", None)
    assert re.match(pattern, label_default_page) is not None
    assert label_default_page == "[Rapport_SecOps.md, p.1]"

    label_empty_doc = format_citation_label("", 3)
    assert re.match(pattern, label_empty_doc) is not None
    assert label_empty_doc == "[Document, p.3]"


def test_calculate_top1_deltas_tnr_25():
    """
    Invariant TNR-25 :
    Calcul rigoureux du Delta Top-1 : delta = round(score - score_top1, 3).
    Exemple certifié : score_top1 = 0.892, score_chunk = 0.865 -> delta = -0.027.
    """
    id_1 = uuid.uuid4()
    id_2 = uuid.uuid4()
    id_3 = uuid.uuid4()

    chunks = [
        RerankedChunk(
            id=id_1,
            document_id=uuid.uuid4(),
            version_id=uuid.uuid4(),
            chunk_index=0,
            content="Top 1 content",
            cosine_score=0.892,
            rank=1,
        ),
        RerankedChunk(
            id=id_2,
            document_id=uuid.uuid4(),
            version_id=uuid.uuid4(),
            chunk_index=1,
            content="Top 2 content",
            cosine_score=0.865,
            rank=2,
        ),
        RerankedChunk(
            id=id_3,
            document_id=uuid.uuid4(),
            version_id=uuid.uuid4(),
            chunk_index=2,
            content="Top 3 content",
            cosine_score=0.742,
            rank=3,
        ),
    ]

    deltas_chunks = calculate_top1_deltas(chunks)

    assert len(deltas_chunks) == 3

    # Top-1 delta nul
    assert deltas_chunks[0].delta_top1 == 0.000
    assert deltas_chunks[0].thermal_status == "emerald"

    # Top-2 delta strictement conforme au scénario TNR-25 (-0.027)
    assert deltas_chunks[1].delta_top1 == -0.027
    assert deltas_chunks[1].thermal_status == "emerald"

    # Top-3 delta
    expected_delta_3 = round(0.742 - 0.892, 3)
    assert deltas_chunks[2].delta_top1 == expected_delta_3
    assert deltas_chunks[2].thermal_status == "cyan"


@pytest.mark.asyncio
async def test_cross_encoder_rerank_promotes_relevant_chunk():
    """
    Vérifie que le modèle Cross-Encoder hisse en Top-1 le chunk apportant
    la réponse exacte, même si son score cosinus bi-encoder initial était inférieur.
    """
    reranker = LocalCrossEncoderAdapter()

    # Chunk A : Discussion générale sur la cryptographie (score cosinus élevé 0.88)
    chunk_a = HybridChunkResult(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        version_id=uuid.uuid4(),
        chunk_index=0,
        content="La cryptographie asymétrique repose sur des paires de clés publiques et privées.",
        dense_similarity=0.88,
        sha256_hash="a" * 64,
        metadata={"document_name": "crypto_general.pdf"},
    )

    # Chunk B : Procédure exacte demandée (score cosinus plus bas 0.85, mais affinité croisée forte)
    chunk_b = HybridChunkResult(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        version_id=uuid.uuid4(),
        chunk_index=1,
        content="La procédure de déverrouillage d'urgence nécessite la saisie simultanée des deux clés de secours physiques.",
        dense_similarity=0.85,
        sha256_hash="b" * 64,
        metadata={"document_name": "urgence_procedure.md"},
        page_number=5,
    )

    query = "Quelle est la procédure de déverrouillage d'urgence ?"

    results = await reranker.rerank(query, [chunk_a, chunk_b], top_k=2)

    assert len(results) == 2

    # Chunk B doit être promu en Top-1 par le Cross-Encoder
    top1 = results[0]
    assert top1.id == chunk_b.id
    assert "déverrouillage d'urgence" in top1.content
    assert top1.rank == 1
    assert top1.delta_top1 == 0.0
    assert top1.citation_label == "[urgence_procedure.md, p.5]"
    assert top1.is_certified is True
    assert len(top1.sha256_hash) == 64

    # Chunk A est relégué en rang 2 avec un delta négatif calculé
    top2 = results[1]
    assert top2.id == chunk_a.id
    assert top2.rank == 2
    assert top2.citation_label == "[crypto_general.pdf, p.1]"


@pytest.mark.asyncio
async def test_cross_encoder_edge_cases():
    """Validation de robustesse : liste vide, 1 seul candidat, requête vide et seuil."""
    reranker = LocalCrossEncoderAdapter()

    # 1. Liste vide
    assert await reranker.rerank("Query", []) == []

    # 2. Un seul élément
    single_chunk = {
        "id": uuid.uuid4(),
        "content": "Unique fragment documentaire.",
        "cosine_score": 0.82,
        "document_name": "doc_unique.pdf",
    }
    single_res = await reranker.rerank("Recherche", [single_chunk])
    assert len(single_res) == 1
    assert single_res[0].rank == 1
    assert single_res[0].delta_top1 == 0.0
    assert single_res[0].thermal_status == "cyan"

    # 3. Requête vide : préserve les métadonnées et retourne les chunks
    empty_q_res = await reranker.rerank("", [single_chunk])
    assert len(empty_q_res) == 1
    assert empty_q_res[0].delta_top1 == 0.0

    # 4. Filtrage par seuil minimal
    low_chunks = [
        {"id": uuid.uuid4(), "content": "Faible 1", "cosine_score": 0.40},
        {"id": uuid.uuid4(), "content": "Faible 2", "cosine_score": 0.45},
    ]
    # Seuil haut de 0.60 : le fallback de rappel conserve au moins le Top-1
    filtered_res = await reranker.rerank("test", low_chunks, min_threshold=0.60)
    assert len(filtered_res) == 1
    assert filtered_res[0].rank == 1
