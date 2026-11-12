# Protocole de Passage de Relais Sécurité / SecOps ➔ Ingénierie IA & RAG (Jalon 2)

> **Date :** 12 Novembre 2026  
> **Émetteur :** Agent Sécurité Applicative & Conformité SecNumCloud (SecOps)  
> **Destinataire :** Agent Ingénieur IA & RAG Souverain  
> **Documents Faisant Autorité :**  
> - [PLAN_IA_RAG.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_IA_RAG.md)  
> - [AGENT_IA_RAG.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/agents/AGENT_IA_RAG.md)  
> - [PLAN_SECURITE.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_SECURITE.md)  
> - [PLAN_GENERAL_JALONNE.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_GENERAL_JALONNE.md)  
> - [referenceChunkEmbed.md](file:///c:/AITest/RAGTIME/RAG-Time/architecture/specifications/referenceChunkEmbed.md)  
> - [SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md](file:///c:/AITest/RAGTIME/RAG-Time/architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md) (Écran 2 : Ingestion & Jobs ARQ)  

---

## 1. État des Lieux & Socle Livré par la Sécurité (Certifié 100% au Vert)

L'Agent Sécurité confirme l'achèvement et la validation intégrale des chantiers sécurité du **Jalon 1** et de la brique de garde-fou amont du **Jalon 2** (**US-SEC-04**).

| Brique / Composant | Emplacement / Fichiers | Statut & Paramètres Validés |
|---|---|---|
| **Filtre Anti-SSRF Déterministe (US-SEC-04)** | [`backend/app/core/anti_ssrf.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/core/anti_ssrf.py)<br>Re-export dans [`backend/app/core/security.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/core/security.py) | **Validé à 100% (58/58 tests Pytest dédiés au vert)**.<br>- Whitelist de protocoles stricte (`http`, `https`).<br>- Blocage loopback (`127.0.0.0/8`, `::1`, `localhost`, `0.0.0.0`).<br>- Rejet RFC 1918 (`10/8`, `172.16/12`, `192.168/16`) et ULA (`fc00::/7`).<br>- Blocage métadonnées cloud (`169.254.169.254`, `169.254.0.0/16`, `fe80::/10`).<br>- Détection d'obfuscation (décimale, hex, octale, dotted hex).<br>- Protection DNS Rebinding via inspection exhaustive de toutes les IP résolues (IPv4/IPv6). |
| **Authentification Argon2id ANSSI & JWT Cookies (US-SEC-02)** | [`backend/app/core/security.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/core/security.py)<br>[`backend/app/api/v1/endpoints/auth.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/api/v1/endpoints/auth.py) | **Validé** : Hachage Argon2id ($m=64\text{ Mo}, t=3, p=4$, sel aléatoire 16 octets). Cookies session `HttpOnly=True, SameSite=Strict, Secure=True`. **Zéro jeton dans le body JSON / localStorage** (TNR-13). Purge atomique logout. |
| **Audit RLS PostgreSQL & STRIDE (US-SEC-01)** | [`backend/tests/test_security_rls_leak.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/tests/test_security_rls_leak.py)<br>[`docker/postgres/init.sql`](file:///c:/AITest/RAGTIME/RAG-Time/docker/postgres/init.sql) | **Validé** : Politiques RLS avec `FORCE ROW LEVEL SECURITY` actives sur `documents`, `document_chunks`, `rag_presets`, `query_logs`. Isolation certifiée face aux menaces Spoofing, Tampering et Information Disclosure (TNR-02). |
| **Audit des Vulnérabilités Node.js & Dépendances** | [`guide/plans/AUDIT_SECURITE_NODEJS_OCTOBRE_2026.md`](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/AUDIT_SECURITE_NODEJS_OCTOBRE_2026.md) | **Validé** : 0 vulnérabilité npm (`npm audit`). Workflows CI et Dockerfile alignés sur Node.js 22 LTS. |
| **Suite Globale Pytest & Coverage** | [`backend/tests/`](file:///c:/AITest/RAGTIME/RAG-Time/backend/tests/) | **83/83 tests unitaires et d'intégration PASSED** (Couverture totale : **81%**). |
| **Linter & Typage Statique** | `ruff check backend/`<br>`mypy backend/ --ignore-missing-imports` | **Code de sortie 0 (0 violation, 0 erreur Mypy)**. |
| **Banc d'Essai TNR Global** | [`scripts/run_tnr_suite.py`](file:///c:/AITest/RAGTIME/RAG-Time/scripts/run_tnr_suite.py) | **31/31 TNRs validés (100.0%)**, dont TNR-02, TNR-13, TNR-18 et TNR-26. |

---

## 2. Interface Technique Mise à Disposition de l'Agent IA / RAG

Pour le pipeline d'extraction web Trafilatura 2.0 (**US-IA-01**), l'Agent IA & RAG dispose directement des fonctions de sécurité pré-validées et exportées dans `app.core.security` :

```python
from app.core.security import SSRFValidationError, assert_url_safe, validate_url_anti_ssrf

# Usage 1 : Validation préventive booléenne
is_valid, resolved_ip, error = validate_url_anti_ssrf(user_url)
if not is_valid:
    logger.warning("Tentative SSRF bloquée : %s (%s)", user_url, error)
    # Rejet immédiat sans solliciter Trafilatura

# Usage 2 : Assertion stricte levant SSRFValidationError
try:
    safe_ip = assert_url_safe(user_url)
    # Lancement sécurisé de Trafilatura 2.0
except SSRFValidationError as e:
    raise HTTPException(status_code=400, detail=str(e))
```

> [!IMPORTANT]
> **Règle d'or de confinement réseau :**  
> Ne jamais appeler `trafilatura.fetch_url(url)` sans avoir exécuté préalablement `assert_url_safe(url)`. En cas d'URL pointant vers un domaine interne, local ou de métadonnées cloud, l'extraction doit être interceptée avant la moindre émission de socket HTTP.

---

## 3. Feuille de Route Immédiate pour l'Agent IA & RAG — Jalon 2

Conformément à la méthodologie en 5 étapes définie dans [AGENT_IA_RAG.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/agents/AGENT_IA_RAG.md) et au [PLAN_IA_RAG.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_IA_RAG.md), l'Agent IA & RAG doit prendre en charge les chantiers suivants :

### 1. US-IA-01 : Pipeline d'Extraction Trafilatura 2.0 & Tableaux Markdown
- Implémenter le service d'extraction web encapsulant `trafilatura` avec `favor_precision=True` par défaut.
- Activer l'extraction et la préservation des tableaux HTML convertis au format Markdown tabulaire standard (`| Col 1 | Col 2 |`).
- Extraire les métadonnées canoniques (titre, date de publication, auteur) et les stocker dans le dictionnaire `metadata JSONB`.
- Valider avec le test TDD préalable `backend/tests/test_trafilatura_extraction.py` et l'invariant **TNR-26**.

### 2. US-IA-02 : Pipeline Déterministe d'Assainissement (NFC & Invisibles)
- Implémenter la chaîne mécanique en 4 étapes ordonnées :
  1. Normalisation Unicode **NFC** (`unicodedata.normalize('NFC', text)`).
  2. Assainissement des balises HTML résiduelles.
  3. Éradication des caractères invisibles et espaces de largeur nulle (`\u200B` à `\u200F`, `\uFEFF`, etc.).
  4. Condensation déterministe des espaces et retours chariot multiples.
- Garantir le strict respect de l'invariant **TNR-27** pour prévenir les dérives d'embedding sur caractères invisibles.

### 3. US-IA-03 : Chunker Multi-Stratégies avec Invariant d'Overlap & Fil d'Ariane
- Implémenter les stratégies de découpage documentées dans [referenceChunkEmbed.md](file:///c:/AITest/RAGTIME/RAG-Time/architecture/specifications/referenceChunkEmbed.md) :
  - **Fixed Sliding Window :** Invariant mathématique strict bloquant $\text{overlap} < \frac{\text{size}}{2}$ (TNR-28).
  - **Sentence Boundary :** Découpage phrastique respectant les abréviations françaises.
  - **Markdown AST Headers :** Découpage hiérarchique avec préfixe contextuel automatique de section `[Section > Sous-Section]` (TNR-30).
- Calculer pour chaque chunk : `chunk_index`, `token_count`, empreinte immuable `sha256_hash` (TNR-04).

### 4. US-BACK-07 / US-IA-08 : Simulateur Dry-Run Pré-Indexation en Mémoire
- Fournir la fonction de simulation sans persistance BDD estimant : nombre de chunks, décompte total de tokens, distribution des tailles et estimation VRAM pgvector HNSW (TNR-29).

---

## 4. Commandes de Validation & Checklist de Reprise

Avant de démarrer l'écriture de code, l'Agent IA & RAG peut vérifier l'intégrité de l'environnement avec les commandes de référence :

```powershell
# 1. Vérification du linter Ruff (doit rester à 0 erreur)
ruff check backend/

# 2. Vérification du typage Mypy
mypy backend/ --ignore-missing-imports

# 3. Exécution de la suite Pytest avec couverture
pytest backend/tests/ -v --cov=backend/app --cov-report=term-missing

# 4. Exécution du banc d'essai TNR (31/31 au vert requis)
python scripts/run_tnr_suite.py
```

Le socle de sécurité et de réseau est verrouillé, étanche et prêt pour accueillir l'ingénierie sémantique et documentaire.

