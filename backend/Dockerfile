# ==============================================================================
# RAGTIME Backend — Dockerfile Multi-Stage Hardened (SecNumCloud 3.2 Compliant)
# ==============================================================================

# --- Étape 1 : Builder d'environnement Python ---
FROM python:3.12-slim-bookworm AS builder

WORKDIR /build

# Dépendances système minimales pour la compilation éventuelle des roues
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Création du venv isolé
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# --- Étape 2 : Image d'Exécution Finale Durcie ---
FROM python:3.12-slim-bookworm AS runtime

LABEL maintainer="Équipe RAGTIME <devops@ragtime.internal>"
LABEL description="RAGTIME Sovereign Backend API & Metrics Gateway"

WORKDIR /app

# Création d'un utilisateur non privilégié dédié (UID/GID 10001)
RUN groupadd -g 10001 ragtime && \
    useradd -u 10001 -g ragtime -m -s /bin/false ragtime

# Récupération de l'environnement virtuel pré-compilé
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copie du code applicatif avec droits restreints
COPY --chown=ragtime:ragtime . /app

# Bascule sous l'utilisateur non-root
USER ragtime:ragtime

EXPOSE 8000

# Commande de démarrage Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
