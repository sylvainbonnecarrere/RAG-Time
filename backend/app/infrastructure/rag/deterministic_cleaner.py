"""
RAGTIME Infrastructure Adapter — Nettoyage Déterministe en 4 Étapes (US-IA-02 & TNR-27)
Conformité stricte referenceChunkEmbed.md, Écran 2 Ingestion, et neutralisation des divergences vectorielles.
"""

import re
import unicodedata

from app.domain.ports.text_cleaner import CleaningResult, TextCleanerPort

# 1. Regex de détection des balises HTML orphelines (ex: <span>, <br>, </div>)
# Protège les inégalités mathématiques (ex: "p < 0.05" ou "s > 0.75")
_HTML_TAGS_PATTERN = re.compile(r"<(?![\d\s=])/?([a-zA-Z0-9]+)(?:\s+[^>]*)?>")

# 2. Plages de caractères invisibles néfastes, directionnels bidi, BOM et soft-hyphen :
# - \u200B à \u200F : Zero-width space, non-joiner, joiner, left-to-right/right-to-left marks
# - \u202A à \u202E : Embedding et overrides directionnels bidi
# - \uFEFF : Zero-width non-breaking space / Byte Order Mark
# - \u00AD : Soft hyphen (trait d'union conditionnel)
_INVISIBLE_CHARS_PATTERN = re.compile(r"[\u200B-\u200F\u202A-\u202E\uFEFF\u00AD]")

# 3. Espaces horizontaux multiples (espaces insécables, tabulations)
_MULTIPLE_SPACES_PATTERN = re.compile(r"[^\S\r\n]+")

# 4. Sauts de ligne multiples consécutifs (au-delà du double retour paragraphe)
_MULTIPLE_NEWLINES_PATTERN = re.compile(r"\n\s*\n+")


class DeterministicCleanerAdapter(TextCleanerPort):
    """
    Adaptateur d'infrastructure pour l'assainissement mécanique rigoureux du corpus source.
    L'ordre séquentiel des passes est déterministe et critique :
    1. Normalisation Unicode NFC
    2. Suppression des balises HTML résiduelles
    3. Éradication des caractères invisibles et corrupteurs
    4. Normalisation et équilibrage des espaces et sauts de ligne
    """

    def clean(self, raw_text: str) -> CleaningResult:
        """Exécute les 4 étapes ordonnées de nettoyage sur le texte brut."""
        if not raw_text:
            return CleaningResult(
                cleaned_text="",
                original_char_count=0,
                cleaned_char_count=0,
                invisibles_removed=0,
                html_tags_removed=0,
            )

        original_char_count = len(raw_text)

        # Étape 1 : Normalisation Unicode vers la forme canonique composée (NFC)
        # Unifie les points de code décomposés (NFD) avec les formes composées pour éviter
        # toute divergence de tokenisation dans les modèles d'embedding.
        text_step1 = unicodedata.normalize("NFC", raw_text)

        # Étape 2 : Élimination des balises HTML résiduelles tout en protégeant les formules mathématiques
        html_tags_matches = len(_HTML_TAGS_PATTERN.findall(text_step1))
        text_step2 = _HTML_TAGS_PATTERN.sub("", text_step1)

        # Étape 3 : Éradication des caractères invisibles, bidi et soft-hyphen (TNR-27)
        invisibles_matches = len(_INVISIBLE_CHARS_PATTERN.findall(text_step2))
        text_step3 = _INVISIBLE_CHARS_PATTERN.sub("", text_step2)

        # Étape 4 : Normalisation et condensation des espaces et sauts de ligne
        # a) Remplacement des tabulations et espaces horizontaux consécutifs par un espace unique
        text_step4a = _MULTIPLE_SPACES_PATTERN.sub(" ", text_step3)
        # b) Remplacement des sauts de ligne consécutifs (> 2) par un double saut canonique (\n\n)
        text_step4b = _MULTIPLE_NEWLINES_PATTERN.sub("\n\n", text_step4a)
        # c) Nettoyage des bordures de chaque ligne
        stripped_lines = [line.strip() for line in text_step4b.splitlines()]
        cleaned_text = "\n".join(stripped_lines).strip()

        cleaned_char_count = len(cleaned_text)

        return CleaningResult(
            cleaned_text=cleaned_text,
            original_char_count=original_char_count,
            cleaned_char_count=cleaned_char_count,
            invisibles_removed=invisibles_matches,
            html_tags_removed=html_tags_matches,
        )
