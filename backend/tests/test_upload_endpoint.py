"""
RAGTIME Tests — Suite de Tests d'Intégration de l'Upload Multipart (US-BACK-04 & TNR-03)
Vérifie :
- Code HTTP 202 Accepted et génération de DTO IngestionJobRead
- Immuabilité du versionnage v+1 en cas d'upload homonyme (TNR-03)
- Rejet de formats interdits et vérification de checksum SHA-256
"""

import hashlib
import io
import uuid

import httpx
import pytest
from app.main import app
from httpx import ASGITransport


async def create_test_tenant(client: httpx.AsyncClient) -> str:
    """Crée un tenant via l'API pour initialiser le tenant et ses presets."""
    slug = f"tenant-up-{uuid.uuid4().hex[:6]}"
    payload = {
        "name": "Tenant Upload Test",
        "slug": slug,
        "category": "tech",
        "description": "Ingénierie & Upload",
        "system_prompt": "Assistant documentaire.",
        "is_active": True,
    }
    res = await client.post("/api/v1/tenants", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


@pytest.mark.asyncio
async def test_upload_document_success_accepted_202():
    """
    Vérifie le téléversement d'un document Markdown valide :
    - Retour HTTP 202 Accepted
    - Job UUID généré
    - Document versionné en v1 et statut pending
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)

        content = b"# Document d'Architecture\n\nCe document decrit l'infrastructure souveraine."
        sha256_client = hashlib.sha256(content).hexdigest()

        files = {
            "file": ("architecture_v1.md", io.BytesIO(content), "text/markdown"),
        }
        data = {
            "sha256": sha256_client,
            "description": "Spécification technique initiale",
        }
        response = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/upload",
            files=files,
            data=data,
        )

        assert response.status_code == 202
        payload = response.json()

        assert "document" in payload
        assert "job" in payload

        doc = payload["document"]
        assert doc["name"] == "architecture_v1.md"
        assert doc["file_type"] == "markdown"
        assert doc["current_version"] == 1
        assert len(doc["versions"]) == 1
        assert doc["versions"][0]["version_number"] == 1
        assert doc["versions"][0]["sha256_checksum"] == sha256_client

        job = payload["job"]
        assert job["document_name"] == "architecture_v1.md"
        assert job["version"] == 1
        assert job["status"] == "pending"
        assert job["sha256"] == sha256_client


@pytest.mark.asyncio
async def test_upload_homonymous_increments_version_tnr_03():
    """
    Validation stricte de la règle TNR-03 :
    Le téléversement successif d'un fichier portant le même nom doit créer
    une version v+1 sans écraser la version antérieure.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)

        content_v1 = b"Contenu initial version 1"
        content_v2 = b"Contenu modifie version 2 avec ajouts"

        # 1. Premier upload -> Version 1
        res1 = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/upload",
            files={"file": ("rapport_annuel.txt", io.BytesIO(content_v1), "text/plain")},
        )
        assert res1.status_code == 202
        doc1 = res1.json()["document"]
        assert doc1["current_version"] == 1
        doc_id = doc1["id"]

        # 2. Deuxième upload du même fichier -> Version 2 (TNR-03)
        res2 = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/upload",
            files={"file": ("rapport_annuel.txt", io.BytesIO(content_v2), "text/plain")},
        )
        assert res2.status_code == 202
        doc2 = res2.json()["document"]
        assert doc2["id"] == doc_id
        assert doc2["current_version"] == 2
        assert len(doc2["versions"]) == 1
        assert doc2["versions"][0]["version_number"] == 2

        # 3. Vérification de la liste complète des documents
        res_list = await client.get(f"/api/v1/tenants/{tenant_id}/documents")
        assert res_list.status_code == 200
        docs_list = res_list.json()
        assert len(docs_list) >= 1
        target = next(d for d in docs_list if d["id"] == doc_id)
        assert target["current_version"] == 2
        # Les deux versions v1 et v2 doivent coexister sans écrasement
        version_numbers = [v["version_number"] for v in target["versions"]]
        assert 1 in version_numbers
        assert 2 in version_numbers


@pytest.mark.asyncio
async def test_upload_rejects_unauthorized_extension():
    """Vérifie le rejet HTTP 400 des extensions interdites (.exe, .sh, etc.)."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)
        content = b"#!/bin/bash\necho Malicious"
        res = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/upload",
            files={"file": ("malicious_script.sh", io.BytesIO(content), "text/plain")},
        )
        assert res.status_code == 400
        assert "non supporté" in res.json()["detail"]


@pytest.mark.asyncio
async def test_upload_rejects_sha256_checksum_mismatch():
    """Vérifie le rejet si le hash fourni par le client diffère du calcul serveur."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)
        content = b"Contenu verifie"
        fake_hash = "0" * 64
        res = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/upload",
            files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
            data={"sha256": fake_hash},
        )
        assert res.status_code == 400
        assert "checksum SHA-256" in res.json()["detail"]
