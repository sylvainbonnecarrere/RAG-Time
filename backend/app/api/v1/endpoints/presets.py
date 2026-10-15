"""
RAGTIME Backend API — Gestion des Presets Nommés par Domaine (US-BACK-03 & US-BACK-10)
Garantit l'immutabilité des presets scellés (TNR-18) et le contrôle d'overlap (TNR-28).
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, text
from sqlalchemy.exc import DBAPIError

from app.core.database import get_tenant_session
from app.models.presets import (
    RagPreset,
    RagPresetCreate,
    RagPresetRead,
    RagPresetUpdate,
)

router = APIRouter(prefix="/tenants/{tenant_id}/presets", tags=["Presets"])


@router.get("", response_model=List[RagPresetRead])
async def list_presets_for_tenant(tenant_id: uuid.UUID):
    """Liste tous les presets de chunking/retrieval rattachés à un espace de travail."""
    async with get_tenant_session(tenant_id) as session:
        stmt = (
            select(RagPreset)
            .where(RagPreset.tenant_id == tenant_id)
            .order_by(RagPreset.created_at.asc())
        )
        result = await session.execute(stmt)
        return result.scalars().all()


@router.post("", response_model=RagPresetRead, status_code=status.HTTP_201_CREATED)
async def create_preset(tenant_id: uuid.UUID, preset_in: RagPresetCreate):
    """
    Crée un nouveau preset nommé pour le tenant spécifié.
    Valide l'invariant TNR-28 : chunk_overlap < chunk_size / 2.
    """
    async with get_tenant_session(tenant_id) as session:
        # Si le preset est défini comme actif, désactive les autres presets existants
        if preset_in.is_active:
            await session.execute(
                update(RagPreset)
                .where(RagPreset.tenant_id == tenant_id)
                .values(is_active=False)
            )

        new_preset = RagPreset(
            tenant_id=tenant_id,
            name=preset_in.name,
            version=preset_in.version,
            is_active=preset_in.is_active,
            chunking_strategy=preset_in.chunking_strategy,
            chunk_size=preset_in.chunk_size,
            chunk_overlap=preset_in.chunk_overlap,
            similarity_threshold=preset_in.similarity_threshold,
            retrieval_top_k=preset_in.retrieval_top_k,
            rerank_enabled=preset_in.rerank_enabled,
            prefix_section_title=preset_in.prefix_section_title,
            embedding_model=preset_in.embedding_model,
            embedding_dim=preset_in.embedding_dim,
            parent_preset_id=preset_in.parent_preset_id,
        )
        session.add(new_preset)
        await session.flush()
        return new_preset


@router.get("/{preset_id}", response_model=RagPresetRead)
async def get_preset(tenant_id: uuid.UUID, preset_id: uuid.UUID):
    """Récupère un preset spécifique appartenant au tenant."""
    async with get_tenant_session(tenant_id) as session:
        preset = await session.get(RagPreset, preset_id)
        if not preset or preset.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Preset introuvable pour ce domaine."
            )
        return preset


@router.put("/{preset_id}", response_model=RagPresetRead)
async def update_preset(
    tenant_id: uuid.UUID,
    preset_id: uuid.UUID,
    preset_in: RagPresetUpdate
):
    """
    Met à jour un preset existant.
    Garantie TNR-18 (Double Barrière) :
    1. Si le domaine contient des documents indexés, refuse toute altération in-place d'embedding/chunking.
    2. Le trigger SQL trg_freeze_preset_on_ingested_docs protège également la BDD.
    """
    async with get_tenant_session(tenant_id) as session:
        preset = await session.get(RagPreset, preset_id)
        if not preset or preset.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Preset introuvable pour ce domaine."
            )

        # 1. Barrière applicative TNR-18
        chunk_count_stmt = text(
            "SELECT count(*) FROM document_chunks WHERE tenant_id = :t_id"
        )
        chunk_count_res = await session.execute(chunk_count_stmt, {"t_id": str(tenant_id)})
        chunks_count = chunk_count_res.scalar() or 0

        update_data = preset_in.model_dump(exclude_unset=True)
        fundamental_fields = {"chunk_size", "chunk_overlap", "embedding_model"}
        modifies_fundamental = any(f in update_data for f in fundamental_fields)

        if chunks_count > 0 and modifies_fundamental:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "CANNOT_MODIFY_FROZEN_PRESET",
                    "message": (
                        f"Invariant TNR-18 Scellé : Ce domaine possède déjà {chunks_count} chunks indexés. "
                        "Toute modification de taille, overlap ou modèle d'embedding in-place est formellement bloquée. "
                        "Veuillez créer une nouvelle révision de preset."
                    ),
                }
            )

        # 2. Validation TNR-28 (chunk_overlap < chunk_size / 2)
        new_size = update_data.get("chunk_size", preset.chunk_size)
        new_overlap = update_data.get("chunk_overlap", preset.chunk_overlap)
        if new_overlap >= (new_size / 2):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invariant TNR-28 Violé : chunk_overlap ({new_overlap}) doit être inférieur à chunk_size / 2 ({new_size / 2})."
            )

        for field, value in update_data.items():
            setattr(preset, field, value)

        try:
            session.add(preset)
            await session.flush()
            return preset
        except DBAPIError as err:
            if "CANNOT_MODIFY_FROZEN_PRESET" in str(err):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "CANNOT_MODIFY_FROZEN_PRESET",
                        "message": "Blocage SQL (TNR-18) : Espace de travail alimenté. Modification du preset rejetée.",
                    }
                )
            raise


@router.put("/{preset_id}/set-default", response_model=RagPresetRead)
async def set_default_preset(tenant_id: uuid.UUID, preset_id: uuid.UUID):
    """
    Désigne ce preset comme preset par défaut / actif pour le domaine
    et désactive le statut actif des autres presets du tenant.
    """
    async with get_tenant_session(tenant_id) as session:
        preset = await session.get(RagPreset, preset_id)
        if not preset or preset.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Preset introuvable pour ce domaine."
            )

        # 1. Passer tous les presets du tenant à is_active = False
        await session.execute(
            update(RagPreset)
            .where(RagPreset.tenant_id == tenant_id)
            .values(is_active=False)
        )

        # 2. Activer le preset sélectionné
        preset.is_active = True
        session.add(preset)
        await session.flush()
        return preset


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preset(tenant_id: uuid.UUID, preset_id: uuid.UUID):
    """Supprime un preset s'il n'est pas le seul restant et n'est pas le preset actif."""
    async with get_tenant_session(tenant_id) as session:
        preset = await session.get(RagPreset, preset_id)
        if not preset or preset.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Preset introuvable pour ce domaine."
            )

        count_stmt = select(func.count(RagPreset.id)).where(RagPreset.tenant_id == tenant_id)
        total_presets = (await session.execute(count_stmt)).scalar() or 0
        if total_presets <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer l'unique preset restant pour ce domaine."
            )

        if preset.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer le preset actif. Veuillez désigner un autre preset par défaut d'abord."
            )

        await session.delete(preset)
        await session.commit()
        return None
