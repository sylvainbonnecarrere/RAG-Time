"""
RAGTIME Backend — Modèle SQLModel RagPreset (Stratégies de Retrieval & Chunking)
Garantit la contrainte TNR-28 : chunk_overlap < chunk_size / 2
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from pydantic import model_validator
from sqlmodel import Field, SQLModel


class RagPresetBase(SQLModel):
    name: str = Field(max_length=128, description="Nom unique du preset")
    version: int = Field(default=1, description="Version incrémentale du preset")
    is_active: bool = Field(default=True, description="Statut actif")
    chunking_strategy: str = Field(default="fixed_sliding", max_length=32)
    chunk_size: int = Field(default=512, ge=128, le=2048, description="Taille du chunk en tokens")
    chunk_overlap: int = Field(default=64, ge=0, description="Recouvrement entre chunks")
    similarity_threshold: Decimal = Field(default=Decimal("0.700"), ge=0.0, le=1.0, max_digits=4, decimal_places=3)
    retrieval_top_k: int = Field(default=5, ge=1, le=50, description="Nombre de chunks retournés")
    rerank_enabled: bool = Field(default=True)
    prefix_section_title: bool = Field(default=True)
    embedding_model: str = Field(default="nomic-embed-text-v1.5", max_length=64)
    embedding_dim: int = Field(default=768)
    parent_preset_id: uuid.UUID | None = Field(default=None, foreign_key="rag_presets.id")

    @model_validator(mode="after")
    def validate_overlap_ratio(self) -> "RagPresetBase":
        """Validation TNR-28 : l'overlap doit être strictement inférieur à la moitié de la taille."""
        if self.chunk_overlap >= (self.chunk_size / 2):
            raise ValueError(
                f"TNR-28 Invariant Violé: chunk_overlap ({self.chunk_overlap}) doit être inférieur à chunk_size / 2 ({self.chunk_size / 2})"
            )
        return self


class RagPreset(RagPresetBase, table=True):
    __tablename__ = "rag_presets"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RagPresetCreate(RagPresetBase):
    tenant_id: uuid.UUID | None = None


class RagPresetRead(RagPresetBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime


class RagPresetUpdate(SQLModel):
    name: str | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None
    similarity_threshold: Decimal | None = None
    retrieval_top_k: int | None = None
    rerank_enabled: bool | None = None
    prefix_section_title: bool | None = None
    embedding_model: str | None = None
