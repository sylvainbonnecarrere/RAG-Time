"""
RAGTIME Backend — Modèle SQLModel QueryLog (Télémétrie MLOps & Audit)
"""

import uuid
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class QueryLogBase(SQLModel):
    query_text: str = Field(description="Requête textuelle brute soumise par l'utilisateur")
    response_preview: str | None = Field(default=None, description="Aperçu des 200 premiers caractères de la réponse")
    ttft_ms: float = Field(description="Time To First Token en millisecondes")
    total_time_ms: float = Field(description="Durée totale d'inférence en millisecondes")
    tokens_generated: int = Field(default=0, description="Nombre total de tokens émis par le LLM")
    chunks_retrieved_count: int = Field(default=0, description="Nombre de chunks injectés dans le prompt")
    top_similarity_score: float | None = Field(default=None, description="Score cosinus du Top-1")
    avg_similarity_score: float | None = Field(default=None, description="Moyenne des scores des chunks")


class QueryLog(QueryLogBase, table=True):
    __tablename__ = "query_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenants.id", index=True, nullable=False)
    preset_id: uuid.UUID | None = Field(default=None, foreign_key="rag_presets.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class QueryLogCreate(QueryLogBase):
    tenant_id: uuid.UUID
    preset_id: uuid.UUID | None = None


class QueryLogRead(QueryLogBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    preset_id: uuid.UUID | None
    created_at: datetime
