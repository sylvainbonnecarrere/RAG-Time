# 02 — Feuille de Route Stratégique & Évolutions — RAGTIME

> **Statut :** Document Directeur des Jalons (2026)  
> **Classification :** Plan Directeur Inter-Agents  
> **Référence :** `01-architecture.md`, `03-backlog-agents.md`

---

## 1. Vue d'Ensemble des Jalons

```
2026-Q1                2026-Q2                2026-Q3                2026-Q4
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Phase 1 & 2     │──▶│  Phase 3 & 4     │──▶│  Phase 5 & 6     │──▶│  Phase 7 & V2    │
│  MVP + Audit     │   │  Observabilité + │   │  Validation +    │   │  Reranking +     │
│  Pédagogique     │   │  Auth SecNumCloud│   │  Tableaux & SSE  │   │  Dédoublonnage   │
└──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
```

---

## 2. Détail des Jalons & Capacités

### Jalon 1 : V1 (MVP RAG Souverain — Socle Fondateur)
- **Objectif** : Valider l'architecture hexagonale et le flux d'ingestion/retrieval bout-en-bout.
- **Livrables Clés** :
  - Parsing PDF / Markdown / SQL avec découpage déterministe en chunks.
  - Calcul d'embeddings denses 768d via `nomic-embed-text-v1.5` local.
  - Indexation vectorielle PostgreSQL 16 + `pgvector` avec index HNSW.
  - Inférence locale Llama 3.2:3B via Ollama.
  - Streaming SSE des réponses avec badges de citations `[Document, p.X]`.
  - Isolation élémentaire par domaine (`tenant_id`).

---

### Jalon 2 : V1.1 (Audit, Pédagogie & Anti-Hallucination)
- **Objectif** : Garantir la vérifiabilité intégrale et l'explicabilité pour les auditeurs et décideurs.
- **Livrables Clés** :
  - **Tiroir d'Inspection de Chunks** (`ChunkInspectorDrawer`) avec métadonnées JSONB certifiées (SHA256, page, token count, extrait brut inaltéré).
  - Jauges de scores comparatifs (similarité cosinus, rang lexical BM25, seuil minimal).
  - **Pipeline d'Observabilité en 5 étapes réelles** (sans aucune pensée simulée).
  - **Gestion Immuable des Presets RAG** (versionnage incrémental `v1..vN` avec interdiction de mise à jour destructrice in-place).
  - Explorateur d'audit vectoriel exhaustif (`RagAuditExplorerView`).

---

### Jalon 3 : V1.2 (Observabilité Système, GPU & Métriques Prometheus)
- **Objectif** : Mesurer la performance matérielle et l'intégrité opérationnelle en continu.
- **Livrables Clés** :
  - Métriques d'inférence en direct : Time-to-First-Token (**TTFT** en millisecondes), débit de tokens/seconde, occupation de la fenêtre de contexte (ex: 8192 tokens max).
  - Métriques matérielles : consommation de VRAM GPU (Go et %), température, charge CPU.
  - Alertes visuelles de dégradation de performance (ex: TTFT > 800 ms, VRAM > 85%).
  - Historique tabulaire des latences avec pagination et tri.

---

### Jalon 4 : Phase 4 (Authentification SecNumCloud & Expérience Utilisateur Métier)
- **Objectif** : Sécurisation des accès et refonte ergonomique éradiquant tout jargon de dev.
- **Livrables Clés** :
  - Formulaire d'authentification robuste avec validation RFC 5322, masquage anti-énumération, et persistance de session sécurisée.
  - Masquage absolu de « Mon espace RAG » pour les utilisateurs déconnectés.
  - Boutons de connexion de démonstration pour 3 personas cibles (Admin Sécurité, Lead Data Scientist, Responsable RH / Juridique).
  - Remplacement de tous les badges de versionnage interne par des statuts métier valorisants.

---

### Jalon 5 : Phase 5 (Validation Déterministe & Immutabilité Conditionnelle TNR-18)
- **Objectif** : Neutraliser les vulnérabilités d'injection et stabiliser l'espace mathématique vectoriel.
- **Livrables Clés** :
  - Architecture en 3 piliers : Sanitizer déterministe (anti-XSS), Schémas de validation stricts, et composant de feedback visuel contextuel (`FormFieldFeedback`).
  - **Règle TNR-18** :
    - *Espace Vierge* : Mode Édition Libre avec contrôle mathématique `chunk_overlap < chunk_size / 2`.
    - *Espace Alimenté* : Scellement immuable du preset vectoriel dès le premier chunk indexé pour garantir la comparabilité des distances cosinus.

---

### Jalon 6 : Phase 6 (Industrialisation, Raccordement SSE Réel & Tableaux Universels)
- **Objectif** : Expérience utilisateur industrielle et robustesse de streaming en conditions réelles.
- **Livrables Clés** :
  - **UX Universelle des Tableaux** (US-FRONT-25) : moteur de recherche textuel, sélecteur de nombre d'éléments par page, tri sur colonnes sans erreur d'hydratation DOM, pagination fluide.
  - **Raccordement SSE Complet** (US-FRONT-26) : écoute des 8 événements standardisés, personnalisation des consignes système par domaine, toggle d'historique persistant.
  - **Gestion Intégrale des Conversations Antérieures** : récupération instantanée dans la discussion, recherche interne, export multi-formats (Markdown, JSON, TXT) et purge sécurisée unitaire ou collective.

---

### Jalon 7 : Phase 7 (Souveraineté Avancée, Qualité RAG & Résilience Industrielle)
- **Objectif** : Excellence opérationnelle, optimisation de la VRAM, et audit comparatif.
- **Livrables Clés** :
  - **Re-ranking Local Cross-Encoder** (US-FRONT-27) : intégration du modèle `bge-reranker-base` exécuté localement, affichage du gain de pertinence calculé et filtrage du Top-K contextuel.
  - **Déduplication Incrémentale des Chunks** (US-FRONT-28) : détection unitaire des doublons textuels par SHA-256 de chunk, métrique de compression vectorielle et économie de VRAM.
  - **Console de Synthèse Comparative Inter-Domaines** (US-FRONT-29) : requête croisée multi-domaines pour comparer deux doctrines ou corpus documentaires côte-à-côte avec étanchéité stricte des sources.
  - **Mode Déconnecté Air-Gap & Cache Résilient** (US-FRONT-30) : consultation hors-ligne autonome, sauvegarde chiffrée des archives et indicateur d'état réseau souverain.

---

### Jalon 8 : V2 (RAG Hybride Avancé & GraphRAG Local)
- **Objectif** : Interconnexion des entités nommées et navigation graphe relationnel.
- **Axes** :
  - Extraction de triplets d'entités (Sujet, Prédicat, Objet) via Llama 3.2 local.
  - Hybridation vectorielle + graphe de connaissances local dans PostgreSQL (tables de liens ou extension Apache AGE).

---

### Jalon 9 : V3 (Multi-Modal Local & Vision Chunks)
- **Objectif** : Ingestion native de schémas techniques, graphiques d'affaires et organigrammes.
- **Axes** :
  - Découpage et description de visuels via modèle Vision local (Llama 3.2-Vision ou Qwen2-VL).
  - Projection vectorielle conjointe texte-image dans `pgvector`.
