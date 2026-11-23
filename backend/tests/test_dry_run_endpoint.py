"""
RAGTIME Tests — Suite de Tests pour le Simulateur Dry-Run Pré-Indexation (US-BACK-07 & TNR-29)
Vérifie :
- Code HTTP 200 OK avec calculs exacts de tokens, chunks et budget VRAM (HNSW 768d)
- Invariant strict TNR-29 : Zéro écriture SQL en base (zéro document, zéro chunk)
- Invariant TNR-28 : Rejet si chunk_overlap >= chunk_size / 2
- Déduction automatique des paramètres depuis le preset actif du tenant si non fournis
"""

import uuid

import httpx
import pytest
from app.core.database import get_tenant_session
from app.main import app
from app.models.chunks import DocumentChunk
from app.models.documents import Document
from httpx import ASGITransport
from sqlalchemy import func, select


async def create_test_tenant(client: httpx.AsyncClient) -> str:
    """Crée un tenant de test via l'API REST."""
    slug = f"tenant-dryrun-{uuid.uuid4().hex[:6]}"
    payload = {
        "name": "Tenant Dry-Run Test",
        "slug": slug,
        "category": "tech",
        "description": "Validation Dry-Run TNR-29",
        "system_prompt": "Assistant factuel souverain.",
        "is_active": True,
    }
    res = await client.post("/api/v1/tenants", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


@pytest.mark.asyncio
async def test_dry_run_simulation_success():
    """
    Vérifie l'exécution nominale du Dry-Run :
    - Retour HTTP 200 OK
    - Calcul de tokens, chunks, et budget VRAM pgvector HNSW
    - Rendu des 3 premiers fragments dans preview_chunks
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)

        sample_text = (
            "# Architecture RAGTIME\n\n"
            "Ce document détaille les spécifications d'ingestion souveraine.\n\n"
            "## Section 1 : Sécurité Anti-SSRF\n"
            "Le filtre anti-SSRF bloque toute tentative d'accès aux réseaux internes.\n\n"
            "## Section 2 : Index pgvector\n"
            "Les vecteurs sont projetés en dimension 768 et indexés en HNSW.\n"
        )

        payload = {
            "text": sample_text,
            "strategy": "fixed_sliding",
            "chunk_size": 20,
            "chunk_overlap": 5,
            "prefix_section_title": True,
        }

        res = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/dry-run",
            json=payload,
        )

        assert res.status_code == 200
        data = res.json()

        assert data["total_chunks"] >= 2
        assert data["total_tokens"] > 0
        assert data["avg_tokens_per_chunk"] > 0
        assert data["min_tokens"] <= data["max_tokens"]

        # Formule mathématique TNR-29 :
        # rawBytes = total_chunks * 768 * 4
        # hnswBytes = round(rawBytes * 1.5)
        # totalBytes = rawBytes + hnswBytes
        expected_raw = data["total_chunks"] * 768 * 4
        expected_hnsw = round(expected_raw * 1.5)
        expected_total = expected_raw + expected_hnsw

        assert data["raw_vector_bytes"] == expected_raw
        assert data["hnsw_overhead_bytes"] == expected_hnsw
        assert data["total_vram_bytes"] == expected_total

        assert len(data["preview_chunks"]) <= 3
        assert data["preview_chunks"][0]["chunk_index"] == 0
        assert "excerpt" in data["preview_chunks"][0]


@pytest.mark.asyncio
async def test_dry_run_isolation_tnr_29():
    """
    Invariant bloquant TNR-29 :
    La simulation Dry-Run s'opère 100% en mémoire vive.
    Vérification stricte qu'aucun enregistrement n'a été inséré dans
    'documents' ni dans 'document_chunks'.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)
        tenant_uuid = uuid.UUID(tenant_id)

        # Compte initial en base
        async with get_tenant_session(tenant_uuid) as session:
            count_docs_before = (
                await session.execute(
                    select(func.count(Document.id)).where(Document.tenant_id == tenant_uuid)
                )
            ).scalar_one()

            count_chunks_before = (
                await session.execute(
                    select(func.count(DocumentChunk.id)).where(DocumentChunk.tenant_id == tenant_uuid)
                )
            ).scalar_one()

        assert count_docs_before == 0
        assert count_chunks_before == 0

        # Appel du simulateur Dry-Run
        payload = {
            "text": "Un texte d'essai pour auditer l'absence totale de persistance en base.",
            "chunk_size": 50,
            "chunk_overlap": 10,
        }
        res = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/dry-run",
            json=payload,
        )
        assert res.status_code == 200

        # Vérification post-simulation : toujours zéro persistance
        async with get_tenant_session(tenant_uuid) as session:
            count_docs_after = (
                await session.execute(
                    select(func.count(Document.id)).where(Document.tenant_id == tenant_uuid)
                )
            ).scalar_one()

            count_chunks_after = (
                await session.execute(
                    select(func.count(DocumentChunk.id)).where(DocumentChunk.tenant_id == tenant_uuid)
                )
            ).scalar_one()

        assert count_docs_after == 0
        assert count_chunks_after == 0


@pytest.mark.asyncio
async def test_dry_run_rejects_overlap_violation_tnr_28():
    """Vérifie le rejet HTTP 400 si l'overlap dépasse chunk_size / 2."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)
        payload = {
            "text": "Texte d'essai",
            "chunk_size": 100,
            "chunk_overlap": 60,  # 60 >= 50 -> Rejet TNR-28
        }
        res = await client.post(
            f"/api/v1/tenants/{tenant_id}/documents/dry-run",
            json=payload,
        )
        assert res.status_code == 400
        assert "TNR-28" in res.json()["detail"]
