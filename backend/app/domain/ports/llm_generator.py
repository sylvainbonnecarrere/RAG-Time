"""
RAGTIME Domain — Port de Génération LLM en Streaming (US-BACK-09)
Définit l'abstraction pour l'inférence locale et le calcul des métriques MLOps temps réel.
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass


@dataclass
class LLMGenerationMetrics:
    """Métriques MLOps réelles mesurées au cours de la génération du modèle (TNR-10)."""
    ttft_ms: float
    total_duration_ms: float
    tokens_generated: int
    tokens_per_second: float


class LLMGeneratorPort(ABC):
    """Port abstrait de génération LLM en streaming."""

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        model: str = "llama3.2:3b",
        temperature: float = 0.2,
    ) -> AsyncGenerator[str, None]:
        """Génère un flux asynchrone de tokens textuels."""
        raise NotImplementedError

    @abstractmethod
    def get_last_metrics(self) -> LLMGenerationMetrics | None:
        """Retourne les métriques de la dernière génération complétée."""
        raise NotImplementedError
