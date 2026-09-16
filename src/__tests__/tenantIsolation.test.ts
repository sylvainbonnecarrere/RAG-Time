/**
 * Tests Unitaires & TNR : US-FRONT-02 & TNR-02
 * Vérification du cloisonnement strict Multi-Tenant
 */

import { MemoryApiClient } from '../services/apiClient';

describe('US-FRONT-02 & TNR-02 : Cloisonnement Multi-Tenant', () => {
  const client = new MemoryApiClient();

  test('Doit commuter de tenant et refléter le nouvel identifiant', () => {
    client.switchTenant('t-202-jur-law');
    expect(client.getActiveTenantId()).toBe('t-202-jur-law');
  });

  test('TNR-02 : Les documents d\'un tenant ne doivent pas fuiter dans un autre tenant', async () => {
    client.switchTenant('t-101-fin-corp');
    const finDocs = await client.getDocuments('t-101-fin-corp');

    client.switchTenant('t-202-jur-law');
    const jurDocs = await client.getDocuments('t-202-jur-law');

    const finDocNames = finDocs.map((d) => d.name);
    const jurDocNames = jurDocs.map((d) => d.name);

    // Aucun document financier ne doit apparaître dans l'espace juridique
    jurDocNames.forEach((name) => {
      expect(finDocNames).not.toContain(name);
    });
  });

  test('Doit rejeter un tenant inexistant ou non autorisé', () => {
    expect(() => {
      client.switchTenant('tenant-inconnu-hack');
    }).toThrow('Tenant invalide ou non autorisé');
  });

  test('Permet à l\'utilisateur de choisir librement son domaine et créer un espace dédié', async () => {
    const created = await client.createTenant({
      name: 'RAG Aéronautique & Propulsion',
      domain: 'Aéronautique & Espace',
      domain_category: 'custom',
      description: 'Manuels de maintenance turbines et sécurité des vols',
    });

    expect(created.domain).toBe('Aéronautique & Espace');
    expect(client.getActiveTenantId()).toBe(created.id);

    // Vérifier l'isolation immédiate de ce nouvel espace
    const docs = await client.getDocuments(created.id);
    expect(docs).toHaveLength(0);

    // Mise à jour du domaine
    const updated = await client.updateTenant(created.id, {
      domain: 'Aérospatial & Systèmes Embarqués',
    });
    expect(updated.domain).toBe('Aérospatial & Systèmes Embarqués');
  });
});
