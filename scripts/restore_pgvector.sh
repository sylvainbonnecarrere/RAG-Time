#!/usr/bin/env bash
# ==============================================================================
# RAGTIME — Script de Restauration PostgreSQL + pgvector (US-DEVOPS-09)
# ==============================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <chemin_du_fichier_dump>"
    exit 1
fi

BACKUP_FILE="$1"
SHA_FILE="${BACKUP_FILE}.sha256"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[ERREUR] Fichier de sauvegarde introuvable : $BACKUP_FILE"
    exit 1
fi

# 1. Vérification d'intégrité SHA-256
if [ -f "$SHA_FILE" ]; then
    echo "--> [1/3] Contrôle cryptographique SHA-256..."
    sha256sum -c "$SHA_FILE"
    echo "[OK] Empreinte validée."
else
    echo "[ATTENTION] Fichier de checksum manquant. Restauration sous réserve."
fi

# 2. Restauration via pg_restore
echo "--> [2/3] Restauration des tables et chunks vectoriels..."
PGPASSWORD="${POSTGRES_PASSWORD:-ragtime_local_db_secret_pass}" \
pg_restore -h "${POSTGRES_HOST:-localhost}" \
           -p "${POSTGRES_PORT:-5432}" \
           -U "${POSTGRES_USER:-ragtime}" \
           -d "${POSTGRES_DB:-ragtime_db}" \
           --clean --if-exists \
           --no-owner \
           "$BACKUP_FILE"

# 3. Réindexation HNSW pour garantir la cohérence des distances cosinus
echo "--> [3/3] Reconstruction et validation des index HNSW pgvector..."
PGPASSWORD="${POSTGRES_PASSWORD:-ragtime_local_db_secret_pass}" \
psql -h "${POSTGRES_HOST:-localhost}" \
     -p "${POSTGRES_PORT:-5432}" \
     -U "${POSTGRES_USER:-ragtime}" \
     -d "${POSTGRES_DB:-ragtime_db}" \
     -c "REINDEX TABLE document_chunks; REINDEX TABLE documents;"

echo "[SUCCÈS] Base de données et index vectoriels HNSW restaurés avec succès."
