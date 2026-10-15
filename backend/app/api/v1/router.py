"""
RAGTIME Backend API — Routeur Principal v1
Agrège l'ensemble des endpoints REST des ressources souveraines.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import tenants, presets

api_v1_router = APIRouter(prefix="/api/v1")

# Enregistrement des sous-routeurs
api_v1_router.include_router(tenants.router)
api_v1_router.include_router(presets.router)
