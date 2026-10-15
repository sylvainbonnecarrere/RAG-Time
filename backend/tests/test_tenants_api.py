"""
Tests d'Intégration API REST — /api/v1/tenants (US-BACK-01 & US-BACK-12)
Vérifie le cycle de vie complet des domaines, le seeding des 3 presets usine et le garde-fou TNR-08.
"""

import uuid
import pytest
import httpx
from httpx import ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_tenants_crud_and_factory_presets():
    """Valide la création d'un tenant et la génération automatique des 3 presets usine."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        unique_slug = f"juris-defense-{uuid.uuid4().hex[:6]}"
        payload = {
            "name": "Juridique & Défense Souveraine",
            "slug": unique_slug,
            "category": "juridique",
            "description": "Domaine dédié aux affaires juridiques de souveraineté",
            "system_prompt": "Tu es un assistant juridique expert en droit souverain.",
            "is_active": True,
        }

        # 1. Création du tenant
        create_res = await client.post("/api/v1/tenants", json=payload)
        assert create_res.status_code == 201
        data = create_res.json()
        assert data["slug"] == unique_slug
        assert "id" in data
        tenant_id = data["id"]

        # 2. Vérification que les 3 presets usine ont bien été initialisés pour ce tenant
        presets_res = await client.get(f"/api/v1/tenants/{tenant_id}/presets")
        assert presets_res.status_code == 200
        presets = presets_res.json()
        assert len(presets) == 3

        names = [p["name"] for p in presets]
        assert "Équilibré et standard" in names
        assert "Précision & Citations strictes" in names
        assert "Recherche Large & Synthèse" in names

        # Vérifier que "Équilibré et standard" est le seul actif par défaut
        default_preset = next(p for p in presets if p["name"] == "Équilibré et standard")
        assert default_preset["is_active"] is True
        assert default_preset["chunk_size"] == 512
        assert default_preset["chunk_overlap"] == 64

        # 3. Récupération par ID
        get_res = await client.get(f"/api/v1/tenants/{tenant_id}")
        assert get_res.status_code == 200
        assert get_res.json()["name"] == payload["name"]

        # 4. Mise à jour du tenant
        update_res = await client.put(f"/api/v1/tenants/{tenant_id}", json={"description": "Description mise à jour"})
        assert update_res.status_code == 200
        assert update_res.json()["description"] == "Description mise à jour"


@pytest.mark.asyncio
async def test_tnr_08_cannot_delete_last_tenant():
    """
    Validation de l'invariant TNR-08 :
    Le système doit interdire formellement la suppression s'il ne reste qu'un seul tenant (fail-safe 1 domaine min).
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Lister les tenants existants
        list_res = await client.get("/api/v1/tenants")
        assert list_res.status_code == 200
        existing_tenants = list_res.json()

        # Si plus d'un tenant, on en supprime jusqu'à ce qu'il n'en reste qu'un
        while len(existing_tenants) > 1:
            target = existing_tenants.pop()
            del_res = await client.delete(f"/api/v1/tenants/{target['id']}")
            assert del_res.status_code == 204

        assert len(existing_tenants) == 1
        last_tenant_id = existing_tenants[0]["id"]

        # Tenter de supprimer le DERNIER tenant restant -> Doit échouer avec HTTP 400
        fail_res = await client.delete(f"/api/v1/tenants/{last_tenant_id}")
        assert fail_res.status_code == 400
        error_detail = fail_res.json().get("detail", {})
        assert error_detail.get("code") == "CANNOT_DELETE_LAST_TENANT"
