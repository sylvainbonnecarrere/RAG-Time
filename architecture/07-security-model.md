# 07 — Modèle de Sécurité & Conformité SecNumCloud — RAGTIME

> **Statut :** Spécification de Sécurité Réglementaire & Modèle de Menaces  
> **Conformité :** SecNumCloud 3.2, Guide ANSSI Recommandations Mots de Passe & Chiffrement, RGPD  
> **Documents Liés :** `01-architecture.md`, `03-backlog-agents.md`

---

## 1. Modèle de Menaces (Méthodologie STRIDE)

Le modèle de menaces de RAGTIME analyse les vecteurs d'attaque potentiels ciblant une infrastructure d'IA générative souveraine on-premise :

| Menace STRIDE | Scénario d'Attaque Spécifique RAG | Contre-Mesure d'Architecture RAGTIME |
|---|---|---|
| **Spoofing (Usurpation)** | Attaquant usurpant l'identité d'un utilisateur pour accéder à un domaine confidentiel. | Authentification JWT sécurisée par cookie HTTP-Only (`SameSite=Strict, Secure=True`), hachage des mots de passe par **Argon2id** (sel 16 octets, m=64Mo, t=3, p=4). |
| **Tampering (Altération)** | Falsification d'extraits documentaires ou injection de faux chunks dans pgvector. | Empreinte cryptographique **SHA-256** immuable calculée à l'ingestion côté client et vérifiée côté serveur. Vérification de l'intégrité avant génération de citations. |
| **Repudiation (Répudiation)** | Utilisateur contestant avoir effectué une requête ou une suppression de document. | Journalisation inaltérable des événements dans PostgreSQL avec horodatage certifié, tenant_id et corrélation de requête. |
| **Information Disclosure (Fuite)** | Fuite de données inter-tenants via requêtes vectorielles croisées ou extraction hors-domaine. | **Clause SQL stricte** `WHERE tenant_id = :current_tenant` forcée dans le plan d'exécution pgvector. Cache frontend purgé à chaque changement de tenant. |
| **Denial of Service (Déni de service)** | Surcharge GPU par envoi de requêtes massives ou injection de prompts de 100k tokens. | Rate-limiting applicatif (SlowAPI / Redis), validation stricte des longueurs de prompts (3 à 2000 caractères), queue de priorité asynchrone ARQ. |
| **Elevation of Privilege (Élévation)** | Utilisateur standard s'auto-attribuant le rôle d'auditeur ou tentant de sceller un preset. | Contrôle d'accès basé sur les rôles (**RBAC**) vérifié à chaque endpoint backend FastAPI. Le frontend n'applique aucun arbitrage d'autorisation critique. |

---

## 2. Invariants de Sécurité du Front-end (Navigateur Non Fiable)

Conformément à la règle d'architecture zéro-confiance :
1. **Le client Web est considéré comme un environnement potentiellement hostile**. Aucune décision de sécurité ne repose sur l'intégrité du code JavaScript exécuté dans le navigateur.
2. **Sanitization Déterministe Anti-XSS** : Tout texte utilisateur ou fragment extrait de document est assaini avant injection dans le DOM via des parseurs sans évaluation de scripts (désactivation de l'exécution de balises actives).
3. **Zéro Secret dans le Bundle** : Aucun jeton d'accès administrateur, clé privée ou adresse IP de passerelle interne ne figure dans les assets statiques compilés.

---

## 3. Matrice de Conformité SecNumCloud & ANSSI

- **Chiffrement au Repos (Data-at-Rest)** : Volumes PostgreSQL chiffrés via LUKS / dm-crypt (AES-XTS-256).
- **Chiffrement en Transit (Data-in-Transit)** : TLS 1.3 exclusif avec suites de chiffrement à confidentialité persistante (ECDHE-ECDSA-AES256-GCM-SHA384).
- **Gestion des Mots de Passe** : Conforme aux recommandations de l'ANSSI :
  - Algorithme : Argon2id
  - Coût mémoire $m = 65536$ Ko (64 Mo)
  - Coût temporel $t = 3$ itérations
  - Degré de parallélisme $p = 4$
  - Longueur minimale de mot de passe : 8 caractères avec complexité vérifiée (majuscule, minuscule, chiffre).
- **Anti-Énumération** : Les endpoints d'authentification renvoient un code générique `401 Non Autorisé` avec message uniforme (« Identifiants invalides »), interdisant toute énumération de la base d'utilisateurs.

---

## 4. Isolation Relationnelle et Vectorielle Multi-Tenant

L'étanchéité absolue entre domaines (tenants) est garantie à trois niveaux de la chaîne technique :

```
[Requête Utilisateur]
        │  (Vérification JWT & Adhésion active au tenant)
        ▼
[FastAPI Gateway]
        │  (Injection automatique du tenant_id dans le contexte SQL)
        ▼
[PostgreSQL / pgvector]
   SELECT content, embedding <=> :query_vector AS distance
   FROM document_chunks
   WHERE tenant_id = :current_tenant_id   <-- CLAUSE OBLIGATOIRE
     AND similarity_score >= :threshold
   ORDER BY distance ASC
   LIMIT :top_k;
        │
        ▼
[Ollama / Llama 3.2]
   (Prompt isolé contenant uniquement les chunks du tenant validé)
```
