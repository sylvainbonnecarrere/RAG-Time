#!/usr/bin/env python3
"""
RAGTIME — Script de Vérification de Disponibilité d'Infrastructure pour l'Agent Backend
Exécute les contrôles préalables avant l'implémentation du Schéma SQLModel,
des extensions pgvector/pgcrypto, des migrations Alembic et de la RLS (US-BACK-01 à US-BACK-03).
"""

import os
import sys
import socket
import urllib.request
import json

def check_tcp_port(host: str, port: int, service_name: str) -> bool:
    try:
        with socket.create_connection((host, port), timeout=3):
            print(f"  [OK] Service {service_name} accessible sur {host}:{port}")
            return True
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        print(f"  [ERREUR] Impossible de joindre {service_name} sur {host}:{port} ({e})")
        return False

def check_ollama():
    url = "http://localhost:11434/api/tags"
    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            model_names = [m["name"] for m in data.get("models", [])]
            has_embed = any("nomic-embed-text" in m for m in model_names)
            has_llm = any("llama3.2:3b" in m for m in model_names)
            if has_embed and has_llm:
                print(f"  [OK] Ollama actif avec nomic-embed-text et llama3.2:3b ({len(model_names)} modèles)")
                return True
            else:
                print(f"  [ATTENTION] Modèles requis manquants dans Ollama : {model_names}")
                return False
    except Exception as e:
        print(f"  [ERREUR] Ollama inaccessible sur {url} : {e}")
        return False

def main():
    print("=" * 80)
    print("  RAGTIME — VÉRIFICATION D'INFRASTRUCTURE AVANT RELAIS BACKEND (JALON 1)")
    print("=" * 80)

    # 1. Vérification .env
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if os.path.exists(env_path):
        print("  [OK] Fichier de configuration .env présent et initialisé")
    else:
        print("  [ERREUR] Fichier .env manquant à la racine du projet")
        sys.exit(1)

    # 2. Vérification des ports d'infrastructure socle
    ok_postgres = check_tcp_port("127.0.0.1", 5432, "PostgreSQL 16 (pgvector)")
    ok_redis = check_tcp_port("127.0.0.1", 6379, "Redis 7 (ARQ)")
    ok_ollama_port = check_tcp_port("127.0.0.1", 11434, "Ollama Local Engine")

    # 3. Vérification des modèles Ollama
    ok_ollama_models = check_ollama()

    print("-" * 80)
    if ok_postgres and ok_redis and ok_ollama_port and ok_ollama_models:
        print("  STATUT : PRÊT POUR LE DÉPLOIEMENT BACKEND (Jalon 1 - Priorité 1)")
        print("  L'Agent Backend peut démarrer US-BACK-01 (Schéma SQLModel & Alembic).")
        print("=" * 80)
        sys.exit(0)
    else:
        print("  STATUT : BLOCAGE D'INFRASTRUCTURE DÉTECTÉ")
        print("=" * 80)
        sys.exit(1)

if __name__ == "__main__":
    main()
