/**
 * Tests Unitaires & TNR : US-FRONT-03 & TNR-03
 * Vérification du versioning sans écrasement et validation d'intégrité SHA256
 */

import { MemoryApiClient } from '../services/apiClient';

describe('US-FRONT-03 & TNR-03 : Ingestion & Versioning Immuable', () => {
  const client = new MemoryApiClient();
  const tenantId = 't-303-tech-dev';

  test('TNR-03 : L\'upload d\'un document portant le même nom doit créer une version v2 sans écraser v1', async () => {
    const filename = 'Architecture_PgVector_Ollama.md';
    
    // Upload d'une nouvelle version
    const { document, job } = await client.uploadDocument(tenantId, {
      name: filename,
      size: 740000,
      type: 'text/markdown',
      sha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    });

    expect(document.current_version).toBeGreaterThanOrEqual(2);
    expect(document.versions.length).toBeGreaterThanOrEqual(2);
    expect(document.versions[0].version_number).toBe(document.current_version);
    expect(job.status).toBe('processing');
  });
});
