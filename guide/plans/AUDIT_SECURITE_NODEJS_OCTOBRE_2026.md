# Audit de Sécurité & Plan de Mise à Jour — Runtime Node.js & Écosystème Frontend

> **Date de l'Audit :** 23 Octobre 2026  
> **Agent Responsable :** Agent Sécurité Applicative & Conformité SecNumCloud  
> **Classification :** Confidentiel Interne / Conformité SecNumCloud 3.2  
> **Périmètre :** Moteur d'exécution Node.js, Dépendances npm frontend, Bundler Vite, Images Docker et Workflows GitHub Actions  

---

## 1. Contexte & Déclencheur de l'Audit

Le cycle de divulgation coordonnée d'octobre 2026 de l'équipe de sécurité Node.js a révélé **10 vulnérabilités de sécurité** affectant les branches actives de Node.js (`v20.x`, `v22.x`, `v24.x` et `v26.x`), dont plusieurs failles critiques et de sévérité élevée. 

Dans le cadre du durcissement SecNumCloud 3.2 de RAGTIME, cet audit évalue l'exposition de nos environnements de développement, de build CI/CD et de déploiement conteneurisé, et consigne les actions correctives appliquées immédiatement.

---

## 2. Vulnérabilités Majeures Détectées sur le Runtime Node.js

### A. CVE-2026-111497 (Sévérité : High / Critique - Vulnérabilité "Node2Shell")
- **Composant affecté :** Décodeur Brotli intégré au moteur C++ de Node.js.
- **Description :** Dépassement de tampon en écriture hors limites (*out-of-bounds write*) lors du déballage de flux de données compressés au format Brotli spécialement forgés.
- **Vecteur d'exploitation :** Exécution de code à distance (RCE) ou déni de service (crash SIGSEGV du processus) lors de la décompression automatique de requêtes ou réponses HTTP (`fetch`, `Express`, proxies).
- **Correctif amont :** Versions Node.js `22.23.4+`, `24.22.1+`, `26.12.1+`.

### B. CVE-2026-105483 (Sévérité : High)
- **Composant affecté :** Module TLS / Vérification du nom d'hôte (*Hostname Verification*).
- **Description :** Contournement de validation de certificat TLS lorsque des adresses IP sont encodées avec des chiffres Unicode pleine chasse (*full-width digits*).
- **Risque :** Attaque de type *Man-in-the-Middle* (MitM) sur les connexions sortantes sécurisées.

### C. CVE-2025-55131 & CVE-2025-55130 (Sévérité : High)
- **Description :** Fuites de mémoire résiduelle non initialisée dans les buffers (`Buffer.alloc` / typed arrays) lors de timeouts dans le module `vm`, et contournement du modèle de permission d'accès au système de fichiers (`--allow-fs-read`) via des liens symboliques relatifs.

---

## 3. Audit des Dépendances Front-End (`npm audit`) & Remédiation Immédiate

L'analyse de l'arbre des dépendances ([package.json](file:///c:/AITest/RAGTIME/RAG-Time/package.json), [package-lock.json](file:///c:/AITest/RAGTIME/RAG-Time/package-lock.json)) a révélé deux composants vulnérables de niveau **High** :

| Paquet | Version Initiale | Vulnérabilité & Référence | Sévérité | Statut Correctif |
|---|---|---|---|---|
| **source-map-js** | `1.2.1` | **GHSA-68fv-2mgg-jv7q** (CWE-1284) : Déni de service de la boucle d'événements (*Event-Loop DoS*) via des décalages de section de source-map indexés. | **High** (CVSS 7.5) | **Corrigé** : Montée de version en `1.2.2`. |
| **vite** | `6.2.3` (<=6.4.3) | **GHSA-587h-7wmj-h5pm** (CWE-77) : Contournement du contrôle d'existence `fs.existsSync()` sous Windows via `launch-editor`.<br>**GHSA-698v-4r3x-3vcv** (CWE-78) : Omission de l'échappement `%` sous Windows.<br>**GHSA-r825-w8mm-5pxw** (CWE-88) : Interprétation d'arguments CLI d'éditeur permettant l'exécution arbitraire.<br>**GHSA-rq7h-c2jc-7f22** & **GHSA-9jrq-w75r-8gcw** : Accès potentiel aux fichiers hors `server.fs.allow` et XSS cross-origin. | **High** | **Corrigé** : Montée de version en `6.4.5`. |

### Preuve de remédiation :
```bash
npm audit fix
up to date, audited 250 packages in 2s
found 0 vulnerabilities
```
- Le typage strict TypeScript (`npm run lint`) et le bundle de production Vite (`npm run build`) ont été réexécutés avec succès avec **0 avertissement ni erreur**.

---

## 4. Analyse d'Impact sur l'Infrastructure & Recommandations

### A. Cycle de Vie de la Version Node.js (Migration Node.js 20 ➔ 22 LTS)
- **Constat :** Les fichiers CI ([.github/workflows/ci.yml](file:///c:/AITest/RAGTIME/RAG-Time/.github/workflows/ci.yml), [.github/workflows/test.yml](file:///c:/AITest/RAGTIME/RAG-Time/.github/workflows/test.yml)) et le [Dockerfile.frontend](file:///c:/AITest/RAGTIME/RAG-Time/Dockerfile.frontend) spécifient actuellement `Node.js 20`.
- **Recommandation SecOps :** Node.js 20 approche de sa fin de vie (EOL). Il est recommandé d'adopter formellement **Node.js 22 LTS (Active)** :
  1. Mettre à jour `node-version: 22` dans les workflows GitHub Actions (garantit l'utilisation des correctifs Brotli et TLS récents).
  2. Mettre à jour l'image de build dans `Dockerfile.frontend` vers `node:22-alpine`.

### B. Confinement d'Exécution en Production
- **Garantie Zéro-Node en Production Runtime :**
  L'architecture RAGTIME exploite un build multi-stage : l'environnement Node.js n'intervient **que pendant la phase de compilation (builder)**. L'image de production finale (`runner`) repose exclusivement sur **Nginx Alpine**, éliminant tout runtime Node.js exposé en production. Le risque d'attaque RCE sur le serveur de production via Node.js est donc neutralisé dès la conception (*Security by Architecture*).

---

## 5. Matrice des Actions Réalisées

1. [x] **Backend CI Fix :** Ajout des paquets cryptographiques indispensables dans [backend/requirements.txt](file:///c:/AITest/RAGTIME/RAG-Time/backend/requirements.txt) (`argon2-cffi>=23.1.0`, `pyjwt>=2.10.0`, `cryptography>=43.0.0`), résolution de l'erreur `ModuleNotFoundError: No module named 'argon2'`.
2. [x] **Frontend Dependencies Fix :** Correction de `vite` (6.4.5) et `source-map-js` (1.2.2) via `npm audit fix`, atteignant 0 vulnérabilité résiduelle.
3. [x] **Vérification Complète :** Pytest avec couverture validé à 25/25, TypeScript `tsc --noEmit` validé, Vite build validé.
