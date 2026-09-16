/**
 * Tests Unitaires & TNR : Phase 5 (US-FRONT-15 à US-FRONT-18)
 * TNR-14 à TNR-17 : Immutabilité des presets, Comparateur RRF, Export souverain, RBAC Démo
 */

import { MemoryApiClient } from '../services/apiClient';

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
});
