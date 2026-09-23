import React, { useState } from 'react';
import { SITE_PAGES_PROPOSAL, FRONTEND_ROADMAP } from '../data/mockRagData';
import { Layers, FileCode, CheckCircle2, Shield, Sparkles, Terminal, Activity, ArrowRight, ExternalLink, Cpu, Layout, GitBranch } from 'lucide-react';

interface FrontendProposalViewProps {
  onNavigate?: (view: 'landing' | 'v1' | 'plan' | 'demo' | 'auth') => void;
}

export const FrontendProposalView: React.FC<FrontendProposalViewProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'pages' | 'plan' | 'solid' | 'tokens'>('solid');

  const categories = [
    { id: 'all', label: 'Toutes les pages (7)' },
    { id: 'Espace Public & Sécurité', label: 'Espace Public & Sécurité' },
    { id: 'Mon Espace RAG', label: 'Mon Espace RAG' },
    { id: 'Audit & Observabilité', label: 'Audit & Observabilité' }
  ];

  const filteredPages = selectedCategory === 'all'
    ? SITE_PAGES_PROPOSAL
    : SITE_PAGES_PROPOSAL.filter(p => p.importance === selectedCategory);

  return (
    <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12" id="frontend-proposal-view">
      
      {/* Top Header */}
      <div className="border-b border-zinc-800/80 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            Dossier d'Architecture Front-end • RAGTIME 2026
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-50 font-sans mb-3">
          Architecture Front-end, Principes SOLID & Tests
        </h1>
        <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
          En réponse aux documents d'autorité (<code className="text-zinc-300 font-mono">03-backlog-agents.md</code>, <code className="text-zinc-300 font-mono">01-architecture.md</code>, <code className="text-zinc-300 font-mono">07-security-model.md</code>),
          voici la spécification détaillée des User Stories, des patterns SOLID, des suites de tests unitaires et de la matrice de non-régression (TNR).
        </p>

        {/* View Switcher */}
        <div className="flex flex-wrap items-center gap-2 mt-6">
          <button
            onClick={() => setActiveTab('solid')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'solid'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Shield className={`w-3.5 h-3.5 ${activeTab === 'solid' ? 'text-white' : 'text-indigo-300'}`} />
            <span>1. Principes SOLID & Tests Unitaires / TNR</span>
          </button>

          <button
            onClick={() => setActiveTab('pages')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pages'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Layout className={`w-3.5 h-3.5 ${activeTab === 'pages' ? 'text-white' : 'text-indigo-400'}`} />
            <span>2. Cartographie des 7 Pages Clés</span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'plan'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-zinc-200'
            }`}
          >
            <GitBranch className={`w-3.5 h-3.5 ${activeTab === 'plan' ? 'text-white' : 'text-blue-400'}`} />
            <span>3. Feuille de Route & Séquencement</span>
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'tokens'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Terminal className={`w-3.5 h-3.5 ${activeTab === 'tokens' ? 'text-white' : 'text-emerald-400'}`} />
            <span>4. Charte & Tokens Tailwind v4</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0 : PRINCIPES SOLID, DESIGN PATTERNS & TESTS UNITAIRES / TNR           */}
      {/* ========================================================================= */}
      {activeTab === 'solid' && (
        <div className="space-y-10 animate-in fade-in duration-300">
          
          {/* Principes SOLID */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800/50">
                Garantie d'Excellence d'Ingénierie
              </span>
              <h2 className="text-xl font-bold text-zinc-100">
                Principes SOLID Appliqués au Front-end Next.js / React
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400">S — Single Responsibility (SRP)</span>
                <p className="text-xs text-zinc-300 font-medium">Séparation stricte État / Présentation / Réseau</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Chaque composant ne fait qu'une chose : <code>useSSEStream</code> gère exclusivement le protocole réseau réactif, <code>DocumentUploader</code> gère la validation et le hachage client, les composants UI sont purement déclaratifs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400">O — Open / Closed (OCP)</span>
                <p className="text-xs text-zinc-300 font-medium">Extensibilité sans rupture</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Le système de rendu de citations et d'extraits (PDF, Markdown, SQL) s'appuie sur un registre de stratégies extensible. L'ajout d'un visualiseur Notion ou Word ne modifie aucunement la console de chat.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400">L — Liskov Substitution (LSP)</span>
                <p className="text-xs text-zinc-300 font-medium">Contrats d'interface respectés</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  L'interface <code>ApiClientPort</code> est strictement implémentée par <code>MemoryApiClient</code> (mode preview et tests) et <code>FetchApiClient</code> (production). L'UI fonctionne de façon identique avec les deux.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400">I — Interface Segregation (ISP)</span>
                <p className="text-xs text-zinc-300 font-medium">Props atomiques et granulaires</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Aucun composant ne reçoit de mega-objet superflu. Le badge de citation ne reçoit que le nom, la page et le score, éliminant les re-rendus inutiles et maximisant la testabilité unitaire.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400">D — Dependency Inversion (DIP)</span>
                <p className="text-xs text-zinc-300 font-medium">Injection via React Context & Ports</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Les vues dépendent d'abstractions (<code>useTenant</code>, <code>useAuth</code>, <code>ApiClientPort</code>) et jamais de requêtes <code>fetch</code> écrites en dur dans le JSX.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400">Finite State Machine (FSM)</span>
                <p className="text-xs text-zinc-300 font-medium">Transitions SSE étanches</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Le cycle de vie du streaming ne peut se trouver que dans des états valides : <code>IDLE → RETRIEVING → GENERATING → COMPLETED | FAILED</code>, interdisant tout état fantôme ou désynchronisé.
                </p>
              </div>
            </div>
          </div>

          {/* User Stories Phase 1 - V1 avec Tests Unitaires et Non-Régression */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center justify-between">
              <span>User Stories V1 & Phases Avancées (Architecture & Tests)</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded">
                23 Tests & TNR Validés (100% au Vert)
              </span>
            </h3>

            <div className="space-y-4">
              {/* US-FRONT-01 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">US-FRONT-01</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">Contrat OpenAPI & Types Générés Stricts</h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Pattern : Adapter • Single Source of Truth
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • <code>contracts.test.ts</code> : Vérification conformité DTO avec schéma OpenAPI FastAPI<br/>
                      • <code>adapter.test.ts</code> : Mapping strict des payloads JSON Pydantic
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-amber-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-01) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Échec automatique du build CI si un champ obligatoire du backend est renommé ou supprimé sans migration du front.
                    </p>
                  </div>
                </div>
              </div>

              {/* US-FRONT-02 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">US-FRONT-02</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">Authentification & Sélecteur d'Espace Multi-Tenant</h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Pattern : Dependency Inversion (TenantContext)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • <code>tenantIsolation.test.ts</code> : Vérification de l'injection systématique du header X-Tenant-ID<br/>
                      • <code>LoginForm.test.tsx</code> : Pas de divulgation d'existence de compte sur 401
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-amber-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-02) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Purge totale et immédiate des caches de documents et de conversations lors d'un basculement d'espace de travail.
                    </p>
                  </div>
                </div>
              </div>

              {/* US-FRONT-03 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">US-FRONT-03</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">Écran d'Ingestion Documentaire & Suivi des Jobs ARQ</h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Pattern : Strategy (MIME) & Observer (ARQ)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • <code>documentVersioning.test.ts</code> : Calcul réel SHA256 Web Crypto API et rejet fichiers &gt; 25Mo<br/>
                      • <code>JobTracker.test.tsx</code> : Transition fidèle pending → processing → indexed
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-amber-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-03) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Garantie d'immutabilité : L'upload d'un fichier ayant le même nom crée un snapshot v+1 sans écraser la version antérieure.
                    </p>
                  </div>
                </div>
              </div>

              {/* US-FRONT-04 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">US-FRONT-04</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">Console de Chat RAG & Streaming SSE Réactif</h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Pattern : Finite State Machine (8 événements) & Safe Parser
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • <code>useSSEStream.test.ts</code> : Dispatch typé des 8 événements sans saut d'état<br/>
                      • <code>Sanitization.test.ts</code> : Neutralisation récursive des balises script et injections XSS
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-amber-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-04 & TNR-05) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Reconnexion sans déduplication via Last-Event-ID et correspondance stricte 1:1 entre badge cliquable et UUID de chunk certifié.
                    </p>
                  </div>
                </div>
              </div>

              {/* US-FRONT-23 / TNR-18 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">US-FRONT-23</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">Règle d'Or d'Immutabilité Conditionnelle des Presets RAG</h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Pattern : Invariant Guard • Fail-Safe Math
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • <code>validatePresetParams</code> : Contrôle de l'invariant mathématique chunk_overlap &lt; chunk_size / 2<br/>
                      • Mode Édition Libre vérifié sur domaine vierge (0 document)
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-amber-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-18) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Scellement inviolable dès le 1er document vectorisé dans pgvector pour préserver la comparabilité des distances cosinus.
                    </p>
                  </div>
                </div>
              </div>

              {/* US-FRONT-25 / TNR-20 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">US-FRONT-25</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">UX Universelle des Tableaux (Recherche, Tri & Pagination)</h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Pattern : Reusable Hook • Clean DOM Hydration
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • <code>useTablePagination</code> : Cohérence de slicing, debounce temps réel et recalcul d'indices<br/>
                      • <code>TableSortHeader</code> : En-tête typé en bouton évitant toute imbrication th invalide
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-amber-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-20) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Zéro erreur d'hydratation DOM et recalcul automatique de la pagination lors des filtres multi-colonnes.
                    </p>
                  </div>
                </div>
              </div>

              {/* US-FRONT-26 / TNR-21 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">US-FRONT-26</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">Console RAG Temps Réel & Gestion Intégrale des Conversations</h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Pattern : Reactive Stream • Multi-Format Exporter
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • Flux SSE 8 événements connectable à FastAPI avec reconnexion par Last-Event-ID<br/>
                      • Gestionnaire de conversations : récupération instantanée, export MD/JSON/TXT et purge
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-amber-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-21) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Isolation de l'historique par tenant et restauration exacte sans perte de citation ni de contexte.
                    </p>
                  </div>
                </div>
              </div>

              {/* US-FRONT-30 / PHASE 7 */}
              <div className="p-5 rounded-xl bg-[#121214] border border-indigo-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-emerald-400 font-bold">US-FRONT-30</span>
                    <h4 className="font-semibold text-zinc-100 text-sm">Inspecteur Visuel de Similarité Cosinus & Écart de Pertinence</h4>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                    Phase 7 • UX Avancée RAG
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-zinc-300 font-medium text-[11px] uppercase tracking-wider block">
                      🧪 Tests Unitaires Spécifiés :
                    </span>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      • <code>CosineInspector.test.tsx</code> : Rendu du thermomètre (0.50 à 1.00), gradient de couleur sémantique et delta de pertinence avec le Top-1
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-1">
                    <span className="text-emerald-400 font-medium text-[11px] uppercase tracking-wider block">
                      🛡️ Test de Non-Régression (TNR-25) :
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Cohérence mathématique entre le score cosinus pgvector 768d et la jauge visuelle sans inversion ni troncature.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Matrice Récapitulative des Tests de Non-Régression */}
          <div className="p-6 rounded-2xl bg-[#121214] border border-zinc-800/80 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">
              Matrice de Couverture des Tests de Non-Régression (TNR)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3 font-mono">Code TNR</th>
                    <th className="py-2.5 px-3">Domaine Visé</th>
                    <th className="py-2.5 px-3">Condition Déclenchante</th>
                    <th className="py-2.5 px-3">Comportement Attendu</th>
                    <th className="py-2.5 px-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-01</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Contrat OpenAPI</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Altération d'un DTO FastAPI</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Échec à la compilation front automatique</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-02</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Isolation Multi-Tenant</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Changement de tenant actif</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Purge totale et immédiate des caches en mémoire</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-03</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Immutabilité Documents</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Re-upload de fichier éponyme</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Création d'un snapshot v+1 sans écrasement de v1</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-04</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Sécurité XSS Extraits</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Chunk contenant scripts malveillants</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Échappement strict sans exécution de code</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-05</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Citations Inaltérables</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Clic sur badge [Doc, p.X]</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Ouverture stricte du chunk_id certifié serveur</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-16</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Nettoyage Markdown & LaTeX</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Sanitisation d'extraits avec symboles et équations</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Préservation de la lisibilité sans altération des formules</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-18</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Immutabilité Conditionnelle</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Tentative d'édition sur domaine avec chunks indexés</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Mode scellé immuable avec création d'une version v+1</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-19</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Invariants Mathématiques</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Saisie d'un overlap &ge; chunk_size / 2</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Rejet avec message d'erreur explicatif contextualisé</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-20</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Tableaux & Hydratation DOM</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Tri multi-colonnes et filtres textuels</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Zéro avertissement DOM et réinitialisation de pagination</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">TNR-21</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Persistance Conversations</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Changement de tenant puis retour sur conversation</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Isolation étanche sans fuite de messages entre domaines</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Vérifié</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">TNR-25</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Similarité Cosinus Visuelle</td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">Affichage du gradient cosinus (0.50 &agrave; 1.00)</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans">Calibration exacte de la jauge avec le vecteur Nomic 768d</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-sans">Spécifié (P7)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1 : CARTOGRAPHIE DES 7 PAGES REQUISES                                */}
      {/* ========================================================================= */}
      {activeTab === 'pages' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-100">
                Périmètre Applicatif : 7 Écrans Structurels
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Chaque page répond directement aux invariants du modèle de domaine (Documents, Versions, Chunks, Presets, Conversations, SSE).
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    selectedCategory === c.id
                      ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredPages.map((page, index) => (
              <div
                key={page.id}
                className="p-5 rounded-2xl bg-[#121214] border border-zinc-800/70 shadow-md hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-zinc-300">
                        0{index + 1}
                      </span>
                      <code className="text-xs font-mono text-indigo-400 font-semibold">
                        {page.route}
                      </code>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                      page.importance === 'Indispensable V1'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        : page.importance === 'Audit V1.1'
                        ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}>
                      {page.importance}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-100 mb-1">
                    {page.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    {page.description}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                    Composants & Modules Front-End Clés
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {page.keyComponents.map((comp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-mono text-zinc-300"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer de la carte avec statut POC et bouton de test */}
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>POC Live & Fonctionnel</span>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => {
                        if (page.route === '/') onNavigate('landing');
                        else if (page.route === '/auth/login') onNavigate('auth');
                        else onNavigate('v1');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-mono transition-colors"
                    >
                      <span>Tester cette vue</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 : MASTER PLAN D'ORGANISATION FRONT-END                             */}
      {/* ========================================================================= */}
      {activeTab === 'plan' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="p-6 rounded-2xl bg-[#121214] border border-zinc-800/80 shadow-md">
            <h2 className="text-xl font-bold text-zinc-50 mb-2">
              Organisation des Responsabilités Front-end
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Conformément à la convention <code className="text-zinc-300 font-mono">docs/frontend-handoff.md</code> stipulée dans <code className="text-zinc-300 font-mono">01-architecture.md</code>, 
              notre rôle front-end garantit une indépendance totale de prototypage puis une intégration sans friction avec les agents backend FastAPI et pgvector.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/70 space-y-2">
                <span className="text-xs font-mono text-indigo-400 font-semibold block">
                  Contrat OpenAPI Source de Vérité
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Interdiction formelle de recopier manuellement les types de données. Utilisation d'un générateur de code OpenAPI automatique (<code className="text-zinc-300 font-mono">openapi-typescript</code>) pour garantir la synchronisation stricte des schémas Pydantic.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/70 space-y-2">
                <span className="text-xs font-mono text-emerald-400 font-semibold block">
                  Gestion du Streaming SSE & Reconnexion
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Support des 7 événements canoniques (message.started, retrieval.started, retrieval.completed, etc.), avec prise en charge du header <code className="text-zinc-300 font-mono">Last-Event-ID</code> et reprise sur interruption réseau.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/70 space-y-2">
                <span className="text-xs font-mono text-blue-400 font-semibold block">
                  Sécurité & Cloisonnement Multi-Tenant
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Bien que l'UI ne soit pas une frontière de sécurité en soi, le frontend injecte systématiquement le <code className="text-zinc-300 font-mono">tenant_id</code> actif dans les headers d'autorisation et refuse tout affichage cross-tenant.
                </p>
              </div>
            </div>
          </div>

          {/* Séquencement par Sprints / Versions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-100">
              Feuille de Route Front-End Synchronisée (V0 → V1 → V1.1 → V1.2)
            </h3>

            <div className="space-y-4">
              {FRONTEND_ROADMAP.map((mile, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-[#121214] border border-zinc-800/80 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block">
                        {mile.phase}
                      </span>
                      <h4 className="text-base font-bold text-zinc-100 font-sans">
                        {mile.name}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 self-start sm:self-auto">
                      {mile.target}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase text-zinc-500 block">
                      Livrables Front-end vérifiables :
                    </span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-300">
                      {mile.deliverables.map((d, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 text-xs text-zinc-500 font-mono flex items-center gap-1.5">
                    <span className="text-zinc-400">Garde-fou :</span>
                    <span>{mile.risksAndMitigations}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3 : CHARTE GRAPHIQUE & DESIGN TOKENS TAILWIND V4                     */}
      {/* ========================================================================= */}
      {activeTab === 'tokens' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="p-6 rounded-2xl bg-[#121214] border border-zinc-800/80">
            <h2 className="text-xl font-bold text-zinc-50 mb-2">
              Charte Graphique & Tokens de Design (Dark Mode Premium)
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed mb-6">
              Application rigoureuse des directives du brief : noir texturé sans noir pur, contraste hiérarchique étudié, suppression totale de l'AI-slop (pas de néons fluo ni de dégradés multicolores).
            </p>

            {/* Tokens Swatches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="h-14 rounded-lg bg-[#09090b] border border-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-400">
                  #09090b (Zinc-950)
                </div>
                <div className="font-semibold text-zinc-200 text-xs">Arrière-plan Canvas</div>
                <div className="text-[11px] text-zinc-500">Noir texturé profond, évitant le noir pur (#000) pour préserver la lisibilité.</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="h-14 rounded-lg bg-[#121214] border border-zinc-800/80 flex items-center justify-center font-mono text-xs text-zinc-300">
                  #121214 (Bento Box)
                </div>
                <div className="font-semibold text-zinc-200 text-xs">Surfaces des Cartes</div>
                <div className="text-[11px] text-zinc-500">Nuance légèrement surélevée avec bordure discrète border-zinc-800/60.</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="h-14 rounded-lg bg-indigo-600 flex items-center justify-center font-mono text-xs text-white font-semibold shadow-md">
                  #4f46e5 (Focus RAG)
                </div>
                <div className="font-semibold text-zinc-200 text-xs">Accent Chirurgical</div>
                <div className="text-[11px] text-zinc-500">Bleu nuit / indigo électrique réservé exclusivement aux actions focales.</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="h-14 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center font-mono text-xs">
                  <span className="text-zinc-50 font-bold">Geist Sans</span>
                  <span className="text-zinc-400 text-[10px]">JetBrains Mono</span>
                </div>
                <div className="font-semibold text-zinc-200 text-xs">Typographie Mathématique</div>
                <div className="text-[11px] text-zinc-500">Headings text-zinc-50, corps text-zinc-400 pour un confort oculaire longue durée.</div>
              </div>

            </div>

            {/* Tailwind CSS v4 Native Rules */}
            <div className="mt-8 p-4 rounded-xl bg-zinc-950 border border-zinc-900 font-mono text-xs space-y-3">
              <span className="text-indigo-400 font-semibold block">
                Extrait des Déclarations Tailwind CSS v4 (@theme & Utilities)
              </span>
              <pre className="text-zinc-400 overflow-x-auto leading-relaxed">
{`/* Configuration Tailwind v4 */
@import "tailwindcss";

:root {
  --color-canvas: #09090b;
  --color-surface-card: #121214;
  --color-border-subtle: rgba(39, 39, 42, 0.6);
  --color-focus-rag: #4f46e5;
  --color-text-primary: #fafafa;
  --color-text-muted: #a1a1aa;
}

/* Grille Bento Responsive */
.rag-bento-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.25rem;
}
@media (min-width: 768px) {
  .rag-bento-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}`}
              </pre>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
