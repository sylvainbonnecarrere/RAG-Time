/**
 * Schémas et Règles de Validation RAGTIME (Phase 5 - US-FRONT-20 à US-FRONT-24)
 * Fournit une validation typée, prédictive et sans dépendances lourdes pour l'ensemble des formulaires.
 */

import { sanitizeFilename, sanitizeInput, sanitizeSlug, sanitizePrompt } from './sanitizer';

export interface ValidationResult<T = any> {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
  sanitized?: T;
}

/**
 * 1. Validation du formulaire d'Authentification (US-FRONT-21)
 */
export function validateLoginForm(emailRaw: string, passwordRaw: string): ValidationResult<{ email: string; password: string }> {
  const errors: Record<string, string> = {};
  const email = sanitizeInput(emailRaw).toLowerCase();
  const password = passwordRaw || '';

  // Validation Email RFC 5322 simplifié et strict
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!email) {
    errors.email = "L'adresse email est requise.";
  } else if (!emailRegex.test(email)) {
    errors.email = "Format d'adresse email invalide (ex: utilisateur@domaine.fr).";
  } else if (email.length > 254) {
    errors.email = "L'adresse email ne peut pas dépasser 254 caractères.";
  }

  // Validation Mot de Passe
  if (!password) {
    errors.password = "Le mot de passe est requis.";
  } else if (password.length < 6) {
    errors.password = "Le mot de passe doit comporter au moins 6 caractères.";
  } else if (password.length > 128) {
    errors.password = "Le mot de passe ne peut pas dépasser 128 caractères.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: { email, password },
  };
}

/**
 * 2. Validation du formulaire de Création / Édition de Domaine (Espace RAG)
 */
export interface TenantFormData {
  name: string;
  slug: string;
  domain: string;
  domain_category: string;
  description?: string;
  system_instructions?: string;
}

export function validateTenantForm(data: TenantFormData): ValidationResult<TenantFormData> {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const name = sanitizeInput(data.name);
  const slug = sanitizeSlug(data.slug || data.name);
  const domain = sanitizeInput(data.domain);
  const domain_category = sanitizeInput(data.domain_category) || 'general';
  const description = sanitizeInput(data.description);
  const system_instructions = sanitizeInput(data.system_instructions);

  // Nom de l'espace
  if (!name) {
    errors.name = "Le nom de l'espace de travail est requis.";
  } else if (name.length < 3) {
    errors.name = "Le nom de l'espace doit comporter au moins 3 caractères.";
  } else if (name.length > 60) {
    errors.name = "Le nom de l'espace ne peut pas dépasser 60 caractères.";
  }

  // Slug
  if (!slug) {
    errors.slug = "L'identifiant slug est requis.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = "Le slug doit être en minuscules avec des tirets (kebab-case, ex: finance-audit).";
  } else if (slug.length < 3 || slug.length > 50) {
    errors.slug = "Le slug doit comporter entre 3 et 50 caractères.";
  }

  // Domaine métier
  if (!domain) {
    errors.domain = "Le domaine métier cible est requis (ex: Juridique, Finance, RH).";
  } else if (domain.length < 2 || domain.length > 80) {
    errors.domain = "Le libellé du domaine doit comporter entre 2 et 80 caractères.";
  }

  // Instructions Système / Prompt métier (optionnel ou recommandé)
  if (system_instructions && system_instructions.length > 3000) {
    errors.system_instructions = "Les instructions système ne peuvent pas dépasser 3000 caractères.";
  } else if (!system_instructions || system_instructions.length < 15) {
    warnings.system_instructions = "Un prompt métier détaillé (>= 15 caractères) améliore la précision des réponses.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    sanitized: {
      name,
      slug,
      domain,
      domain_category,
      description,
      system_instructions,
    },
  };
}

/**
 * 3. Validation du Téléversement Documentaire (US-FRONT-22)
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.md', '.markdown', '.sql', '.txt', '.csv', '.docx', '.json'];
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 Mo

export interface DocumentUploadInput {
  file: {
    name: string;
    size: number;
    type?: string;
  } | null;
  domain_id?: string;
  description?: string;
}

export function validateDocumentUpload(data: DocumentUploadInput): ValidationResult<{
  cleanFilename: string;
  domain_id: string;
  description: string;
}> {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!data.file) {
    errors.file = "Veuillez sélectionner un fichier à téléverser.";
    return { isValid: false, errors };
  }

  const rawName = data.file.name || '';
  const cleanFilename = sanitizeFilename(rawName);
  const size = data.file.size;

  // Validation Extension
  const ext = rawName.substring(rawName.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.file = `Format de fichier non autorisé (${ext || 'inconnu'}). Formats acceptés : ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }

  // Validation Taille
  if (size <= 0) {
    errors.file = "Le fichier sélectionné est vide (0 octet).";
  } else if (size > MAX_FILE_SIZE_BYTES) {
    const sizeMo = (size / (1024 * 1024)).toFixed(1);
    errors.file = `Fichier trop volumineux (${sizeMo} Mo). La limite maximale autorisée est de 25 Mo.`;
  }

  // Validation Domaine d'affectation
  const domain_id = sanitizeInput(data.domain_id);
  if (!domain_id) {
    errors.domain_id = "Veuillez sélectionner un domaine de destination pour ce document.";
  }

  // Description
  const description = sanitizeInput(data.description);
  if (description.length > 500) {
    errors.description = "La description ne peut pas dépasser 500 caractères.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    sanitized: {
      cleanFilename,
      domain_id,
      description,
    },
  };
}

/**
 * 4. Validation Mathématique des Hyperparamètres de Preset RAG (US-FRONT-23 & TNR-18)
 */
export interface PresetFormData {
  name: string;
  description?: string;
  chunk_size: number;
  chunk_overlap: number;
  similarity_threshold: number;
  retrieval_top_k: number;
  reranking_enabled: boolean;
  embedding_model: string;
}

export function validatePresetParams(
  data: PresetFormData,
  isTenantEmpty: boolean
): ValidationResult<PresetFormData> {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Règle d'or TNR-18 / US-FRONT-19 : Espace alimenté -> modification bloquée
  if (!isTenantEmpty) {
    errors.general = "Violation d'immutabilité : Cet espace contient déjà des documents découpés en chunks dans pgvector. Le preset est strictement scellé.";
    return { isValid: false, errors };
  }

  const name = sanitizeInput(data.name);
  if (!name) {
    errors.name = "Le nom du preset est requis.";
  } else if (name.length < 3 || name.length > 80) {
    errors.name = "Le nom du preset doit comporter entre 3 et 80 caractères.";
  }

  // Chunk Size (256 à 1024 tokens)
  const chunkSize = Number(data.chunk_size);
  if (isNaN(chunkSize) || chunkSize < 256 || chunkSize > 1024) {
    errors.chunk_size = "La taille de chunk doit être comprise entre 256 et 1024 tokens.";
  }

  // Chunk Overlap (20 à 200 tokens)
  const chunkOverlap = Number(data.chunk_overlap);
  if (isNaN(chunkOverlap) || chunkOverlap < 20 || chunkOverlap > 200) {
    errors.chunk_overlap = "Le recouvrement (overlap) doit être compris entre 20 et 200 tokens.";
  }

  // INVARIANT MATHÉMATIQUE RAGTIME : Overlap < Chunk Size / 2
  if (!errors.chunk_size && !errors.chunk_overlap) {
    if (chunkOverlap >= chunkSize / 2) {
      errors.chunk_overlap = `Incohérence mathématique : le recouvrement (${chunkOverlap} tok) doit être strictement inférieur à la moitié de la taille de chunk (${Math.floor(chunkSize / 2)} tok) pour éviter les redondances vectorielles.`;
    }
  }

  // Seuil de Similarité (0.50 à 0.95)
  const threshold = Number(data.similarity_threshold);
  if (isNaN(threshold) || threshold < 0.50 || threshold > 0.95) {
    errors.similarity_threshold = "Le seuil de similarité cosinus doit être compris entre 0.50 et 0.95.";
  } else if (threshold < 0.60) {
    warnings.similarity_threshold = "Un seuil inférieur à 0.60 peut admettre des fragments faiblement corrélés.";
  } else if (threshold > 0.85) {
    warnings.similarity_threshold = "Un seuil supérieur à 0.85 est très strict et risque de filtrer des passages utiles.";
  }

  // Top-K (1 à 12)
  const topK = Number(data.retrieval_top_k);
  if (isNaN(topK) || topK < 1 || topK > 12) {
    errors.retrieval_top_k = "Le nombre de fragments extraits (Top-K) doit être compris entre 1 et 12.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    sanitized: {
      ...data,
      name,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
      similarity_threshold: threshold,
      retrieval_top_k: topK,
    },
  };
}

/**
 * 5. Validation des Requêtes Chat RAG (US-FRONT-24)
 */
export function validateChatQuery(
  rawQuery: string,
  documentsCount: number,
  isStreaming: boolean
): { isValid: boolean; error?: string; warning?: string; sanitizedQuery: string } {
  const sanitizedQuery = sanitizePrompt(rawQuery);

  if (isStreaming) {
    return {
      isValid: false,
      error: "Une génération de réponse est déjà en cours. Veuillez patienter.",
      sanitizedQuery,
    };
  }

  if (documentsCount === 0) {
    return {
      isValid: false,
      error: "Ce domaine est vierge (0 document indexé). Téléversez vos premiers fichiers pour activer l'inférence RAG.",
      sanitizedQuery,
    };
  }

  if (!sanitizedQuery || sanitizedQuery.length === 0) {
    return {
      isValid: false,
      error: "Veuillez saisir une question avant d'envoyer.",
      sanitizedQuery: '',
    };
  }

  if (sanitizedQuery.length < 3) {
    return {
      isValid: false,
      error: "La question doit comporter au moins 3 caractères significatifs pour une recherche sémantique.",
      sanitizedQuery,
    };
  }

  if (sanitizedQuery.length > 4000) {
    return {
      isValid: false,
      error: "La question dépasse la longueur maximale autorisée (4000 caractères).",
      sanitizedQuery,
    };
  }

  return {
    isValid: true,
    sanitizedQuery,
  };
}
