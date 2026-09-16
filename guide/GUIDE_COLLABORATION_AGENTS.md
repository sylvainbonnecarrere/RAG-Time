# Guide de Collaboration Inter-Agents — RAGTIME (2026)

> **Destinataires :** 
> - Agent Backend Python (FastAPI, SQLModel, Alembic, ARQ)
> - Agent Sécurité Applicative & Infrastructure (Auth, Isolation Tenant, Scans)
> - Agent Ingénieur IA / RAG (Ports LlamaIndex, pgvector, Ollama)
> - Agent DevOps / QA (Docker, CI/CD, Tests de non-régression)
> 
> **Émetteur :** Agent Développeur Frontend / UX-UI Senior  
> **Documents d'Autorité :** `01-architecture.md`, `03-backlog-agents.md`, `07-security-model.md`

---

## 1. Protocole de Séquencement d'un Run (Rappel Obligatoire)

Pour chaque incrément, aucun agent ne commence à coder avant que le périmètre n'ait franchi les étapes ordonnées :
```text
1. Tech Lead définit le périmètre du run
2. Backend met à jour le schéma OpenAPI (/openapi.json)
3. Ingénieur IA/RAG définit les contrats internes (Document, Chunk, SearchResult...)
4. Frontend génère automatiquement ses types TypeScript depuis l'OpenAPI
5. Implémentation parallèle Frontend + Backend
6. QA ajoute les tests unitaires et d'intégration
7. Sécurité valide l'isolation tenant et l'absence de fuite
8. DevOps vérifie la CI sans dépendance GPU
```

---

## 2. Note aux Développeurs Backend (FastAPI & ARQ)

### 2.1 Contrat OpenAPI Versionné
- Le frontend s'engage à **ne jamais écrire d'interface ou de type à la main**.
- Veuillez exposer tous les DTO avec descriptions claires et exemples Pydantic.
- Tous les identifiants exposés doivent être des **UUID v4** générés côté serveur (jamais dérivés du nom du fichier).
- Les erreurs de validation (422 / 400) doivent respecter un schéma unifié contenant `code`, `message_user_safe` et `correlation_id`.

### 2.2 Contrat SSE de Streaming (`/api/v1/chat/conversations/{id}/stream`)
Pour la génération de réponses sourcées, le frontend écoute strictement les **8 types d'événements** :
1. `message.started` : Déclenche l'affichage du message assistant en statut `streaming`.
2. `retrieval.started` : Affiche l'étape 02 « Recherche vectorielle ».
3. `retrieval.completed` : Transmet le nombre de chunks candidats trouvés.
4. `generation.started` : Avertit que le prompt a été transmis au runtime Ollama.
5. `generation.delta` : Porte le morceau de texte incrémental (`text_delta`) à concaténer.
6. `sources.available` : Fournit la liste certifiée des `message_source` (id, chunk_id, document_name, score, page).
7. `message.completed` : Signal de fin propre avec métriques (`ttft_ms`, `tokens_per_second`).
8. `message.failed` : En cas d'erreur ou d'interruption Ollama.

**Exigence Reconnexion :** Le serveur doit supporter l'en-tête standard `Last-Event-ID` pour permettre au client de reprendre un flux interrompu sans doublonner les tokens.

---

### 2.3 Spécifications Requises pour l'Agent Backend & Architecte BDD : Liaison Document-Domaine et CRUD Documentaire

> **Contexte Utilisateur :** L'utilisateur a demandé de pouvoir créer librement des domaines différents, de regrouper tous ses documents selon les domaines créés, et de disposer d'une interface complète pour uploader, voir/consulter (aperçu et versions) et supprimer ses documents grâce à un tableau regroupé par domaine.

#### 1. Architecture Base de Données (PostgreSQL / SQLModel / Alembic)
Le schéma BDD doit obligatoirement formaliser la relation stricte entre un document et son domaine d'affectation :
```sql
-- 1. Relation Document -> Tenant / Domaine
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(32) NOT NULL, -- 'pdf', 'markdown', 'sql'
    description TEXT NULL,
    current_version INT NOT NULL DEFAULT 1,
    total_chunks INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index d'isolation et d'agrégation multi-domaines
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_file_type ON documents(file_type);

-- 2. Historique des Versions Immuables (TNR-03)
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    sha256_checksum CHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    chunks_count INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'indexed',
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

-- 3. Table des Chunks pgvector avec clé d'étanchéité
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL, -- nomic-embed-text 768 dimensions
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_chunks_tenant_vector ON document_chunks(tenant_id);
```

#### 2. Endpoints FastAPI à Implémenter en Backend
L'agent backend devra implémenter et exposer les routes suivantes dans `/openapi.json` :
1. `GET /api/v1/documents?grouped_by=domain` :
   - Retourne la liste hiérarchique de tous les domaines accessibles à l'utilisateur avec leurs documents rattachés et statistiques agrégées (nombre de documents, chunks totaux, taille cumulée).
2. `POST /api/v1/documents/upload` :
   - Accepte `file` (multipart), ainsi que les paramètres obligatoires `tenant_id` (domaine d'affectation choisi par l'utilisateur) et `description` (optionnelle).
   - Calcule et vérifie le SHA-256 côté serveur pour comparaison avec le SHA-256 transmis par le client.
3. `GET /api/v1/documents/{document_id}` :
   - Consultation détaillée d'un document : métadonnées complètes, liste ordonnée des versions `v1..vN` avec leurs checksums, aperçu textuel initial pour l'UI.
4. `DELETE /api/v1/documents/{document_id}` :
   - **Règle de purge critique :** La suppression d'un document doit impérativement déclencher la suppression en cascade de l'ensemble de ses vecteurs d'embedding dans `document_chunks` afin de libérer l'espace dans l'index HNSW pgvector et garantir qu'aucun chunk orphelin ne puisse être extrait lors des futures recherches sémantiques.
5. `DELETE /api/v1/documents/{document_id}/versions/{version_number}` :
   - Supprime une révision obsolète tout en recalculant le `current_version` actif si nécessaire.

### 2.4 Spécifications Requises : Initialisation de Compte Vierge & Comportement RAG lors de Domaines Sans Documents
- **Détection Compte / Domaine Vierge :** Lorsqu'un utilisateur vient de s'inscrire ou sélectionne un domaine ne comportant encore aucun document indexé (`documents_count == 0`), le chat RAG doit refuser l'envoi de prompt ou renvoyer un statut explicite `{"status": "no_documents_indexed", "action": "upload_required"}`.
- **Interdiction Formelle d'Hallucination :** Conformément à l'éthique de RAGTIME, l'inférence locale Llama 3.2 ne doit JAMAIS tenter de répondre « à l'aveugle » sans chunks pgvector de référence. Le backend doit intercepter ces requêtes et inviter formellement l'utilisateur à téléverser ses documents.
- **Support du Sélecteur de Domaine Direct dans le Chat :** Le backend doit accepter le paramètre `tenant_id` ou le header `X-Tenant-ID` sur `/api/v1/chat/conversations/{id}/stream` pour router instantanément l'isolation vectorielle pgvector vers le domaine choisi par l'utilisateur directement depuis le chat, sans exiger de reconnexion globale.

### 2.5 Spécifications Requises : Cycle de Vie et Suppression d'un Domaine RAG (`DELETE /api/v1/tenants/{tenant_id}`)
- **Endpoint Backend Requis :** `DELETE /api/v1/tenants/{tenant_id}`
- **Règle de Sauvegarde (Fail-Safe) :** Si l'utilisateur tente de supprimer son unique domaine restant, le serveur DOIT renvoyer un statut `400 Bad Request` avec le code d'erreur `CANNOT_DELETE_LAST_TENANT` : *« Impossible de supprimer le dernier espace de travail : au moins un domaine doit rester configuré. »*
- **Purge en Cascade Obligatoire :**
  1. Purge de tous les enregistrements `documents` rattachés au `tenant_id`.
  2. Purge immédiate de la partition pgvector `document_chunks WHERE tenant_id = :tenant_id` avec libération de la mémoire de l'index HNSW.
  3. Suppression des révisions de presets RAG associées au tenant.
  4. Réassignation automatique du tenant actif vers le premier tenant subsistant pour la session utilisateur en cours.

---

## 3. Note à l'Agent Sécurité (Applicative & Infrastructure)

### 3.1 Périmètre de Confiance Frontend
Conformément au document `07-security-model.md` (§2 et §13) :
- **Le navigateur est considéré comme une zone NON FIABLE.**
- Le frontend n'applique aucun contrôle de sécurité critique : toutes les autorisations, vérifications d'adhésion (`membership`), et limitations de quotas de requêtes sont **strictement validées côté serveur**.
- Le frontend ne fabrique jamais d'identifiant de source ou de chunk. Les identifiants transmis par l'UI dans les requêtes d'inspection sont systématiquement validés par le backend (`tenant_id = current_tenant`).

### 3.2 Données Sensibles & Secrets
- **Zéro clé secrète dans le bundle front-end :** aucun token maître, clé API ou mot de passe ne réside dans le code Next.js / Vite.
- `.env.example` ne contient que des clés factices.
- Le contenu utilisateur et les extraits de documents sont **échappés et sanitizés** avant tout rendu Markdown pour neutraliser tout risque d'attaque **XSS**.

### 3.3 Isolation Multi-Tenant
- Bien que l'interface permette la sélection visuelle d'un tenant actif pour l'utilisateur, l'API FastAPI vérifie à chaque appel que le `user_id` possède une adhésion active dans le `tenant_id` demandé.
- En cas de session expirée ou révoquée, le frontend intercepte le code `401/403` et redirige instantanément vers l'écran d'authentification.

---

## 4. Note à l'Ingénieur IA / RAG

### 4.1 Règle de Transparence sans « Pensée Simulée »
- Dans la V1.1 (Audit & Pédagogie), l'interface expose les **métriques réelles mesurées** (scores cosinus, rang RRF, temps de réponse, tokens consommés).
- **Interdiction formelle :** Ne générez jamais de fausse chaîne de pensée (*chain-of-thought*) inventée pour combler l'absence de données. Si un chunk n'a pas été retenu en raison d'un seuil trop bas, l'API renvoie l'événement `fallback_applied` avec le seuil numérique réel.

### 4.2 Formats de Citations
Les étiquettes cliquables doivent pouvoir être reconstituées à partir des métadonnées du chunk :
- `document_name` : Nom affichable du document.
- `page_number` : Numéro de page (si PDF).
- `location` : Chemin de section ou nom de table (si SQL).
- `similarity_score` : Score numérique flottant [0.0 - 1.0].

---

## 5. Matrice des Contacts & Responsabilités

| Domaine | Agent Référent | Fichiers Sous sa Responsabilité |
|---|---|---|
| **Frontend UI/UX** | Dev Frontend | `frontend/`, `src/components/`, `src/data/`, `src/types/` |
| **Backend & ORM** | Dev Backend | `backend/app/api/`, `backend/app/services/`, `alembic/` |
| **Pipelines RAG** | Ingénieur IA | `backend/app/domain/ports/`, `backend/app/infrastructure/rag/` |
| **Audit & Sécurité** | Sécurité | `backend/app/core/security.py`, scanners de vulnérabilités |
| **Infra & CI/CD** | DevOps | `docker-compose.yml`, `.github/workflows/`, `setup.ps1` |

---

## 6. Spécifications Détaillées Phase 2 — V1.1 (Audit & Pédagogie)

### 6.1 Presets RAG & Immutabilité (TNR-05 & US-FRONT-07)
Afin de garantir une traçabilité rigoureuse et de respecter la règle de non-régression **TNR-05**, toute modification apportée aux paramètres de retrieval d'un preset actif (`is_active: true`) doit impérativement respecter les règles suivantes :

1. **Interdiction d'écrasement (UPDATE in-place) :** La ligne existante dans la table `rag_presets` ne doit jamais être modifiée sur ses paramètres de chunking ou de retrieval.
2. **Création d'une révision incrémentale `v+1` :** Le backend génère une nouvelle entrée avec `version = previous_version + 1`, `parent_preset_id = previous_id`, et active la nouvelle version tout en désactivant l'ancienne.
3. **Contrat d'API FastAPI attendu :**
   ```python
   # POST /api/v1/tenants/{tenant_id}/presets/{preset_id}/versions
   class RagPresetUpdateRequest(BaseModel):
       name: Optional[str]
       chunk_size: int = Field(ge=128, le=2048)
       chunk_overlap: int = Field(ge=0, le=500)
       similarity_threshold: float = Field(ge=0.0, le=1.0)
       retrieval_top_k: int = Field(ge=1, le=20)
       rerank_enabled: bool = True
       embedding_model: str
   ```
4. **Infobulles Pédagogiques du Frontend :** Le frontend guide l'administrateur avec des infobulles claires explicitant l'impact de chaque curseur :
   - *Chunk Size* : balance entre contextualité sémantique et dilution informationnelle.
   - *Chunk Overlap* : garantie de continuité thématique aux frontières de découpe.
   - *Seuil Cosinus* : compromis entre rappel exhaustif et factualité stricte anti-hallucination.

---

### 6.2 Audit des Chunks pgvector & Métadonnées JSONB (US-FRONT-05 & TNR-04)
Le tiroir d'inspection (`ChunkInspectorDrawer`) et le tableau d'audit (`RagAuditExplorerView`) exigent des données authentiques directement issues de pgvector et du parseur :

1. **Endpoint d'audit des chunks :**
   ```text
   GET /api/v1/tenants/{tenant_id}/chunks?document_id={uuid}&min_score={float}&limit={int}
   ```
2. **Métadonnées JSONB Certifiées :** Chaque chunk retourné comporte l'extrait brut inaltéré, le SHA-256 du document d'origine, le modèle d'embedding (ex: `nomic-embed-text-v1.5`), le compte exact de tokens, ainsi que le vecteur ou son extrait représentatif pour vérification cryptographique.
3. **Règle d'or UI :** L'interface n'invente et n'édite jamais une citation. La conformité à l'invariant RAGTIME certifie que tout extrait affiché provient à 100% de la partition vectorielle du tenant courant.

---

### 6.3 Observabilité du Pipeline en 5 Étapes sans Pensée Simulée (US-FRONT-06)
1. Le pipeline timeline est synchronisé exclusivement sur les flux SSE émis par le backend FastAPI :
   - `Étape 1 - Reçu` : Horodatage dès réception de la requête utilisateur sur l'API Gateway.
   - `Étape 2 - pgvector` : Index HNSW partitionné exécutant la recherche cosinus dense (m=16, ef_construction=64).
   - `Étape 3 - Isolation` : Clause stricte `WHERE tenant_id = :current_tenant` appliquée au niveau SQL.
   - `Étape 4 - Chunks` : Filtrage selon `similarity_threshold` et réordonnancement via Cross-Encoder `bge-reranker-base`.
   - `Étape 5 - Ollama SSE` : Début du streaming incrémental du modèle local (Llama 3.2:3b).
2. **Interdiction de la pensée simulée :** Zéro simulation de raisonnement, zéro affichage de fausses réflexions « je cherche dans vos fichiers... » si aucun événement réel n'est émis. Seuls les états techniques réels sont représentés.

---

## 7. Travail Réalisé en Phase 4 & Recommandations pour les Futurs Agents

### 7.1 Synthèse du Travail Front-End Réalisé en Phase 4
1. **POC d'Authentification & Gestion de Session (`src/components/v1/AuthLoginView.tsx`, `src/context/AuthContext.tsx`) :**
   - Implémentation d'une vue de connexion dédiée et responsive conforme aux exigences SecNumCloud/Argon2id.
   - Mock d'authentification résilient répondant toujours `true` avec validation du formulaire, prise en charge de "Se souvenir de moi" et persistance sécurisée de session via `sessionStorage`.
   - Boutons de connexion démo en 1 clic pour 3 profils types (Admin Sécurité, Lead Data Scientist, Responsable RH / Juridique).
2. **Guard de Navigation & Masquage de l'Espace RAG (`src/App.tsx`, `src/components/Navbar.tsx`) :**
   - Masquage absolu de l'onglet « Mon espace RAG » tant que l'utilisateur est déconnecté.
   - Remplacement du CTA supérieur par « Se connecter » qui ouvre la vue de login.
   - Redirection automatique vers `/auth/login` si un utilisateur déconnecté déclenche une action interne.
   - Une fois connecté : affichage de la pastille utilisateur avec bouton de déconnexion et accès direct à « Mon espace RAG ».
3. **Refonte de l'Identité Visuelle & Élimination des Badges Internes :**
   - Mise à niveau du background global en `#4a5467` pour un contraste et une lisibilité accrus sous le header sombre `#12161f`.
   - Éradication de toutes les mentions de développement ("Phase 1", "Phase 2", "V1.2") au profit de labels utilisateurs orientés métier ("Mon espace RAG", "Ouvrir le Chat RAG", "Indexation pgvector Active", "Cluster En Direct").
   - Mise à jour de la cartographie des 7 pages clés dans `FrontendProposalView.tsx` avec badges « POC Live & Fonctionnel » et boutons de test direct vers chaque vue.

---

### 7.2 Recommandations pour l'Agent Backend Python (FastAPI & fastapi-users)
1. **Brancher `fastapi-users` sur l'UI sans rupture de contrat :**
   - Le composant `AuthLoginView.tsx` et le service `apiClient.ts` sont déjà structurés pour consommer le format standard OAuth2 Password Request (`username`, `password`).
   - Remplacer le mock par l'appel à `POST /api/v1/auth/jwt/login`.
   - Renvoyer le JWT dans un cookie HTTP-Only sécurisé (`SameSite=Strict, Secure=True`) pour protéger l'application contre les attaques XSS.
2. **Gestion du Tenant par Défaut au Login :**
   - Inclure dans le payload de retour du login (`GET /api/v1/users/me`) la liste des tenants accessibles par l'utilisateur ainsi que le `default_tenant_id`.
   - Cela permettra au frontend d'initialiser immédiatement le `TenantContext` sans requête intermédiaire superflue.

---

### 7.3 Recommandations pour l'Agent Sécurité Applicative
1. **Durcissement des Politiques de Mots de Passe & Hachage Argon2id :**
   - Appliquer les recommandations ANSSI : Argon2id avec sel cryptographique de 16 octets, coût mémoire $m = 65536$ (64 Mo), coût temps $t = 3$, parallélisme $p = 4$.
2. **Rate Limiting & Protection Anti-Brute-Force :**
   - Configurer un middleware SlowAPI / Redis limitant les tentatives sur `/api/v1/auth/jwt/login` à 5 requêtes/minute par adresse IP.
   - Renvoyer des messages d'erreur uniformes (`Identifiants invalides`) sans jamais préciser si c'est l'email ou le mot de passe qui est erroné (anti-énumération de comptes).

---

### 7.4 Recommandations pour les Futurs Agents Frontend
1. **Respect de l'Invariance de Cloisonnement :**
   - Ne jamais charger de données métier (documents, chunks, presets) au niveau de la racine globale si l'utilisateur n'est pas authentifié.
   - Veiller à ce que l'appel à `logout()` déclenche impérativement la purge totale des states React et du `sessionStorage`.
2. **Maintien de la Cohérence Typographique & Couleurs :**
   - Conserver la hiérarchie de contraste établie (`#4a5467` pour le fond corporel sous le header sombre `#12161f`), interdisant le recours aux fonds noirs uniformes non texturés.
   - Éviter d'introduire des libellés techniques de versionnage dans les composants finaux destinés aux utilisateurs.

---

## 8. Système Robuste & Sécurisé de Validation de Formulaires (Phase 5 — US-FRONT-19 à 24, TNR-18/19)

### 8.1 Architecture en 3 Piliers

L'ensemble des formulaires et points d'entrée de données de l'application repose sur une architecture de validation déterministe et assainie sans dépendance externe superflue :

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     1. Assainissement Pur (Sanitization)                │
│                     src/lib/validation/sanitizer.ts                     │
│  - sanitizeInput : neutralisation XSS (<script>, tags, control chars)   │
│  - sanitizeFilename : suppression ../, null bytes, caractères réservés │
│  - sanitizeSlug : normalisation kebab-case sécurisée                    │
│  - sanitizePrompt : neutralisation injection et élagage des répétitions │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    2. Schémas de Validation Déterministes               │
│                     src/lib/validation/schemas.ts                       │
│  - validateLoginForm (email RFC 5322, mdp >= 8 car.)                    │
│  - validateTenantForm (slug unique, nom >= 3, catégorie, prompt)       │
│  - validateDocumentUpload (whitelist ext, taille <= 25Mo, nom assaini)  │
│  - validatePresetParams (bornes token, chunk_overlap < size/2, TNR-18)  │
│  - validateChatQuery (prompt assaini, longueur 3-2000 car., doc count)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   3. Composant Visuel de Feedback UI                    │
│                 src/components/v1/FormFieldFeedback.tsx                 │
│  - Erreur bloquante (rose-400 / rose-950/40)                            │
│  - Avertissement / Conseil pédagogique (amber-400 / amber-950/40)       │
│  - Succès / Validation (emerald-400)                                    │
│  - Respect scrupuleux du webdesign RAGTIME (contrastes, typographie)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Règle d'Or TNR-18 : Immutabilité Conditionnelle des Presets RAG

La règle d'immutabilité a été formalisée et clarifiée pour concilier **flexibilité d'onboarding** et **rigueur mathématique vectorielle** :

1. **Espace Vierge (`documents_count === 0`) :**
   - **Mode Édition Libre Activé** : L'utilisateur ou administrateur peut librement ajuster, tester et sauvegarder les hyperparamètres (Chunk Size, Overlap, Seuil Cosinus, Modèle pgvector, Top-K, Cross-Encoder).
   - Validation mathématique stricte à la sauvegarde : `chunk_overlap < chunk_size / 2` (garantie anti-redondance).
   - Badge visuel vert : `(Mode Édition Libre)`.
2. **Espace Alimenté (`documents_count > 0`) :**
   - **Preset Strictement Immuable (Scellé)** : Dès lors que le premier document est ingéré et converti en vecteurs `vector(768)` dans PostgreSQL / pgvector, toute modification du preset est **définitivement verrouillée**.
   - Pourquoi cette rigueur ? Modifier la taille de chunk ou le modèle d'embedding sur un espace où des chunks existent déjà briserait la comparabilité des distances cosinus et violerait l'auditabilité absolue des citations.
   - Badge visuel ambre : `🔒 Preset Immuable (Scellé)`.
   - Bouton de sauvegarde désactivé et remplacé par l'indicateur de scellement.
   - Pour tester d'autres configurations, l'utilisateur est invité à créer un nouveau domaine ou utiliser l'Espace Sandbox vierge.

### 8.3 Recommandations pour l'Agent Backend & Sécurité

1. **Validation en Miroir côté FastAPI :**
   - Ne jamais présumer que la validation côté client est suffisante. Les schémas Pydantic backend doivent répliquer exactement les mêmes bornes (`chunk_size` entre 256 et 1024, `similarity_threshold` entre 0.50 et 0.95, etc.).
   - Le backend doit également vérifier l'invariant `TNR-18` : si `SELECT count(*) FROM document_chunks WHERE tenant_id = :id > 0`, toute requête `PUT /api/v1/tenants/{id}/presets/{preset_id}` doit retourner un code HTTP `409 Conflict` ou `422 Unprocessable Entity` avec message d'immutabilité explicite.
2. **Gestion des Erreurs Standardisées :**
   - Renvoyer des réponses d'erreurs au format JSON `{ "field": "nom_du_champ", "message": "..." }` pour permettre au composant `FormFieldFeedback` de mapper instantanément les erreurs réseau sous les champs idoines.

---

## 9. Phase 6 — Industrialisation Souveraine, Raccordement Réel & UX Universelle Avancée

### 9.1 Synthèse des Évolutions Majeures du Frontend
1. **Console RAG Temps Réel & Personnalisation Système :**
   - Ajout du libellé textuel explicite `Personnalisation système` sur le bouton de configuration des consignes de domaine dans `SourcedChatView`.
   - Contrôle d'historique persistant : activation/désactivation par domaine avec stockage dans `localStorage`.
   - Gestion intégrale de la conversation : archivage nommé avec horodatage (`SavedConversationsModal`), export instantané multi-formats (Markdown, JSON, TXT) et copie presse-papier avec confirmation visuelle.
2. **UX Universelle des Tableaux (US-FRONT-25 / TNR-20) :**
   - Déploiement transversal d'un système de pagination, tri multi-critères et sélecteur de nombre maximum d'éléments (`useTablePagination`, `TablePaginationBar`, `TableSortHeader`).
   - Couverture complète de l'espace RAG : `DocumentIngestionView` (documents du domaine actif et vue groupée multi-domaines), `RagAuditExplorerView` (inventaire des chunks pgvector), `TelemetryDashboardView` (historique des latences et inférences).
3. **Contrats d'Ingestion Asynchrone & Métriques Prometheus :**
   - Types `AsyncIngestionJobProgress`, `SavedConversationSession`, et `PrometheusMetricEntry` formalisés dans `src/contracts/api-types.ts`.

---

### 9.2 Directives & Conséquences pour l'Agent Backend Python (FastAPI & ARQ)

#### 1. Raccordement SSE Réel (`POST /api/v1/chat/stream`)
- L'endpoint de streaming doit impérativement respecter les **8 événements SSE standardisés** :
  - `message.started` -> `retrieval.started` -> `retrieval.completed` -> `generation.started` -> `generation.delta` -> `sources.available` -> `message.completed` -> `message.failed`.
- Le backend doit lire le header `X-Tenant-ID` pour charger le prompt système métier du domaine (personnalisable via la console) et filtrer rigoureusement la table `document_chunks`.
- Respect du header `Last-Event-ID` pour assurer la tolérance aux micro-coupures réseau sans token dupliqué.

#### 2. Worker ARQ d'Ingestion Asynchrone (`POST /api/v1/documents/upload-async` & `GET /api/v1/documents/jobs/{job_id}`)
- Pour tout document > 1 Mo ou multi-pages, le backend doit renvoyer un `job_id` (UUID v4) avec code HTTP `202 Accepted`.
- Le worker ARQ met à jour l'état dans Redis selon la séquence d'étapes :
  `pending` -> `extracting` -> `chunking` -> `embedding` -> `indexing` -> `completed | failed`.
- L'endpoint `GET /api/v1/documents/jobs/{job_id}` doit retourner un objet `AsyncIngestionJobProgress` avec `progress_percentage` et `chunks_processed`.

---

### 9.3 Directives pour l'Agent DevOps / MLOps (Prometheus & Observabilité)

#### 1. Exposition des Métriques Prometheus (`/metrics`)
- L'agent DevOps doit configurer le scraper Prometheus pour collecter :
  - `ragtime_query_ttft_seconds` (Histogramme des TTFT).
  - `ragtime_query_tokens_per_second` (Gauge/Summary).
  - `ragtime_vram_usage_bytes` et `ragtime_context_window_occupancy_ratio`.
  - `ragtime_service_health{service="fastapi|pgvector|ollama|redis_arq"}`.
- Les seuils d'alerting définis côté frontend doivent être synchronisés avec Prometheus Alertmanager :
  - TTFT > 800 ms (Alerte Dégradation Inférence).
  - Contexte VRAM > 85% (Warning Tronquage Prompt).
  - Service injoignable > 30s (Alerte Critique Infrastructure).

---

### 9.4 Directives pour l'Agent Sécurité Applicative

1. **Isolation Cryptographique des Exports Multi-Formats (US-FRONT-28 / TNR-23) :**
   - Les exports JSON et Markdown générés par la plateforme contiennent des extraits documentaires et des hashes SHA-256 certifiés.
   - L'agent sécurité doit valider qu'aucun token d'accès, clé API, adresse IP interne ou secret de session n'est injecté dans les métadonnées des exports.
2. **Audit des Droits sur l'Historique de Conversation :**
   - L'historique stocké côté client est strictement isolé par `tenantId`. L'agent sécurité doit s'assurer que lors d'une déconnexion ou d'un changement de tenant, aucun échange du domaine précédent ne reste accessible dans le DOM ou dans les stores partagés.
