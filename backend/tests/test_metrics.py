"""
Tests Unitaires des Métriques Prometheus & Scraping (US-DEVOPS-06 / TNR-10)
Vérifie la présence et la véracité des métriques TTFT, débit et VRAM sur /metrics.
"""

import pytest
from app.core.metrics import record_ttft, record_tokens_per_sec, record_vram_usage, update_service_health


@pytest.mark.asyncio
async def test_metrics_instrumentation_and_endpoint(async_client):
    # Enregistrement de mesures réelles
    record_ttft(0.42)
    record_tokens_per_sec(38.5)
    record_vram_usage(8589934592) # 8 Go
    update_service_health("fastapi", True)

    # Appel de l'endpoint /metrics
    res = await async_client.get("/metrics")
    assert res.status_code == 200
    content = res.text

    # Vérification des définitions standard Prometheus
    assert "ragtime_ttft_seconds" in content
    assert "ragtime_tokens_per_second" in content
    assert "ragtime_vram_usage_bytes" in content
    assert "ragtime_service_health" in content

    # Vérification des valeurs enregistrées
    assert "ragtime_tokens_per_second 38.5" in content
    assert "ragtime_vram_usage_bytes 8.589934592e+09" in content or "8589934592" in content
