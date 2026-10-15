# Plan de Sécurité Applicative & Conformité SecNumCloud — RAGTIME (2026)

> **Agent Responsable :** Agent Sécurité Applicative & Conformité SecNumCloud  
> **Documents Faisant Autorité :** `architecture/01-architecture.md`, `architecture/03-backlog-agents.md`, `architecture/07-security-model.md`, `architecture/specifications/Recommandations.md`, `architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md`  
> **Conformité & Rigueur :** SecNumCloud 3.2, Guide ANSSI Mots de Passe & Chiffrement, Modèle de Menaces STRIDE, Row-Level Security (RLS) & OWASP API Top 10

---

## 1. Principes Directeurs & Invariants de Sécurité

1. **Le Navigateur est une Zone Hostile (Zero-Trust) :**  
   Aucune décision de sécurité, de filtrage d'accès ou d'isolation de données ne repose sur le code client JavaScript. Tout contrôle est formellement validé côté serveur.
2. **Row-Level Security (RLS) PostgreSQL Inviolable & Protection Connection Pooling :**  
   L'isolation multi-tenant est garantie par le moteur relationnel via des politiques RLS obligatoires (`current_setting('app.current_tenant_id', true)::uuid = tenant_id`). Réinitialisation stricte `RESET app.current_tenant_id;` lors du retour au pool de connexions, et notification explicite de l'utilisateur (popup UI) en cas de reset ou de rupture de contexte.
3. **Mots de Passe selon Normes ANSSI (Argon2id) :**  
   Hachage cryptographique de haute sécurité : $m = 64\text{ Mo}$, $t = 3$ itérations, $p = 4$ parallélisme, sel cryptographique de 16 octets.
4. **Zéro Token Sensible dans le Storage Navigateur :**  
   Les jetons d'accès JWT sont véhiculés exclusivement via des cookies `HTTP-Only` sécurisés (`SameSite=Strict, Secure=True`), inaccessibles aux scripts DOM pour neutraliser le vol de session par XSS.
5. **Protection Anti-SSRF Déterministe pour l'Extraction Web :**  
   Rejet formel de toute adresse IP privée, de bouclage (`127.0.0.1`, `localhost`) ou de métadonnées cloud avant tout appel réseau de Trafilatura.

---

## 2. Découpage en User Stories Sécurité (US-SEC-01 à US-SEC-10)

---

### Jalon Isolation des Données & RLS (Priorité 1)

#### US-SEC-01 : Modélisation des Menaces STRIDE & Politiques RLS PostgreSQL [STATUT : VALIDÉ (JALON 1)]
- **User Story :** En tant qu'auditeur de sécurité, je veux auditer et appliquer les politiques Row-Level Security sur les tables `documents`, `document_chunks`, `audit_logs` et `rag_presets` pour garantir l'étanchéité absolue inter-domaines.
- **Tâche PR :** `security(rls): verify and enforce strict postgresql row-level security policies for multi-tenant isolation`
- **Pattern & SOLID :** *Zero-Trust Pattern*, *Defense-in-Depth*.
- **Critères d'Acceptation :**
  - Politique : `CREATE POLICY tenant_isolation ON document_chunks FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);`
  - Rejet systématique de toute requête sans tenant configuré.
  - Impossibilité pour un utilisateur du tenant A de lire ou manipuler les chunks du tenant B, même par injection SQL directe.
- **Tests Préalables (TDD - Pytest) :**
  - `test_security_rls_leak.py` : Tentative de requête transversale inter-tenants bloquée à 100% (Information Disclosure via cross-tenant joins & subqueries, Tampering cross-tenant UPDATE/DELETE, Spoofing cross-tenant INSERT).
  - `tnr_tenant_isolation_ui.py` (TNR-02) : Validation de l'absence de fuite de données.
- **Preuve d'Audit & Validation :** Suite `backend/tests/test_security_rls_leak.py` validée sur rôle applicatif `ragtime_app` (`NOSUPERUSER, NOBYPASSRLS`).

#### US-SEC-02 : Authentification Souveraine Argon2id & Sessions en Cookies HTTP-Only [STATUT : VALIDÉ (JALON 1)]
- **User Story :** En tant qu'administrateur de sécurité, je veux implémenter l'authentification basée sur les recommandations ANSSI avec hachage Argon2id et délivrance du jeton JWT dans un cookie `HTTP-Only` sécurisé pour éradiquer les risques d'exfiltration.
- **Tâche PR :** `security(auth): implement ANSSI-compliant Argon2id password hashing and HTTP-Only JWT session cookies`
- **Pattern & SOLID :** *Authenticator Pattern*, *Secure Cookie Token Strategy*.
- **Critères d'Acceptation :**
  - Paramètres Argon2id : `memory_cost=65536`, `time_cost=3`, `parallelism=4`, `salt_len=16`.
  - Attributs du cookie : `HttpOnly=True`, `SameSite=Strict`, `Secure=True` (ou `False` en local test), `Path=/`.
  - Zéro jeton JWT injecté dans le corps de réponse JSON ou stocké dans le `localStorage` (TNR-13).
  - Endpoints implémentés : `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_argon2id_hashing.py` : Vérification des paramètres cryptographiques ANSSI, salage aléatoire 16 octets et résilience.
  - `test_auth_api.py` : Validation de l'émission exclusive en cookie HTTP-Only, corps JSON sans jeton, révocation logout `max-age=0` et anti-énumération HTTP 401.
  - `tnr_session_storage_purge.py` (TNR-13) : Vérification de la purge de session à la déconnexion.

#### US-SEC-03 : Middleware Anti-Brute-Force & Réponses Uniformes Anti-Énumération
- **User Story :** En tant que responsable SSI, je veux limiter le taux de requêtes sur `/api/v1/auth/jwt/login` (max 5 tentatives par minute par IP) et renvoyer une réponse 401 générique « Identifiants invalides » pour empêcher l'énumération de comptes.
- **Tâche PR :** `security(rate-limit): configure SlowAPI rate-limiting and anti-enumeration generic responses`
- **Pattern & SOLID :** *Rate Limiting Interceptor*, *Information Hiding Pattern*.
- **Critères d'Acceptation :**
  - Blocage à la 6ème tentative sous 60 secondes avec code HTTP 429 Too Many Requests.
  - Temps de réponse constant (égalisation temporelle pour éviter les attaques par canal auxiliaire / timing attacks).
  - Message d'erreur uniforme sans distinction entre email inexistant et mot de passe erroné.
- **Tests Préalables (TDD - Pytest) :**
  - `test_rate_limiting.py` : Envoi de 10 requêtes de connexion consécutives déclenchant le code 429.
  - `tnr_anti_enumeration.py` : Vérification de l'uniformité des réponses d'erreur.

---

### Jalon Protection Ingestion & Assainissement (Priorité 2)

#### US-SEC-04 : Filtre de Validation Anti-SSRF pour l'Ingestion d'URL Web (Trafilatura)
- **User Story :** En tant qu'analyste sécurité, je veux interdire toute tentative d'ingestion d'URL pointant vers des réseaux internes, la boucle locale ou des services de métadonnées d'infrastructure afin de parer les attaques SSRF (*Server-Side Request Forgery*).
- **Tâche PR :** `security(anti-ssrf): deterministic IP resolution filter rejecting private networks and cloud metadata`
- **Pattern & SOLID :** *Filter Pattern*, *Defensive Whitelist*.
- **Critères d'Acceptation :**
  - Résolution DNS préalable de l'hôte avant toute requête HTTP.
  - Rejet formel des adresses de bouclage : `127.0.0.0/8`, `::1`, `localhost`.
  - Rejet des plages privées RFC 1918 : `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
  - Rejet des métadonnées cloud : `169.254.169.254`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_anti_ssrf_filter.py` : Rejet de 15 variantes d'URL manipulatrices (décimales, hexadécimales, redirections locales).
  - `tnr_trafilatura_anti_ssrf.py` (TNR-26) : Non-régression sur le blocage SSRF.

#### US-SEC-05 : Audit & Durcissement de l'Assainissement Déterministe Anti-XSS
- **User Story :** En tant qu'auditeur applicatif, je veux auditer le pipeline d'assainissement déterministe pour certifier la neutralisation absolue des balises `<script>`, `onerror`, `javascript:` et caractères invisibles dans les extraits Markdown affichés dans l'UI.
- **Tâche PR :** `security(anti-xss): deterministic input sanitizer audit and regex hardening`
- **Pattern & SOLID :** *Sanitization Strategy*, *Zero-Script Evaluation*.
- **Critères d'Acceptation :**
  - Neutralisation des vecteurs XSS complexes (polyglots, encodages HTML imbriqués, balises `<iframe>`, `<embed>`, `<svg onload>`).
  - Maintien scrupuleux des formules mathématiques légitimes contenant `<` ou `>`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_xss_sanitization.py` : Ingestion de 50 payloads XSS OWASP validant la neutralisation.
  - `tnr_xss_sanitization.py` (TNR-07) : Non-régression sur l'échappement strict.

#### US-SEC-06 : Contrôle d'Accès Basé sur les Rôles (RBAC) au Niveau API Gateway
- **User Story :** En tant qu'administrateur, je veux que l'API FastAPI vérifie à chaque requête les rôles et permissions (Admin, Lead Data Scientist, Auditeur) pour interdire toute élévation de privilèges (ex: un auditeur tentant de supprimer un document).
- **Tâche PR :** `security(rbac): strict role-based access control dependency enforcement on API endpoints`
- **Pattern & SOLID :** *Role-Based Access Control (RBAC)*, *Dependency Injection*.
- **Critères d'Acceptation :**
  - Dépendance FastAPI `require_role(["admin", "lead_ds"])`.
  - Rejet avec code `403 Forbidden` en cas de droits insuffisants.
  - Journalisation de toute tentative d'accès non autorisé dans `audit_logs`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_rbac_permissions.py` : Tentative de suppression documentaire avec profil auditeur rejetée en 403.
  - `tnr_rbac_authorization.py` (TNR-17) : Validation du cloisonnement des rôles.

---

### Jalon Intégrité Cryptographique & Conformité (Priorité 3)

#### US-SEC-07 : Auditabilité Cryptographique des Citations & Vérification SHA-256
- **User Story :** En tant qu'auditeur légal, je veux vérifier que chaque extrait de citation affiché par le système RAG est cryptographiquement identique à l'empreinte SHA-256 calculée lors de l'ingestion initiale.
- **Tâche PR :** `security(integrity): SHA-256 checksum verification on citations and audit logging`
- **Pattern & SOLID :** *Integrity Verifier*, *Tamper-Proof Audit*.
- **Critères d'Acceptation :**
  - Vérification du hash avant transmission au frontend.
  - Rejet immédiat avec alerte d'intégrité si un fragment a été altéré en base de données.
- **Tests Préalables (TDD - Pytest) :**
  - `test_sha256_verification.py` : Altération artificielle d'un chunk détectée immédiatement.
  - `tnr_chunk_metadata_integrity.py` (TNR-04) : Non-régression sur l'auditabilité.

#### US-SEC-08 : Sécurisation des Flux Réseau & Configuration TLS 1.3 Strict
- **User Story :** En tant qu'officier de sécurité des systèmes d'information, je veux imposer TLS 1.3 exclusif avec suites de chiffrement à confidentialité persistante (ECDHE-ECDSA-AES256-GCM-SHA384) sur la passerelle inverse Nginx.
- **Tâche PR :** `security(tls): enforce TLS 1.3 forward-secrecy cipher suites and hardened HTTP headers`
- **Pattern & SOLID :** *Transport Security Pattern*, *Security Headers Enforcement*.
- **Critères d'Acceptation :**
  - Désactivation complète de TLS 1.0, 1.1 et 1.2.
  - En-têtes HTTP de sécurité configurés : `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_tls_headers.py` : Vérification de la présence et de la valeur des 5 en-têtes de sécurité obligatoires.

#### US-SEC-09 : Purge Cryptographique de Session et d'Isolation Cross-Tenant (TNR-02 / TNR-13)
- **User Story :** En tant qu'utilisateur se déconnectant ou changeant de domaine, je veux que tous les contextes mémoires, sessions et caches soient purgés instantanément pour interdire toute rémanence inter-sessions.
- **Tâche PR :** `security(session-purge): atomic session invalidation and cross-tenant memory purge`
- **Pattern & SOLID :** *Sanitization on Exit*, *Zero-Retention*.
- **Critères d'Acceptation :**
  - Révocation du cookie HTTP-Only via en-tête `Set-Cookie: ... Max-Age=0`.
  - Purge des caches applicatifs et des tokens en mémoire.
- **Tests Préalables (TDD - Pytest) :**
  - `test_session_purge.py` : Vérification de l'invalidation immédiate du cookie.
  - `tnr_session_storage_purge.py` (TNR-13) : Non-régression sur la déconnexion étanche.

#### US-SEC-10 : Automatisation des Scans de Sécurité Statiques (SAST, Bandit, Trivy)
- **User Story :** En tant que responsable sécurité, je veux intégrer des outils d'analyse statique de sécurité (SAST) dans le pipeline pour bloquer automatiquement tout merge en cas de vulnérabilité haute ou critique.
- **Tâche PR :** `security(sast): automated vulnerability and secret scanning with Bandit, Trivy, and TruffleHog`
- **Pattern & SOLID :** *Continuous Security Inspection*.
- **Critères d'Acceptation :**
  - Exécution de Bandit sur le code Python (zéro alerte High).
  - Scan de vulnérabilités conteneurs via Trivy.
  - Détection de fuites de clés avec TruffleHog.
- **Tests Préalables (TDD - Pytest) :**
  - `test_sast_clean.py` : Script de validation SAST local s'exécutant avec succès.

---

## 3. Matrice de Couverture des Tests de Non-Régression (TNR Sécurité)

| ID TNR | Périmètre Sécurité | Règle d'Or Bloquante |
|---|---|---|
| **TNR-02** | RLS Multi-Tenant | Basculement de domaine purgeant instantanément les contextes sans fuite |
| **TNR-04** | Audit des Chunks | Empreintes cryptographiques SHA-256 certifiées et inaltérables |
| **TNR-07** | Protection XSS | Neutralisation absolue des scripts et balises malveillantes |
| **TNR-10** | Cycle de Vie Tenant | Blocage formel de la suppression du dernier domaine existant |
| **TNR-11** | Persistance Auth | Maintien sécurisé de la session via cookie HTTP-Only |
| **TNR-12** | Guard Non-Authentifié | Redirection immédiate des requêtes non autorisées |
| **TNR-13** | Déconnexion & Purge | Révocation immédiate et purge totale des cookies et states |
| **TNR-18** | Immutabilité Presets | Scellement cryptographique et mathématique de l'espace vectoriel |
| **TNR-26** | Trafilatura SSRF | Rejet catégorique des URL pointant vers le réseau local |
