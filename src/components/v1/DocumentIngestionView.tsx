/**
 * Écran d'Ingestion Documentaire & Tableau Regroupé par Domaine - US-FRONT-03 & TNR-03
 * Permet d'uploader des documents avec attribution au domaine souhaité,
 * de consulter (aperçu du contenu, versions, chunks), et de supprimer les documents avec confirmation.
 */

import React, { useState, useRef, useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useDocumentUploader } from '../../hooks/useDocumentUploader';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Hash,
  Layers,
  History,
  RefreshCw,
  Plus,
  ShieldCheck,
  FolderOpen,
  FolderPlus,
  Eye,
  Trash2,
  Search,
  Filter,
  ArrowRight,
  Database,
  Info,
  Check,
  Copy,
  Globe,
  Play,
  Sparkles,
  Sliders,
  Cpu,
  Lock,
  Unlock,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { DocumentDTO, DocumentType, TenantDTO, UUID, RagPresetDTO } from '../../contracts/api-types';
import { defaultApiClient } from '../../services/apiClient';
import { DocumentConsultModal } from './DocumentConsultModal';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { DomainConfigModal } from './DomainConfigModal';
import { PresetInfoModal } from './PresetInfoModal';
import { validateDocumentUpload } from '../../lib/validation/schemas';
import { FormFieldFeedback } from './FormFieldFeedback';
import { DomainDocumentsTable } from './DomainDocumentsTable';
import { useTablePagination } from '../../hooks/useTablePagination';
import { TablePaginationBar, TableSortHeader } from './TablePaginationBar';
import { WebUrlExtractionForm, ExtractedWebDocument, TrafilaturaOptions } from './WebUrlExtractionForm';
import { CleaningOptionsPanel, CleaningOptions, cleanDocumentText } from './CleaningOptionsPanel';
import { PreIndexingDryRunModal } from './PreIndexingDryRunModal';

export interface DocumentIngestionViewProps {
  onNavigateToStudio?: () => void;
}

export const DocumentIngestionView: React.FC<DocumentIngestionViewProps> = ({ onNavigateToStudio }) => {
  const { activeTenant, tenants, switchTenant, tenantSwitchCount, activePreset, presets, activatePreset } = useTenant();
  const {
    documents,
    groupedDocuments,
    activeJobs,
    isLoading,
    uploadError,
    uploadFile,
    deleteDocument,
    deleteDocumentVersion,
    clearError,
  } = useDocumentUploader(activeTenant?.id || null, tenantSwitchCount);

  // Presets RAG du domaine cible et gestion du preset actif (US-FRONT-27-BIS)
  const [targetDomainPresets, setTargetDomainPresets] = useState<RagPresetDTO[]>([]);
  const [selectedPresetForInfo, setSelectedPresetForInfo] = useState<RagPresetDTO | null>(null);
  const [isActivatingPreset, setIsActivatingPreset] = useState(false);

  // États locaux de navigation et filtres
  const [viewMode, setViewMode] = useState<'grouped' | 'active_only'>('grouped');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'pdf' | 'markdown' | 'sql'>('all');
  const [selectedDestinationTenantId, setSelectedDestinationTenantId] = useState<UUID | ''>('');

  // Modales
  const [isDragging, setIsDragging] = useState(false);
  const [consultingDoc, setConsultingDoc] = useState<DocumentDTO | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ doc: DocumentDTO; tenantId: UUID } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  // Onglet source d'ingestion : Fichiers locaux vs Extraction Web Trafilatura 2.0 (US-FRONT-31 & TNR-26)
  const [uploadSourceTab, setUploadSourceTab] = useState<'files' | 'web'>('files');

  // Options de nettoyage déterministe (US-FRONT-32 & TNR-27)
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    unicode_nfc: true,
    strip_invisibles: true,
    strip_html: true,
    normalize_whitespace: true,
  });
  const [isCleaningPanelOpen, setIsCleaningPanelOpen] = useState(false);

  // État du simulateur Dry-Run Pré-Indexation (US-FRONT-34 & TNR-29)
  const [isDryRunModalOpen, setIsDryRunModalOpen] = useState(false);
  const [dryRunTargetDoc, setDryRunTargetDoc] = useState<{ title: string; content: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tenant effectif pour le téléversement (par défaut le tenant actif ou sélectionné)
  const currentUploadTargetTenant = useMemo(() => {
    if (selectedDestinationTenantId) {
      return tenants.find((t) => t.id === selectedDestinationTenantId) || activeTenant;
    }
    return activeTenant;
  }, [selectedDestinationTenantId, tenants, activeTenant]);

  // Synchronisation des presets RAG selon le domaine cible (US-FRONT-27-BIS)
  React.useEffect(() => {
    if (!currentUploadTargetTenant) return;
    if (currentUploadTargetTenant.id === activeTenant?.id) {
      setTargetDomainPresets(presets);
      return;
    }
    let isCancelled = false;
    defaultApiClient
      .getPresets(currentUploadTargetTenant.id)
      .then((list) => {
        if (!isCancelled) {
          setTargetDomainPresets(list);
        }
      })
      .catch((err) => {
        console.error('Erreur chargement presets domaine cible:', err);
      });
    return () => {
      isCancelled = true;
    };
  }, [currentUploadTargetTenant?.id, activeTenant?.id, presets]);

  const effectiveActivePreset = useMemo(() => {
    if (currentUploadTargetTenant?.id === activeTenant?.id) {
      return activePreset || presets.find((p) => p.is_active) || presets[0] || null;
    }
    return targetDomainPresets.find((p) => p.is_active) || targetDomainPresets[0] || null;
  }, [currentUploadTargetTenant?.id, activeTenant?.id, activePreset, presets, targetDomainPresets]);

  const handleQuickActivatePreset = async (presetId: string) => {
    setIsActivatingPreset(true);
    try {
      if (currentUploadTargetTenant?.id === activeTenant?.id) {
        await activatePreset(presetId);
      } else if (currentUploadTargetTenant) {
        await defaultApiClient.activatePreset(currentUploadTargetTenant.id, presetId);
        const updatedList = await defaultApiClient.getPresets(currentUploadTargetTenant.id);
        setTargetDomainPresets(updatedList);
      }
      showNotification('Preset RAG d’ingestion mis à jour avec succès.');
    } catch (err) {
      console.error('Erreur activation preset:', err);
    } finally {
      setIsActivatingPreset(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setFileValidationError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validation = validateDocumentUpload({
        file: { name: file.name, size: file.size, type: file.type },
        domain_id: currentUploadTargetTenant?.id,
      });

      if (!validation.isValid) {
        setFileValidationError(validation.errors.file || validation.errors.domain_id || 'Fichier invalide');
        return;
      }

      await uploadFile(
        file,
        currentUploadTargetTenant?.id,
        currentUploadTargetTenant?.domain
      );
      showNotification(`Document ${file.name} téléversé avec succès dans ${currentUploadTargetTenant?.domain}.`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validation = validateDocumentUpload({
        file: { name: file.name, size: file.size, type: file.type },
        domain_id: currentUploadTargetTenant?.id,
      });

      if (!validation.isValid) {
        setFileValidationError(validation.errors.file || validation.errors.domain_id || 'Fichier invalide');
        e.target.value = '';
        return;
      }

      await uploadFile(
        file,
        currentUploadTargetTenant?.id,
        currentUploadTargetTenant?.domain
      );
      showNotification(`Document ${file.name} téléversé avec succès dans ${currentUploadTargetTenant?.domain}.`);
      e.target.value = '';
    }
  };

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Traitement d'un document extrait via Trafilatura 2.0 Web (US-FRONT-31 & TNR-26)
  const handleWebDocumentExtracted = async (doc: ExtractedWebDocument, _options: TrafilaturaOptions) => {
    const target = currentUploadTargetTenant || activeTenant;
    // Appliquer le nettoyage déterministe avant la constitution du fichier
    const cleaned = cleanDocumentText(doc.clean_markdown, cleaningOptions).cleanedText;
    const safeTitle = (doc.title || 'Extraction_Web').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50);
    const filename = `${safeTitle}.md`;
    const blob = new Blob([cleaned], { type: 'text/markdown' });
    const file = new File([blob], filename, { type: 'text/markdown' });
    await uploadFile(file, target?.id, target?.domain);
    showNotification(`Page web "${doc.title}" extraite avec succès (Trafilatura 2.0) et indexée dans ${target?.domain}.`);
  };

  // Déclenchement de la simulation Dry-Run (US-FRONT-34 & TNR-29)
  const handleOpenDryRun = (doc?: DocumentDTO) => {
    const target = currentUploadTargetTenant || activeTenant;
    if (doc) {
      setDryRunTargetDoc({
        title: doc.name,
        content: doc.preview_content || `# Document ${doc.name}\n\nContenu indexé sous pgvector pour le domaine ${doc.domain_name || target?.domain || 'courant'}.`,
      });
    } else {
      setDryRunTargetDoc({
        title: `Simulation_DryRun_${target?.domain || 'Domaine'}`,
        content: `# Référentiel Souverain - ${target?.domain || 'Domaine'}\n\n## 1. Introduction et Périmètre\nLe pipeline d'ingestion partitionne les documents en fragments homogènes de tokens avec un chevauchement calibré. Les métadonnées JSONB et les vecteurs 768d sont strictement isolés par tenant_id.\n\n## 2. Découpage et Normalisation\nL'algorithme de fenêtrage glissant respecte les frontières sémantiques et préserve le contexte documentaire. Chaque bloc reçoit un hash cryptographique SHA-256 inaltérable.\n\n## 3. Algorithme de Recherche Hybride\nLa recherche dense pgvector (HNSW distance cosinus) est combinée avec la recherche sparse BM25 via l'algorithme Reciprocal Rank Fusion (RRF k=60).`,
      });
    }
    setIsDryRunModalOpen(true);
  };

  // Suppression confirmée d'un document
  const handleConfirmDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocument(docToDelete.doc.id, docToDelete.tenantId);
      showNotification(`Document "${docToDelete.doc.name}" et ses vecteurs pgvector supprimés.`);
      if (consultingDoc?.id === docToDelete.doc.id) {
        setConsultingDoc(null);
      }
      setDocToDelete(null);
    } catch (err) {
      console.error('Erreur lors de la suppression du document:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Suppression d'une version spécifique
  const handleDeleteVersion = async (doc: DocumentDTO, versionNum: number) => {
    try {
      const updated = await deleteDocumentVersion(doc.id, versionNum, doc.tenant_id);
      showNotification(`Version v${versionNum} du document "${doc.name}" supprimée.`);
      setConsultingDoc({ ...doc, versions: doc.versions.filter((v) => v.version_number !== versionNum) });
    } catch (err) {
      console.error('Erreur suppression version:', err);
    }
  };

  // Démonstration rapide : simuler l'envoi d'un nouveau fichier adapté au domaine
  const handleQuickDemoUpload = (type: 'pdf' | 'sql' | 'md', isNewVersion: boolean) => {
    const target = currentUploadTargetTenant || activeTenant;
    const domainClean = (target?.domain || 'Souverain')
      .split('&')[0]
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '_');

    const domainDocs = documents.filter((d) => d.tenant_id === target?.id);
    const existingDoc = domainDocs[0];

    const filename = isNewVersion
      ? existingDoc
        ? existingDoc.name
        : `${domainClean}_Referentiel_Majeur.pdf`
      : type === 'pdf'
      ? `${domainClean}_Document_Reference_${Date.now().toString().slice(-4)}.pdf`
      : type === 'sql'
      ? `Index_PgVector_${domainClean}_${Date.now().toString().slice(-4)}.sql`
      : `Guide_Pratique_${domainClean}_${Date.now().toString().slice(-4)}.md`;

    const blob = new Blob(
      [`Contenu du document certifié ${filename} pour RAGTIME dans le domaine ${target?.domain}...`],
      { type: type === 'pdf' ? 'application/pdf' : 'text/plain' }
    );
    const mockFile = new File([blob], filename, { type: blob.type });
    uploadFile(mockFile, target?.id, target?.domain);
    showNotification(`Simulation d'upload déclenchée pour ${filename}.`);
  };

  const renderFileIcon = (type: DocumentType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'sql':
        return <FileCode className="w-4 h-4 text-amber-400" />;
      default:
        return <FileSpreadsheet className="w-4 h-4 text-indigo-400" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  // Filtrage des documents
  const filterDocList = (docsList: DocumentDTO[]) => {
    return docsList.filter((doc) => {
      const matchesSearch =
        searchQuery === '' ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.versions.some((v) => v.sha256_checksum.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType =
        selectedTypeFilter === 'all' || doc.file_type === selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  };

  // Pagination & Tri pour la vue Domaine Actif Uniquement (US-FRONT-25)
  const filteredActiveDocs = useMemo(
    () => filterDocList(documents),
    [documents, searchQuery, selectedTypeFilter]
  );

  const activeTablePagination = useTablePagination(filteredActiveDocs, {
    initialPageSize: 5,
    initialSortKey: 'name',
    initialSortDirection: 'asc',
    pageSizeOptions: [5, 10, 25, 50],
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* En-tête contextuel & Actions de Domaine */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121214] border border-zinc-800/80 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-100">
              Gestion Documentaire & Ingestion par Domaine
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300">
              Indexation pgvector Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-3xl">
            Téléversez, prévisualisez et organisez vos documents par domaine métier souverain. Les fichiers sont partitionnés en blocs de 512 tokens et projetés dans l'espace vectoriel 768d pgvector sous isolation stricte.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsDomainModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm shadow-indigo-600/20"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Nouveau Domaine</span>
          </button>

          {/* Bouton Simulateur Dry-Run avec infobulle pédagogique grand public */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleOpenDryRun()}
              className="px-3 py-2 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 text-xs font-semibold border border-indigo-700/60 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              id="btn-trigger-dry-run-header"
              aria-describedby="tooltip-dry-run-header"
            >
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simulateur Dry-Run</span>
              <HelpCircle className="w-3 h-3 text-indigo-400/80 group-hover:text-indigo-200 transition-colors" />
            </button>

            {/* Infobulle explicative tout public */}
            <div
              id="tooltip-dry-run-header"
              role="tooltip"
              className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col w-72 p-3 bg-zinc-900 border border-indigo-500/40 rounded-xl shadow-xl z-50 pointer-events-none text-left animate-in fade-in-50 duration-150"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-1">
                <Play className="w-3.5 h-3.5 text-indigo-400" />
                <span>Simulateur Dry-Run (Essai à blanc)</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                <strong>Testez sans risque :</strong> Découpe virtuellement un document en mémoire pour vérifier le nombre de fragments, la taille des morceaux et l'espace mémoire requis, <em>sans rien enregistrer</em> dans la base de données.
              </p>
              <div className="mt-2 pt-1.5 border-t border-zinc-800 text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>100% virtuel • Zéro modification de vos données</span>
              </div>
            </div>
          </div>

          {/* Bouton Simuler v+1 avec infobulle pédagogique */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleQuickDemoUpload('pdf', true)}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              id="btn-trigger-sim-vplus1"
              aria-describedby="tooltip-sim-vplus1"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simuler v+1</span>
              <HelpCircle className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            </button>

            {/* Infobulle explicative tout public */}
            <div
              id="tooltip-sim-vplus1"
              role="tooltip"
              className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col w-72 p-3 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 pointer-events-none text-left animate-in fade-in-50 duration-150"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 mb-1">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Simuler une révision (Version v+1)</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                <strong>Historique inaltérable :</strong> Crée une nouvelle version d'un document existant (ex: passage de v1 à v2) pour observer la gestion des versions sans jamais écraser ni perdre la version originale.
              </p>
              <div className="mt-2 pt-1.5 border-t border-zinc-800 text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Garantie de traçabilité : aucun document n'est écrasé</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications de succès */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Erreurs de validation de fichier (TNR-19) */}
      {fileValidationError && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 animate-in fade-in">
          <div className="flex-1">
            <FormFieldFeedback id="file-upload-validation-error" error={fileValidationError} />
          </div>
          <button
            type="button"
            onClick={() => setFileValidationError(null)}
            className="text-xs font-semibold hover:underline text-rose-200 ml-3 cursor-pointer shrink-0"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Erreur de validation backend */}
      {uploadError && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 animate-in fade-in">
          <div className="flex-1">
            <FormFieldFeedback id="file-upload-backend-error" error={uploadError} />
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-xs font-semibold hover:underline text-rose-200 ml-3 cursor-pointer shrink-0"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Bannière d'Affichage Explicite du Preset RAG Actif & Paramètres de Vectorisation (US-FRONT-27-BIS) */}
      <div className="bg-[#121214] border border-indigo-900/60 rounded-xl p-5 shadow-lg relative overflow-hidden">
        {/* Lueur d'ambiance subtile */}
        <div className="absolute top-0 right-0 w-96 h-32 bg-indigo-600/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center shrink-0 shadow-inner">
              <Sliders className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-zinc-100">
                  Configuration RAG Appliquée à l'Ingestion
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 font-medium">
                  {currentUploadTargetTenant?.domain || 'Domaine actif'}
                </span>
                {effectiveActivePreset && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Preset : {effectiveActivePreset.name} (v{effectiveActivePreset.version})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Ces hyperparamètres régissent le découpage en fragments, le modèle d'embedding et l'indexation pgvector de tous les documents importés dans ce domaine.
              </p>
            </div>
          </div>

          {/* Actions & Sélecteur rapide si plusieurs presets */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {targetDomainPresets.length > 1 && (
              <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-700/80 rounded-lg px-2.5 py-1">
                <label className="text-[11px] text-zinc-400 font-medium">Bascule :</label>
                <select
                  value={effectiveActivePreset?.id || ''}
                  onChange={(e) => handleQuickActivatePreset(e.target.value)}
                  disabled={isActivatingPreset}
                  className="bg-transparent text-xs text-zinc-200 font-medium focus:outline-none cursor-pointer"
                >
                  {targetDomainPresets.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                      {p.name} (v{p.version}) {p.is_active ? '★ Actif' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {effectiveActivePreset && (
              <button
                type="button"
                onClick={() => setSelectedPresetForInfo(effectiveActivePreset)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium border border-zinc-700/70 flex items-center gap-1.5 transition-colors"
                title="Consulter la fiche technique exhaustive du preset"
              >
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Fiche Technique</span>
              </button>
            )}

            {onNavigateToStudio && (
              <button
                type="button"
                onClick={onNavigateToStudio}
                className="px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 hover:text-indigo-200 text-xs font-semibold border border-indigo-700/60 flex items-center gap-1.5 transition-colors"
                title="Accéder au Studio Presets RAG pour modifier ou créer des presets"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gérer dans le Studio</span>
                <ExternalLink className="w-3 h-3 text-indigo-400" />
              </button>
            )}
          </div>
        </div>

        {/* Grille des 4 Métriques Synthétiques du Preset */}
        {effectiveActivePreset ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            {/* 1. Embedding */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3">
              <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Modèle d'Embedding
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">pgvector</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-zinc-100 truncate" title={effectiveActivePreset.embedding_model}>
                {effectiveActivePreset.embedding_model}
              </div>
              <div className="mt-1 text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                <span>768 dimensions</span>
                <span>•</span>
                <span>Cosine Distance</span>
              </div>
            </div>

            {/* 2. Segmentation & Stratégie */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3">
              <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Stratégie de Chunking
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">ARQ Worker</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-zinc-100">
                {effectiveActivePreset.chunking_strategy === 'sentence_boundary'
                  ? 'Phrastique Grammatical'
                  : effectiveActivePreset.chunking_strategy === 'markdown_sections'
                  ? 'Sections Markdown AST'
                  : 'Fenêtre Glissante'}
              </div>
              <div className="mt-1 text-[10px] text-zinc-400 font-mono">
                Taille : <span className="text-zinc-200">{effectiveActivePreset.chunk_size} tok</span> | Recouvrement : <span className="text-zinc-200">{effectiveActivePreset.chunk_overlap} tok</span>
              </div>
            </div>

            {/* 3. Retrieval & Seuil */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3">
              <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  Seuil Cosinus & Retrieval
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Top-K</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-zinc-100">
                Seuil min : ≥ {effectiveActivePreset.similarity_threshold.toFixed(2)}
              </div>
              <div className="mt-1 text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                <span>Top-{effectiveActivePreset.retrieval_top_k} Chunks</span>
                <span>•</span>
                <span className={effectiveActivePreset.reranking_enabled ? 'text-emerald-400' : 'text-zinc-500'}>
                  {effectiveActivePreset.reranking_enabled ? 'Reranker BGE actif' : 'Dense seul'}
                </span>
              </div>
            </div>

            {/* 4. Statut d'Immutabilité */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3">
              <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  {(currentUploadTargetTenant?.documents_count ?? 0) > 0 ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  Statut de l'Espace
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">TNR-18</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                {(currentUploadTargetTenant?.documents_count ?? 0) > 0 ? (
                  <span className="text-amber-300">🔒 Espace Scellé</span>
                ) : (
                  <span className="text-emerald-300">🔓 Espace Vierge</span>
                )}
              </div>
              <div className="mt-1 text-[10px] text-zinc-400 leading-tight">
                {(currentUploadTargetTenant?.documents_count ?? 0) > 0
                  ? `${currentUploadTargetTenant?.documents_count} doc(s) indexé(s) - Modèle & chunks figés.`
                  : 'Aucun document - Configuration modifiable.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 text-xs text-zinc-400 italic">
            Aucun preset RAG configuré pour ce domaine. Rendez-vous dans le Studio Presets RAG pour initialiser la configuration.
          </div>
        )}
      </div>

      {/* Zone de Téléversement avec Sélection du Domaine Cible */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-semibold">
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Téléverser un document dans un domaine</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 font-medium">
              Domaine d'affectation :
            </label>
            <select
              value={selectedDestinationTenantId || activeTenant?.id || ''}
              onChange={(e) => setSelectedDestinationTenantId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.domain} ({t.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sélecteur de méthode d'ingestion & Panneau de Nettoyage (US-FRONT-31 & US-FRONT-32) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setUploadSourceTab('files')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                uploadSourceTab === 'files'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              id="tab-upload-files"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Fichiers Locaux (PDF, MD, SQL)</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadSourceTab('web')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                uploadSourceTab === 'web'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              id="tab-web-trafilatura"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Extraction Web (Trafilatura 2.0)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                Anti-SSRF
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCleaningPanelOpen(!isCleaningPanelOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isCleaningPanelOpen
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            id="btn-toggle-cleaning-panel"
            title="Activer ou désactiver les 4 filtres de normalisation et nettoyage déterministe"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filtres de Nettoyage Déterministe</span>
            <span className="text-[10px] font-mono text-emerald-400">
              ({Object.values(cleaningOptions).filter(Boolean).length}/4)
            </span>
          </button>
        </div>

        {/* Panneau de Nettoyage Déterministe Dépliable (US-FRONT-32 & TNR-27) */}
        {isCleaningPanelOpen && (
          <div className="pt-2 animate-in fade-in-50 duration-200">
            <CleaningOptionsPanel
              options={cleaningOptions}
              onChange={setCleaningOptions}
            />
          </div>
        )}

        {/* Contenu selon l'onglet actif : Fichiers Locaux vs Web Trafilatura */}
        {uploadSourceTab === 'files' ? (
          <>
            {/* Drag & Drop Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/20 scale-[0.99]'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.md,.markdown,.sql"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-zinc-200">
                Glissez-déposez vos fichiers pour{' '}
                <span className="text-indigo-400 font-semibold underline">
                  {currentUploadTargetTenant?.domain || activeTenant?.domain}
                </span>
                , ou parcourez
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Formats acceptés : PDF, Markdown (.md), SQL — Limite : 20 Mo par document.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Calcul SHA-256 client immédiat
                </span>
                <span>•</span>
                <span className="text-indigo-400">Versioning immuable (v1, v2, ...)</span>
                <span>•</span>
                <span>Isolation pgvector hermétique</span>
              </div>
            </div>

            {/* Boutons de test rapide */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
              <span className="text-[11px] text-zinc-400">Tests rapides :</span>
              <button
                onClick={() => handleQuickDemoUpload('pdf', false)}
                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors text-[11px]"
              >
                + Démo PDF
              </button>
              <button
                onClick={() => handleQuickDemoUpload('md', false)}
                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors text-[11px]"
              >
                + Démo Markdown
              </button>
              <button
                onClick={() => handleQuickDemoUpload('sql', false)}
                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors text-[11px]"
              >
                + Démo SQL
              </button>
            </div>
          </>
        ) : (
          /* Module d'Extraction Web Trafilatura 2.0 (US-FRONT-31 & TNR-26) */
          <div className="pt-2 animate-in fade-in-50 duration-200">
            <WebUrlExtractionForm
              onDocumentExtracted={handleWebDocumentExtracted}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Suivi des Jobs ARQ (Temps Réel) */}
      {activeJobs.length > 0 && (
        <div className="bg-[#121214] border border-indigo-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Jobs d'ingestion ARQ actifs ({activeJobs.length})</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">Queue Redis: `arq:default`</span>
          </div>

          <div className="space-y-2.5">
            {activeJobs.map((job) => (
              <div
                key={job.job_id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-200">{job.document_name}</span>
                  <span className="font-mono text-indigo-400">{job.progress_pct}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${job.progress_pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="truncate pr-2">{job.step_description}</span>
                  <span className="font-mono text-zinc-400 shrink-0">
                    SHA256: {job.sha256.slice(0, 10)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre d'outils du Tableau Documentaire */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] border border-zinc-800/80 rounded-xl p-4">
        {/* Toggle Vue Regroupée vs Vue Active */}
        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'grouped'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tous les Domaines ({groupedDocuments.length})</span>
          </button>
          <button
            onClick={() => setViewMode('active_only')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'active_only'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Domaine Actif ({documents.length})</span>
          </button>
        </div>

        {/* Filtres & Recherche */}
        <div className="flex items-center gap-2.5">
          {/* Recherche */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filtrer par nom ou hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
            />
          </div>

          {/* Type selector */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Tous types</option>
            <option value="pdf">PDF</option>
            <option value="markdown">Markdown</option>
            <option value="sql">SQL</option>
          </select>
        </div>
      </div>

      {/* VUE 1 : GROUPÉE PAR DOMAINE */}
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-zinc-400 bg-[#121214] border border-zinc-800 rounded-xl">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
              Agrégation des documents par domaine en cours...
            </div>
          ) : groupedDocuments.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-400 bg-[#121214] border border-zinc-800 rounded-xl">
              Aucun domaine configuré.
            </div>
          ) : (
            groupedDocuments.map(({ tenant, documents: domainDocs }) => {
              const filteredDocs = filterDocList(domainDocs);
              const isActive = activeTenant?.id === tenant.id;
              const totalChunks = domainDocs.reduce((acc, d) => acc + d.total_chunks, 0);

              return (
                <div
                  key={tenant.id}
                  className={`bg-[#121214] border rounded-xl overflow-hidden transition-colors ${
                    isActive ? 'border-indigo-500/50 shadow-lg shadow-indigo-950/20' : 'border-zinc-800/80'
                  }`}
                >
                  {/* En-tête du Domaine */}
                  <div className="px-5 py-4 bg-zinc-950/70 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-100">{tenant.domain}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                              Domaine Actif
                            </span>
                          )}
                          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {tenant.name}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{tenant.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <div className="text-right text-xs text-zinc-400 hidden sm:block">
                        <div>
                          <strong className="text-zinc-200 font-mono">{domainDocs.length}</strong> doc(s) •{' '}
                          <strong className="text-zinc-200 font-mono">{totalChunks}</strong> chunks
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">pgvector: {tenant.slug}</div>
                      </div>

                      {!isActive && (
                        <button
                          onClick={() => switchTenant(tenant.id)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 flex items-center gap-1 transition-colors"
                          title="Faire de ce domaine l'espace de travail actif pour le chat RAG"
                        >
                          <span>Activer</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tableau des Documents de ce Domaine avec Tri et Pagination (US-FRONT-25) */}
                  <DomainDocumentsTable
                    documents={filteredDocs}
                    tenant={tenant}
                    renderFileIcon={renderFileIcon}
                    formatBytes={formatBytes}
                    onCopyHash={handleCopyHash}
                    copiedHash={copiedHash}
                    onConsult={(doc) => setConsultingDoc(doc)}
                    onDelete={(doc, tenantId) => setDocToDelete({ doc, tenantId })}
                    onDryRun={handleOpenDryRun}
                    tableIdPrefix="grouped-table"
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VUE 2 : DOMAINE ACTIF UNIQUEMENT (avec Tri et Pagination US-FRONT-25) */}
      {viewMode === 'active_only' && (
        <div className="bg-[#121214] border border-zinc-800/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Documents Cloisonnés ({documents.length})
              </h3>
              <span className="text-[11px] text-zinc-400 bg-zinc-800/70 px-2 py-0.5 rounded border border-zinc-700/40">
                Domaine: {activeTenant?.domain}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vecteurs stockés dans pgvector</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
              Chargement des documents du domaine...
            </div>
          ) : filteredActiveDocs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              Aucun document correspondant trouvé dans cet espace de travail.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">
                        <TableSortHeader
                          title="Document"
                          columnKey="name"
                          currentSortKey={activeTablePagination.sortKey}
                          currentSortDirection={activeTablePagination.sortDirection}
                          onSort={activeTablePagination.handleSort}
                        />
                      </th>
                      <th className="py-3 px-4">
                        <TableSortHeader
                          title="Version Active"
                          columnKey="current_version"
                          currentSortKey={activeTablePagination.sortKey}
                          currentSortDirection={activeTablePagination.sortDirection}
                          onSort={activeTablePagination.handleSort}
                        />
                      </th>
                      <th className="py-3 px-4">Checksum SHA256</th>
                      <th className="py-3 px-4">
                        <TableSortHeader
                          title="Chunks"
                          columnKey="total_chunks"
                          currentSortKey={activeTablePagination.sortKey}
                          currentSortDirection={activeTablePagination.sortDirection}
                          onSort={activeTablePagination.handleSort}
                        />
                      </th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {activeTablePagination.paginatedItems.map((doc) => {
                      const latestVersion = doc.versions[0];
                      return (
                        <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {renderFileIcon(doc.file_type)}
                              <div>
                                <div className="font-medium text-zinc-200">{doc.name}</div>
                                <div className="text-[10px] text-zinc-400">
                                  Mis à jour le {new Date(doc.updated_at).toLocaleDateString('fr-FR')} • {formatBytes(latestVersion?.file_size_bytes || 0)}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 px-2 py-0.5 rounded">
                              v{doc.current_version}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                title={latestVersion?.sha256_checksum}
                                className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800"
                              >
                                {latestVersion?.sha256_checksum.slice(0, 12)}...
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyHash(latestVersion?.sha256_checksum || '')}
                                className="p-1 hover:text-indigo-400 text-zinc-400 transition-colors"
                                title="Copier le SHA-256"
                              >
                                {copiedHash === latestVersion?.sha256_checksum ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono text-zinc-300">
                              {doc.total_chunks} chunks
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Indexé
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDryRun(doc)}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-xs font-medium border border-zinc-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Essai à blanc (Dry-Run) : simuler le découpage en fragments sans modifier la base"
                                >
                                  <Play className="w-3 h-3 text-indigo-400" />
                                  <span>Dry-Run</span>
                                </button>
                                {/* Infobulle tout public */}
                                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:flex flex-col w-56 p-2.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 pointer-events-none text-left animate-in fade-in-50 duration-150">
                                  <span className="text-[11px] font-semibold text-indigo-300">
                                    Essai à blanc (Dry-Run)
                                  </span>
                                  <span className="text-[10px] text-zinc-300 mt-0.5 leading-snug">
                                    Prévisualisez le découpage en fragments et l'empreinte mémoire sans impacter vos données réelles.
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setConsultingDoc(doc)}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 flex items-center gap-1 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Consulter</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDocToDelete({ doc, tenantId: activeTenant?.id || doc.tenant_id })
                                }
                                className="p-1.5 rounded bg-zinc-800 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 hover:border-rose-500/30 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Barre de pagination et sélecteur de nombre max d'affichage */}
              <TablePaginationBar
                currentPage={activeTablePagination.currentPage}
                totalPages={activeTablePagination.totalPages}
                totalItems={activeTablePagination.totalItems}
                pageSize={activeTablePagination.pageSize}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={activeTablePagination.setCurrentPage}
                onPageSizeChange={activeTablePagination.setPageSize}
                itemLabel="document"
                idPrefix="active-domain-docs-table"
              />
            </div>
          )}
        </div>
      )}

      {/* Modal de Consultation Approfondie du Document */}
      <DocumentConsultModal
        document={consultingDoc}
        isOpen={!!consultingDoc}
        onClose={() => setConsultingDoc(null)}
        onDeleteDocument={(doc) => {
          setDocToDelete({ doc, tenantId: doc.tenant_id });
        }}
        onDeleteVersion={handleDeleteVersion}
      />

      {/* Dialogue de Confirmation de Suppression */}
      <ConfirmDeleteDialog
        isOpen={!!docToDelete}
        title={`Supprimer le document "${docToDelete?.doc.name}" ?`}
        description="Cette opération est irréversible. Le fichier source, l'ensemble des versions enregistrées et tous les embeddings vectoriels 768d générés dans PostgreSQL pgvector seront définitivement purgés."
        confirmLabel="Supprimer le document"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteDocument}
        onCancel={() => setDocToDelete(null)}
      />

      {/* Modal de Création d'un Nouveau Domaine RAG */}
      <DomainConfigModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        initialMode="create"
      />

      {/* Modal de Simulation Pré-Indexation (Dry-Run) & Estimateur VRAM (US-FRONT-34 & TNR-29) */}
      <PreIndexingDryRunModal
        isOpen={isDryRunModalOpen}
        onClose={() => setIsDryRunModalOpen(false)}
        documentTitle={dryRunTargetDoc?.title || 'Document_Test'}
        documentContent={dryRunTargetDoc?.content || ''}
        chunkSize={effectiveActivePreset?.chunk_size || 512}
        chunkOverlap={effectiveActivePreset?.chunk_overlap || 64}
        strategy={
          effectiveActivePreset?.chunking_strategy === 'sentence_boundary'
            ? 'sentence'
            : effectiveActivePreset?.chunking_strategy === 'markdown_sections'
            ? 'markdown'
            : 'sliding_window'
        }
        onConfirmIndex={() => {
          setIsDryRunModalOpen(false);
          showNotification('Simulation validée. Paramètres de découpage vérifiés en mémoire.');
        }}
      />

      {/* Modal de Fiche Technique Preset RAG (US-FRONT-27-BIS) */}
      <PresetInfoModal
        isOpen={selectedPresetForInfo !== null}
        preset={selectedPresetForInfo}
        onClose={() => setSelectedPresetForInfo(null)}
      />
    </div>
  );
};
