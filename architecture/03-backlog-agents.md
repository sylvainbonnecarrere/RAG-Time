# 03 — Backlog Détaillé des Agents & Matrice TNR — RAGTIME

> **Statut :** Spécification Opérationnelle Inter-Agents  
> **Conformité :** Méthode Agile Souveraine, Rigueur BDD/TDD  
> **Documents Liés :** `01-architecture.md`, `02-roadmap.md`, `07-security-model.md`

---

## 1. Rôles & Matrice RACI des Agents

| Rôle Agent | Responsabilités Primaires | Livrables Attendus |
|---|---|---|
| **Tech Lead** | Architecture globale, validation des PRs, arbitrage technique | Schémas maîtres, directives de run, arbitrage des invariants |
| **Backend Python** | FastAPI, SQLModel, PostgreSQL/pgvector, worker ARQ/Redis | API REST, contrôleurs SSE, migrations Alembic, tâches async |
| **Ingénieur RAG / IA** | Parsing documents, chunking, embeddings, RRF & Re-ranking | Pipelines LlamaIndex/LangChain purs, prompts Ollama, guardrails |
| **Frontend UX/UI** | Interface Next.js/React, Tailwind CSS v4, validation réactive | Vues responsive, visualisations D3/Recharts, streaming SSE, audits |
| **Sécurité & Conformité** | Modèle de menace, SecNumCloud, scans vulnérabilités, RGPD | Règles RBAC, isolation tenant SQL, politiques de chiffrement |
| **DevOps & QA** | Docker Compose, packaging Air-gap, CI/CD, tests automatisés | Images conteneurisées, benchmarks GPU/CPU, suites TNR |

---

## 2. Matrice Complète des Tests de Non-Régression (TNR)

| Identifiant | Intitulé du Test de Non-Régression | Périmètre | Règle d'Or Bloquante |
|---|---|---|---|
| **TNR-01** | `tnr-contract-diff.test.ts` | Contrats OpenAPI | Aucun champ obligatoire ne peut être supprimé ou renommé sans incrément majeur. |
| **TNR-02** | `tnr-tenant-isolation-ui.test.ts` | Isolation Multi-Tenant | Basculement de tenant purge instantanément tous les caches mémoire et stores locaux. |
| **TNR-03** | `tnr-document-versioning.test.ts` | Versionnage Documentaire | Un upload homonyme crée une version `v+1` immuable avec nouveau SHA256 sans écraser `v1`. |
| **TNR-04** | `tnr-chunk-metadata-integrity.test.ts` | Audit Vectoriel | Tout extrait affiché dans l'UI doit comporter les métadonnées JSONB certifiées issues de pgvector. |
| **TNR-05** | `tnr-preset-immutability.test.ts` | Presets RAG | Modification d'un preset actif engendre une révision incrémentale distincte ; écrasement interdit. |
| **TNR-06** | `tnr-stream-reconnection.test.ts` | Résilience SSE | Reprise fluide du streaming après coupure via `Last-Event-ID` sans duplication de tokens. |
| **TNR-07** | `tnr-xss-sanitization.test.ts` | Sécurité Applicative | Neutralisation absolue des balises `<script>`, `onerror`, `javascript:` dans les extraits Markdown. |
| **TNR-08** | `tnr-domain-delete-guard.test.ts` | Gestion Domaines | Blocage strict de la suppression du dernier domaine restant (fail-safe 1 domaine min.). |
| **TNR-09** | `tnr-empty-domain-guard.test.ts` | Éthique Anti-Hallucination | Interdiction formelle d'interroger le LLM sur un domaine sans document indexé (`doc_count == 0`). |
| **TNR-10** | `tnr-hardware-telemetry.test.ts` | Observabilité | Les métriques TTFT, tokens/s et VRAM proviennent des capteurs réels, sans fausse télémétrie. |
| **TNR-11** | `tnr-auth-guard-navigation.test.ts` | Sécurité Navigation | Les routes et vues RAG sont inaccessibles sans authentification valide active. |
| **TNR-12** | `tnr-password-complexity.test.ts` | Sécurité Accès | Rejet des mots de passe faibles (< 8 car., sans chiffre ou majuscule) selon RFC ANSSI. |
| **TNR-13** | `tnr-session-storage-purge.test.ts` | Sécurité Données | La déconnexion vide immédiatement le storage navigateur et les contextes de session. |
| **TNR-14** | `tnr-citation-label-format.test.ts` | Affichage Citations | Les chips de citation respectent la nomenclature `[Nom, p.X]` sans rupture de texte. |
| **TNR-15** | `tnr-dom-hydration-clean.test.ts` | Qualité Front-end | Zéro erreur ou warning d'hydratation DOM React (ex: interdiction d'imbrication `<th><th>`). |
| **TNR-16** | `tnr-table-pagination-bounds.test.ts` | Ergonomie Tableaux | La modification de taille de page réinitialise la pagination sur une page valide (`page <= max_pages`). |
| **TNR-17** | `tnr-multi-format-export.test.ts` | Export Données | Les exports JSON/Markdown/TXT comportent la traçabilité des hashes sans exposer de secrets internes. |
| **TNR-18** | `tnr-preset-freeze-on-docs.test.ts` | Immutabilité Mathématique | Un preset rattaché à un domaine possédant >= 1 document est rigoureusement scellé et non éditable. |
| **TNR-19** | `tnr-form-validation-feedback.test.ts` | Validation Formulaires | Tout champ invalide affiche son message explicatif contextualisé via `FormFieldFeedback`. |
| **TNR-20** | `tnr-table-search-debounce.test.ts` | Moteur de Recherche | La recherche dans les tableaux s'exécute avec debounce réactif et affiche le ratio de résultats. |
| **TNR-21** | `tnr-saved-conversations.test.ts` | Historique Chat | Restauration d'une session passée réinjecte intégralement l'échange et ses sources certifiées. |
| **TNR-22** | `tnr-async-ingestion-progress.test.ts` | Tâches ARQ Asynchrones | Suivi fluide de la file d'attente d'ingestion avec jauge et étapes sans blocage UI. |
| **TNR-23** | `tnr-multi-format-export-crypto.test.ts` | Export Cryptographique | Validation des hashes SHA-256 et absence totale de fuite de tokens internes dans les exports. |
| **TNR-24** | `tnr-telemetry-alert-reaction.test.ts` | Observabilité Dégradation | Déclenchement réactif des seuils d'alerte (TTFT > 800ms, VRAM > 85%) avec état visuel clair. |
| **TNR-25** | `tnr-cosine-similarity-visual-scale.test.ts` | Inspecteur Cosinus Phase 7 | Étalonnage exact entre le score flottant nomic 768d et le thermomètre visuel (0.50 à 1.00), delta Top-1 exact. |
| **TNR-26** | `tnr-trafilatura-extraction-options.test.ts` | Extraction Web Phase 7 | Le mode Précision élimine le boilerplate HTML sans rogner le corps textuel ni les en-têtes de tables. |
| **TNR-27** | `tnr-deterministic-cleaning-invisibles.test.ts` | Nettoyage Déterministe P7 | Éradication certifiée des caractères invisibles (\u200B-\u200F, \uFEFF, \u00AD) et normalisation NFC sans casse de LaTeX. |
| **TNR-28** | `tnr-chunking-multistrategy-invariants.test.ts` | Multi-Stratégies Chunking P7 | Respect absolu de chunk_overlap < chunk_size/2 sur glissant, et non-rupture des phrases en phrastique. |
| **TNR-29** | `tnr-pre-indexing-dryrun-isolation.test.ts` | Simulation Dry-Run Phase 7 | Zéro appel INSERT dans PostgreSQL lors de la simulation, estimation exacte des tokens et de la VRAM. |
| **TNR-30** | `tnr-contextual-header-prefixing.test.ts` | Préfixage Titre Phase 7 | Les chunks découpés par section Markdown reçoivent leur préfixe [Titre > Sous-titre] sans perte de corps. |

---

## 3. Backlog Opérationnel des Agents — Phase 7 (Pipeline d'Ingestion & Expérience Visuelle)

### 3.1 Agent Backend Python (FastAPI, Trafilatura, ARQ & pgvector)
- **Routes & DTOs Pydantic :**
  - `POST /api/v1/ingestion/extract-url` : Extraction web avec Trafilatura (paramètres : `url`, `mode` ['precision', 'recall'], `include_tables`, `include_links`).
  - `POST /api/v1/ingestion/clean-preview` : Nettoyage et audit de caractères invisibles (retourne diff A/B, métriques de nettoyage).
  - `POST /api/v1/ingestion/dry-run` : Simulation de chunking et calcul du budget VRAM sans persistance en base.
  - Extension de `POST /api/v1/documents/upload` et `POST /api/v1/documents/upload-async` pour accepter `chunking_strategy`, `cleaning_options`, `source_url`.
- **Modèle de Données & Migrations Alembic :**
  - Ajout des colonnes `source_url`, `extraction_method`, `cleaning_stats` dans `documents`.
  - Ajout de `strategy_used`, `section_title`, `context_prefix` dans `document_chunks`.
  - Ajout de `chunking_strategy`, `prefix_section_title` dans `rag_presets`.

### 3.2 Agent Ingénieur IA / RAG
- Implémentation du port `MultiStrategyChunkerPort` avec les 3 stratégies majeures :
  1. *SlidingWindowChunker* : tokenizer local (SentencePiece / BPE), pas glissant et validation stricte `overlap < size/2`.
  2. *SentenceBoundaryChunker* : regex de ponctuation forte adaptée à la typographie française, buffer de phrases jusqu'au plafond de tokens.
  3. *MarkdownSectionChunker* : parseur AST CommonMark, extraction hiérarchique des titres H1/H2/H3 et préfixage `[Section > Sous-section]`.
- Implémentation de la jauge cosinus et de la formule de calcul du delta Top-1 : $\Delta = \text{score}_{\text{chunk}} - \text{score}_{\text{top1}}$.

### 3.3 Agent Frontend UX/UI
- **Chat RAG Sourcé :**
  - Badges de citations enrichis d'un mini-thermomètre cosinus et popover d'explication au survol.
  - Tiroir `ChunkInspectorDrawer` intégrant la jauge thermique dégradée, le delta Top-1 et la formule mathématique.
- **Ingestion & Jobs ARQ :**
  - Onglet double source : Fichier local (glisser-déposer) vs Scraping d'URL Web (Trafilatura).
  - Console de nettoyage déterministe avec bascules (Unicode NFC, Invisibles, Balises) et inspecteur A/B.
  - Bouton interactif « Simuler le découpage (Dry-Run) » ouvrant le modal d'audit pré-indexation.
- **Studio Preset RAG :**
  - Sélecteur de stratégie de chunking avec formulaires dynamiques (masquage/affichage conditionnel des curseurs).
  - Respect scrupuleux de l'immutabilité conditionnelle TNR-18 (édition libre sur domaine vierge, scellement sur domaine alimenté).
  - Gestion simplifiée de presets nommés sans versioning rigide v1/v2, initialisation des 3 presets types lors de la création d'un domaine (« Équilibré et standard » par défaut), et affichage du preset retrieval actif dans le Chat RAG Sourcé.

### 3.4 Agent Sécurité & Conformité
- **Protection Anti-SSRF :** Validation stricte des URL fournies à Trafilatura (blocage des adresses privées RFC 1918 : 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1, localhost).
- **Audit d'Invisibles :** Vérification que le nettoyage éradique les caractères de contrôle utilisés pour tromper les filtres sémantiques ou injecter des instructions cachées (prompt injection invisible).

---

## 4. Backlog Détaillé des User Stories (US-FRONT-01 à US-FRONT-35 & TNR-25 à TNR-31)

*(Voir `guide/plans/PLAN_FRONTEND.md` pour le détail exhaustif des critères d'acceptation, patterns SOLID et implémentations de chaque User Story).*
