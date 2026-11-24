"""
RAGTIME Domain — Ports Hexagonaux VectorStoragePort & EmbeddingModelPort (US-IA-04)
Définit les interfaces d'embedding local 768d (nomic-embed) et d'indexation vectorielle
pgvector HNSW sous PostgreSQL 16 conformément à referenceChunkEmbed.md.
"""

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class ScoredChunk:
    """Fragment documentaire annoté de sa distance et similarité cosinus."""
    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    content: str
    similarity_score: float  # Score cosinus [0.0 - 1.0]
    cosine_distance: float   # Distance <=> pgvector (1.0 - similarity)
    context_prefix: str | None = None
    section_title: str | None = None
    sha256_hash: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    rank: int = 1


class EmbeddingModelPort(ABC):
    """Port secondaire pour la génération locale d'embeddings denses 768d."""

    @abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        """Génère un vecteur normalisé pour une chaîne unique."""

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Génère une liste de vecteurs normalisés par lot."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Dimension fixe des embeddings (768d pour nomic-embed-text-v1.5)."""


class VectorStoragePort(ABC):
    """Port secondaire pour l'indexation et la recherche vectorielle K-NN pgvector."""

    @abstractmethod
    async def search_similar(
        self,
        session: AsyncSession,
        tenant_id: uuid.UUID,
        query_vector: list[float],
        top_k: int = 5,
        threshold: float = 0.5,
    ) -> list[ScoredChunk]:
        """
        Recherche K-NN de similarité cosinus indexée en HNSW sur document_chunks.
        Filtre formellement selon le tenant_id et le seuil d'admissibilité.
        """
