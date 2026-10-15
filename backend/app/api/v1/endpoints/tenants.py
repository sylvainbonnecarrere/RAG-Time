"""
RAGTIME Backend API — Gestion du Cycle de Vie des Tenants / Domaines (US-BACK-01 & US-BACK-12)
Fournit les endpoints CRUD complets, le seeding des 3 presets usine et le garde-fou TNR-08.
"""

import uuid
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.core.database import get_db_session, get_tenant_session
from app.models.tenants import Tenant, TenantCreate, TenantRead, TenantUpdate
from app.models.presets import RagPreset

router = APIRouter(prefix="/tenants", tags=["Tenants"])

# Définition des 3 presets d'usine souverains
FACTORY_PRESETS = [
    {
        "name": "Équilibré et standard",
        "chunk_size": 512,
        "chunk_overlap": 64,
        "similarity_threshold": Decimal("0.700"),
        "retrieval_top_k": 5,
        "is_active": True,
        "chunking_strategy": "fixed_sliding",
        "rerank_enabled": True,
        "prefix_section_title": True,
        "embedding_model": "nomic-embed-text-v1.5",
        "embedding_dim": 768,
    },
    {
        "name": "Précision & Citations strictes",
        "chunk_size": 384,
        "chunk_overlap": 48,
        "similarity_threshold": Decimal("0.820"),
        "retrieval_top_k": 3,
        "is_active": False,
        "chunking_strategy": "semantic_markdown",
        "rerank_enabled": True,
        "prefix_section_title": True,
        "embedding_model": "nomic-embed-text-v1.5",
        "embedding_dim": 768,
    },
    {
        "name": "Recherche Large & Synthèse",
        "chunk_size": 1024,
        "chunk_overlap": 128,
        "similarity_threshold": Decimal("0.620"),
        "retrieval_top_k": 8,
        "is_active": False,
        "chunking_strategy": "fixed_sliding",
        "rerank_enabled": False,
        "prefix_section_title": True,
        "embedding_model": "nomic-embed-text-v1.5",
        "embedding_dim": 768,
    },
]


@router.get("", response_model=List[TenantRead])
async def list_tenants(session: AsyncSession = Depends(get_db_session)):
    """Récupère l'intégralité des espaces de travail / tenants disponibles."""
    stmt = select(Tenant).order_by(Tenant.created_at.asc())
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_in: TenantCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """
    Crée un nouvel espace de travail / tenant et initialise automatiquement
    les 3 presets types d'usine sous son contexte RLS propre.
    """
    # Vérification d'unicité du slug
    existing = await session.execute(select(Tenant).where(Tenant.slug == tenant_in.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un domaine avec le slug '{tenant_in.slug}' existe déjà."
        )

    # 1. Création du tenant
    new_tenant = Tenant(
        name=tenant_in.name,
        slug=tenant_in.slug,
        category=tenant_in.category,
        description=tenant_in.description,
        system_prompt=tenant_in.system_prompt,
        is_active=tenant_in.is_active,
    )
    session.add(new_tenant)
    await session.commit()
    await session.refresh(new_tenant)

    # 2. Seeding des 3 presets usine sous le contexte RLS du nouveau tenant
    async with get_tenant_session(new_tenant.id) as tenant_sess:
        for preset_data in FACTORY_PRESETS:
            preset = RagPreset(
                tenant_id=new_tenant.id,
                name=preset_data["name"],
                chunk_size=preset_data["chunk_size"],
                chunk_overlap=preset_data["chunk_overlap"],
                similarity_threshold=preset_data["similarity_threshold"],
                retrieval_top_k=preset_data["retrieval_top_k"],
                is_active=preset_data["is_active"],
                chunking_strategy=preset_data["chunking_strategy"],
                rerank_enabled=preset_data["rerank_enabled"],
                prefix_section_title=preset_data["prefix_section_title"],
                embedding_model=preset_data["embedding_model"],
                embedding_dim=preset_data["embedding_dim"],
            )
            tenant_sess.add(preset)

    return new_tenant


@router.get("/{tenant_id}", response_model=TenantRead)
async def get_tenant(
    tenant_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """Récupère les détails d'un tenant spécifique par son identifiant unique."""
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Espace de travail introuvable."
        )
    return tenant


@router.put("/{tenant_id}", response_model=TenantRead)
async def update_tenant(
    tenant_id: uuid.UUID,
    tenant_in: TenantUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Met à jour les paramètres généraux d'un espace de travail."""
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Espace de travail introuvable."
        )

    update_data = tenant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session)
):
    """
    Supprime un espace de travail en cascade.
    Règle bloquante TNR-08 : Rejette la suppression s'il ne reste qu'un seul domaine (fail-safe 1 domaine min).
    """
    # 1. Contrôle du nombre total de tenants
    count_stmt = select(func.count(Tenant.id))
    count_res = await session.execute(count_stmt)
    total_tenants = count_res.scalar() or 0

    if total_tenants <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CANNOT_DELETE_LAST_TENANT",
                "message": "Opération interdite (TNR-08) : Impossible de supprimer le dernier espace de travail souverain."
            }
        )

    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Espace de travail introuvable."
        )

    # 2. Suppression en cascade
    await session.delete(tenant)
    await session.commit()
    return None
