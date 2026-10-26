"""
RAGTIME Security Test Suite — Validation Anti-SSRF Déterministe (US-SEC-04 & TNR-26)
Conformité stricte SecNumCloud 3.2, OWASP API Security (API7:2023) et Modèle STRIDE.
"""

from unittest.mock import patch

import pytest
from app.core.security import SSRFValidationError, assert_url_safe, validate_url_anti_ssrf

# ==============================================================================
# 1. Tests de Rejet des Protocoles et Schémas Dangereux
# ==============================================================================


@pytest.mark.parametrize(
    "dangerous_url",
    [
        "file:///etc/passwd",
        "file:///C:/Windows/win.ini",
        "gopher://127.0.0.1:70/",
        "ftp://files.example.com/data.txt",
        "dict://127.0.0.1:11211/stat",
        "ldap://127.0.0.1:389/dc=example,dc=com",
        "javascript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "tftp://10.0.0.1/config",
        "ssh://user@example.com",
        "",
        "not-a-valid-url",
        "://missing-scheme.com",
    ],
)
def test_anti_ssrf_rejects_non_http_schemes(dangerous_url: str):
    """Vérifie le rejet formel de tout protocole autre que HTTP ou HTTPS."""
    is_valid, resolved_ip, error = validate_url_anti_ssrf(dangerous_url)
    assert is_valid is False
    assert resolved_ip is None
    assert error is not None


# ==============================================================================
# 2. Tests de Rejet de la Boucle Locale (Loopback IPv4 & IPv6)
# ==============================================================================


@pytest.mark.parametrize(
    "loopback_url",
    [
        "http://localhost/",
        "http://localhost:8000/admin",
        "https://localhost:3000/api",
        "http://sub.localhost:8080/",
        "http://127.0.0.1/",
        "http://127.0.0.1:5432/",
        "http://127.0.0.2:8080/",
        "http://127.255.255.254/",
        "http://0.0.0.0:8000/",
        "http://[::1]/",
        "http://[::1]:8080/metrics",
        "http://[0000:0000:0000:0000:0000:0000:0000:0001]/",
    ],
)
def test_anti_ssrf_rejects_loopback(loopback_url: str):
    """Vérifie le blocage systématique des adresses localhost et loopback."""
    is_valid, _resolved_ip, error = validate_url_anti_ssrf(loopback_url)
    assert is_valid is False
    assert "loopback" in (error or "").lower() or "local" in (error or "").lower() or "proscrit" in (error or "").lower()


# ==============================================================================
# 3. Tests de Rejet des Réseaux Privés (RFC 1918)
# ==============================================================================


@pytest.mark.parametrize(
    "private_url",
    [
        "http://10.0.0.1/",
        "http://10.255.255.254/secret",
        "https://10.10.10.10:8443/",
        "http://172.16.0.1/",
        "http://172.20.10.5:8080/",
        "http://172.31.255.254/",
        "http://192.168.0.1/",
        "http://192.168.1.1/admin",
        "https://192.168.100.50:9000/",
        "http://192.168.255.254/",
    ],
)
def test_anti_ssrf_rejects_rfc1918_private_ranges(private_url: str):
    """Vérifie le blocage des plages d'adresses IPv4 privées RFC 1918 (10/8, 172.16/12, 192.168/16)."""
    is_valid, _resolved_ip, error = validate_url_anti_ssrf(private_url)
    assert is_valid is False
    assert "privée" in (error or "").lower() or "rfc 1918" in (error or "").lower() or "proscrit" in (error or "").lower()


# ==============================================================================
# 4. Tests de Rejet des Métadonnées Cloud et Lien-Local
# ==============================================================================


@pytest.mark.parametrize(
    "cloud_metadata_url",
    [
        "http://169.254.169.254/latest/meta-data/",
        "http://169.254.169.254/computeMetadata/v1/",
        "http://169.254.0.1/",
        "http://169.254.255.254/",
        "http://metadata.google.internal/",
        "http://[fe80::1]/",
        "http://[fe80::a00:27ff:fe8d:e924]/",
    ],
)
def test_anti_ssrf_rejects_cloud_metadata_and_link_local(cloud_metadata_url: str):
    """Vérifie le blocage absolu du service de métadonnées d'instance cloud (169.254.169.254) et lien-local."""
    is_valid, _resolved_ip, error = validate_url_anti_ssrf(cloud_metadata_url)
    assert is_valid is False
    assert error is not None


# ==============================================================================
# 5. Tests de Rejet des IP Obfusquées (Décimal, Hexadécimal, Octal)
# ==============================================================================


@pytest.mark.parametrize(
    "obfuscated_url",
    [
        "http://2130706433/",  # Décimal pour 127.0.0.1
        "http://0x7f000001/",  # Hexadécimal pour 127.0.0.1
        "http://0177.0.0.1/",  # Octal pour 127.0.0.1
        "http://0x7f.0.0.1/",  # Dotted Hex
        "http://2886729729/",  # Décimal pour 172.16.0.1
        "http://3232235521/",  # Décimal pour 192.168.0.1
    ],
)
def test_anti_ssrf_rejects_obfuscated_ips(obfuscated_url: str):
    """Vérifie que les notations alternatives d'adresses IP (hex, dec, octal) sont décodées et bloquées."""
    is_valid, _resolved_ip, error = validate_url_anti_ssrf(obfuscated_url)
    assert is_valid is False
    assert error is not None


# ==============================================================================
# 6. Tests de Résolution DNS Rebinding et Faux Noms de Domaine
# ==============================================================================


def test_anti_ssrf_detects_dns_rebinding_resolving_to_private():
    """Simule un nom de domaine public (ex: attacker.com) dont le DNS résout vers une IP privée."""
    with patch("socket.getaddrinfo") as mock_dns:
        # getaddrinfo retourne [(family, type, proto, canonname, (address, port))]
        mock_dns.return_value = [
            (2, 1, 6, "", ("192.168.1.50", 80)),
        ]
        is_valid, resolved_ip, error = validate_url_anti_ssrf("https://attacker-domain.com/data")
        assert is_valid is False
        assert resolved_ip == "192.168.1.50"
        assert "privée" in (error or "").lower() or "proscrit" in (error or "").lower()


def test_anti_ssrf_detects_dns_rebinding_resolving_to_loopback():
    """Simule un nom de domaine résolvant vers 127.0.0.1 (ex: localtest.me, nip.io)."""
    with patch("socket.getaddrinfo") as mock_dns:
        mock_dns.return_value = [
            (2, 1, 6, "", ("127.0.0.1", 443)),
        ]
        is_valid, resolved_ip, error = validate_url_anti_ssrf("https://127.0.0.1.nip.io/api")
        assert is_valid is False
        assert resolved_ip == "127.0.0.1"
        assert "loopback" in (error or "").lower() or "local" in (error or "").lower()


def test_anti_ssrf_detects_multihomed_dns_with_any_private_ip():
    """Si un domaine possède plusieurs IP (A / AAAA) dont au moins une privée, il doit être rejeté."""
    with patch("socket.getaddrinfo") as mock_dns:
        mock_dns.return_value = [
            (2, 1, 6, "", ("93.184.216.34", 443)),  # IP publique
            (2, 1, 6, "", ("10.0.0.1", 443)),  # IP privée subversive
        ]
        is_valid, _resolved_ip, error = validate_url_anti_ssrf("https://dual-homed-danger.org/")
        assert is_valid is False
        assert "10.0.0.1" in (error or "")


# ==============================================================================
# 7. Tests d'Acceptation des URLs Publiques Légitimes
# ==============================================================================


@pytest.mark.parametrize(
    "legitimate_url, mocked_ip",
    [
        ("https://en.wikipedia.org/wiki/Retrieval-augmented_generation", "208.80.154.224"),
        ("https://docs.github.com/en/get-started", "140.82.121.3"),
        ("http://example.com/sample.pdf", "93.184.216.34"),
        ("https://anssi.gouv.fr/fr/actualites", "185.194.82.42"),
    ],
)
def test_anti_ssrf_allows_valid_public_urls(legitimate_url: str, mocked_ip: str):
    """Vérifie que les URLs publiques légitimes résolvant vers des adresses routables sont autorisées."""
    with patch("socket.getaddrinfo") as mock_dns:
        mock_dns.return_value = [
            (2, 1, 6, "", (mocked_ip, 443)),
        ]
        is_valid, resolved_ip, error = validate_url_anti_ssrf(legitimate_url)
        assert is_valid is True
        assert resolved_ip == mocked_ip
        assert error is None


def test_anti_ssrf_handles_unresolvable_domain():
    """Vérifie le comportement propre lors d'une impossibilité de résolution DNS."""
    with patch("socket.getaddrinfo", side_effect=OSError("Name or service not known")):
        is_valid, resolved_ip, error = validate_url_anti_ssrf("https://non-existent-domain-xyz-404.org/")
        assert is_valid is False
        assert resolved_ip is None
        assert "impossible de résoudre" in (error or "").lower() or "dns" in (error or "").lower()


# ==============================================================================
# 8. Tests de la fonction utilitaire assert_url_safe
# ==============================================================================


def test_assert_url_safe_raises_on_ssrf():
    """Vérifie que assert_url_safe lève bien SSRFValidationError en cas d'attaque."""
    with pytest.raises(SSRFValidationError):
        assert_url_safe("http://127.0.0.1:8000/internal")


def test_assert_url_safe_returns_ip_on_success():
    """Vérifie que assert_url_safe renvoie l'IP résolue en cas de succès."""
    with patch("socket.getaddrinfo") as mock_dns:
        mock_dns.return_value = [
            (2, 1, 6, "", ("93.184.216.34", 443)),
        ]
        ip = assert_url_safe("https://example.com/safe")
        assert ip == "93.184.216.34"
