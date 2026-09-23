/**
 * Détection Robuste de Formats Documentaires par Magic Bytes & Inspection de Tête - US-FRONT-30 & TNR-25
 * Inspecte la signature binaire réelle du fichier plutôt que de se fier aveuglément à l'extension.
 */

export type DetectedDocumentType = 'pdf' | 'markdown' | 'sql' | 'unknown';

export interface MagicBytesDetectionResult {
  detectedType: DetectedDocumentType;
  confidence: 'high' | 'medium' | 'low';
  mimeType: string;
  signature: string;
  isExecutableOrSuspicious: boolean;
}

/**
 * Analyse les octets initiaux d'un buffer ou d'une chaîne
 */
export function detectDocumentFormat(
  bytes: Uint8Array | ArrayBuffer | string
): MagicBytesDetectionResult {
  let uint8: Uint8Array;
  if (typeof bytes === 'string') {
    uint8 = new TextEncoder().encode(bytes.slice(0, 1024));
  } else if (bytes instanceof ArrayBuffer) {
    uint8 = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 1024));
  } else {
    uint8 = bytes.subarray(0, Math.min(bytes.length, 1024));
  }

  // 1. Détection Exécutables Interdits (PE MZ = 0x4D 0x5A, ELF = 0x7F 0x45 0x4C 0x46)
  if (uint8.length >= 2 && uint8[0] === 0x4d && uint8[1] === 0x5a) {
    return {
      detectedType: 'unknown',
      confidence: 'high',
      mimeType: 'application/x-dosexec',
      signature: 'MZ (PE Windows Executable)',
      isExecutableOrSuspicious: true,
    };
  }
  if (uint8.length >= 4 && uint8[0] === 0x7f && uint8[1] === 0x45 && uint8[2] === 0x4c && uint8[3] === 0x46) {
    return {
      detectedType: 'unknown',
      confidence: 'high',
      mimeType: 'application/x-elf',
      signature: 'ELF (Linux Executable)',
      isExecutableOrSuspicious: true,
    };
  }

  // 2. Détection PDF : %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    uint8.length >= 5 &&
    uint8[0] === 0x25 &&
    uint8[1] === 0x50 &&
    uint8[2] === 0x44 &&
    uint8[3] === 0x46 &&
    uint8[4] === 0x2d
  ) {
    return {
      detectedType: 'pdf',
      confidence: 'high',
      mimeType: 'application/pdf',
      signature: '%PDF- (Adobe PDF)',
      isExecutableOrSuspicious: false,
    };
  }

  // Décodage texte des premiers 1024 octets pour détection SQL vs Markdown
  let textHeader = '';
  try {
    textHeader = new TextDecoder('utf-8', { fatal: false }).decode(uint8);
  } catch {
    return {
      detectedType: 'unknown',
      confidence: 'low',
      mimeType: 'application/octet-stream',
      signature: 'Binary non décodable',
      isExecutableOrSuspicious: false,
    };
  }

  const cleanHeader = textHeader.trimStart();

  // 3. Détection SQL : mots-clés typiques au début du script
  const sqlKeywordsRegex = /^(?:--|\/\*|CREATE\s+TABLE|CREATE\s+DATABASE|INSERT\s+INTO|SELECT\s+|ALTER\s+TABLE|DROP\s+TABLE|BEGIN\s+TRANSACTION|SET\s+|USE\s+)/i;
  if (sqlKeywordsRegex.test(cleanHeader)) {
    return {
      detectedType: 'sql',
      confidence: 'high',
      mimeType: 'application/sql',
      signature: 'SQL DDL/DML Statement',
      isExecutableOrSuspicious: false,
    };
  }

  // 4. Détection Markdown : titres #, frontmatter ---, listes ou syntaxe markdown
  const markdownPatterns = /^(?:---[\s\S]*?---|#\s+.+|##\s+.+|>\s+.+|\*\s+.+|-\s+.+|```)/;
  if (markdownPatterns.test(cleanHeader)) {
    return {
      detectedType: 'markdown',
      confidence: 'high',
      mimeType: 'text/markdown',
      signature: 'CommonMark / Frontmatter Header',
      isExecutableOrSuspicious: false,
    };
  }

  // Si c'est du texte brut UTF-8 standard sans marqueurs binaires bizarres
  return {
    detectedType: 'markdown',
    confidence: 'medium',
    mimeType: 'text/plain',
    signature: 'UTF-8 Plain Text Document',
    isExecutableOrSuspicious: false,
  };
}
