# Protocole de Passage de Relais Backend ➔ Sécurité / SecOps (Jalon 1)

> **Date :** Octobre 2026  
> **Émetteur :** Agent Développeur Backend Senior  
> **Destinataire :** Agent Sécurité Applicative & Conformité SecNumCloud  
> **Documents Faisant Autorité :**  
> - [PLAN_SECURITE.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_SECURITE.md)  
> - [AGENT_SECURITE.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/agents/AGENT_SECURITE.md)  
> - [PLAN_GENERAL_JALONNE.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_GENERAL_JALONNE.md)  
> - [PLAN_BACKEND.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_BACKEND.md)  
> - `architecture/07-security-model.md` & `architecture/01-architecture.md`  
> - [SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md](file:///c:/AITest/RAGTIME/RAG-Time/architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md)  

---

## 1. État des Lieux & Socle Livré par le Backend (Certifié 100% au Vert)

L'Agent Backend confirme la livraison et la validation des composants BDD, persistance et API :

| Composant | Point d'Accès / Fichiers Clés | Statut & Paramètres Vérifiés |
|---|---|---|
| **Schéma SQL & Alembic** | [`alembic/versions/001_initial_schema_rls_freeze.py`](file:///c:/AITest/RAGTIME/RAG-Time/alembic/versions/001_initial_schema_rls_freeze.py) | Migration `001_init_schema (head)` appliquée en base. Tables : `tenants`, `documents`, `document_versions`, `document_chunks`, `rag_presets`, `query_logs`. |
| **Modèles SQLModel DTO** | [`backend/app/models/`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/models/) | Modèles Pydantic v2 stricts : types UUID v4 exclusifs, colonnes `metadata JSONB` indexées en GIN, et colonne `embedding vector(768)` indexée HNSW (`vector_cosine_ops`, $m=16$, $ef=64$). |
| **Row-Level Security (RLS)** | [`backend/app/core/database.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/core/database.py) | Politiques `tenant_isolation_policy` actives avec `FORCE ROW LEVEL SECURITY`. Rôle applicatif non-privilégié `ragtime_app` (`NOSUPERUSER`, `NOBYPASSRLS`). |
| **Session & Connection Pooling** | `get_tenant_session(tenant_id)` | Injection du tenant via `set_config('app.current_tenant_id', :id, false)`. **Nettoyage garanti** par `RESET app.current_tenant_id;` dans le bloc `finally` pour neutraliser le risque de pollution du pool `asyncpg`. |
| **Trigger d'Immutabilité TNR-18** | PostgreSQL `trg_freeze_preset_on_ingested_docs` | Double barrière : vérification applicative (`HTTP 409 Conflict`) + exception SQL `CANNOT_MODIFY_FROZEN_PRESET` en cas de tentative d'altération in-place d'un preset alimenté. |
| **Passerelle API REST FastAPI** | [`backend/app/api/v1/router.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/api/v1/router.py) | Endpoints `/api/v1/tenants` (avec seeding automatique des 3 presets usine et garde-fou TNR-08), `/api/v1/tenants/{id}/presets`, et probe dynamique `/health` (Postgres, Redis, Ollama). |
| **Harnais de Tests Pytest** | [`backend/tests/`](file:///c:/AITest/RAGTIME/RAG-Time/backend/tests/) | **18/18 tests unitaires & intégration au vert (100%)** en 1.66s. |
| **Banc d'Essai TNR Global** | [`scripts/run_tnr_suite.py`](file:///c:/AITest/RAGTIME/RAG-Time/scripts/run_tnr_suite.py) | **31/31 TNR validés à 100.0%**. |

---

## 2. Feuille de Route pour l'Agent Sécurité / SecOps — Jalon 1 (Priorité 1)

Conformément à la méthodologie en **5 étapes** définie dans [AGENT_SECURITE.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/agents/AGENT_SECURITE.md) et au [PLAN_SECURITE.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_SECURITE.md), voici les chantiers à réaliser :

###  US-SEC-01 : Modélisation des Menaces STRIDE & Politiques RLS PostgreSQL
- **Contexte :** Les politiques RLS initiales sont posées sur `documents`, `document_chunks`, `rag_presets` et `query_logs`. L'agent Sécurité doit auditer et durcir ces politiques contre les vecteurs de menace STRIDE :
  - **Spoofing / Elevation of Privilege :** Tentative de requêtes brutes sans en-tête `X-Tenant-ID` ou injection de chaîne vide.
  - **Tampering :** Tentative d'insertion ou modification de chunks d'un tenant B depuis une session authentifiée sous le tenant A.
  - **Information Disclosure :** Tentative de fuite de métadonnées ou de vecteurs par jointures SQL transversales.
- **Règles d'Or & Attentes :**
  - Confirmer que le rôle de connexion applicative `ragtime_app` est strictement non-superuser (`NOSUPERUSER`, `NOBYPASSRLS`).
  - S'assurer que `app.current_tenant_id` ne peut pas être manipulé par des paramètres de requêtes non validés.
  - Rédiger des tests de pénétration / leak dans `backend/tests/test_security_rls_leak.py` consolidant l'invariant **TNR-02**.

---

###  US-SEC-02 : Authentification Souveraine Argon2id & Sessions en Cookies HTTP-Only
- **Contexte :** RAGTIME applique les normes de l'ANSSI pour la protection des identités et l'éradication du vol de session par injection XSS.
- **Exigences Techniques Cryptographiques :**
  - Implémenter le module de sécurité dans `backend/app/core/security.py`.
  - **Hachage Argon2id :** Utiliser la bibliothèque `argon2-cffi` (déjà installée dans l'environnement) avec les paramètres recommandés par l'ANSSI :
    * Mémoire vive : $m = 64\text{ Mo}$ (`memory_cost=65536`)
    * Itérations : $t = 3$ (`time_cost=3`)
    * Parallélisme : $p = 4$ (`parallelism=4`)
    * Sel cryptographique aléatoire de 16 octets (`salt_len=16`)
  - **Délivrance de Jeton JWT Sécurisé :**
    * Algorithme `HS256` avec sel secret issu de `settings.SECRET_KEY`.
    * Expiration courte ou configurable (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`).
    * **Règle absolue :** Le jeton d'accès JWT doit être véhiculé **exclusivement** via un cookie sécurisé :
      `HttpOnly=True, SameSite=Strict, Secure=True` (ou `Secure=False` en dev localhost si HTTP pur).
    * **Zéro fuite :** Zéro token JWT renvoyé dans le corps de réponse JSON ou accessible au DOM / `localStorage` (protection anti-XSS et conformité **TNR-13**).
  - **Endpoints & Dépendances d'Authentification :**
    * Créer le router `backend/app/api/v1/endpoints/auth.py` (`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`).
    * Implémenter la dépendance FastAPI d'extraction de session `get_current_tenant_user` dans `backend/app/api/deps.py`.
    * À la déconnexion (`/logout`), positionner l'en-tête `Set-Cookie` avec expiration immédiate pour purger le cookie de session.

---

## 3. Points d'Attention Cruciaux & Invariants Bloquants

1. **Piège du Connection Pooling asyncpg & RLS :**
   Dans [`backend/app/core/database.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/core/database.py), toute session tenant applique :
   ```sql
   SET ROLE ragtime_app;
   SELECT set_config('app.current_tenant_id', :tenant_id, false);
   ```
   Et exécute obligatoirement dans son bloc `finally` :
   ```sql
   RESET app.current_tenant_id;
   RESET ROLE;
   ```
   Toute extension d'authentification ou nouveau middleware doit impérativement respecter ce schéma de nettoyage.
2. **Notification UI lors d'un Reset de Session :**
   Le middleware [`TenantContextMiddleware`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/core/database.py) surveille l'en-tête `X-Tenant-ID`. En cas de token manquant, corrompu ou réinitialisé, il émet l'en-tête de réponse HTTP `X-Tenant-Session-Reset: true` afin que l'interface utilisateur informe l'usager via une notification explicite.
3. **Anti-Énumération de Compte :**
   Toute tentative de connexion infructueuse sur `/login` doit retourner un code `401 Unauthorized` générique (`"Identifiants invalides"`), sans jamais révéler si l'identifiant existe ou non.

---

## 4. Commandes de Validation pour l'Agent Sécurité

```powershell
# 1. Vérifier la disponibilité des briques d'infrastructure (Postgres, Redis, Ollama)
python scripts/verify_backend_readiness.py

# 2. Exécuter l'ensemble de la suite de tests unitaires et d'intégration
pytest backend/tests/ -v

# 3. Lancer le banc d'essai complet des 31 Tests de Non-Régression
python scripts/run_tnr_suite.py

# 4. Vérifier la conformité du code et du typage
npm run lint
```
