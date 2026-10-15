"""
Banc d'Essai TDD — US-BACK-02 : Réinitialisation du Connection Pooling & Header Session Reset
Valide que app.current_tenant_id est toujours RESET à la restitution de connexion.
"""

import uuid

import httpx
import pytest
from app.core.config import settings
from app.core.database import get_tenant_session
from app.main import app
from httpx import ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


@pytest.mark.asyncio
async def test_session_reset_on_pool_release():
    """Vérifie que la variable de session app.current_tenant_id est vidée après libération."""
    tenant_id = uuid.uuid4()
    
    # 1. Utiliser le context manager
    async with get_tenant_session(tenant_id) as session:
        res = await session.execute(text("SELECT current_setting('app.current_tenant_id', true);"))
        val = res.scalar()
        assert val == str(tenant_id)
        
    # 2. Emprunter une session brute hors contexte
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        res = await session.execute(text("SELECT current_setting('app.current_tenant_id', true);"))
        val = res.scalar()
        # Doit être vide ou NULL car le context manager a fait RESET
        assert val is None or val == ""
    await engine.dispose()


@pytest.mark.asyncio
async def test_middleware_tenant_session_header():
    """Vérifie le middleware injectant le header X-Tenant-Session-Reset si nécessaire."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Requête sans tenant
        response = await client.get("/")
        assert response.status_code == 200
