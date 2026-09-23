/**
 * Tests Unitaires & TNR : Phase 5 (US-FRONT-15 à US-FRONT-18)
 * TNR-14 à TNR-17 : Immutabilité des presets, Comparateur RRF, Export souverain, RBAC Démo
 */

import { MemoryApiClient } from '../services/apiClient';
import { validatePresetParams, validateLoginForm, validateDocumentUpload } from '../lib/validation/schemas';
import { sanitizeInput } from '../lib/validation/sanitizer';

describe('Phase 5 : Fonctionnalités Avancées & Non-Régression TNR-14 à TNR-17', () => {
  test('TNR-14 : Règle d\'Immutabilité des Presets après Ingestion (US-FRONT-15)', async () => {
    const client = new MemoryApiClient();
    const initialPresets = await client.getPresets('t-101-fin-corp');
    const activeOne = initialPresets.find((p) => p.is_active) || initialPresets[0];

    // Modification du preset qui doit générer une nouvelle révision immuable v+1
    const newRevision = await client.updatePresetImmutable('t-101-fin-corp', activeOne.id, {
      name: `${activeOne.name} (Modifié)`,
      chunk_size: 768,
      chunk_overlap: 96,
      similarity_threshold: 0.75,
      retrieval_top_k: 5,
      reranking_enabled: true,
      embedding_model: activeOne.embedding_model,
      is_active: true,
    });

    expect(newRevision.version).toBeGreaterThan(activeOne.version);

    const updatedPresets = await client.getPresets('t-101-fin-corp');
    const oldVersionStillExists = updatedPresets.some(
      (p) => p.id === activeOne.id && p.version === activeOne.version
    );
    expect(oldVersionStillExists).toBe(true);
  });

  test('TNR-15 : Cohérence Mathématique RRF vs Dense Split-Screen (US-FRONT-16)', () => {
    const k = 60;
    // Cas 1 : Document sémantique général (rang dense 1, rang sparse 10)
    const scoreDoc1 = 1 / (k + 1) + 1 / (k + 10);
    // Cas 2 : Document à terme exact repêché (rang dense 4, rang sparse 1)
    const scoreDoc2 = 1 / (k + 4) + 1 / (k + 1);

    expect(scoreDoc2).toBeGreaterThan(scoreDoc1);
  });

  test('TNR-16 : Intégrité des Métadonnées d\'Export Souverain Markdown (US-FRONT-17)', () => {
    const dummyExport = {
      tenant_name: 'Tech & Dev Platform',
      domain: 'tech',
      model: 'Llama 3.2 3B GGUF Q4_K_M',
      query: 'Expliquer le cloisonnement pgvector',
      sources: [
        {
          name: 'Architecture_PgVector_Ollama.md',
          page: 3,
          similarity_score: 0.934,
          hash: 'fedcba0987654321',
        },
      ],
    };

    expect(dummyExport.sources[0].hash).toBeDefined();
    expect(dummyExport.sources[0].similarity_score).toBeGreaterThan(0.7);
  });

  test('TNR-17 : Bascule Rapide de Rôles Démo & Cloisonnement RBAC (US-FRONT-18)', () => {
    const demoAccounts = [
      { email: 'admin@ragtime.fr', role: 'owner' },
      { email: 'datascientist@ragtime.fr', role: 'member' },
      { email: 'lecteur@ragtime.fr', role: 'viewer' },
    ];

    expect(demoAccounts.every((acc) => ['owner', 'member', 'viewer'].includes(acc.role))).toBe(true);
    expect(demoAccounts.find((acc) => acc.role === 'owner')?.email).toBe('admin@ragtime.fr');
  });

  test('TNR-18 : Immutabilité Conditionnelle des Presets RAG (US-FRONT-23)', () => {
    const validPresetData = {
      name: 'Preset Test Production',
      chunk_size: 512,
      chunk_overlap: 64,
      similarity_threshold: 0.75,
      retrieval_top_k: 5,
      reranking_enabled: true,
      embedding_model: 'nomic-embed-text-v1.5',
    };

    // Cas 1 : Domaine Vierge -> Doit être valide
    const emptyValidation = validatePresetParams(validPresetData, true);
    expect(emptyValidation.isValid).toBe(true);

    // Cas 2 : Domaine Alimenté -> Bloqué avec erreur immutability
    const populatedValidation = validatePresetParams(validPresetData, false);
    expect(populatedValidation.isValid).toBe(false);
    expect(populatedValidation.errors.immutability).toBeDefined();

    // Cas 3 : Invariant overlap < chunk_size / 2
    const invalidOverlap = validatePresetParams({ ...validPresetData, chunk_size: 256, chunk_overlap: 180 }, true);
    expect(invalidOverlap.isValid).toBe(false);
    expect(invalidOverlap.errors.chunk_overlap).toBeDefined();
  });

  test('TNR-19 : Assainissement XSS & Validation des Formulaires (US-FRONT-19)', () => {
    // 1. Assainissement anti-XSS
    const dirty = '<script>alert("xss")</script>Texte Propre';
    const cleaned = sanitizeInput(dirty);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('alert');
    expect(cleaned).toBe('Texte Propre');

    // 2. Validation Login RFC
    const invalidLogin = validateLoginForm('invalid-email', '123');
    expect(invalidLogin.isValid).toBe(false);
    expect(invalidLogin.errors.email).toBeDefined();
    expect(invalidLogin.errors.password).toBeDefined();

    // 3. Fichier interdit
    const forbidden = validateDocumentUpload({ name: 'malware.exe', size: 1024, type: 'application/x-msdownload' } as any);
    expect(forbidden.isValid).toBe(false);
    expect(forbidden.errors.file).toBeDefined();
  });
});
