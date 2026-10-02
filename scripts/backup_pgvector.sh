#!/usr/bin/env bash
# ==============================================================================
# RAGTIME — Script de Sauvegarde Immuable PostgreSQL + pgvector (US-DEVOPS-09)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ragtime_backup_${TIMESTAMP}.dump"
SHA_FILE="${BACKUP_FILE}.sha256"

mkdir -p "$BACKUP_DIR"

echo "--> Démarrage du backup PostgreSQL pgvector..."
PGPASSWORD="${POSTGRES_PASSWORD:-ragtime_local_db_secret_pass}" \
pg_dump -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "${POSTGRES_USER:-ragtime}" \
        -d "${POSTGRES_DB:-ragtime_db}" \
        -Fc \
        -f "$BACKUP_FILE"

echo "--> Calcul du checksum cryptographique SHA-256..."
sha256sum "$BACKUP_FILE" > "$SHA_FILE"

echo "[OK] Sauvegarde immuable créée avec succès :"
echo "     Dump : $BACKUP_FILE"
echo "     SHA  : $(cat "$SHA_FILE")"
