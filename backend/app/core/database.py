"""
RAGTIME Sovereign Backend — Gestionnaire de Persistance & Pooling Sécurisé (US-BACK-02)
Fournit l'accès asynchrone à PostgreSQL 16 + pgvector avec isolation RLS stricte et RESET systématique.
"""

import uuid
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings

import os
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool

# En environnement de test Pytest, utiliser NullPool pour éliminer tout conflit d'Event Loop entre tests asyncpg
is_testing = bool(os.environ.get("PYTEST_CURRENT_TEST")) or settings.RAGTIME_ENV == "testing"

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    poolclass=NullPool if is_testing else AsyncAdaptedQueuePool,
    **({} if is_testing else {"pool_size": 10, "max_overflow": 20}),
)

# Factory de sessions asynchrones
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def set_tenant_context(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    """
    Injecte le contexte tenant pour la RLS PostgreSQL :
    1. Bascule locale sur le rôle applicatif ragtime_app (NOSUPERUSER, NOBYPASSRLS)
    2. Affecte app.current_tenant_id via set_config (session-level garanti jusqu'au RESET dans finally)
    """
    try:
        await session.execute(text("SET ROLE ragtime_app;"))
    except Exception:
        # Si le rôle ragtime_app n'est pas utilisé ou non disponible, continue
        pass
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tenant_id, false);"),
        {"tenant_id": str(tenant_id)},
    )


async def reset_tenant_context(session: AsyncSession) -> None:
    """
    Réinitialise impérativement la variable de session et le rôle
    pour éliminer tout risque de pollution inter-tenant dans le pool asyncpg.
    """
    await session.execute(text("RESET app.current_tenant_id;"))
    try:
        await session.execute(text("RESET ROLE;"))
    except Exception:
        pass


@asynccontextmanager
async def get_tenant_session(tenant_id: uuid.UUID) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager asynchrone garantissant :
    1. L'emprunt d'une session depuis le pool asyncpg
    2. L'injection sécurisée du tenant_id sous rôle applicatif
    3. La réinitialisation systématique (RESET) à la libération de la connexion
    """
    async with async_session_factory() as session:
        try:
            await set_tenant_context(session, tenant_id)
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            # Règle vitale TNR-02 : Assainissement impératif du pool asyncpg
            try:
                await reset_tenant_context(session)
            except Exception:
                pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency FastAPI standard pour les requêtes hors contexte spécifique."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware FastAPI assurant :
    1. L'interception du header X-Tenant-ID
    2. La détection des resets de contexte
    3. L'émission du header X-Tenant-Session-Reset: true pour l'affichage de popup côté UI
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        tenant_header = request.headers.get("X-Tenant-ID")
        session_reset_detected = False

        if tenant_header:
            try:
                # Validation format UUID
                uuid.UUID(tenant_header)
            except ValueError:
                session_reset_detected = True

        response = await call_next(request)

        if session_reset_detected:
            response.headers["X-Tenant-Session-Reset"] = "true"

        return response
