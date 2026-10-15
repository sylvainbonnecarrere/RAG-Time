"""
RAGTIME Backend — Modèle SQLModel Tenant (Domaines d'Isolation)
"""

import uuid
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class TenantBase(SQLModel):
    name: str = Field(max_length=128, description="Nom humain du domaine")
    slug: str = Field(max_length=64, unique=True, index=True, description="Slug URL normalisé")
    category: str = Field(default="tech", max_length=64, description="Catégorie métier (sante, finance, etc.)")
    description: str | None = Field(default=None, description="Description de l'usage du domaine")
    system_prompt: str = Field(description="Consignes système injectées au LLM pour ce domaine")
    is_active: bool = Field(default=True, description="Statut actif du domaine")


class Tenant(TenantBase, table=True):
    __tablename__ = "tenants"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TenantCreate(TenantBase):
    pass


class TenantRead(TenantBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TenantUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    is_active: bool | None = None
