"""
RAGTIME Backend API — Routeur de Streaming SSE Conversationnel (US-BACK-09)
Expose les flux temps réel /api/v1/chat/stream et /api/v1/chat/conversations/{id}/stream
avec support des 8 événements standardisés, citations thermiques et reprise sur Last-Event-ID.
"""

import uuid
from typing import Annotated

from app.services.chat_stream_service import ChatStreamRequest, ChatStreamService
from fastapi import APIRouter, Header, Request, status
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/chat", tags=["Chat & Streaming SSE"])

# Instance singleton du service de streaming conversationnel
chat_service = ChatStreamService()


@router.post(
    "/stream",
    summary="Flux SSE Conversationnel Standard (US-BACK-09)",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {
            "description": "Flux SSE émettant les 8 événements normalisés RAGTIME",
            "content": {"text/event-stream": {}},
        }
    },
)
async def stream_chat(
    request_data: ChatStreamRequest,
    request: Request,
    last_event_id: Annotated[str | None, Header(alias="Last-Event-ID")] = None,
) -> StreamingResponse:
    """
    Consomme une requête de chat et retourne un flux continu Server-Sent Events (SSE) :
    1. message.started
    2. retrieval.started
    3. retrieval.completed
    4. sources.available (citations normées et statuts thermiques)
    5. generation.started
    6. generation.delta (tokens LLM successifs)
    7. message.completed (métriques réelles MLOps)
    ou message.failed si domaine vierge (TNR-09) ou incident.
    """
    return StreamingResponse(
        chat_service.stream_chat(
            request=request_data,
            last_event_id_header=last_event_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/conversations/{conversation_id}/stream",
    summary="Flux SSE rattaché à une conversation existante (US-BACK-09)",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {
            "description": "Flux SSE ordonné rattaché à l'identifiant de conversation",
            "content": {"text/event-stream": {}},
        }
    },
)
async def stream_conversation_chat(
    conversation_id: uuid.UUID,
    request_data: ChatStreamRequest,
    request: Request,
    last_event_id: Annotated[str | None, Header(alias="Last-Event-ID")] = None,
) -> StreamingResponse:
    """
    Flux SSE spécialisé rattaché à une conversation identifiée.
    """
    # Garantit que la conversation_id du path prévaut
    request_data.conversation_id = conversation_id

    return StreamingResponse(
        chat_service.stream_chat(
            request=request_data,
            last_event_id_header=last_event_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
