"""
RAGTIME Backend — Modèle SQLModel Tenant (Domaines d'Isolation)
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class TenantBase(SQLModel):
    name: str = Field(max_length=128, description="Nom humain du domaine")
    slug: str = Field(max_length=64, unique=True, index=True, description="Slug URL normalisé")
    category: str = Field(default="tech", max_length=64, description="Catégorie métier (sante, finance, etc.)")
    description: Optional[str] = Field(default=None, description="Description de l'usage du domaine")
    system_prompt: str = Field(description="Consignes système injectées au LLM pour ce domaine")
    is_active: bool = Field(default=True, description="Statut actif du domaine")


class Tenant(TenantBase, table=True):
    __tablename__ = "tenants"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TenantCreate(TenantBase):
    pass


class TenantRead(TenantBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TenantUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    is_active: Optional[bool] = None
