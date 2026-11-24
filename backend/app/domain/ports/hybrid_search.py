"""
RAGTIME Domain — Port Hexagonal HybridSearchPort & Algorithme RRF (US-IA-05)
Définit les interfaces de recherche hybride combinant la recherche sémantique dense
(pgvector) et la recherche lexicale clairsemée (PostgreSQL BM25 / Full-Text Search)
avec l'algorithme Reciprocal Rank Fusion (RRF k=60).
"""

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class HybridChunkResult:
    """
    Représentation unifiée et immuable d'un fragment documentaire
    issu de la fusion hybride RRF.
    """
    id: uuid.UUID
    document_id: uuid.UUID
    version_id: uuid.UUID
    chunk_index: int
    content: str
    context_prefix: str | None = None
    section_title: str | None = None
    sha256_hash: str = ""
    token_count: int = 0
    page_number: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    dense_rank: int | None = None
    sparse_rank: int | None = None
    dense_similarity: float | None = None
    sparse_score: float | None = None
    rrf_score: float = 0.0
    final_rank: int = 1


def compute_rrf_scores(
    dense_ranked_ids: list[uuid.UUID],
    sparse_ranked_ids: list[uuid.UUID],
    k: int = 60,
    dense_weight: float = 1.0,
    sparse_weight: float = 1.0,
) -> dict[uuid.UUID, float]:
    """
    Calcule les scores Reciprocal Rank Fusion (RRF) déterministes :
    RRF(d) = sum(w_m / (k + r_m(d))) pour chaque modèle où d apparaît.

    Les rangs sont 1-based (1, 2, ...).
    """
    if k < 1:
        raise ValueError("La constante RRF k doit être >= 1.")

    scores: dict[uuid.UUID, float] = {}

    for rank, doc_id in enumerate(dense_ranked_ids, start=1):
        score = dense_weight / (k + rank)
        scores[doc_id] = scores.get(doc_id, 0.0) + score

    for rank, doc_id in enumerate(sparse_ranked_ids, start=1):
        score = sparse_weight / (k + rank)
        scores[doc_id] = scores.get(doc_id, 0.0) + score

    return scores


class HybridSearchPort(ABC):
    """
    Port secondaire pour la recherche hybride dense (pgvector) +
    lexicale (PostgreSQL BM25 Full-Text) avec fusion réciproque RRF.
    """

    @abstractmethod
    async def search_hybrid(
        self,
        session: AsyncSession,
        tenant_id: uuid.UUID,
        query_text: str,
        query_vector: list[float] | None = None,
        top_k: int = 5,
        k_constant: int = 60,
        dense_threshold: float = 0.5,
        dense_limit: int = 20,
        sparse_limit: int = 20,
        dense_weight: float = 1.0,
        sparse_weight: float = 1.0,
    ) -> list[HybridChunkResult]:
        """
        Exécute la recherche hybride et retourne les top_k fragments fusionnés.
        """
