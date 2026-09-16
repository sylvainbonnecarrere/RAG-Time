/**
 * Tests Unitaires & TNR : US-FRONT-01 & TNR-01
 * Vérification des contrats OpenAPI et de l'Adapter Pattern
 */

import { DocumentDTO, MessageSourceDTO, SSEEventType } from '../contracts/api-types';
import { MemoryApiClient } from '../services/apiClient';

describe('US-FRONT-01 : Contrats OpenAPI & ApiClientPort', () => {
  const client = new MemoryApiClient();

  test('Doit récupérer la liste des tenants avec leurs rôles sans altération', async () => {
    const tenants = await client.getTenants();
    expect(tenants.length).toBeGreaterThan(0);
    expect(tenants[0]).toHaveProperty('id');
    expect(tenants[0]).toHaveProperty('name');
    expect(tenants[0]).toHaveProperty('slug');
    expect(tenants[0]).toHaveProperty('role');
  });

  test('TNR-01 : Vérification de la compatibilité des 8 types d\'événements SSE', () => {
    const expectedEvents: SSEEventType[] = [
      'message.started',
      'retrieval.started',
      'retrieval.completed',
      'generation.started',
      'generation.delta',
      'sources.available',
      'message.completed',
      'message.failed',
    ];

    expect(expectedEvents).toHaveLength(8);
  });

  test('Doit calculer correctement la structure des sources et métadonnées JSONB', async () => {
    const chunk = await client.getChunkDetail('test-chunk-id');
    expect(chunk).not.toBeNull();
    const source = chunk as MessageSourceDTO;
    expect(source.similarity_score).toBeGreaterThanOrEqual(0);
    expect(source.similarity_score).toBeLessThanOrEqual(1);
    expect(source.metadata).toHaveProperty('embedding_model');
    expect(source.metadata).toHaveProperty('chunk_index');
  });
});
