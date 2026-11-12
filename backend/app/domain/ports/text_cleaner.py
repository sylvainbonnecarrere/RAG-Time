"""
RAGTIME Domain Ports — Contrat d'Assainissement Déterministe (US-IA-02)
Architecture Hexagonale : Port Secondaire Driven pour l'hygiène du corpus textuel.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class CleaningResult:
    """Résultat de la passe d'assainissement avec traçabilité télémétrique."""

    cleaned_text: str
    original_char_count: int
    cleaned_char_count: int
    invisibles_removed: int
    html_tags_removed: int

    @property
    def reduction_percentage(self) -> float:
        """Pourcentage de réduction de taille suite au nettoyage mécanique."""
        if self.original_char_count == 0:
            return 0.0
        diff = self.original_char_count - self.cleaned_char_count
        return max(0.0, (diff / self.original_char_count) * 100.0)


class TextCleanerPort(ABC):
    """Port hexagonal pour le pipeline de nettoyage mécanique déterministe pré-chunking."""

    @abstractmethod
    def clean(self, raw_text: str) -> CleaningResult:
        """
        Exécute la passe d'assainissement mécanique en 4 étapes séquentielles :
        1. Normalisation Unicode NFC
        2. Élimination des balises HTML résiduelles
        3. Éradication des caractères invisibles et corrupteurs
        4. Normalisation et condensation des espaces et sauts de ligne
        """
        ...
