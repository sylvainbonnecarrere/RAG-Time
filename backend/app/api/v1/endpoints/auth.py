"""
RAGTIME Backend API — Endpoints d'Authentification Souveraine & Cookies HTTP-Only (US-SEC-02)
Délivre les jetons JWT exclusivement par cookie HTTP-Only pour éradiquer tout vol de session XSS (TNR-13).
"""

from typing import Any

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    COOKIE_HTTPONLY,
    COOKIE_NAME,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    create_access_token,
    get_password_hash,
    verify_password,
)
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["Authentification"])

# Utilisateurs de test souverains avec mots de passe pré-hachés en Argon2id ANSSI
# Mot de passe par défaut : "RagTime2026!SecOps"
DEFAULT_TEST_HASH = get_password_hash("RagTime2026!SecOps")
MOCK_USERS_DB = {
    "admin@ragtime.local": {
        "id": "u-admin-01",
        "username": "admin@ragtime.local",
        "hashed_password": DEFAULT_TEST_HASH,
        "role": "admin",
        "tenant_id": "00000000-0000-0000-0000-000000000001",
    },
    "auditeur@ragtime.local": {
        "id": "u-audit-02",
        "username": "auditeur@ragtime.local",
        "hashed_password": DEFAULT_TEST_HASH,
        "role": "auditor",
        "tenant_id": "00000000-0000-0000-0000-000000000001",
    },
}


class LoginRequest(BaseModel):
    username: str = Field(description="Nom d'utilisateur ou adresse email")
    password: str = Field(description="Mot de passe en clair")
    tenant_id: str | None = Field(default=None, description="Identifiant de tenant optionnel")


class UserSessionResponse(BaseModel):
    status: str
    username: str
    role: str
    tenant_id: str | None = None


@router.post("/login", response_model=UserSessionResponse)
async def login(login_data: LoginRequest, response: Response):
    """
    Authentifie l'utilisateur via Argon2id et dépose le jeton JWT dans un cookie HTTP-Only.
    Règle absolue TNR-13 : Aucun jeton d'accès n'est exposé dans le corps JSON de réponse.
    """
    user = MOCK_USERS_DB.get(login_data.username)

    # Réponse uniforme anti-énumération en cas d'identifiant introuvable ou mot de passe erroné
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Construction des claims du JWT
    token_payload = {
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "tenant_id": login_data.tenant_id or user["tenant_id"],
    }
    jwt_token = create_access_token(token_payload)

    # Dépôt du cookie HTTP-Only sécurisé (Inaccessible au JavaScript du navigateur)
    max_age_seconds = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key=COOKIE_NAME,
        value=jwt_token,
        max_age=max_age_seconds,
        httponly=COOKIE_HTTPONLY,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )

    return UserSessionResponse(
        status="authenticated",
        username=user["username"],
        role=user["role"],
        tenant_id=token_payload["tenant_id"],
    )


@router.post("/logout")
async def logout(response: Response):
    """
    Révoque la session active en purgeant le cookie HTTP-Only (TNR-13).
    """
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=COOKIE_HTTPONLY,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )
    return {"status": "logged_out"}


@router.get("/me", response_model=dict[str, Any])
async def get_me(current_user: dict[str, Any] = Depends(get_current_user)):
    """
    Restitue l'identité et les privilèges de la session courante issue du cookie sécurisé.
    """
    return {
        "authenticated": True,
        "user_id": current_user.get("sub"),
        "username": current_user.get("username"),
        "role": current_user.get("role"),
        "tenant_id": current_user.get("tenant_id"),
    }
