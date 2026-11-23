"""
RAGTIME Tests — Suite de Tests d'Intégration du Web Scrape & Anti-SSRF (US-BACK-05)
Vérifie :
- Code HTTP 202 Accepted lors de la soumission d'une URL sécurisée
- Blocage formel des requêtes Anti-SSRF (127.0.0.1, RFC 1918, 169.254.169.254)
- Création du document html_url sous isolation tenant RLS
"""

import uuid

import httpx
import pytest
from app.main import app
from httpx import ASGITransport


async def create_test_tenant(client: httpx.AsyncClient) -> str:
    """Crée un tenant via l'API pour initialiser le tenant et ses presets."""
    slug = f"tenant-sc-{uuid.uuid4().hex[:6]}"
    payload = {
        "name": "Tenant Scrape Test",
        "slug": slug,
        "category": "tech",
        "description": "Ingénierie & Scrape",
        "system_prompt": "Assistant documentaire.",
        "is_active": True,
    }
    res = await client.post("/api/v1/tenants", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


@pytest.mark.asyncio
async def test_scrape_endpoint_success_on_safe_url():
    """Vérifie l'enrôlement ARQ lors d'une URL externe sécurisée."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)
        payload = {
            "url": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006419288",
            "description": "Article Code Civil",
        }
        res = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/scrape",
            json=payload,
        )

        assert res.status_code == 202
        data = res.json()

        assert "document" in data
        assert "job" in data

        doc = data["document"]
        assert doc["file_type"] == "html_url"
        assert doc["source_url"] == payload["url"]
        assert doc["extraction_method"] == "trafilatura_2.0"

        job = data["job"]
        assert job["status"] == "pending"
        assert "ARQ" in job["step_description"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "forbidden_url",
    [
        "http://127.0.0.1:8000/api/v1/auth/me",
        "http://localhost:5432/",
        "http://10.0.0.1/admin",
        "http://192.168.1.1/router",
        "http://172.16.0.5/internal",
        "http://169.254.169.254/latest/meta-data/",
        "http://0.0.0.0:8000/",
    ],
)
async def test_scrape_endpoint_blocks_ssrf_attacks(
    forbidden_url: str,
):
    """
    Validation de sécurité anti-SSRF bloquante :
    Toute tentative d'accès à des ressources internes, cloud metadata ou bouclage
    doit être interceptée et rejetée avec HTTP 400.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)
        res = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/scrape",
            json={"url": forbidden_url},
        )
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert "Anti-SSRF" in detail or "non sécurisée" in detail
