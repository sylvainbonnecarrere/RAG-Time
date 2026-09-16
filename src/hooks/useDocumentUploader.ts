/**
 * Hook useDocumentUploader - US-FRONT-03 & TNR-03
 * Pattern : Strategy (MIME validator) & Observer (ARQ job progression)
 * Calcul de checksum SHA-256 réel via Web Crypto API côté client
 */

import { useState, useEffect, useCallback } from 'react';
import { DocumentDTO, IngestionJobDTO, TenantDTO, UUID } from '../contracts/api-types';
import { defaultApiClient } from '../services/apiClient';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/markdown',
  'text/x-markdown',
  'text/plain',
  'application/sql',
  'text/sql',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.md', '.markdown', '.sql'];

export function useDocumentUploader(activeTenantId: UUID | null, tenantSwitchCount: number) {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [groupedDocuments, setGroupedDocuments] = useState<
    Array<{ tenant: TenantDTO; documents: DocumentDTO[] }>
  >([]);
  const [activeJobs, setActiveJobs] = useState<IngestionJobDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!activeTenantId) return;
    setIsLoading(true);
    try {
      const [docs, grouped] = await Promise.all([
        defaultApiClient.getDocuments(activeTenantId),
        defaultApiClient.getAllDocumentsGroupedByDomain(),
      ]);
      setDocuments(docs);
      setGroupedDocuments(grouped);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId]);

  // Charger les documents lors de l'initialisation ou du changement de tenant (TNR-02)
  useEffect(() => {
    if (!activeTenantId) return;
    setActiveJobs([]);
    fetchDocuments();
  }, [activeTenantId, tenantSwitchCount, fetchDocuments]);

  /**
   * Calcul cryptographique du SHA256 côté client via crypto.subtle
   */
  const computeSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Validation stricte des critères de sécurité côté client
   */
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). Limite autorisée : 20 Mo.`;
    }

    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Format '${file.name.split('.').pop()}' non supporté. Formats autorisés : PDF, Markdown (.md), SQL.`;
    }

    return null;
  };

  /**
   * Suppression d'un document entier
   */
  const deleteDocument = useCallback(
    async (documentId: UUID, tenantId?: UUID) => {
      const targetTenant = tenantId || activeTenantId;
      if (!targetTenant) return;
      try {
        await defaultApiClient.deleteDocument(targetTenant, documentId);
        await fetchDocuments();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
        setUploadError(msg);
        throw err;
      }
    },
    [activeTenantId, fetchDocuments]
  );

  /**
   * Suppression d'une version spécifique d'un document
   */
  const deleteDocumentVersion = useCallback(
    async (documentId: UUID, versionNumber: number, tenantId?: UUID) => {
      const targetTenant = tenantId || activeTenantId;
      if (!targetTenant) return;
      try {
        await defaultApiClient.deleteDocumentVersion(targetTenant, documentId, versionNumber);
        await fetchDocuments();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur suppression version';
        setUploadError(msg);
        throw err;
      }
    },
    [activeTenantId, fetchDocuments]
  );

  /**
   * Envoi et suivi du job d'ingestion ARQ
   */
  const uploadFile = useCallback(
    async (file: File, customTenantId?: UUID, customDomainName?: string) => {
      const destinationTenantId = customTenantId || activeTenantId;
      if (!destinationTenantId) return;
      setUploadError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      try {
        // 1. Calcul du SHA256
        const sha256 = await computeSHA256(file);

        // 2. Appel du port API
        const { document, job } = await defaultApiClient.uploadDocument(destinationTenantId, {
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          sha256,
          domain_id: destinationTenantId,
          domain_name: customDomainName,
        });

        // 3. Mise à jour de la liste locale
        if (destinationTenantId === activeTenantId) {
          setDocuments((prev) => {
            const filtered = prev.filter((d) => d.id !== document.id);
            return [document, ...filtered];
          });
        }
        // Rafraîchir le groupement par domaine
        const updatedGrouped = await defaultApiClient.getAllDocumentsGroupedByDomain();
        setGroupedDocuments(updatedGrouped);

        // 4. Ajouter le job actif et simuler les étapes de l'ARQ worker
        setActiveJobs((prev) => [job, ...prev]);

        // Simulation progressive du pipeline ARQ
        const jobSteps = [
          { pct: 35, desc: 'Extraction de texte & normalisation Unicode (Clean Architecture)' },
          { pct: 65, desc: 'Chunking récursif & préservation des tables/titres' },
          { pct: 85, desc: 'Vectorisation Ollama nomic-embed-text (768 dimensions)' },
          { pct: 100, desc: 'Indexation HNSW pgvector complétée' },
        ];

        let stepIndex = 0;
        const interval = setInterval(async () => {
          if (stepIndex < jobSteps.length) {
            const step = jobSteps[stepIndex];
            setActiveJobs((prev) =>
              prev.map((j) =>
                j.job_id === job.job_id
                  ? {
                      ...j,
                      progress_pct: step.pct,
                      step_description: step.desc,
                      status: step.pct === 100 ? 'indexed' : 'processing',
                    }
                  : j
              )
            );
            stepIndex++;
          } else {
            clearInterval(interval);
            // Mettre à jour le statut du document
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === document.id
                  ? {
                      ...d,
                      status: 'indexed',
                      versions: d.versions.map((v, i) =>
                        i === 0 ? { ...v, status: 'indexed' } : v
                      ),
                    }
                  : d
              )
            );
            const finalGrouped = await defaultApiClient.getAllDocumentsGroupedByDomain();
            setGroupedDocuments(finalGrouped);

            // Retirer le job après quelques secondes
            setTimeout(() => {
              setActiveJobs((prev) => prev.filter((j) => j.job_id !== job.job_id));
            }, 3000);
          }
        }, 600);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inattendue lors du traitement';
        setUploadError(message);
      }
    },
    [activeTenantId]
  );

  return {
    documents,
    groupedDocuments,
    activeJobs,
    isLoading,
    uploadError,
    uploadFile,
    deleteDocument,
    deleteDocumentVersion,
    refreshDocuments: fetchDocuments,
    clearError: () => setUploadError(null),
  };
}
