"""
RAGTIME Backend API — Dépendances d'Authentification & Sessions SecOps (US-SEC-02)
Extrait et valide le jeton de session JWT transporté exclusivement par Cookie HTTP-Only.
"""

from typing import Any

from app.core.security import COOKIE_NAME, decode_access_token
from fastapi import HTTPException, Request, status


async def get_current_user(request: Request) -> dict[str, Any]:
    """
    Extrait l'utilisateur authentifié depuis le cookie HTTP-Only sécurisé.
    Zéro token requis ou accepté depuis le localStorage côté client.
    """
    # 1. Extraction prioritaire depuis le cookie HTTP-Only
    token = request.cookies.get(COOKIE_NAME)

    # 2. Fallback d'en-tête Authorization (pour les outils d'audit ou scripts de test)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session non authentifiée. Cookie de session absent.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Validation de la signature cryptographique du JWT
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalide ou expirée.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
