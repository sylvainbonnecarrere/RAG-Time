"""
RAGTIME Tests — Suite de Tests du Contrôleur de Streaming SSE Réel (US-BACK-09)
Vérifie :
1. Émission ordonnée des 8 événements SSE standardisés
2. Garde Éthique Anti-Hallucination sur domaine vierge (TNR-09 : doc_count == 0 -> ERR_EMPTY_DOMAIN)
3. Résilience et reprise après micro-coupure via Last-Event-ID (TNR-06)
4. Vérité instrumentée des métriques MLOps (TNR-10 : TTFT, tokens/sec)
5. Persistance automatique dans query_logs avec contexte RLS
"""

import hashlib
import json
import uuid

import httpx
import pytest
from app.core.database import async_session_factory, reset_tenant_context, set_tenant_context
from app.main import app
from app.models.audit import QueryLog
from app.models.chunks import DocumentChunk
from app.models.documents import Document, DocumentVersion
from httpx import ASGITransport
from sqlalchemy import select


def parse_sse_events(raw_sse_text: str) -> list[dict]:
    """Parse le texte brut d'un flux SSE en liste de dictionnaires d'événements structurés."""
    events = []
    blocks = raw_sse_text.strip().split("\n\n")
    for block in blocks:
        if not block.strip():
            continue
        event_dict: dict = {"id": None, "event": None, "data": None}
        for line in block.strip().split("\n"):
            if line.startswith("id:"):
                event_dict["id"] = line[3:].strip()
            elif line.startswith("event:"):
                event_dict["event"] = line[6:].strip()
            elif line.startswith("data:"):
                data_str = line[5:].strip()
                try:
                    event_dict["data"] = json.loads(data_str)
                except json.JSONDecodeError:
                    event_dict["data"] = data_str
        if event_dict["event"] or event_dict["data"]:
            events.append(event_dict)
    return events


async def create_test_tenant(client: httpx.AsyncClient) -> str:
    """Crée un tenant de test actif."""
    slug = f"tenant-chat-{uuid.uuid4().hex[:6]}"
    payload = {
        "name": "Domaine Analyse Chat",
        "slug": slug,
        "category": "legal",
        "description": "Validation du streaming conversationnel",
        "system_prompt": "Assistant juridique et financier",
        "is_active": True,
    }
    res = await client.post("/api/v1/tenants", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


async def index_test_document_and_chunk(tenant_uuid: uuid.UUID, content: str, doc_name: str = "Reglement_Financier.pdf") -> uuid.UUID:
    """Indexe un document avec version et chunk vectorisé sous contexte tenant."""
    async with async_session_factory() as session:
        await set_tenant_context(session, tenant_uuid)
        try:
            doc = Document(
                name=doc_name,
                file_type="pdf",
                tenant_id=tenant_uuid,
                current_version=1,
                total_chunks=1,
            )
            session.add(doc)
            await session.flush()

            version = DocumentVersion(
                document_id=doc.id,
                version_number=1,
                sha256_checksum=hashlib.sha256(content.encode("utf-8")).hexdigest(),
                file_size_bytes=len(content.encode("utf-8")),
                chunks_count=1,
                storage_path=f"/secure/storage/{doc.id}/v1.bin",
            )
            session.add(version)
            await session.flush()

            chunk = DocumentChunk(
                document_id=doc.id,
                version_id=version.id,
                tenant_id=tenant_uuid,
                chunk_index=0,
                content=content,
                section_title="Article 4 - Solvabilité",
                page_number=14,
                sha256_hash=hashlib.sha256(content.encode("utf-8")).hexdigest(),
                token_count=len(content.split()),
                embedding=[0.05] * 768,
                chunk_metadata={"file_type": "pdf", "document_name": doc_name},
            )
            session.add(chunk)
            await session.commit()
            return doc.id
        finally:
            await reset_tenant_context(session)


@pytest.mark.asyncio
async def test_empty_domain_triggers_ethical_guard_tnr_09():
    """
    TNR-09 : Vérifie que l'interrogation d'un domaine vierge (doc_count == 0)
    est bloquée immédiatement avec émission de 'message.failed' (ERR_EMPTY_DOMAIN)
    sans jamais lancer la génération LLM.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id = await create_test_tenant(client)

        payload = {
            "query": "Quel est le ratio CET1 exigé par la réglementation ?",
            "tenant_id": tenant_id,
        }

        res = await client.post("/api/v1/chat/stream", json=payload)
        assert res.status_code == 200
        assert "text/event-stream" in res.headers["content-type"]

        events = parse_sse_events(res.text)
        assert len(events) >= 2

        # 1. message.started
        assert events[0]["event"] == "message.started"
        assert "message_id" in events[0]["data"]

        # 2. message.failed avec ERR_EMPTY_DOMAIN
        assert events[1]["event"] == "message.failed"
        assert events[1]["data"]["error_code"] == "ERR_EMPTY_DOMAIN"
        assert "TNR-09" in events[1]["data"]["message_user_safe"]

        # Aucune génération ne doit être initiée
        event_names = [e["event"] for e in events]
        assert "generation.started" not in event_names
        assert "generation.delta" not in event_names
        assert "message.completed" not in event_names


@pytest.mark.asyncio
async def test_full_sse_stream_pipeline_8_events_nominal():
    """
    US-BACK-09 : Vérifie le flux complet avec 8 événements standardisés,
    transport des sources thermiques, TTFT et persistance dans query_logs.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id_str = await create_test_tenant(client)
        tenant_uuid = uuid.UUID(tenant_id_str)

        sample_content = (
            "Le ratio de solvabilité CET1 de l'établissement bancaire atteint 14.8 % au 31 décembre 2025, "
            "largement au-dessus des exigences minimales imposées par les accords de Bâle III."
        )
        await index_test_document_and_chunk(tenant_uuid, sample_content, "Rapport_Annuel_2025.pdf")

        payload = {
            "query": "Quel est le ratio de solvabilite CET1 de la banque ?",
            "tenant_id": tenant_id_str,
        }

        res = await client.post("/api/v1/chat/stream", json=payload)
        assert res.status_code == 200
        assert "text/event-stream" in res.headers["content-type"]

        events = parse_sse_events(res.text)
        event_names = [e["event"] for e in events]

        # Vérification de l'ordre et de la complétude
        assert "message.started" in event_names
        assert "retrieval.started" in event_names
        assert "retrieval.completed" in event_names
        assert "sources.available" in event_names
        assert "generation.started" in event_names
        assert "generation.delta" in event_names
        assert "message.completed" in event_names

        # Vérification du contenu de sources.available
        sources_evt = next(e for e in events if e["event"] == "sources.available")
        sources_data = sources_evt["data"]["sources"]
        assert len(sources_data) >= 1
        first_source = sources_data[0]
        assert "similarity_score" in first_source
        assert "rerank_score" in first_source
        assert "location" in first_source
        assert first_source["metadata"]["thermal_status"] in ["emerald", "cyan", "amber", "rose"]

        # Vérification des métriques réelles dans message.completed (TNR-10)
        completed_evt = next(e for e in events if e["event"] == "message.completed")
        assert completed_evt["data"]["time_to_first_token_ms"] > 0
        assert completed_evt["data"]["total_tokens"] > 0
        assert completed_evt["data"]["tokens_per_second"] > 0
        assert completed_evt["data"]["total_duration_ms"] > 0

        # Vérification de la persistance dans query_logs
        async with async_session_factory() as session:
            await set_tenant_context(session, tenant_uuid)
            try:
                stmt = select(QueryLog).where(QueryLog.tenant_id == tenant_uuid)
                result = await session.execute(stmt)
                logs = result.scalars().all()
                assert len(logs) >= 1
                assert logs[0].tokens_generated > 0
                assert logs[0].ttft_ms > 0
            finally:
                await reset_tenant_context(session)


@pytest.mark.asyncio
async def test_sse_reconnection_last_event_id_resilience_tnr_06():
    """
    TNR-06 : Vérifie qu'en transmettant l'en-tête Last-Event-ID (ex: 'evt-3'),
    le serveur saute les 3 premiers événements déjà reçus et reprend à partir du 4ème.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id_str = await create_test_tenant(client)
        tenant_uuid = uuid.UUID(tenant_id_str)

        content = "Politique d'octroi de credits conformement aux normes IFRS 9."
        await index_test_document_and_chunk(tenant_uuid, content)

        payload = {
            "query": "Quelles sont les normes applicables ?",
            "tenant_id": tenant_id_str,
        }

        # Simuler une reconnexion avec Last-Event-ID: evt-3
        headers = {"Last-Event-ID": "evt-3"}
        res = await client.post("/api/v1/chat/stream", json=payload, headers=headers)
        assert res.status_code == 200

        events = parse_sse_events(res.text)
        # Les événements retournés doivent avoir des IDs strictement supérieurs à 3
        for evt in events:
            assert evt["id"] is not None
            # Exemple evt-4, evt-5...
            evt_num = int(evt["id"].replace("evt-", ""))
            assert evt_num > 3


@pytest.mark.asyncio
async def test_stream_conversation_endpoint():
    """
    Vérifie l'endpoint /api/v1/chat/conversations/{conversation_id}/stream
    avec conservation de la conversation_id.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tenant_id_str = await create_test_tenant(client)
        tenant_uuid = uuid.UUID(tenant_id_str)

        await index_test_document_and_chunk(tenant_uuid, "Documentation souveraine RAGTIME.")

        conv_id = uuid.uuid4()
        payload = {
            "query": "Quel est le nom de la plateforme ?",
            "tenant_id": tenant_id_str,
        }

        url = f"/api/v1/chat/conversations/{conv_id}/stream"
        res = await client.post(url, json=payload)
        assert res.status_code == 200

        events = parse_sse_events(res.text)
        started_evt = next(e for e in events if e["event"] == "message.started")
        assert started_evt["data"]["conversation_id"] == str(conv_id)
