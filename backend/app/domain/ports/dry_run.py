"""
RAGTIME Domain — Port DryRunSimulatorPort & Dataclasses d'Audit Pré-Indexation (US-IA-08)
Définit le contrat d'interface pour la simulation in-memory du partitionnement,
l'histogramme statistique des tokens et l'estimation de l'empreinte VRAM pgvector HNSW (TNR-29).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from app.domain.ports.chunker import RawChunk


@dataclass(frozen=True)
class TokenHistogram:
    """Distribution statistique de la taille des chunks en tokens."""
    total_tokens: int
    min_tokens: int
    max_tokens: int
    median_tokens: float
    avg_tokens: float
    percentile_25: float
    percentile_75: float
    bucket_less_than_60: int = 0
    bucket_60_to_150: int = 0
    bucket_151_to_300: int = 0
    bucket_301_to_500: int = 0
    bucket_501_to_800: int = 0
    bucket_more_than_800: int = 0


@dataclass(frozen=True)
class VramEstimation:
    """Estimation mathématique de l'enveloppe mémoire VRAM pour pgvector HNSW."""
    dimension: int
    raw_vector_bytes: int
    hnsw_overhead_bytes: int
    total_vram_bytes: int
    total_vram_mb: float
    requires_high_memory_gpu: bool


@dataclass(frozen=True)
class SemanticAudit:
    """Audit sémantique du partitionnement pour déjouer dilution et perte de contexte."""
    under_chunked_count: int  # Chunks < 60 tokens (risque de perte de contexte)
    over_chunked_count: int   # Chunks > 800 tokens (risque de dilution sémantique)
    is_balanced: bool
    diagnostic: str


@dataclass(frozen=True)
class DryRunAnalysis:
    """Analyse complète restituée par le simulateur pré-indexation."""
    total_chunks: int
    histogram: TokenHistogram
    vram: VramEstimation
    semantic_audit: SemanticAudit
    preview_chunks: list[RawChunk] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class DryRunSimulatorPort(ABC):
    """
    Port Hexagonal pour l'exécution d'une simulation de découpage et de dimensionnement.
    Garanti 100% sans effet de bord sur la base de données relationnelle ou vectorielle.
    """

    @abstractmethod
    def simulate(
        self,
        text: str,
        strategy: str = "fixed_sliding",
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        prefix_section_title: bool = True,
        embedding_dim: int = 768,
        preview_limit: int = 3,
    ) -> DryRunAnalysis:
        """
        Exécute la simulation en mémoire vive pure.
        """
