"""
RAGTIME Backend — Modèle SQLModel DocumentChunk avec pgvector vector(768)
Stocke les vecteurs d'embeddings nomic-embed-text et les métadonnées JSONB indexées GIN.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlmodel import SQLModel, Field, JSON, Column
from pgvector.sqlalchemy import Vector


class ChunkMetadata(SQLModel):
    page: Optional[int] = None
    section: Optional[str] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    clean_duration_ms: Optional[float] = None
    custom: Optional[Dict[str, Any]] = None


class DocumentChunkBase(SQLModel):
    chunk_index: int = Field(description="Index séquentiel du chunk dans le document")
    content: str = Field(description="Texte brut normalisé NFC du chunk")
    context_prefix: Optional[str] = Field(default=None, description="Titre parent ou breadcrumb hiérarchique")
    strategy_used: str = Field(default="fixed_sliding", max_length=32)
    section_title: Optional[str] = Field(default=None, max_length=255)
    sha256_hash: str = Field(max_length=64, description="Hash SHA-256 du texte brut du chunk")
    token_count: int = Field(description="Nombre réel de tokens mesuré")
    page_number: Optional[int] = Field(default=None)


class DocumentChunk(DocumentChunkBase, table=True):
    __tablename__ = "document_chunks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True, nullable=False)
    version_id: uuid.UUID = Field(foreign_key="document_versions.id", index=True, nullable=False)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True, nullable=False)
    
    # Colonne vector(768) compatible nomic-embed-text
    embedding: List[float] = Field(sa_column=Column(Vector(768), nullable=False))
    
    # Colonne JSON nommée "metadata" en base de données PostgreSQL
    chunk_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column("metadata", JSON, nullable=False)
    )
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentChunkRead(DocumentChunkBase):
    id: uuid.UUID
    document_id: uuid.UUID
    version_id: uuid.UUID
    tenant_id: uuid.UUID
    chunk_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
