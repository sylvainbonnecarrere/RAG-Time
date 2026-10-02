"""
RAGTIME MLOps — Instrumentation Prometheus & Télémétrie Souveraine (US-DEVOPS-06)
Fournit les métriques réelles sans simulation pour satisfaire l'invariant TNR-10.
"""

from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST

# 1. Latence du Time-to-First-Token (TTFT) en secondes
TTFT_HISTOGRAM = Histogram(
    "ragtime_ttft_seconds",
    "Latence du Time-to-First-Token (TTFT) en secondes",
    buckets=[0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 5.0],
)

# 2. Débit instantané de génération de tokens
TOKENS_PER_SECOND_GAUGE = Gauge(
    "ragtime_tokens_per_second",
    "Débit instantané de génération de tokens par seconde",
)

# 3. Consommation de mémoire VRAM GPU en octets
VRAM_USAGE_GAUGE = Gauge(
    "ragtime_vram_usage_bytes",
    "Mémoire VRAM allouée mesurée sur le GPU NVIDIA",
)

# 4. Total des requêtes traitées par tenant
TENANT_QUERIES_COUNTER = Counter(
    "ragtime_tenant_queries_total",
    "Nombre total de requêtes RAG traitées par tenant",
    ["tenant_id", "status"],
)

# 5. État de santé des 4 services socles de l'infrastructure
SERVICE_HEALTH_GAUGE = Gauge(
    "ragtime_service_health",
    "Disponibilité opérationnelle du service (1 = sain, 0 = dégradé/inaccessible)",
    ["service"],
)


def record_ttft(seconds: float) -> None:
    """Enregistre une mesure réelle de TTFT."""
    TTFT_HISTOGRAM.observe(seconds)


def record_tokens_per_sec(rate: float) -> None:
    """Met à jour le débit instantané de tokens/s."""
    TOKENS_PER_SECOND_GAUGE.set(rate)


def record_vram_usage(bytes_allocated: int) -> None:
    """Met à jour l'empreinte VRAM GPU."""
    VRAM_USAGE_GAUGE.set(bytes_allocated)


def update_service_health(service_name: str, is_healthy: bool) -> None:
    """Met à jour la jauge d'état de santé du service."""
    SERVICE_HEALTH_GAUGE.labels(service=service_name).set(1.0 if is_healthy else 0.0)


def get_latest_metrics() -> tuple[bytes, str]:
    """Exporte les métriques Prometheus encodées."""
    return generate_latest(), CONTENT_TYPE_LATEST
