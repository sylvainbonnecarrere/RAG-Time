"""
Tests d'Intégration API REST — /api/v1/tenants/{id}/presets (US-BACK-03 & US-BACK-10)
Vérifie la gestion des presets nommés, le commutateur par défaut et la double barrière TNR-18.
"""

import uuid
from decimal import Decimal
import pytest
import httpx
from httpx import ASGITransport
from sqlalchemy import text

from app.main import app
from app.core.database import get_tenant_session


@pytest.mark.asyncio
async def test_presets_api_lifecycle_and_set_default():
    """Valide la création, la permutation par défaut et les contraintes TNR-28."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Créer un tenant de test
        t_res = await client.post(
            "/api/v1/tenants",
            json={
                "name": "Espace Test Presets",
                "slug": f"test-presets-{uuid.uuid4().hex[:6]}",
                "system_prompt": "Prompt test",
            }
        )
        assert t_res.status_code == 201
        tenant_id = t_res.json()["id"]

        # 2. Créer un preset valide
        preset_payload = {
            "name": "Audit Financier Ultra-Fin",
            "chunk_size": 256,
            "chunk_overlap": 32,
            "similarity_threshold": 0.850,
            "retrieval_top_k": 4,
            "is_active": False,
        }
        create_res = await client.post(f"/api/v1/tenants/{tenant_id}/presets", json=preset_payload)
        assert create_res.status_code == 201
        new_preset_id = create_res.json()["id"]

        # 3. Commuter ce preset comme actif par défaut
        set_def_res = await client.put(f"/api/v1/tenants/{tenant_id}/presets/{new_preset_id}/set-default")
        assert set_def_res.status_code == 200
        assert set_def_res.json()["is_active"] is True

        # Vérifier que les autres presets sont passés à is_active = False
        all_presets_res = await client.get(f"/api/v1/tenants/{tenant_id}/presets")
        assert all_presets_res.status_code == 200
        for p in all_presets_res.json():
            if p["id"] == new_preset_id:
                assert p["is_active"] is True
            else:
                assert p["is_active"] is False


@pytest.mark.asyncio
async def test_tnr_18_preset_frozen_via_api():
    """
    Validation TNR-18 via API REST :
    Un domaine avec document_chunks alimenté rejette la modification in-place avec HTTP 409 Conflict.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Créer un tenant
        t_res = await client.post(
            "/api/v1/tenants",
            json={
                "name": "Espace Alimenté TNR18",
                "slug": f"tnr18-{uuid.uuid4().hex[:6]}",
                "system_prompt": "Prompt",
            }
        )
        assert t_res.status_code == 201
        tenant_id = t_res.json()["id"]

        # Récupérer les presets existants
        presets_res = await client.get(f"/api/v1/tenants/{tenant_id}/presets")
        preset_id = presets_res.json()[0]["id"]

        # 2. Alimenter l'espace avec 1 document et 1 chunk sous le contexte tenant
        async with get_tenant_session(uuid.UUID(tenant_id)) as session:
            doc_id = uuid.uuid4()
            ver_id = uuid.uuid4()
            chunk_id = uuid.uuid4()

            await session.execute(
                text("INSERT INTO documents (id, tenant_id, name, file_type, extraction_method) VALUES (:id, :t_id, 'Test.pdf', 'pdf', 'native');"),
                {"id": str(doc_id), "t_id": tenant_id}
            )
            await session.execute(
                text("INSERT INTO document_versions (id, document_id, version_number, sha256_checksum, file_size_bytes, storage_path) VALUES (:id, :d_id, 1, :sha, 100, '/p');"),
                {"id": str(ver_id), "d_id": str(doc_id), "sha": "a"*64}
            )
            dummy_vec = "[" + ",".join(["0.01"] * 768) + "]"
            await session.execute(
                text("INSERT INTO document_chunks (id, document_id, version_id, tenant_id, chunk_index, content, sha256_hash, token_count, embedding) VALUES (:id, :d_id, :v_id, :t_id, 0, 'Texte', :sha, 10, CAST(:vec AS vector));"),
                {"id": str(chunk_id), "d_id": str(doc_id), "v_id": str(ver_id), "t_id": tenant_id, "sha": "b"*64, "vec": dummy_vec}
            )

        # 3. Tenter de modifier le chunk_size du preset via l'API REST -> DOIT RENVOYER HTTP 409 CONFLICT
        fail_res = await client.put(
            f"/api/v1/tenants/{tenant_id}/presets/{preset_id}",
            json={"chunk_size": 256}
        )
        assert fail_res.status_code == 409
        err = fail_res.json().get("detail", {})
        assert err.get("code") == "CANNOT_MODIFY_FROZEN_PRESET"
