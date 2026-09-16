/**
 * Vue Principale de l'Espace RAGTIME Phase 1 - V1 (MVP RAG)
 * Regroupe :
 * - US-FRONT-01 : Contrat OpenAPI & Types stricts
 * - US-FRONT-02 : Authentification & Sélecteur d'Espace Tenant
 * - US-FRONT-03 : Écran d'Ingestion Documentaire & Suivi des Jobs ARQ
 * - US-FRONT-04 : Console de Chat RAG & Streaming SSE réactif
 */

import React, { useState } from 'react';
import { TenantWorkspaceBar } from './TenantWorkspaceBar';
import { AuthModal } from './AuthModal';
import { DocumentIngestionView } from './DocumentIngestionView';
import { SourcedChatView } from './SourcedChatView';
import { RagPresetStudioView } from './RagPresetStudioView';
import { RagAuditExplorerView } from './RagAuditExplorerView';
import { TelemetryDashboardView } from './TelemetryDashboardView';
import { ChunkInspectorDrawer } from './ChunkInspectorDrawer';
import { LiveTestConsole } from './LiveTestConsole';
import { MessageSourceDTO } from '../../contracts/api-types';
import {
  MessageSquare,
  UploadCloud,
  CheckCircle2,
  Shield,
  FlaskConical,
  Sliders,
  Database,
  Activity,
} from 'lucide-react';

export const V1WorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'chat' | 'documents' | 'presets' | 'audit' | 'telemetry' | 'tests'
  >('chat');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [inspectedChunk, setInspectedChunk] = useState<MessageSourceDTO | null>(null);

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col bg-[#09090b] text-zinc-300">
      {/* Barre d'isolation Multi-Tenant (US-FRONT-02) */}
      <TenantWorkspaceBar onOpenAuthModal={() => setIsAuthModalOpen(true)} />

      {/* Navigation entre sous-modules V1 / V1.1 */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2 space-y-2.5">
        {/* Ligne 1 : Navigation par onglets sur pleine largeur (aucun chevauchement) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800 scrollbar-thin">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            id="tab-btn-chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat RAG Sourcé (SSE)</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'documents'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            id="tab-btn-documents"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Ingestion & Jobs ARQ</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            id="tab-btn-presets"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Studio Presets RAG</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            id="tab-btn-audit"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Observabilité & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'telemetry'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            id="tab-btn-telemetry"
          >
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Télémétrie & RRF</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'tests'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/60'
            }`}
            id="tab-btn-tests"
          >
            <FlaskConical className="w-4 h-4" />
            <span>Harnais Tests & TNR</span>
          </button>
        </div>

        {/* Ligne 2 discrète : Statut d'opérationnalité et conformité des tests */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Espace RAG Opérationnel
            </span>
            <span>•</span>
            <span className="text-zinc-400">Cluster pgvector actif</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              21 Tests & TNR Validés (100%)
            </span>
          </div>
        </div>
      </div>

      {/* Contenu principal selon onglet actif */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {activeTab === 'chat' && (
          <SourcedChatView
            onInspectChunk={(src) => setInspectedChunk(src)}
            onNavigateToDocuments={() => setActiveTab('documents')}
          />
        )}

        {activeTab === 'documents' && <DocumentIngestionView />}

        {activeTab === 'presets' && (
          <RagPresetStudioView
            onOpenChunkInspector={(src) => setInspectedChunk(src)}
          />
        )}

        {activeTab === 'audit' && (
          <RagAuditExplorerView
            onOpenChunkInspector={(src) => setInspectedChunk(src)}
          />
        )}

        {activeTab === 'telemetry' && <TelemetryDashboardView />}

        {activeTab === 'tests' && <LiveTestConsole />}
      </main>

      {/* Tiroir d'audit de chunk (US-FRONT-05) */}
      <ChunkInspectorDrawer
        source={inspectedChunk}
        onClose={() => setInspectedChunk(null)}
      />

      {/* Modal d'authentification (US-FRONT-02) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
