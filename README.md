# RAGTIME — Plateforme RAG Auto-Hébergée, Souveraine & Multi-Tenant

> **Conception & Architecture :** Bonnecarrere Sylvain  
> **Version :** 2.0 (2026)  
> **Statut :** Spécification d'Architecture, Modèle de Sécurité & Plan Front-End  
> **Runtime :** 100% Local (FastAPI, PostgreSQL 16 + pgvector, Ollama natif, Redis/ARQ, Next.js / Tailwind CSS v4)

---

## 1. Vision & Positionnement Produit

**RAGTIME** est une plateforme industrielle de *Retrieval-Augmented Generation* (RAG) **strictement auto-hébergée et multi-tenant**, conçue pour les entreprises exigeant une étanchéité absolue de leurs données et une traçabilité totale des synthèses documentaires.

### Les 4 Piliers Fondamentaux
1. **Souveraineté & Zéro Fuite Cloud :** Exécution 100% locale (Windows 10/WSL2 ou Linux) sans dépendance à des API LLM externes.
2. **Isolation Multi-Tenant Native :** Cloisonnement mathématique et relationnel dès le modèle de données (PostgreSQL + pgvector).
3. **Citations Auditables (Zéro Hallucination) :** Chaque affirmation générée est liée à un chunk précis vérifiable (`[Document, p.X]`), avec score de similarité vectoriel et lexical.
4. **Transparence Algorithmique :** Affichage exclusif des 5 étapes réelles observables du pipeline (*Question reçue → Recherche pgvector → Filtrage tenant → Sources retenues → Streaming SSE*). Aucune simulation de « chaîne de pensée ».

---

## 2. Architecture Technique

| Couche | Technologie Retenue | Rôle & Invariants |
|---|---|---|
| **Frontend** | React 19 / Next.js, TypeScript, Tailwind CSS v4 | Dark Mode Premium (#09090b / #121214), types stricts générés depuis OpenAPI, client SSE robuste |
| **Backend API** | FastAPI (Python 3.12+) | Endpoints REST + SSE, validation Pydantic, isolation par `tenant_id` |
| **Authentification** | `fastapi-users` | Mots de passe hachés Argon2id, JWT courte durée, adhésions par rôle (Owner, Admin, Member, Viewer) |
| **Base Relationnelle & Vecteurs** | PostgreSQL 16 + `pgvector` | Table `chunk_embeddings` (HNSW, cosinus, dimension 1024), isolation tenant obligatoire dans le plan SQL |
| **Moteur LLM & Embedding** | Ollama local natif (Windows/WSL2) | Modèle génératif quantifié local + modèle d'embedding par défaut (`bge-m3`), budget de contexte de 16k tokens mesuré |
| **Jobs Asynchrones** | `arq` + Redis | File de parsing et chunking sans blocage de l'API. PostgreSQL reste la source de vérité |
| **Conteneurisation & CI/CD** | Docker Desktop + Compose, GitHub Actions | Déploiement reproductible, CI sans dépendance GPU (tests avec mocks) |

---

## 3. Cartographie des 7 Pages Clés (Validée)

1. **`/` — Landing Page Showcase :** Vitrine Dark Mode Premium, Grille Bento responsive (Ingestion Connectée, Index Vectoriel pgvector, Assistant Sourcé avec citations cliquables).
2. **`/auth/login` — Authentification & Sélecteur de Tenant :** Connexion Argon2id et étanchéité des espaces de travail.
3. **`/app/chat` — Console RAG & Assistant Sourcé :** Streaming Server-Sent Events (SSE) avec gestion de reprise `Last-Event-ID` et inspection de chunks.
4. **`/app/documents` — Ingestion & Versioning Documentaire :** Upload multi-sources (PDF, SQL, Notion, Markdown), statut des jobs ARQ sans écrasement.
5. **`/app/audit` — Inspecteur de Chunks & Audit Pédagogique (V1.1) :** Exploration des passages, checksums SHA256, métadonnées JSONB et scores RRF.
6. **`/app/presets` — Studio des Presets RAG (V1.1) :** Configuration immuable des stratégies de chunking, seuil cosinus et repli en cas de contexte insuffisant.
7. **`/app/observability` — Observabilité & Télémétrie (V1.2) :** Monitoring de la latence TTFT, débit tokens/seconde Ollama, métriques mémoire GPU/RAM.

---

## 4. Dossier de Cadrage & Collaboration Inter-Agents

Pour assurer l'alignement strict entre les agents spécialisés, consultez le répertoire `/guide/` :
- **[`/guide/PLAN_FRONTEND.md`](./guide/PLAN_FRONTEND.md)** : Découpage chronologique en User Stories pour le Frontend, critères d'acceptation par PR, gestion du SSE et des citations.
- **[`/guide/GUIDE_COLLABORATION_AGENTS.md`](./guide/GUIDE_COLLABORATION_AGENTS.md)** : Règles de collaboration pour les agents Backend, Sécurité, IA/RAG, DevOps et QA (séparation des zones de confiance, contrats OpenAPI et SSE, garde-fous anti-régression).

---

## 5. Phase 1 — V1 Réalisée & Vérifiée

La Phase 1 - V1 du front-end RAGTIME est pleinement opérationnelle et testée :
- **US-FRONT-01 :** Contrat OpenAPI strict (`/src/contracts/api-types.ts`) & Architecture Port/Adapter (`ApiClientPort`).
- **US-FRONT-02 :** Isolation Multi-Tenant (`TenantContext`) avec injection systématique du header `X-Tenant-ID` et purge du cache local sur permutation (TNR-02).
- **US-FRONT-03 :** Ingestion documentaire drag-and-drop avec calcul réel SHA256 Web Crypto API, détection de versioning `v+1` sans écrasement (TNR-03) et suivi des statuts de jobs ARQ.
- **US-FRONT-04 :** Console de Chat RAG avec traitement streaming SSE réactif des 8 événements officiels, boutons d'arrêt d'urgence (`AbortController`) et métriques de latence (TTFT, tokens/s).
- **US-FRONT-05 :** Tiroir d'inspection de chunks certifiés avec calcul de similarité cosinus vs seuil et métadonnées JSONB brutes inaltérées (TNR-05).
- **Harnais de Tests :** Tests unitaires (`src/__tests__/`) et test runner interactif in-app pour l'audit en direct.

---

## 6. Démarrage Rapide & Tests

```bash
# 1. Cloner le projet et installer les dépendances
npm install

# 2. Lancer la validation des types TypeScript et tests
npm run lint

# 3. Compiler l'application pour la production
npm run build

# 4. Lancer le serveur de développement
npm run dev # Accessible sur le port 3000
```
