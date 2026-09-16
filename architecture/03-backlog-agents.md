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
| **TNR-22** | `tnr-cross-encoder-rerank.test.ts` | Qualité RAG Phase 7 | Le re-ranking local affine l'ordonnancement sans jamais dégrader le score cosinus originel. |
| **TNR-23** | `tnr-chunk-deduplication.test.ts` | Hygiène Vectorielle | Deux chunks textuellement identiques au sein d'un même tenant ne génèrent qu'un seul vecteur pgvector. |
| **TNR-24** | `tnr-cross-domain-isolation.test.ts` | Synthèse Comparative | L'analyse comparative multi-domaines étiquette strictement chaque source par son `tenant_id` natif. |
| **TNR-25** | `tnr-airgap-offline-cache.test.ts` | Résilience Déconnectée | La bascule en mode Air-Gap permet la consultation des archives et caches sans appel réseau externe. |

---

## 3. Backlog Détaillé des User Stories (US-FRONT-01 à US-FRONT-30)

*(Voir `PLAN_FRONTEND.md` pour le détail exhaustif des critères d'acceptation, patterns SOLID et implémentations de chaque User Story).*
