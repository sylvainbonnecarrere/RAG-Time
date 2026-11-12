"""
RAGTIME Unit & Invariant Tests — Pipeline d'Assainissement Déterministe (US-IA-02 & TNR-27)
Conformité stricte referenceChunkEmbed.md, Écran 2 Ingestion, et neutralisation des divergences vectorielles.
"""

import unicodedata

from app.infrastructure.rag.deterministic_cleaner import DeterministicCleanerAdapter


def test_cleaner_normalizes_unicode_to_canonical_composed_nfc():
    """Vérifie l'unification canonique NFC : conversion de NFD (décomposé) en NFC (composé)."""
    cleaner = DeterministicCleanerAdapter()

    # Forme décomposée NFD : 'e' + accent aigu combinant '\u0301'
    texte_nfd = "Qualite\u0301 et se\u0301curite\u0301 des donne\u0301es souveraines."
    assert unicodedata.is_normalized("NFD", texte_nfd)
    assert not unicodedata.is_normalized("NFC", texte_nfd)

    result = cleaner.clean(texte_nfd)
    cleaned = result.cleaned_text

    # Après passage du cleaner, le texte doit impérativement être en NFC
    assert unicodedata.is_normalized("NFC", cleaned)
    assert cleaned == "Qualité et sécurité des données souveraines."


def test_cleaner_eradicates_invisible_and_zero_width_characters():
    """TNR-27 : Vérifie l'éradication des caractères invisibles corrupteurs d'embeddings."""
    cleaner = DeterministicCleanerAdapter()

    # Chaîne injectée de caractères invisibles néfastes :
    # \u200B (zero-width space), \u200C (zero-width non-joiner), \u200D (zero-width joiner)
    # \uFEFF (BOM / zero-width non-breaking space), \u00AD (soft hyphen)
    # \u202A à \u202E (marques directionnelles bidi)
    texte_pollue = (
        "RAGTIME\u200B est un\uFEFF système souverain\u00AD d'ingénierie\u200C "
        "documentaire\u200D sans fuite\u202A de données\u202C."
    )

    result = cleaner.clean(texte_pollue)

    assert result.invisibles_removed >= 5
    assert "\u200B" not in result.cleaned_text
    assert "\u200C" not in result.cleaned_text
    assert "\u200D" not in result.cleaned_text
    assert "\uFEFF" not in result.cleaned_text
    assert "\u00AD" not in result.cleaned_text
    assert "\u202A" not in result.cleaned_text
    assert "\u202C" not in result.cleaned_text
    assert result.cleaned_text == "RAGTIME est un système souverain d'ingénierie documentaire sans fuite de données."


def test_cleaner_removes_residual_html_tags_while_preserving_math_formulas():
    """Vérifie le retrait des balises HTML orphelines tout en préservant les inégalités mathématiques."""
    cleaner = DeterministicCleanerAdapter()

    texte_avec_html_et_math = (
        "<p>Le test clinique montre un taux de significativité <span>p < 0.05</span> "
        "et un score cosinus <em>s > 0.75</em>.</p><br><div class='extra'>Fin du rapport.</div>"
    )

    result = cleaner.clean(texte_avec_html_et_math)
    cleaned = result.cleaned_text

    # Les balises HTML doivent être supprimées
    assert "<p>" not in cleaned
    assert "</p>" not in cleaned
    assert "<span>" not in cleaned
    assert "</span>" not in cleaned
    assert "<em>" not in cleaned
    assert "</em>" not in cleaned
    assert "<br>" not in cleaned
    assert "<div class='extra'>" not in cleaned
    assert "</div>" not in cleaned

    # Les formules mathématiques avec chevrons doivent être rigoureusement préservées
    assert "p < 0.05" in cleaned
    assert "s > 0.75" in cleaned


def test_cleaner_normalizes_spaces_tabs_and_newlines():
    """Vérifie la condensation des tabulations et sauts de ligne multiples (paragraphes équilibrés)."""
    cleaner = DeterministicCleanerAdapter()

    texte_espaces_anarchiques = (
        "Titre du   document    officiel.\t\t\n\n\n\n\n"
        "Premier paragraphe    avec   espaces multiples.\n\n\n"
        "   Deuxième paragraphe avec indentation superflue.   \n\n"
    )

    result = cleaner.clean(texte_espaces_anarchiques)
    cleaned = result.cleaned_text

    # Maximum 2 sauts consécutifs (\n\n) entre paragraphes
    assert "\n\n\n" not in cleaned
    assert "\t" not in cleaned
    assert "   " not in cleaned
    assert cleaned == (
        "Titre du document officiel.\n\n"
        "Premier paragraphe avec espaces multiples.\n\n"
        "Deuxième paragraphe avec indentation superflue."
    )


def test_cleaner_handles_empty_or_whitespace_only():
    """Vérifie le comportement sain sur chaînes vides ou remplies d'espaces."""
    cleaner = DeterministicCleanerAdapter()
    res1 = cleaner.clean("")
    assert res1.cleaned_text == ""
    assert res1.original_char_count == 0
    assert res1.reduction_percentage == 0.0

    res2 = cleaner.clean("   \t  \n  ")
    assert res2.cleaned_text == ""
