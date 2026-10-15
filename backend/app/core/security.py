"""
RAGTIME Core Security — Cryptographie Souveraine Argon2id & JWT (US-SEC-02)
Conformité stricte SecNumCloud 3.2 et Recommandations ANSSI sur le hachage et les cookies.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from app.core.config import settings
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# 1. Configuration Argon2id ANSSI (m=64 Mo, t=3 itérations, p=4 parallélisme, sel 16 octets)
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 Mo en KiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

# 2. Constantes pour les cookies de session sécurisés
COOKIE_NAME = "ragtime_session"
COOKIE_HTTPONLY = True
COOKIE_SAMESITE = "strict"
# En environnement de développement, permet le fonctionnement HTTP local sans blocage navigateur
COOKIE_SECURE = settings.RAGTIME_ENV.lower() not in ("development", "test", "testing")


def get_password_hash(password: str) -> str:
    """Hache un mot de passe en utilisant l'algorithme Argon2id selon les normes ANSSI."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe en temps constant face à son empreinte Argon2id."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Génère un jeton JWT d'accès signé avec la SECRET_KEY souveraine."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Décode et valide la signature cryptographique d'un jeton JWT."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, ValueError):
        return None
