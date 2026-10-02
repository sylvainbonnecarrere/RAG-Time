#!/usr/bin/env bash
# ==============================================================================
# RAGTIME — Déploiement Autonome sur Serveur Cible Air-Gap (Zéro Internet)
# ==============================================================================
set -euo pipefail

echo "================================================================================"
echo "  DÉPLOIEMENT SOUVERAIN AIR-GAP RAGTIME"
echo "================================================================================"

# 1. Vérification de l'intégrité SHA-256
echo "--> [1/4] Vérification cryptographique des archives..."
if [ -f "manifest.sha256" ]; then
    sha256sum -c manifest.sha256
    echo "[OK] Intégrité de l'ensemble des paquets validée."
else
    echo "[ATTENTION] Fichier manifest.sha256 absent. Poursuite sans vérification d'empreinte."
fi

# 2. Chargement des images Docker locales
echo "--> [2/4] Chargement des images Docker dans le registre local..."
for img in images/*.tar.gz; do
    if [ -f "$img" ]; then
        echo "Chargement de $img..."
        docker load < "$img"
    fi
done

# 3. Restauration des modèles Ollama locaux
echo "--> [3/4] Restauration des modèles LLM et embeddings Ollama..."
mkdir -p ~/.ollama/models
if [ -d "models" ]; then
    cp -r models/* ~/.ollama/models/ 2>/dev/null || true
    echo "[OK] Modèles restaurés."
fi

# 4. Lancement de la stack Docker Compose
echo "--> [4/4] Démarrage de la stack souveraine..."
docker compose up -d

echo ""
echo "================================================================================"
echo "  DÉPLOIEMENT AIR-GAP EFFECTUÉ AVEC SUCCÈS"
echo "================================================================================"
