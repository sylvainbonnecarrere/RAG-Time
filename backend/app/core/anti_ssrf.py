"""
RAGTIME Anti-SSRF Deterministic Validator (US-SEC-04 & TNR-26)
Conformité stricte SecNumCloud 3.2, OWASP API Security (API7:2023 Server Side Request Forgery) et STRIDE.

Interdit formellement toute requête vers :
- La boucle locale (localhost, 127.0.0.0/8, ::1, 0.0.0.0)
- Les réseaux privés RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7)
- Les métadonnées d'instances cloud (169.254.169.254, 169.254.0.0/16, fe80::/10)
- Les adresses obfusquées (octales, décimales, hexadécimales)
- Les schémas non-HTTP/HTTPS (file://, gopher://, ftp://, ldap://, dict://)
- Les attaques par rebond DNS (DNS Rebinding)
"""

import ipaddress
import socket
from urllib.parse import urlparse


class SSRFValidationError(ValueError):
    """Exception levée en cas de détection d'une URL dangereuse ou non conforme."""



# Schémas autorisés exclusivement (Whitelisting défensif)
ALLOWED_SCHEMES = frozenset({"http", "https"})

# Noms d'hôtes ou suffixes expressément proscrits
FORBIDDEN_HOSTNAME_SUFFIXES = (
    "localhost",
    ".localhost",
    ".local",
    ".internal",
    ".lan",
    ".home",
    ".corp",
)

# Réseaux et plages sensibles (Métadonnées Cloud, CGNAT, Link-Local)
SENSITIVE_NETWORKS: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = [
    ipaddress.ip_network("169.254.0.0/16"),   # IPv4 Link-Local & AWS/GCP/Azure/OpenStack metadata
    ipaddress.ip_network("100.64.0.0/10"),    # RFC 6598 Carrier-Grade NAT (Shared Address Space)
    ipaddress.ip_network("198.18.0.0/15"),    # RFC 2544 Benchmarking
    ipaddress.ip_network("fe80::/10"),        # IPv6 Link-Local
    ipaddress.ip_network("fc00::/7"),         # IPv6 Unique Local Address (ULA)
]


def _parse_obfuscated_ip(host: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address | None:
    """Tente de décoder une adresse IP potentiellement obfusquée (décimale, hexadécimale, octale)."""
    clean_host = host.strip("[]")
    
    # 1. Format IP standard IPv4 ou IPv6
    try:
        return ipaddress.ip_address(clean_host)
    except ValueError:
        pass

    # 2. Format entier décimal (ex: 2130706433 pour 127.0.0.1) ou hexadécimal (0x7f000001)
    try:
        val: int | None = None
        if clean_host.startswith(("0x", "0X")):
            val = int(clean_host, 16)
        elif clean_host.isdigit():
            val = int(clean_host, 10)
        
        if val is not None and 0 <= val <= 0xFFFFFFFF:
            return ipaddress.IPv4Address(val)
    except (ValueError, OverflowError):
        pass

    # 3. Format pointé avec octets hexadécimaux ou octaux (ex: 0177.0.0.1 ou 0x7f.0.0.1)
    if "." in clean_host:
        parts = clean_host.split(".")
        if len(parts) == 4:
            try:
                octets: list[int] = []
                for p in parts:
                    if p.startswith(("0x", "0X")):
                        octets.append(int(p, 16))
                    elif p.startswith("0") and len(p) > 1 and p.isdigit():
                        octets.append(int(p, 8))
                    elif p.isdigit():
                        octets.append(int(p, 10))
                    else:
                        break
                if len(octets) == 4 and all(0 <= o <= 255 for o in octets):
                    return ipaddress.IPv4Address(bytes(octets))
            except (ValueError, OverflowError):
                pass

    return None


def _is_ip_forbidden(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> tuple[bool, str]:
    """Évalue si une adresse IP donnée appartient à une zone privée, locale ou de métadonnées."""
    if ip.is_loopback:
        return True, f"Protection Anti-SSRF : Accès interdit aux hôtes locaux ou de bouclage (loopback : {ip})."
    
    if ip.is_private:
        return True, f"Protection Anti-SSRF : Les adresses privées (RFC 1918 / ULA : {ip}) sont proscrites."
    
    if ip.is_link_local:
        return True, f"Protection Anti-SSRF : L'adresse de lien local / métadonnées cloud ({ip}) est proscrite."
    
    if ip.is_multicast:
        return True, f"Protection Anti-SSRF : L'adresse de diffusion multidestinataire ({ip}) est proscrite."
    
    if ip.is_reserved:
        return True, f"Protection Anti-SSRF : L'adresse IETF réservée ({ip}) est proscrite."
    
    if ip.is_unspecified:
        return True, "Protection Anti-SSRF : L'adresse non spécifiée (0.0.0.0 ou ::) est proscrite."
    
    for net in SENSITIVE_NETWORKS:
        if ip in net:
            return True, f"Protection Anti-SSRF : L'adresse {ip} appartient à la plage sensible proscrite {net}."
            
    return False, ""


def validate_url_anti_ssrf(url_str: str) -> tuple[bool, str | None, str | None]:
    """
    Valide de manière déterministe une URL web pour interdire toute attaque SSRF.
    
    Returns:
        tuple[is_valid, resolved_ip, error_message]
    """
    if not url_str or not isinstance(url_str, str):
        return False, None, "URL invalide ou vide."

    clean_url = url_str.strip()
    try:
        parsed = urlparse(clean_url)
    except ValueError as e:
        return False, None, f"Impossible d'analyser l'URL : {e}"

    # 1. Vérification stricte du schéma
    if not parsed.scheme or parsed.scheme.lower() not in ALLOWED_SCHEMES:
        return (
            False,
            None,
            f"Schéma '{parsed.scheme}' interdit. Seuls les protocoles HTTP et HTTPS sont autorisés.",
        )

    # 2. Vérification de l'hôte
    hostname = parsed.hostname
    if not hostname:
        return False, None, "L'URL ne contient aucun nom d'hôte valide."

    host_lower = hostname.lower()

    # 3. Vérification des noms d'hôtes locaux explicites
    if host_lower == "localhost" or any(host_lower.endswith(sfx) for sfx in FORBIDDEN_HOSTNAME_SUFFIXES):
        return (
            False,
            None,
            f"Protection Anti-SSRF : Accès interdit aux hôtes locaux ou de bouclage ('{hostname}').",
        )

    # 4. Vérification si l'hôte est une IP (directe ou obfusquée)
    ip_obj = _parse_obfuscated_ip(hostname)
    if ip_obj is not None:
        forbidden, reason = _is_ip_forbidden(ip_obj)
        if forbidden:
            return False, str(ip_obj), reason
        return True, str(ip_obj), None

    # 5. Résolution DNS de l'hôte pour contrer le DNS Rebinding
    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    try:
        addr_info = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except OSError as e:
        return False, None, f"Impossible de résoudre le nom de domaine '{hostname}' : {e}"

    if not addr_info:
        return False, None, f"Aucune adresse IP résolue pour '{hostname}'."

    first_resolved_ip: str | None = None
    # Vérification de TOUTES les adresses IP associées à ce domaine (IPv4 & IPv6)
    for res in addr_info:
        sockaddr = res[4]
        ip_str = str(sockaddr[0])
        if first_resolved_ip is None:
            first_resolved_ip = ip_str

        try:
            resolved_ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            return False, ip_str, f"Adresse IP résolue invalide : {ip_str}"

        forbidden, reason = _is_ip_forbidden(resolved_ip_obj)
        if forbidden:
            return False, ip_str, f"{reason} (Domaine '{hostname}' résolu vers {ip_str})"

    return True, first_resolved_ip, None


def assert_url_safe(url_str: str) -> str:
    """Valide l'URL et lève une exception SSRFValidationError si elle est interdite."""
    is_valid, resolved_ip, error = validate_url_anti_ssrf(url_str)
    if not is_valid:
        raise SSRFValidationError(error or "URL non autorisée par le filtre Anti-SSRF.")
    return resolved_ip or ""
