"""
Configuration Pytest pour le Backend RAGTIME (US-DEVOPS-04)
Fournit les fixtures asynchrones pour tester l'API FastAPI et le Fast-Mock Ollama.
"""

import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport

from app.main import app
from tests.mocks.ollama_mock import FastMockOllamaClient


@pytest.fixture
def mock_ollama():
    """Fournit une instance du Fast-Mock Ollama déterministe."""
    return FastMockOllamaClient()


@pytest_asyncio.fixture
async def async_client():
    """Client HTTP asynchrone pointant sur l'application FastAPI en mémoire (ASGI)."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture(autouse=True)
async def cleanup_database_connections():
    """Garantit la libération et fermeture propre des connexions après chaque test."""
    yield
    from app.core.database import engine
    await engine.dispose()
