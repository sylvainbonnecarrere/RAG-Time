# Guide de Référence : Extraction, Nettoyage, Chunking & Embedding pour RAG Souverain

> **Statut :** Document de Référence Technique & Norme d'Ingénierie RAG  
> **Emplacement :** `architecture/specifications/referenceChunkEmbed.md`  
> **Portée :** Pipeline d'ingestion documentaire, pré-traitement, partitionnement sémantique, vectorisation locale et indexation pgvector / FAISS.

---

## Sommaire Exécutif

Un système RAG (*Retrieval-Augmented Generation*) ne vaut que par la propreté de son corpus source. En ingénierie RAG, l'adage est catégorique : **« Un corpus sale produit un RAG sale »**.

L'ensemble de la chaîne de valeur repose sur quatre étapes séquentielles rigoureuses et déterministes :
1. **Extraction de contenu principal :** Élimination du bruit structurel (menus, bannières, pieds de page, scripts) et préservation de la sémantique et des métadonnées sources.
2. **Nettoyage & Normalisation mécanique :** Normalisation Unicode canonique (NFC), éradication des balises résiduelles, suppression des caractères invisibles corrupteurs et condensation des espaces.
3. **Chunking (Découpage en fragments) :** Compromis optimal entre dilution sémantique (chunks trop gros) et perte de contexte (chunks trop courts), avec stratégie de recouvrement (*overlap*) ou découpage structurel/phrastique.
4. **Embedding & Indexation vectorielle :** Transformation textuelle en vecteurs denses fixes (ex: 768 dimensions pour `nomic-embed-text`), calcul géométrique de similarité cosinus, et passage à l'échelle via index vectoriel (pgvector HNSW / FAISS).

```
┌─────────────────┐     ┌────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Source Brute   │ ──► │   Extraction   │ ──► │    Nettoyage    │ ──► │     Chunking     │
│ (HTML/PDF/MD)   │     │ (Trafilatura)  │     │ (NFC/Invisibles)│     │(Overlap/Sections)│
└─────────────────┘     └────────────────┘     └─────────────────┘     └──────────────────┘
                                                                                 │
                                                                                 ▼
┌─────────────────┐     ┌────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Réponse LLM +   │ ◄── │ Recherche K-NN │ ◄── │   Indexation    │ ◄── │  Embedding 768d  │
│ Citations Cert. │     │(Cosinus / HNSW)│     │(pgvector/FAISS) │     │ (nomic-embed)    │
└─────────────────┘     └────────────────┘     └─────────────────┘     └──────────────────┘
```

---

## 1. Extraction & Nettoyage Documentaire

### 1.1 Le problème fondamental : Le bruit du Web et des formats composites
Télécharger une page web revient à récupérer du HTML brut où l'article visé côtoie :
- Des barres de navigation complexes,
- Des bannières publicitaires et bannières de cookies (RGPD),
- Des encarts latéraux (*sidebars*) de recommandation,
- Des pieds de page légaux, scripts tracking JavaScript et styles CSS.

**Toxicité pour le RAG :** Chaque élément parasite indexé devient un **chunk polluant**. Lors d'une recherche vectorielle, le moteur risque de remonter un extrait de menu ou une mention légale plutôt que la réponse métier.

### 1.2 Pourquoi Trafilatura ?
Le ciblage manuel via des sélecteurs CSS (`div.article-body`) est extrêmement fragile : chaque site dispose d'une arborescence distincte qui évolue fréquemment.
**Trafilatura** résout ce défi grâce à des heuristiques statistiques éprouvées :
- Analyse de la densité textuelle relative aux balises,
- Reconnaissance des balises sémantiques HTML5 (`<article>`, `<main>`, `<p>`),
- Calcul de la longueur moyenne des blocs de texte.

#### Ses trois atouts maîtres pour le RAG :
1. **Extraction propre sans configuration par site.**
2. **Récupération des métadonnées clés :** titre, auteur, date de publication, indispensables pour la traçabilité des citations et le filtrage contextuel.
3. **Restitution multi-formats :** texte brut, Markdown (avec conservation des titres et listes) et JSON structuré.

### 1.3 Installation & Dépendances Critiques
Trafilatura nécessite obligatoirement le composant `lxml-html-clean` :

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install trafilatura==2.0.0 lxml-html-clean==0.4.5
```

> **Piège d'installation n°1 :**  
> `ImportError: lxml.html.clean module is now a separate project`  
> Depuis la version 6 de `lxml`, `html.clean` a été isolé dans un paquet indépendant. Sans `lxml-html-clean`, l'import de Trafilatura échoue immédiatement.

### 1.4 Code de Référence : Extraction avec Métadonnées et Markdown

```python
import json
import trafilatura
from typing import Dict, Any, Optional

def extraire_contenu_complet(html_ou_url: str, is_url: bool = False, favor_precision: bool = True) -> Dict[str, Any]:
    """
    Extrait le contenu propre, sa structure Markdown et ses métadonnées.
    Pour un pipeline RAG, on privilégie favor_precision=True (réduction du bruit).
    """
    html = trafilatura.fetch_url(html_ou_url) if is_url else html_ou_url
    if not html:
        return {}

    # Extraction structurée JSON avec métadonnées
    brut_json = trafilatura.extract(
        html,
        output_format="json",
        with_metadata=True,
        favor_precision=favor_precision
    )
    
    # Extraction Markdown pour préserver la structure hiérarchique
    texte_markdown = trafilatura.extract(
        html,
        output_format="markdown",
        favor_precision=favor_precision
    ) or ""

    if not brut_json:
        return {"texte": texte_markdown, "markdown": texte_markdown}

    donnees = json.loads(brut_json)
    return {
        "titre": donnees.get("title") or "Document sans titre",
        "auteur": donnees.get("author"),
        "date": donnees.get("date"),
        "source": html_ou_url if is_url else None,
        "texte": donnees.get("text", ""),
        "markdown": texte_markdown
    }
```

### 1.5 Compromis : Précision vs Rappel
* **Mode Précision (`favor_precision=True`) :** Strict. Ne retient que les blocs à certitude statistique élevée. C'est le **choix recommandé par défaut en RAG** car un faux positif (bruit) dégrade directement la génération du LLM.
* **Mode Rappel (`favor_recall=True`) :** Permissif. Utile lorsque les documents sources ont un formatage inhabituel ou si une phase de filtrage humain/LLM intervient en aval.

---

## 2. Nettoyage Mécanique & Normalisation

### 2.1 Pourquoi nettoyer mécaniquement avant l'indexation ?
Un modèle d'embedding convertit une suite de caractères en coordonnées mathématiques dans un espace vectoriel. Il ne « devine » pas qu'un espace insécable (`\u00A0`), un caractère invisible ou une balise `<span>` orpheline sont sémantiquement neutres.

**Conséquence dramatique :** Deux textes sémantiquement identiques génèrent deux vecteurs divergents si l'un contient un point de code invisible. La recherche échoue silencieusement sans la moindre erreur console.

### 2.2 Les 4 Piliers du Nettoyage Déterministe

#### A. Normalisation Unicode NFC
Un caractère accentué comme `é` peut s'écrire :
- En 1 point de code composé : `\u00E9` (NFC).
- En 2 points de code décomposés : `e` + `\u0301` (NFD).  
À l'écran le rendu est indiscernable, mais pour le tokenizer d'un modèle d'embedding (WordPiece, BPE), ce sont deux entrées différentes. La normalisation NFC unifie la représentation.

#### B. Éradication des Balises HTML Résiduelles
Supprime les reliquats d'extraction (`<span>`, `<br>`, `<em>`).

#### C. Suppression des Caractères Invisibles (Le bug indétectable à l'œil)
- Espace de largeur nulle (*zero-width space* `\u200B` à `\u200F`),
- Marques d'orientation bidirectionnelle (`\u202A` à `\u202E`),
- Marque d'ordre des octets (*Byte Order Mark* `\uFEFF`),
- Trait d'union conditionnel (*soft hyphen* `\u00AD`).

#### D. Normalisation des Espaces et Sauts de Ligne
Condensation des tabulations multiples en espace simple, limitation des sauts de ligne consécutifs à `\n\n` (paragraphe canonique) et suppression des espaces superflus en début et fin de ligne.

### 2.3 Pipeline Déterministe d'Assainissement (Python)

```python
import unicodedata
import re

_BALISES_HTML = re.compile(r"<[^>]+>")
# Plages zero-width, marques directionnelles, BOM et soft-hyphen
_INVISIBLES = re.compile(r"[\u200B-\u200F\u202A-\u202E\uFEFF\u00AD]")
_ESPACES = re.compile(r"[ \t]+")
_LIGNES_VIDES = re.compile(r"\n\s*\n+")

def normaliser_unicode(texte: str) -> str:
    """Normalise vers la forme canonique composée (NFC)."""
    return unicodedata.normalize("NFC", texte)

def retirer_html(texte: str) -> str:
    """Supprime les balises HTML orphelines."""
    return _BALISES_HTML.sub("", texte)

def retirer_invisibles(texte: str) -> str:
    """Élimine les caractères de contrôle et invisibles néfastes."""
    return _INVISIBLES.sub("", texte)

def normaliser_espaces(texte: str) -> str:
    """Réduit les espaces superflus et équilibre les paragraphes."""
    texte = _ESPACES.sub(" ", texte)
    texte = _LIGNES_VIDES.sub("\n\n", texte)
    lignes = [l.strip() for l in texte.splitlines()]
    return "\n".join(lignes).strip()

def pipeline_nettoyage(texte: str) -> str:
    """
    Pipeline rigoureux : l'ordre est critique.
    1. Unicode -> 2. HTML -> 3. Invisibles -> 4. Espaces en dernier.
    """
    if not texte:
        return ""
    texte = normaliser_unicode(texte)
    texte = retirer_html(texte)
    texte = retirer_invisibles(texte)
    texte = normaliser_espaces(texte)
    return texte
```

---

## 3. Stratégies de Chunking (Découpage en Fragments)

### 3.1 Pourquoi le Chunking est la clé de voûte du RAG
Un vecteur d'embedding résume l'intégralité du passage qu'il représente en un point unique :
- **Chunk trop grand (> 1000 tokens) :** Le vecteur agrège une moyenne floue de multiples thématiques hétérogènes. Il ne ressemble fortement à aucune question pointue.
- **Chunk trop petit (< 60 tokens) :** Le fragment perd son ancrage contextuel (ex: *« Il faut redémarrer le service »* sans préciser lequel).

Le rôle de l'architecte RAG consiste à isoler **une unité sémantique cohérente** (une idée claire par chunk).

---

### 3.2 Tableau Comparatif des 4 Grandes Stratégies

| Stratégie | Description & Fonctionnement | Cas d'Usage Idéal | Avantages | Limites & Précautions |
|---|---|---|---|---|
| **1. Taille Fixe + Recouvrement (Sliding Window)** | Fenêtre glissante de $N$ tokens/mots avançant d'un pas $P = N - \text{overlap}$. | Textes bruts hétérogènes, logs, dumps non structurés. | Déterministe, robuste, universel. | Risque de couper une phrase en plein milieu. Nécessite 10-20% d'overlap. |
| **2. Découpage par Phrases (Sentence Chunking)** | Découpe par ponctuation forte (`.!?`) puis agrège jusqu'à un budget de mots sans casser de phrase. | Prose continue, articles de presse, littérature, mémos. | Ne casse jamais la grammaire. Les chunks restent parfaitement intelligibles. | Une phrase très longue peut dépasser le budget unitaire. |
| **3. Découpage par Sections Markdown** | Découpe sur les balises de titres (`#`, `##`, `###`). | Spécifications techniques, Markdown, documentation RFC. | Respecte l'intention de l'auteur. Permet de préfixer le titre au chunk. | Inopérant si le document ne comporte aucune balise de titre. |
| **4. Chunking Sémantique (Semantic Chunking)** | Mesure la similarité cosinus entre phrases adjacentes et coupe là où la distance vectorielle dépasse un seuil. | Rapports d'analyse complexes avec transitions thématiques douces. | Frontières sémantiques précises et naturelles. | Coût de calcul élevé (nécessite d'appeler le modèle d'embedding pour chaque phrase). |

---

### 3.3 Implémentations Types

#### A. Fenêtre Glissante avec Recouvrement (Sliding Window)
Le recouvrement (*overlap*) est vital : sans lui, une idée située à cheval sur deux blocs est mathématiquement tronquée et perdue pour la recherche vectorielle.

```python
def chunk_taille_fixe(texte: str, taille: int = 500, recouvrement: int = 100) -> list[str]:
    """Découpe en fenêtre glissante de tokens ou mots."""
    if recouvrement >= taille:
        raise ValueError("Le recouvrement doit être strictement inférieur à la taille.")
    mots = texte.split()
    pas = taille - recouvrement
    chunks = []
    debut = 0
    while debut < len(mots):
        chunks.append(" ".join(mots[debut:debut + taille]))
        if debut + taille >= len(mots):
            break
        debut += pas
    return chunks
```

#### B. Découpage par Phrases
S'appuie sur une regex de détection de ponctuation forte suivie d'un espace et d'une majuscule :

```python
_FIN_PHRASE = re.compile(r"(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ])")

def segmenter_phrases(texte: str) -> list[str]:
    texte_nettoye = " ".join(texte.split())
    if not texte_nettoye:
        return []
    return [p.strip() for p in _FIN_PHRASE.split(texte_nettoye) if p.strip()]

def chunk_par_phrases(texte: str, max_mots: int = 120) -> list[str]:
    phrases = segmenter_phrases(texte)
    chunks, courant, compte = [], [], 0
    for phrase in phrases:
        nb = len(phrase.split())
        if courant and (compte + nb > max_mots):
            chunks.append(" ".join(courant))
            courant, compte = [], 0
        courant.append(phrase)
        compte += nb
    if courant:
        chunks.append(" ".join(courant))
    return chunks
```

#### C. Découpage par Sections avec Préfixage Contextuel
**Astuce d'Architecte :** Préfixer systématiquement le titre de la section au début du corps du chunk.  
Exemple : `[Volume nommé Docker] Créé explicitement avec docker volume create, il persiste indépendamment des conteneurs.`  
Cela injecte gratuitement le contexte dans l'embedding sans alourdir le texte.

```python
def chunk_par_sections_markdown(markdown: str) -> list[dict]:
    sections, titre_actuel, corps = [], "(En-tête)", []
    for ligne in markdown.splitlines():
        if ligne.lstrip().startswith("#"):
            if any(l.strip() for l in corps):
                sections.append({
                    "titre": titre_actuel,
                    "texte": f"[{titre_actuel}] " + "\n".join(corps).strip()
                })
            titre_actuel = ligne.lstrip("#").strip()
            corps = []
        else:
            corps.append(ligne)
    if any(l.strip() for l in corps):
        sections.append({
            "titre": titre_actuel,
            "texte": f"[{titre_actuel}] " + "\n".join(corps).strip()
        })
    return sections
```

---

## 4. Modèles d'Embedding & Mesures Vectorielles

### 4.1 Modèles Recommandés pour RAG Souverain

| Modèle | Dimensions | Multilingue ? | Déploiement Local | Contexte Max | Cas d'Usage Recommandé |
|---|---|---|---|---|---|
| **`nomic-embed-text`** | **768** | Oui (80+ langues) | Ollama (`ollama pull nomic-embed-text`) | 8 192 tokens | **Standard Souverain RAGTIME.** Excellent compromis précision/vitesse/mémoire. |
| **`bge-m3`** (BAAI) | **1024** | Oui (Haute fidélité) | Ollama / HuggingFace | 8 192 tokens | RAG haute exigence juridique ou technique multi-lingue (dense + sparse + colbert). |
| **`all-MiniLM-L6-v2`** | **384** | Non (Anglais fort) | CPU / sentence-transformers | 512 tokens | Prototypage rapide basse consommation, non recommandé pour corpus français. |
| **`paraphrase-multilingual`** | **768** | Oui | sentence-transformers | 512 tokens | Alternative CPU légère pour documentation d'entreprise francophone. |

> **Règle d'or absolue d'Immutabilité Vectorielle :**  
> Les vecteurs issus de deux modèles différents ou de dimensions différentes sont **strictement incompatibles**. On ne peut pas comparer un vecteur nomic-embed (768d) avec un vecteur bge-m3 (1024d). Tout changement de modèle impose la réindexation intégrale du corpus.

### 4.2 Mesure de Proximité : Similarité Cosinus
La similarité cosinus mesure l'angle géométrique $\theta$ entre deux vecteurs $\vec{A}$ et $\vec{B}$, indépendamment de leur norme euclidienne :

$$\text{Similarité Cosinus}(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|} = \frac{\sum_{i=1}^n A_i B_i}{\sqrt{\sum_{i=1}^n A_i^2} \sqrt{\sum_{i=1}^n B_i^2}}$$

* **1.0 :** Vecteurs strictement colinéaires (sens identique).
* **0.75 - 0.95 :** Proximité sémantique forte (réponses hautement pertinentes en RAG).
* **0.50 - 0.70 :** Proximité modérée / contexte connexe.
* **< 0.50 :** Bruit statistique / hors sujet.

---

## 5. Indexation Scalable : FAISS vs pgvector (PostgreSQL)

Une comparaison linéaire naïve $O(N)$ recalcule la distance sur chaque chunk. À 100 000 chunks, la recherche s'effondre. L'utilisation d'une structure d'index de type **HNSW** (*Hierarchical Navigable Small World*) est impérative.

### Matrice Décisionnelle : Quand utiliser FAISS vs pgvector ?

| Critère | FAISS (Facebook AI Similarity Search) | PostgreSQL 16 + pgvector (HNSW) |
|---|---|---|
| **Architecture** | Bibliothèque en mémoire (*in-process*) sans serveur. | SGBD relationnel client-serveur ACID complet. |
| **Persistance** | Manuelle (`faiss.write_index` + fichier texte séparé pour métadonnées). | Automatique et transactionnelle (tables SQL). |
| **Cloisonnement Multi-Tenant** | Complexe (nécessite 1 index FAISS par tenant ou filtrage mémoire). | **Natif et parfait :** `WHERE tenant_id = :id` directement dans la clause SQL. |
| **Métadonnées & Jointures** | Pratiquement inexistantes ou bricolées en mémoire. | Richesse du format JSONB, clés étrangères, horodatages, versions. |
| **Rôle dans RAGTIME** | Utilisé pour prototypages ultra-rapides ou calculs hors-ligne. | **Moteur officiel de production souverain (Index HNSW $m=16, ef=64$).** |

---

## 6. Table de Synthèse & Diagnostic de Dépannage RAG

| Symptôme Constaté | Cause Racine Probable | Remédiation Recommandée |
|---|---|---|
| **La recherche remonte des pavés de navigation ou des bandeaux de cookies.** | Extraction brute sans filtrage heuristique. | Utiliser Trafilatura avec `favor_precision=True` plutôt qu'un regex HTML basique. |
| **Deux textes identiques produisent des résultats de recherche divergents.** | Présence de caractères invisibles (zero-width) ou décomposition Unicode NFD. | Passer l'intégralité du texte brut dans `pipeline_nettoyage` (NFC + purge `_INVISIBLES`). |
| **Le LLM répond « Selon vos documents... » mais hallucine sur les détails.** | Chunks trop gros (> 1000 mots), le vecteur dense a lissé l'information critique. | Réduire le chunk size à 400-512 tokens et adopter le découpage phrastique avec 15% d'overlap. |
| **Le LLM répond « Information introuvable » alors que le mot est dans le document.** | L'idée était coupée à la frontière de deux chunks sans chevauchement. | Configurer `chunk_overlap = 64` tokens (règle $overlap < size / 2$). |
| **`AssertionError: dimension mismatch` à l'insertion vectorielle.** | Incompatibilité de dimension (ex: vecteur 768d envoyé dans une colonne pgvector 1024d). | Vérifier la concordance stricte entre le modèle d'embedding actif et la table SQL. |
| **Scores cosinus tous tassés entre 0.82 et 0.88 sans distinction claire.** | Corpus excessivement homogène ou absence de normalisation $L_2$ des vecteurs. | Normaliser les vecteurs avec `faiss.normalize_L2` ou vérifier que pgvector utilise `<=>` (cosine distance). |

---

*Ce document fait foi pour les implémentations logicielles, les contrats d'API et les interfaces d'ingestion de la plateforme RAGTIME.*
