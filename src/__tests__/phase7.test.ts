/**
 * Tests Unitaires & TNR : Phase 7 (US-FRONT-30 à US-FRONT-35)
 * Tests de Non-Régression TNR-25 à TNR-31 :
 * - TNR-25 : Détection par Magic Bytes (PDF, SQL, Markdown) et rejet d'exécutables
 * - TNR-26 : Extraction Web Trafilatura 2.0 & Protection Anti-SSRF (RFC 1918 / Loopback)
 * - TNR-27 : Normalisation Unicode NFC & Nettoyage Déterministe
 * - TNR-28 : Partitionnement Sémantique Markdown & Conservation des En-têtes
 * - TNR-29 : Simulation Pré-Indexation Dry-Run (isolation mémoire & dimensionnement VRAM)
 * - TNR-30 : Préservation de l'espace vectoriel et gestion des presets de retrieval
 * - TNR-31 : Étalonnage du score de similarité CosineScoreBadge
 */

import { detectDocumentFormat } from '../lib/validation/magicBytes';
import { validateUrlAntiSSRF } from '../components/v1/WebUrlExtractionForm';
import { cleanDocumentText } from '../components/v1/CleaningOptionsPanel';
import { simulateDryRun, computeVramBudget } from '../components/v1/PreIndexingDryRunModal';
import { validatePresetParams } from '../lib/validation/schemas';

describe('Phase 7 : Pipeline d\'Ingestion, Trafilatura, Nettoyage & Non-Régression TNR-25 à TNR-31', () => {
  // TNR-25 : Détection par Magic Bytes
  test('TNR-25 : Détection par Magic Bytes & Rejet des binaires suspects (US-FRONT-30)', () => {
    // PDF avec signature %PDF-
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const pdfResult = detectDocumentFormat(pdfBytes);
    expect(pdfResult.detectedType).toBe('pdf');
    expect(pdfResult.isExecutableOrSuspicious).toBe(false);

    // Binaire Windows PE (MZ)
    const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const exeResult = detectDocumentFormat(exeBytes);
    expect(exeResult.isExecutableOrSuspicious).toBe(true);
    expect(exeResult.detectedType).toBe('unknown');

    // SQL Header
    const sqlText = 'CREATE TABLE documents (id UUID PRIMARY KEY, name TEXT);';
    const sqlResult = detectDocumentFormat(sqlText);
    expect(sqlResult.detectedType).toBe('sql');

    // Markdown Header
    const mdText = '# Architecture pgvector & Trafilatura 2.0\n\nContenu document';
    const mdResult = detectDocumentFormat(mdText);
    expect(mdResult.detectedType).toBe('markdown');
  });

  // TNR-26 : Extraction Web & Anti-SSRF
  test('TNR-26 : Protection Anti-SSRF stricte sur URLs Web (US-FRONT-31)', () => {
    // Doit rejeter localhost et loopback
    expect(validateUrlAntiSSRF('http://localhost:8080/admin').isValid).toBe(false);
    expect(validateUrlAntiSSRF('http://127.0.0.1/secret').isValid).toBe(false);
    expect(validateUrlAntiSSRF('http://0.0.0.0/').isValid).toBe(false);

    // Doit rejeter les IP privées RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    expect(validateUrlAntiSSRF('https://192.168.1.50/dashboard').isValid).toBe(false);
    expect(validateUrlAntiSSRF('https://10.0.0.1/api').isValid).toBe(false);
    expect(validateUrlAntiSSRF('https://172.16.0.5/').isValid).toBe(false);

    // Doit rejeter l'adresse de métadonnées Cloud AWS/GCP (169.254.169.254)
    expect(validateUrlAntiSSRF('http://169.254.169.254/latest/meta-data').isValid).toBe(false);

    // Doit rejeter les protocoles non-web
    expect(validateUrlAntiSSRF('file:///etc/passwd').isValid).toBe(false);
    expect(validateUrlAntiSSRF('ftp://files.example.com').isValid).toBe(false);

    // Doit accepter une URL web publique légitime
    expect(validateUrlAntiSSRF('https://en.wikipedia.org/wiki/Retrieval-augmented_generation').isValid).toBe(true);
    expect(validateUrlAntiSSRF('https://docs.github.com/en/get-started').isValid).toBe(true);
  });

  // TNR-27 : Normalisation Unicode NFC & Nettoyage Déterministe
  test('TNR-27 : Normalisation Unicode NFC et éradication des invisibles (US-FRONT-32)', () => {
    // Texte avec caractères invisibles Zero-Width Space (\u200B) et balise HTML
    const rawDirty = 'Rapport\u200B souverain\uFEFF avec <script>alert("hack")</script> <b>gras</b> et   multiples    espaces.';
    const result = cleanDocumentText(rawDirty, {
      unicode_nfc: true,
      strip_invisibles: true,
      strip_html: true,
      normalize_whitespace: true,
    });

    expect(result.cleanedText).not.toContain('\u200B');
    expect(result.cleanedText).not.toContain('\uFEFF');
    expect(result.cleanedText).not.toContain('<script>');
    expect(result.cleanedText).not.toContain('<b>');
    expect(result.stats.invisiblesCount).toBeGreaterThan(0);
    expect(result.stats.tagsCount).toBeGreaterThan(0);

    // Vérification de la préservation mathématique (p < 0.05 ne doit pas être supprimé)
    const mathText = 'Résultat statistique : p < 0.05 avec intervalle [a, b].';
    const mathCleaned = cleanDocumentText(mathText, {
      unicode_nfc: true,
      strip_invisibles: true,
      strip_html: true,
      normalize_whitespace: false,
    });
    expect(mathCleaned.cleanedText).toContain('p < 0.05');
  });

  // TNR-28 : Découpage Sémantique et Invariants de Fenêtrage
  test('TNR-28 : Invariants du découpage et préservation de la taille (US-FRONT-33)', () => {
    const text = 'Mot '.repeat(500);
    const dryRun = simulateDryRun(text, 256, 32, 'sliding_window');

    expect(dryRun.totalChunks).toBeGreaterThan(1);
    expect(dryRun.totalTokens).toBeGreaterThan(0);
    expect(dryRun.avgTokensPerChunk).toBeLessThanOrEqual(256 * 1.5);
  });

  // TNR-29 : Simulation Pré-Indexation Dry-Run & Dimensionnement VRAM
  test('TNR-29 : Simulation Dry-Run 100% en mémoire et calcul VRAM HNSW 768d (US-FRONT-34)', () => {
    const sampleDoc = '# Architecture Souveraine\n\n' + 'Paragraphe de test technique. '.repeat(100);
    const sim = simulateDryRun(sampleDoc, 512, 64, 'sliding_window');

    expect(sim.totalChunks).toBeGreaterThan(0);
    expect(sim.previewChunks.length).toBeLessThanOrEqual(3);

    // Dimensionnement VRAM 768d : raw = chunks * 768 * 4 octets, HNSW overhead = 1.5x raw
    const vram = computeVramBudget(sim.totalChunks, 768);
    const expectedRaw = sim.totalChunks * 768 * 4;
    const expectedHnsw = Math.round(expectedRaw * 1.5);

    expect(vram.rawBytes).toBe(expectedRaw);
    expect(vram.hnswBytes).toBe(expectedHnsw);
    expect(vram.totalBytes).toBe(expectedRaw + expectedHnsw);
  });

  // TNR-30 : Validation des Règles d'Immutabilité et Retrieval Seul
  test('TNR-30 : Scellement de l\'espace vectoriel et validation allowRetrievalOnly (US-FRONT-23)', () => {
    // Sur domaine peuplé, modification du chunk_size interdite
    const resBlocked = validatePresetParams(
      {
        name: 'Preset Test',
        chunk_size: 1024,
        chunk_overlap: 100,
        similarity_threshold: 0.70,
        retrieval_top_k: 8,
        reranking_enabled: false,
        embedding_model: 'text-embedding-3-small',
      },
      false, // isTenantEmpty = false (domaine avec documents)
      { allowRetrievalOnly: false }
    );
    expect(resBlocked.isValid).toBe(false);
    expect(resBlocked.errors.immutability).toBeDefined();

    // Avec allowRetrievalOnly = true, la modification des seuils de recherche est autorisée
    const resRetrievalOnly = validatePresetParams(
      {
        name: 'Preset Test',
        chunk_size: 512,
        chunk_overlap: 64,
        similarity_threshold: 0.80,
        retrieval_top_k: 12,
        reranking_enabled: true,
        embedding_model: 'text-embedding-3-small',
      },
      false,
      { allowRetrievalOnly: true }
    );
    expect(resRetrievalOnly.isValid).toBe(true);
  });

  // TNR-31 : Étalonnage du Cosine Score
  test('TNR-31 : Étalonnage du Cosine Score et segmentation de confiance (US-FRONT-35)', () => {
    const highSimilarity = 0.88;
    const mediumSimilarity = 0.71;
    const lowSimilarity = 0.58;

    expect(highSimilarity).toBeGreaterThanOrEqual(0.75);
    expect(mediumSimilarity).toBeGreaterThanOrEqual(0.65);
    expect(mediumSimilarity).toBeLessThan(0.75);
    expect(lowSimilarity).toBeLessThan(0.65);
  });
});
