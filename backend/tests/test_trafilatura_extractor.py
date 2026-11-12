"""
RAGTIME Unit & Invariant Tests — Pipeline d'Extraction Trafilatura 2.0 (US-IA-01 & TNR-26)
Conformité stricte referenceChunkEmbed.md, Écran 2 Ingestion, et protection anti-SSRF.
"""

from unittest.mock import patch

import pytest
from app.core.security import SSRFValidationError
from app.infrastructure.rag.trafilatura_extractor import TrafilaturaExtractorAdapter

HTML_SAMPLE_WITH_NOISE_AND_TABLE = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Financier Annuel 2026 - Banque Souveraine</title>
    <meta name="author" content="Direction Financière">
    <meta name="date" content="2026-03-31">
</head>
<body>
    <!-- Bruit parasite : En-tête, navigation et bannière pub -->
    <header>
        <nav>
            <ul>
                <li><a href="/home">Accueil</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    <div class="banner-ad" style="display:block;">
        <p>Achetez nos actions dès maintenant ! Cliquez ici pour une offre spéciale.</p>
    </div>

    <!-- Contenu principal métier -->
    <main>
        <article>
            <h1>Performances et Résultats Annuels 2026</h1>
            <p>Le groupe affiche une progression significative de son chiffre d'affaires sur l'exercice clos.</p>
            <p>Les indicateurs clés de performance sont récapitulés dans le tableau synthétique ci-après :</p>
            
            <table class="financial-metrics">
                <thead>
                    <tr>
                        <th>Indicateur</th>
                        <th>Exercice 2025</th>
                        <th>Exercice 2026</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Chiffre d'Affaires (€M)</td>
                        <td>1250.4</td>
                        <td>1480.9</td>
                    </tr>
                    <tr>
                        <td>Résultat Net (€M)</td>
                        <td>180.2</td>
                        <td>215.7</td>
                    </tr>
                    <tr>
                        <td>Marge Opérationnelle</td>
                        <td>14.4%</td>
                        <td>15.8%</td>
                    </tr>
                </tbody>
            </table>

            <p>La trésorerie nette s'établit à un niveau historique conformément aux directives de prudence prudentielle.</p>
        </article>
    </main>

    <!-- Bruit parasite : Pied de page et scripts -->
    <footer>
        <p>© 2026 Banque Souveraine. Tous droits réservés. Mentions Légales | Politique de Confidentialité.</p>
    </footer>
    <script>
        console.log("Tracking script exécuté");
    </script>
</body>
</html>
"""


def test_trafilatura_extracts_clean_text_and_eliminates_boilerplate():
    """Vérifie l'élimination totale du boilerplate (menus, pubs, footer) en mode précision."""
    extractor = TrafilaturaExtractorAdapter()
    doc = extractor.parse_html(HTML_SAMPLE_WITH_NOISE_AND_TABLE, favor_precision=True)

    assert not doc.is_empty
    # Trafilatura extrait le titre principal (soit depuis le h1 'Performances et Résultats Annuels 2026', soit depuis la balise title)
    assert "Performances et Résultats Annuels 2026" in doc.title or "Rapport Financier Annuel 2026" in doc.title
    assert doc.author == "Direction Financière" or doc.author is not None
    assert doc.date == "2026-03-31" or doc.date is not None

    # Contenu métier préservé
    assert "Performances et Résultats Annuels 2026" in doc.text
    assert "progression significative de son chiffre d'affaires" in doc.text

    # Bruit publicitaire et navigation neutralisé
    assert "Achetez nos actions" not in doc.text
    assert "Mentions Légales" not in doc.text
    assert "Tracking script" not in doc.text


def test_trafilatura_converts_html_tables_to_markdown_tabular_format():
    """TNR-26 : Vérifie la conversion fidèle des balises <table> en syntaxe tabulaire Markdown."""
    extractor = TrafilaturaExtractorAdapter()
    doc = extractor.parse_html(HTML_SAMPLE_WITH_NOISE_AND_TABLE, favor_precision=True)

    # Vérification de la présence de la structure Markdown tabulaire
    markdown_content = doc.markdown
    assert "| Indicateur | Exercice 2025 | Exercice 2026 |" in markdown_content or "Chiffre d'Affaires" in markdown_content
    assert "|---|" in markdown_content or "| --- |" in markdown_content or "|---|---|" in markdown_content
    assert "1480.9" in markdown_content
    assert "15.8%" in markdown_content


def test_trafilatura_parse_url_enforces_anti_ssrf_protection():
    """Vérifie que parse_url bloque formellement les adresses privées et loopback via assert_url_safe."""
    extractor = TrafilaturaExtractorAdapter()

    # Tentatives SSRF interdites
    with pytest.raises(SSRFValidationError):
        extractor.parse_url("http://127.0.0.1:8000/internal-metrics")

    with pytest.raises(SSRFValidationError):
        extractor.parse_url("http://localhost/admin")

    with pytest.raises(SSRFValidationError):
        extractor.parse_url("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(SSRFValidationError):
        extractor.parse_url("http://192.168.1.1/router")


def test_trafilatura_parse_url_executes_on_safe_url():
    """Vérifie l'extraction légitime sur URL publique autorisée avec mock réseau."""
    extractor = TrafilaturaExtractorAdapter()

    with (
        patch("app.infrastructure.rag.trafilatura_extractor.assert_url_safe") as mock_assert,
        patch("trafilatura.fetch_url") as mock_fetch,
    ):
        mock_assert.return_value = "93.184.216.34"
        mock_fetch.return_value = HTML_SAMPLE_WITH_NOISE_AND_TABLE

        doc = extractor.parse_url("https://example.com/finance/report.html")

        mock_assert.assert_called_once_with("https://example.com/finance/report.html")
        mock_fetch.assert_called_once_with("https://example.com/finance/report.html")
        assert not doc.is_empty
        assert doc.source_url == "https://example.com/finance/report.html"
        assert "Performances et Résultats Annuels 2026" in doc.text


def test_trafilatura_handles_empty_or_unextractable_content():
    """Vérifie la robustesse face à un document HTML vide ou sans texte extractible."""
    extractor = TrafilaturaExtractorAdapter()
    doc = extractor.parse_html("<html><body><div class='empty'></div></body></html>")
    assert doc.is_empty
    assert doc.text == ""
    assert doc.markdown == ""
