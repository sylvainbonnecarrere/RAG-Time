/**
 * Modal de Consultation & Audit Approfondi d'un Document - RAGTIME (2026)
 * Permet de visualiser le contenu, l'historique des versions, le SHA-256 et les métadonnées de chunking
 */

import React, { useState } from 'react';
import {
  X,
  FileText,
  Database,
  Hash,
  Clock,
  Layers,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  FolderOpen,
  Info,
  HelpCircle,
} from 'lucide-react';
import { DocumentDTO, DocumentVersionDTO } from '../../contracts/api-types';

interface DocumentConsultModalProps {
  document: DocumentDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteDocument?: (doc: DocumentDTO) => void;
  onDeleteVersion?: (doc: DocumentDTO, versionNumber: number) => void;
}

export const DocumentConsultModal: React.FC<DocumentConsultModalProps> = ({
  document,
  isOpen,
  onClose,
  onDeleteDocument,
  onDeleteVersion,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'versions' | 'metadata'>('preview');

  if (!isOpen || !document) return null;

  const currentVersionData =
    document.versions.find((v) => v.version_number === (selectedVersionNum || document.current_version)) ||
    document.versions[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              {document.file_type === 'sql' ? (
                <Database className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-100 truncate">
                  {document.name}
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  v{document.current_version}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {document.file_type.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Domaine : <strong className="text-zinc-200">{document.domain_name || 'Général'}</strong>
                </span>
                <span>•</span>
                <span>ID: <code className="font-mono text-zinc-400">{document.id}</code></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-zinc-800 bg-zinc-900/40 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Aperçu & Extraits
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'versions'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Historique des Versions ({document.versions.length})
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'metadata'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Métadonnées & Chunks pgvector
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {document.description && (
                <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs text-zinc-300">
                  <span className="text-zinc-400 font-medium">Description : </span>
                  {document.description}
                </div>
              )}

              <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 font-mono text-xs leading-relaxed text-zinc-300 max-h-96 overflow-y-auto whitespace-pre-wrap selection:bg-indigo-500/30">
                {document.preview_content || (
                  <div className="text-zinc-400 italic py-6 text-center">
                    Aucun aperçu textuel disponible pour ce document.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-lg text-xs text-zinc-300 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-300">Principe des versions immuables (v1, v2, v+1) :</strong>
                  <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                    Lorsque vous téléversez une mise à jour d'un document portant le même nom, le système ne remplace jamais le fichier d'origine : il crée automatiquement une révision suivante (<strong>v+1</strong>) dotée de sa propre empreinte numérique certifiée (SHA-256). Vous conservez ainsi un historique inaltérable et vérifiable.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/40">
                {document.versions.map((ver) => {
                  const isCurrent = ver.version_number === document.current_version;
                  return (
                    <div
                      key={ver.version_number}
                      className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                        isCurrent ? 'bg-indigo-500/5' : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-mono font-medium rounded ${
                              isCurrent
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            v{ver.version_number} {isCurrent && '(Version Active)'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {ver.status === 'indexed' ? 'Indexé' : ver.status}
                          </span>
                          <span className="text-xs text-zinc-400">
                            • {formatBytes(ver.file_size_bytes)}
                          </span>
                          <span className="text-xs text-zinc-400">
                            • {ver.chunks_count} chunks
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                          <Hash className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                          <span className="truncate max-w-md">{ver.sha256_checksum}</span>
                          <button
                            onClick={() => handleCopy(ver.sha256_checksum)}
                            className="p-1 hover:text-indigo-400 transition-colors"
                            title="Copier le SHA-256"
                          >
                            {copiedHash === ver.sha256_checksum ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Téléversé le {new Date(ver.created_at).toLocaleString('fr-FR')}
                        </div>
                      </div>

                      {document.versions.length > 1 && onDeleteVersion && (
                        <button
                          onClick={() => onDeleteVersion(document, ver.version_number)}
                          className="px-2.5 py-1.5 rounded text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors flex items-center gap-1 shrink-0"
                          title="Supprimer cette version spécifique"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Supprimer v{ver.version_number}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="text-xs text-zinc-400">Chunks pgvector</div>
                  <div className="text-lg font-semibold text-zinc-100 font-mono mt-0.5">
                    {document.total_chunks}
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="text-xs text-zinc-400">Taille totale</div>
                  <div className="text-lg font-semibold text-zinc-100 font-mono mt-0.5">
                    {formatBytes(currentVersionData.file_size_bytes)}
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="text-xs text-zinc-400">Modèle Embedding</div>
                  <div className="text-sm font-semibold text-zinc-200 mt-1 truncate">
                    nomic-embed-v1.5
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="text-xs text-zinc-400">Dimension Vecteur</div>
                  <div className="text-lg font-semibold text-zinc-100 font-mono mt-0.5">
                    768 dims
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">UUID Document</span>
                  <span className="font-mono text-zinc-300">{document.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">ID Domaine / Tenant</span>
                  <span className="font-mono text-zinc-300">{document.domain_id || document.tenant_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Nom du Domaine</span>
                  <span className="font-semibold text-indigo-400">{document.domain_name || 'Général'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Format MIME détecté</span>
                  <span className="font-mono text-zinc-300">{document.file_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">SHA-256 Version Active</span>
                  <span className="font-mono text-zinc-400 truncate max-w-xs">{currentVersionData.sha256_checksum}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Dernière mise à jour</span>
                  <span className="text-zinc-300">{new Date(document.updated_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
          <div>
            {onDeleteDocument && (
              <button
                onClick={() => onDeleteDocument(document)}
                className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer le document
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
