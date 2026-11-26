"""
RAGTIME Backend API — Routeur Principal v1
Agrège l'ensemble des endpoints REST des ressources souveraines.
"""

from app.api.v1.endpoints import auth, chat, documents, presets, tenants
from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")

# Enregistrement des sous-routeurs
api_v1_router.include_router(auth.router)
api_v1_router.include_router(tenants.router)
api_v1_router.include_router(presets.router)
api_v1_router.include_router(documents.router)
api_v1_router.include_router(chat.router)
