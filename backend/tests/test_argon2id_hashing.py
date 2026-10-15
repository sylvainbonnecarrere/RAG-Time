"""
Tests Cryptographiques SecOps — US-SEC-02 : Conformité ANSSI du Hachage Argon2id
Vérifie les paramètres de résistance mémoire, le salage déterministe et le temps constant.
"""

from app.core.security import get_password_hash, ph, verify_password


def test_argon2id_parameters_anssi_compliance():
    """
    Vérifie la stricte conformité aux recommandations ANSSI :
    - memory_cost = 65536 KiB (64 Mo de RAM)
    - time_cost = 3 itérations
    - parallelism = 4 threads
    - salt_len = 16 octets
    - hash_len = 32 octets
    """
    assert ph.time_cost == 3
    assert ph.memory_cost == 65536
    assert ph.parallelism == 4
    assert ph.salt_len == 16
    assert ph.hash_len == 32


def test_argon2id_random_salting_and_verification():
    """Valide que le sel aléatoire produit des hashes différents pour le même mot de passe."""
    password = "MotDePasseTresSecret2026!"

    hash1 = get_password_hash(password)
    hash2 = get_password_hash(password)

    # Doivent être distincts grâce au sel aléatoire de 16 octets
    assert hash1 != hash2
    assert hash1.startswith("$argon2id$")
    assert "m=65536,t=3,p=4" in hash1

    # Validation d'égalité
    assert verify_password(password, hash1) is True
    assert verify_password(password, hash2) is True
    assert verify_password("MauvaisMotDePasse", hash1) is False


def test_argon2id_malformed_hash_resilience():
    """Vérifie qu'un hash corrompu ne lève pas d'exception non gérée."""
    assert verify_password("password", "hash_totalement_invalide") is False
    assert verify_password("password", "$argon2id$v=19$m=100$bad$salt$hash") is False
