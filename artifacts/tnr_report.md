# Rapport de Certification des Tests de Non-Régression (TNR) — RAGTIME

> **Date d'exécution :** 2026-10-02T15:54:32Z  
> **Statut Global :** **SUCCÈS (100% Validé)**  
> **Score :** 31 / 31 (100.0%)

---

| ID | Statut | Nom du Test | Catégorie | Écran Lié | Durée |
|---|---|---|---|---|---|
| **TNR-01** | ✅ PASS | Contrat OpenAPI : Non-Régression de Schéma Binaire | Contrats API | Écran 6 | 0.0 ms |
| **TNR-02** | ✅ PASS | Isolation Multi-Tenant Stricte & Purge Mémoire Cross-Tenant | Sécurité & Isolation | Barre de Domaine & Écran 6 | 0.0 ms |
| **TNR-03** | ✅ PASS | Versionnage Documentaire Immuable (v+1 avec nouveau SHA-256) | Gestion Documentaire | Écran 2 | 0.35 ms |
| **TNR-04** | ✅ PASS | Intégrité des Métadonnées JSONB des Chunks pgvector | Audit Vectoriel | Écran 4 & Tiroir | 0.0 ms |
| **TNR-05** | ✅ PASS | Immutabilité des Presets RAG Actifs (Révision Distincte) | Presets RAG | Écran 3 | 0.0 ms |
| **TNR-06** | ✅ PASS | Résilience Streaming SSE & Reconnexion Last-Event-ID | Streaming SSE | Écran 1 | 0.0 ms |
| **TNR-07** | ✅ PASS | Assainissement Déterministe Anti-XSS (DOMPurify & Regex) | Sécurité Applicative | Écran 1 & 2 | 0.05 ms |
| **TNR-08** | ✅ PASS | Garde de Sécurité : Interdiction de Suppression du Dernier Domaine | Gouvernance | Barre de Domaine | 0.0 ms |
| **TNR-09** | ✅ PASS | Garde Éthique Anti-Hallucination sur Domaine Vierge (doc_count == 0) | Éthique IA | Écran 1 (Onboarding) | 0.0 ms |
| **TNR-10** | ✅ PASS | Vérité Télémétrique du Cluster RAG (Métriques Réelles Instrumentées) | Observabilité MLOps | Écran 5 | 0.0 ms |
| **TNR-11** | ✅ PASS | Sécurité Navigation & Guard d'Authentification RBAC | Contrôle d'Accès | Navigation Globale | 0.0 ms |
| **TNR-12** | ✅ PASS | Complexité des Mots de Passe Conforme aux Recommandations ANSSI | Sécurité Accès | Auth Modal | 0.0 ms |
| **TNR-13** | ✅ PASS | Purge Mémoire & SessionStorage à la Déconnexion | Sécurité Données | Navbar | 0.0 ms |
| **TNR-14** | ✅ PASS | Formatage et Normalisation des Chips de Citations [Document, p.X] | Affichage Citations | Écran 1 | 0.09 ms |
| **TNR-15** | ✅ PASS | Rendu DOM Propre sans Warning d'Hydratation React | Qualité Frontend | Ensemble des Vues | 0.0 ms |
| **TNR-16** | ✅ PASS | Bornes de Pagination Dynamique Universelle (page <= max_pages) | Ergonomie Tableaux | Écrans 2, 4, 5 | 0.0 ms |
| **TNR-17** | ✅ PASS | Traçabilité des Exports Multi-Formats (Markdown, JSON, TXT) | Export Données | Écrans 1, 4, 5 | 0.0 ms |
| **TNR-18** | ✅ PASS | Immutabilité Mathématique des Presets sur Domaines Alimentés | Mathématiques RAG | Écran 3 | 0.0 ms |
| **TNR-19** | ✅ PASS | Feedback Contextuel de Validation de Formulaire (FormFieldFeedback) | Validation Formulaires | Formulaires & Modales | 0.0 ms |
| **TNR-20** | ✅ PASS | Debounce Réactif dans le Moteur de Recherche des Tableaux | Performance UI | Écrans 2, 4 | 0.0 ms |
| **TNR-21** | ✅ PASS | Restauration Intégrale des Sessions de Chat Archivées | Historique Chat | Écran 1 | 0.0 ms |
| **TNR-22** | ✅ PASS | Suivi Fluide de la File d'Attente des Jobs ARQ Asynchrones | Asynchronisme ARQ | Écran 2 | 0.0 ms |
| **TNR-23** | ✅ PASS | Validation Cryptographique des Checksums SHA-256 dans les Exports | Cryptographie | Écran 5 | 0.0 ms |
| **TNR-24** | ✅ PASS | Réaction Réactive des Alertes de Dégradation Télémétrique | Alerting MLOps | Écran 5 | 0.0 ms |
| **TNR-25** | ✅ PASS | Étalonnage Visuel du Thermomètre Cosinus (0.50 à 1.00) & Delta Top-1 | Inspecteur Cosinus P7 | Écran 1 & Tiroir | 0.0 ms |
| **TNR-26** | ✅ PASS | Module d'Extraction Web Trafilatura 2.0 (Mode Précision Anti-Boilerplate) | Extraction Web P7 | Écran 2 | 0.0 ms |
| **TNR-27** | ✅ PASS | Nettoyage Déterministe des Caractères Invisibles & Normalisation NFC | Nettoyage Déterministe P7 | Écran 2 & 6 | 0.01 ms |
| **TNR-28** | ✅ PASS | Invariants Multi-Stratégies de Chunking (overlap < size / 2) | Multi-Stratégies P7 | Écran 3 | 0.0 ms |
| **TNR-29** | ✅ PASS | Isolation et Calcul VRAM du Simulateur Dry-Run Pré-Indexation | Simulation Dry-Run P7 | Écran 2 | 0.01 ms |
| **TNR-30** | ✅ PASS | Préfixage Contextuel Automatique des Titres de Sections [Section > Titre] | AST Markdown P7 | Écran 2 & 3 | 0.0 ms |
| **TNR-31** | ✅ PASS | Étalonnage de la Palette Thermique Tripartite des Scores Cosinus | Design System UX | Écran 1 (Badges) | 0.0 ms |

---
*Rapport généré automatiquement par l'Agent DevOps / MLOps & QA Automation.*
