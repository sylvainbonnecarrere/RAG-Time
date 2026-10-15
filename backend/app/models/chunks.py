"""
RAGTIME Backend — Modèle SQLModel DocumentChunk avec pgvector vector(768)
Stocke les vecteurs d'embeddings nomic-embed-text et les métadonnées JSONB indexées GIN.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlmodel import JSON, Column, Field, SQLModel


class ChunkMetadata(SQLModel):
    page: int | None = None
    section: str | None = None
    char_start: int | None = None
    char_end: int | None = None
    clean_duration_ms: float | None = None
    custom: dict[str, Any] | None = None


class DocumentChunkBase(SQLModel):
    chunk_index: int = Field(description="Index séquentiel du chunk dans le document")
    content: str = Field(description="Texte brut normalisé NFC du chunk")
    context_prefix: str | None = Field(default=None, description="Titre parent ou breadcrumb hiérarchique")
    strategy_used: str = Field(default="fixed_sliding", max_length=32)
    section_title: str | None = Field(default=None, max_length=255)
    sha256_hash: str = Field(max_length=64, description="Hash SHA-256 du texte brut du chunk")
    token_count: int = Field(description="Nombre réel de tokens mesuré")
    page_number: int | None = Field(default=None)


class DocumentChunk(DocumentChunkBase, table=True):
    __tablename__ = "document_chunks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True, nullable=False)
    version_id: uuid.UUID = Field(foreign_key="document_versions.id", index=True, nullable=False)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True, nullable=False)
    
    # Colonne vector(768) compatible nomic-embed-text
    embedding: list[float] = Field(sa_column=Column(Vector(768), nullable=False))
    
    # Colonne JSON nommée "metadata" en base de données PostgreSQL
    chunk_metadata: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column("metadata", JSON, nullable=False)
    )
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DocumentChunkRead(DocumentChunkBase):
    id: uuid.UUID
    document_id: uuid.UUID
    version_id: uuid.UUID
    tenant_id: uuid.UUID
    chunk_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
