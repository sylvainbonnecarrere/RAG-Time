"""
Tests Unitaires des Endpoints / et /health du Backend (US-DEVOPS-02 / US-DEVOPS-04)
"""

import pytest


@pytest.mark.asyncio
async def test_root_endpoint(async_client):
    res = await async_client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["app"] == "RAGTIME"
    assert data["status"] == "operational"


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client):
    res = await async_client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "services" in data
    assert "fastapi" in data["services"]
    assert data["services"]["fastapi"] == "healthy"
