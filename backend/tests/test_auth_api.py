"""
Tests d'Intégration API REST SecOps — /api/v1/auth (US-SEC-02 & TNR-13)
Vérifie la délivrance exclusive du JWT en cookie HTTP-Only, le logout et l'anti-énumération.
"""

import httpx
import pytest
from app.core.security import COOKIE_NAME
from app.main import app
from httpx import ASGITransport


@pytest.mark.asyncio
async def test_auth_login_sets_http_only_cookie_and_no_body_token():
    """
    Règle d'or TNR-13 :
    Le jeton JWT doit être déposé exclusivement en cookie HTTP-Only et ABSENT du corps JSON.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        login_payload = {
            "username": "admin@ragtime.local",
            "password": "RagTime2026!SecOps",
        }

        # 1. Connexion
        res = await client.post("/api/v1/auth/login", json=login_payload)
        assert res.status_code == 200
        body = res.json()

        # Invariant TNR-13 : Zéro token dans le corps JSON
        assert "access_token" not in body
        assert "token" not in body
        assert body["status"] == "authenticated"
        assert body["username"] == "admin@ragtime.local"

        # Vérification des attributs du cookie
        set_cookie_header = res.headers.get("set-cookie", "")
        assert COOKIE_NAME in set_cookie_header
        assert "httponly" in set_cookie_header.lower()
        assert "samesite=strict" in set_cookie_header.lower()

        # 2. Appel de /api/v1/auth/me avec les cookies reçus
        me_res = await client.get("/api/v1/auth/me")
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["authenticated"] is True
        assert me_data["username"] == "admin@ragtime.local"
        assert me_data["role"] == "admin"

        # 3. Déconnexion (Purge de session TNR-13)
        logout_res = await client.post("/api/v1/auth/logout")
        assert logout_res.status_code == 200
        assert logout_res.json()["status"] == "logged_out"

        # 4. Vérification que /api/v1/auth/me est désormais refusé
        me_after_logout = await client.get("/api/v1/auth/me")
        assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_auth_login_anti_enumeration():
    """
    Règle d'or Anti-Énumération :
    Retourne toujours un code 401 générique avec 'Identifiants invalides.'
    qu'il s'agisse d'un utilisateur inexistant ou d'un mot de passe incorrect.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # A. Utilisateur inexistant
        res_unknown = await client.post(
            "/api/v1/auth/login",
            json={"username": "inconnu@inconnu.local", "password": "BadPassword123"}
        )
        assert res_unknown.status_code == 401
        assert res_unknown.json()["detail"] == "Identifiants invalides."

        # B. Utilisateur existant mais mauvais mot de passe
        res_bad_pass = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin@ragtime.local", "password": "MauvaisMotDePasse!"}
        )
        assert res_bad_pass.status_code == 401
        assert res_bad_pass.json()["detail"] == "Identifiants invalides."
