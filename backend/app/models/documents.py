"""
RAGTIME Backend — Modèles SQLModel Document et DocumentVersion (TNR-03 Immuabilité)
"""

import uuid
from datetime import UTC, datetime
from typing import Any

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


class DocumentRead(DocumentBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    cleaning_stats: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


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
