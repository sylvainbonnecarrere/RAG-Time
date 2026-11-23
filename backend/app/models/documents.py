"""
RAGTIME Backend — Modèles SQLModel Document et DocumentVersion (TNR-03 Immuabilité)
Fournit également les DTOs Pydantic pour l'upload multipart, le web-scrape et les jobs ARQ.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, HttpUrl
from sqlmodel import JSON, Column, Field, SQLModel


class DocumentBase(SQLModel):
    name: str = Field(max_length=255, description="Nom d'origine du fichier")
    file_type: str = Field(max_length=32, description="Type: pdf, markdown, sql, txt, html_url")
    source_url: str | None = Field(default=None, description="URL source si web scrape")
    extraction_method: str = Field(default="native_parser", max_length=64)
    description: str | None = Field(default=None)
    current_version: int = Field(default=1, description="Version active du document")
    total_chunks: int = Field(default=0, description="Nombre cumulé de chunks actifs")


class Document(DocumentBase, table=True):
    __tablename__ = "documents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True, nullable=False)
    cleaning_stats: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DocumentVersionBase(SQLModel):
    version_number: int = Field(description="Numéro séquentiel v1, v2...")
    sha256_checksum: str = Field(max_length=64, description="Empreinte SHA-256 certifiée")
    file_size_bytes: int = Field(description="Taille du fichier en octets")
    chunks_count: int = Field(default=0)
    status: str = Field(default="indexed", max_length=32)
    storage_path: str = Field(description="Chemin interne sur disque ou volume sécurisé")


class DocumentVersion(DocumentVersionBase, table=True):
    __tablename__ = "document_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DocumentVersionRead(DocumentVersionBase):
    id: uuid.UUID
    document_id: uuid.UUID
    created_at: datetime


class DocumentRead(DocumentBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    cleaning_stats: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    versions: list[DocumentVersionRead] = Field(default_factory=list)


# =========================================================================
# DTOs pour Ingestion Asynchrone ARQ, Upload Multipart & Web Scrape
# =========================================================================

class IngestionJobRead(BaseModel):
    job_id: uuid.UUID
    tenant_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    version: int
    status: str = "pending"
    progress_pct: int = 0
    step_description: str = "Enregistré en file d'ingestion asynchrone ARQ"
    sha256: str
    created_at: datetime


class DocumentUploadResponse(BaseModel):
    document: DocumentRead
    job: IngestionJobRead


class DocumentScrapeRequest(BaseModel):
    url: HttpUrl
    description: str | None = None


# =========================================================================
# DTOs pour Simulation Dry-Run Pré-Indexation (US-BACK-07 & TNR-29)
# =========================================================================

class DryRunSimulationRequest(BaseModel):
    text: str
    strategy: str | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None
    prefix_section_title: bool | None = None


class DryRunChunkPreviewDTO(BaseModel):
    chunk_index: int
    token_count: int
    char_count: int
    context_prefix: str | None = None
    excerpt: str


class TokenHistogramDTO(BaseModel):
    median_tokens: float
    percentile_25: float
    percentile_75: float
    bucket_less_than_60: int = 0
    bucket_60_to_150: int = 0
    bucket_151_to_300: int = 0
    bucket_301_to_500: int = 0
    bucket_501_to_800: int = 0
    bucket_more_than_800: int = 0


class SemanticAuditDTO(BaseModel):
    under_chunked_count: int
    over_chunked_count: int
    is_balanced: bool
    diagnostic: str


class DryRunSimulationResponse(BaseModel):
    total_chunks: int
    total_tokens: int
    avg_tokens_per_chunk: float
    min_tokens: int
    max_tokens: int
    raw_vector_bytes: int
    hnsw_overhead_bytes: int
    total_vram_bytes: int
    preview_chunks: list[DryRunChunkPreviewDTO]
    histogram: TokenHistogramDTO | None = None
    semantic_audit: SemanticAuditDTO | None = None


