"""
RAGTIME Domain — Port Hexagonal RerankerPort & Métriques Thermiques Cosinus (US-IA-06)
Définit les interfaces de re-ranking Cross-Encoder (bge-reranker-base), la classification
thermique quadripartite (TNR-31), le calcul précis du Delta Top-1 (TNR-25) et le
formatage normalisé des citations sourcées [Document, p.X] (TNR-14).
"""

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, replace
from typing import Any

from app.domain.ports.hybrid_search import HybridChunkResult


def classify_thermal_status(score: float) -> str:
    """
    Détermine la classe thermique d'un score de similarité cosinus :
    - >= 0.85 : 'emerald' (Émeraude vif — pertinence maximale)
    - 0.70 à 0.849 : 'cyan' (Cyan / Vert d'eau — pertinence forte)
    - 0.60 à 0.699 : 'amber' (Ambre — pertinence modérée)
    - < 0.60 : 'rose' (Rose / Rouge — pertinence faible ou hors seuil)
    """
    clamped = max(0.0, min(1.0, float(score)))
    if clamped >= 0.85:
        return "emerald"
    if clamped >= 0.70:
        return "cyan"
    if clamped >= 0.60:
        return "amber"
    return "rose"


def format_citation_label(document_name: str, page_number: int | None = None) -> str:
    """
    Génère le label normalisé de citation selon la spécification TNR-14 :
    Format impératif : [Nom_Document, p.X]
    """
    clean_name = document_name.strip() if document_name else "Document"
    page = page_number if (page_number is not None and page_number > 0) else 1
    return f"[{clean_name}, p.{page}]"


@dataclass(frozen=True)
class RerankedChunk:
    """
    Fragment documentaire enrichi après passage par le modèle Cross-Encoder.
    Comporte le score de re-ranking, le statut thermique, le Delta Top-1 et
    la certification d'intégrité cryptographique SHA-256.
    """
    id: uuid.UUID
    document_id: uuid.UUID
    version_id: uuid.UUID
    chunk_index: int
    content: str
    document_name: str = "Document"
    context_prefix: str | None = None
    section_title: str | None = None
    sha256_hash: str = ""
    token_count: int = 0
    page_number: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    cosine_score: float = 0.0
    rerank_score: float = 0.0
    delta_top1: float = 0.0
    thermal_status: str = "rose"
    citation_label: str = ""
    is_certified: bool = True
    rank: int = 1


def calculate_top1_deltas(chunks: list[RerankedChunk]) -> list[RerankedChunk]:
    """
    Calcule le Delta Top-1 pour chaque citation selon TNR-25 :
    Delta = round(score - score_top1, 3).
    Pour le Top-1 : Delta = 0.000.
    Pour les rangs suivants : Delta <= 0.000.
    """
    if not chunks:
        return []

    top1_score = chunks[0].cosine_score
    updated_chunks: list[RerankedChunk] = []

    for idx, c in enumerate(chunks, start=1):
        delta = round(c.cosine_score - top1_score, 3)
        updated_chunks.append(
            replace(
                c,
                delta_top1=delta,
                rank=idx,
                thermal_status=classify_thermal_status(c.cosine_score),
            )
        )

    return updated_chunks


class RerankerPort(ABC):
    """
    Port secondaire pour l'ordonnancement par Cross-Encoder (bge-reranker-base)
    et l'enrichissement télémétrique des citations.
    """

    @abstractmethod
    async def rerank(
        self,
        query: str,
        chunks: list[HybridChunkResult | dict[str, Any]],
        top_k: int = 5,
        min_threshold: float = 0.0,
    ) -> list[RerankedChunk]:
        """
        Réordonne les fragments candidats selon la pertinence croisée avec la requête.
        """
