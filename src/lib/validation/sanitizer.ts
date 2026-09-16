/**
 * Module de Sanitization & Protection Sécurisée RAGTIME
 * Assainit les entrées utilisateurs pour neutraliser les risques XSS,
 * les injections de traversée de chemin (path traversal) et les caractères de contrôle.
 */

/**
 * Assainit une chaîne de texte générique :
 * - Supprime les balises HTML/scripts (<script>, <img onerror>, etc.)
 * - Élimine les caractères de contrôle non imprimables
 * - Normalise les espaces superflus
 */
export function sanitizeInput(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/<[^>]*>?/gm, '') // Élimination des balises HTML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Caractères de contrôle ASCII
    .trim();
}

/**
 * Assainit un nom de fichier pour le stockage et l'indexation RAG :
 * - Bloque la traversée de répertoire (../, ..\, etc.)
 * - Supprime les chemins absolus ou relatifs dangereux
 * - Conserve uniquement les caractères autorisés (alphanumériques, tirets, underscores, points)
 * - Limite la taille maximale à 120 caractères
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'document_sans_nom.pdf';
  // Extraire le nom de base sans chemin de dossier
  let baseName = filename.replace(/^.*[\\/]/, '');
  
  // Remplacer les caractères dangereux ou de traversée
  baseName = baseName
    .replace(/\.{2,}/g, '.') // Élimine les doubles points ..
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remplace les caractères spéciaux par _
    .replace(/^_+/, ''); // Pas de tiret bas en tête
    
  if (!baseName || baseName === '.') {
    baseName = 'document_securise.pdf';
  }
  
  // Tronquer à 120 caractères en préservant l'extension si possible
  if (baseName.length > 120) {
    const lastDot = baseName.lastIndexOf('.');
    if (lastDot > 0 && baseName.length - lastDot <= 10) {
      const ext = baseName.substring(lastDot);
      baseName = baseName.substring(0, 120 - ext.length) + ext;
    } else {
      baseName = baseName.substring(0, 120);
    }
  }
  
  return baseName;
}

/**
 * Assainit un slug d'espace ou domaine :
 * - Format kebab-case strict : minuscules, chiffres, tirets
 */
export function sanitizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9-]/g, '-') // Remplace tout caractère non alphanumérique par -
    .replace(/-+/g, '-') // Regroupe les tirets multiples
    .replace(/^-+|-+$/g, ''); // Trim des tirets
}

/**
 * Assainit une invite de chat RAG :
 * - Échappe les tentatives de prompt injection basées sur des balises de système simulé
 * - Réduit les espaces blancs excessifs
 */
export function sanitizePrompt(prompt: string): string {
  if (!prompt) return '';
  return prompt
    .replace(/<\|.*?\|>/g, '') // Neutralise les tokens spéciaux LLM ex: <|im_start|>
    .replace(/\[INST\]|\[\/INST\]/g, '') // Neutralise les balises d'instruction Llama
    .replace(/\s+/g, ' ')
    .trim();
}
