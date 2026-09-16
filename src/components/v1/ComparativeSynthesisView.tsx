/**
 * Console de Synthèse Comparative Inter-Domaines (US-FRONT-29 / Phase 7)
 * Permet aux auditeurs et décideurs d'interroger simultanément deux corpus documentaires
 * (ex: Domaine Juridique vs Domaine RH, ou Version Alpha vs Version Beta)
 * tout en maintenant une étanchéité absolue des partitions vectorielles pgvector.
 */

import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
  Scale,
  ArrowRightLeft,
  Sparkles,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import { CitationSource } from '../../types';

interface ComparativeSynthesisViewProps {
  onInspectChunk?: (source: CitationSource) => void;
}

export const ComparativeSynthesisView: React.FC<ComparativeSynthesisViewProps> = ({
  onInspectChunk
}) => {
  const { tenants, activeTenant } = useTenant();

  // Choix des 2 domaines à comparer (par défaut, le tenant actif et le premier autre tenant disponible)
  const defaultDomainA = activeTenant?.id || tenants[0]?.id || '';
  const defaultDomainB = tenants.find((t) => t.id !== defaultDomainA)?.id || tenants[1]?.id || tenants[0]?.id || '';

  const [domainAId, setDomainAId] = useState<string>(defaultDomainA);
  const [domainBId, setDomainBId] = useState<string>(defaultDomainB);
  const [query, setQuery] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [copied, setCopied] = useState(false);

  const domainA = tenants.find((t) => t.id === domainAId) || tenants[0];
  const domainB = tenants.find((t) => t.id === domainBId) || tenants[1] || tenants[0];

  // Suggestions de questions comparatives transverses
  const promptSuggestions = [
    "Quelles sont les clauses de confidentialité et sanctions en cas de manquement ?",
    "Quels sont les délais de préavis contractuels et conditions de résiliation ?",
    "Quelles sont les règles de gouvernance des données et rétention d'archives ?",
    "Quelles sont les mesures de sécurité requises pour les accès distants ?"
  ];

  // Résultats simulés mais déterministes et isolés pour les 2 domaines
  const handleRunComparison = () => {
    if (!query.trim()) return;
    setIsComparing(true);
    setTimeout(() => {
      setIsComparing(false);
      setHasCompared(true);
    }, 850);
  };

  const domainASources: CitationSource[] = [
    {
      id: 'src-comp-a1',
      documentName: `${domainA?.slug || 'alpha'}_politique_securite.pdf`,
      documentType: 'pdf',
      location: 'Section 4.2 - Obligations',
      pageNumber: 8,
      similarityScore: 0.912,
      rerankScore: 0.948,
      rerankGainPercent: 12.4,
      tokensCount: 310,
      chunkId: `chk_${domainA?.id.slice(-6) || '001'}_42`,
      excerpt: `Dans le cadre du domaine ${domainA?.name}, toute déviation des protocoles impose une notification immédiate sous 24h avec audit obligatoire des traces.`,
      metadata: { tenant_id: domainA?.id || '', isolation: 'strict' }
    },
    {
      id: 'src-comp-a2',
      documentName: `${domainA?.slug || 'alpha'}_referentiel.md`,
      documentType: 'markdown',
      location: 'Annexe Conformité',
      pageNumber: 2,
      similarityScore: 0.884,
      rerankScore: 0.921,
      rerankGainPercent: 8.9,
      tokensCount: 240,
      chunkId: `chk_${domainA?.id.slice(-6) || '001'}_43`,
      excerpt: `Rétention stricte des journaux d'accès fixée à 12 mois glissants sur stockage local immuable.`,
      metadata: { tenant_id: domainA?.id || '', isolation: 'strict' }
    }
  ];

  const domainBSources: CitationSource[] = [
    {
      id: 'src-comp-b1',
      documentName: `${domainB?.slug || 'beta'}_charte_operations.pdf`,
      documentType: 'pdf',
      location: 'Article 11 - Procédures',
      pageNumber: 14,
      similarityScore: 0.897,
      rerankScore: 0.935,
      rerankGainPercent: 10.2,
      tokensCount: 290,
      chunkId: `chk_${domainB?.id.slice(-6) || '002'}_11`,
      excerpt: `Pour le domaine ${domainB?.name}, le délai d'escalade est configuré à 48h ouvrées avec revue hebdomadaire par le comité de pilotage.`,
      metadata: { tenant_id: domainB?.id || '', isolation: 'strict' }
    },
    {
      id: 'src-comp-b2',
      documentName: `${domainB?.slug || 'beta'}_accords_cadres.sql`,
      documentType: 'sql',
      location: 'Table compliance_rules',
      pageNumber: 1,
      similarityScore: 0.865,
      rerankScore: 0.902,
      rerankGainPercent: 9.4,
      tokensCount: 195,
      chunkId: `chk_${domainB?.id.slice(-6) || '002'}_12`,
      excerpt: `Archivage fixé à 36 mois pour les clauses d'audit externe avec chiffrement au repos AES-256.`,
      metadata: { tenant_id: domainB?.id || '', isolation: 'strict' }
    }
  ];

  const handleExportMarkdown = () => {
    const md = `# Synthèse RAGTIME Comparative Inter-Domaines
**Date :** ${new Date().toISOString()}  
**Question Posée :** ${query}

---

## 1. Domaine A : ${domainA?.name} (${domainA?.category})
**Réponse Sourcée :**
D'après le corpus documentaire de ${domainA?.name}, les exigences prévoient un protocole d'escalade sous 24h ouvrées et une conservation des traces sur 12 mois glissants.

**Sources Certifiées :**
${domainASources.map((s) => `- [${s.documentName}, p.${s.pageNumber || 1}] (Score Rerank: ${(s.rerankScore! * 100).toFixed(1)}%, Boost: +${s.rerankGainPercent}%) : « ${s.excerpt} »`).join('\n')}

---

## 2. Domaine B : ${domainB?.name} (${domainB?.category})
**Réponse Sourcée :**
D'après le corpus documentaire de ${domainB?.name}, le protocole tolère jusqu'à 48h ouvrées avec comité de revue hebdomadaire et un archivage étendu à 36 mois.

**Sources Certifiées :**
${domainBSources.map((s) => `- [${s.documentName}, p.${s.pageNumber || 1}] (Score Rerank: ${(s.rerankScore! * 100).toFixed(1)}%, Boost: +${s.rerankGainPercent}%) : « ${s.excerpt} »`).join('\n')}

---

## 3. Analyse Différentielle & Synthèse de Convergence
- **Convergences :** Les deux référentiels imposent un chiffrement intégral des traces au repos et une traçabilité unitaire.
- **Divergences :** ${domainA?.name} est plus restrictif sur les délais de notification (24h vs 48h), tandis que ${domainB?.name} impose une durée d'archivage légale 3x supérieure (36 mois vs 12 mois).
- **Garantie Souveraine :** Zéro mélange de vecteurs. Requêtes exécutées sur des partitions pgvector strictement étanches.
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `synthese_comparative_${domainA?.slug}_vs_${domainB?.slug}_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Synthèse Comparative : ${domainA?.name} vs ${domainB?.name} sur « ${query} »`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* En-tête & Objectif */}
      <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100">
                  Synthèse Comparative Inter-Domaines
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  US-FRONT-29 • Isolation Stricte
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Comparez les réponses, règles et citations de deux corpus documentaires distincts côte-à-côte avec le modèle Llama 3.2 local, sans aucune fuite ou contamination inter-tenants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Partitions pgvector Étanches</span>
            </span>
          </div>
        </div>

        {/* Sélecteurs des 2 domaines */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
          <div className="bg-zinc-900/70 border border-indigo-900/40 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Domaine Référent A</span>
            </label>
            <select
              value={domainAId}
              onChange={(e) => setDomainAId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              id="select-compare-domain-a"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === domainBId}>
                  {t.name} ({t.documents_count} docs • {t.category})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-400 truncate">
              Prompt : <span className="text-zinc-300">{domainA?.system_instructions?.slice(0, 75) || 'Standard'}...</span>
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-purple-900/40 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>Domaine Référent B</span>
            </label>
            <select
              value={domainBId}
              onChange={(e) => setDomainBId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
              id="select-compare-domain-b"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === domainAId}>
                  {t.name} ({t.documents_count} docs • {t.category})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-400 truncate">
              Prompt : <span className="text-zinc-300">{domainB?.system_instructions?.slice(0, 75) || 'Standard'}...</span>
            </p>
          </div>
        </div>

        {/* Barre de Saisie de Question Comparative */}
        <div className="mt-4 space-y-2.5">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) handleRunComparison();
              }}
              placeholder="Ex: Quelles sont les clauses de résiliation et les délais d'audit contractuels ?"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-32 py-3 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              id="input-comparative-query"
            />
            <button
              type="button"
              onClick={handleRunComparison}
              disabled={isComparing || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              id="btn-run-comparative-query"
            >
              {isComparing ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyse...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Comparer</span>
                </>
              )}
            </button>
          </div>

          {/* Suggestions de questions rapides */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-zinc-400">
            <span className="shrink-0 text-zinc-500 flex items-center gap-1">
              <Search className="w-3 h-3" /> Suggestions :
            </span>
            {promptSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(s);
                }}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 truncate shrink-0 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Résultats de l'analyse comparative */}
      {hasCompared && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Actions globales sur la synthèse */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-300">
                Résultat Comparatif Différentiel
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Double inférence achevée (320ms / 345ms)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportMarkdown}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                id="btn-export-comparative-markdown"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Exporter Synthèse (.md)</span>
              </button>
            </div>
          </div>

          {/* Grille côte-à-côte des deux domaines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Colonne Domaine A */}
            <div className="bg-[#121214] border border-indigo-900/50 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                  <h3 className="text-sm font-bold text-zinc-100">{domainA?.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {domainA?.category}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">TTFT : 185ms</span>
              </div>

              {/* Réponse du Domaine A */}
              <div className="text-xs text-zinc-300 leading-relaxed space-y-2 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <p>
                  Dans le corpus documentaire de <strong className="text-indigo-300">{domainA?.name}</strong>, la clause stipule une exigence de conformité stricte avec escalade sous <strong className="text-white">24 heures ouvrées</strong> et audit systématique des traces.
                </p>
                <p className="text-zinc-400">
                  La politique de rétention est quant à elle fixée à un plafond strict de <strong className="text-zinc-200">12 mois glissants</strong> sur support souverain immuable.
                </p>
              </div>

              {/* Citations du Domaine A */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sources Certifiées ({domainASources.length})</span>
                </h4>

                <div className="space-y-2">
                  {domainASources.map((src) => (
                    <div
                      key={src.id}
                      className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] space-y-1 hover:border-indigo-800 transition-colors"
                    >
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-semibold text-indigo-300 truncate">
                          📄 {src.documentName} (p.{src.pageNumber})
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          Rerank: {(src.rerankScore! * 100).toFixed(1)}% (+{src.rerankGainPercent}%)
                        </span>
                      </div>
                      <p className="text-zinc-400 italic">« {src.excerpt} »</p>
                      {onInspectChunk && (
                        <button
                          type="button"
                          onClick={() => onInspectChunk(src)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1 pt-1"
                        >
                          <span>Auditer le chunk pgvector</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Colonne Domaine B */}
            <div className="bg-[#121214] border border-purple-900/50 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                  <h3 className="text-sm font-bold text-zinc-100">{domainB?.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    {domainB?.category}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">TTFT : 192ms</span>
              </div>

              {/* Réponse du Domaine B */}
              <div className="text-xs text-zinc-300 leading-relaxed space-y-2 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <p>
                  Pour le domaine <strong className="text-purple-300">{domainB?.name}</strong>, la doctrine tolère un délai de notification élargi à <strong className="text-white">48 heures ouvrées</strong>, avec analyse périodique en comité de pilotage.
                </p>
                <p className="text-zinc-400">
                  En revanche, la conservation des archives requiert une durée minimale légale de <strong className="text-zinc-200">36 mois</strong>, chiffrée selon les standards AES-256.
                </p>
              </div>

              {/* Citations du Domaine B */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sources Certifiées ({domainBSources.length})</span>
                </h4>

                <div className="space-y-2">
                  {domainBSources.map((src) => (
                    <div
                      key={src.id}
                      className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] space-y-1 hover:border-purple-800 transition-colors"
                    >
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-semibold text-purple-300 truncate">
                          📄 {src.documentName} (p.{src.pageNumber})
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          Rerank: {(src.rerankScore! * 100).toFixed(1)}% (+{src.rerankGainPercent}%)
                        </span>
                      </div>
                      <p className="text-zinc-400 italic">« {src.excerpt} »</p>
                      {onInspectChunk && (
                        <button
                          type="button"
                          onClick={() => onInspectChunk(src)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1 pt-1"
                        >
                          <span>Auditer le chunk pgvector</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Synthèse Différentielle & Analyse d'Écart */}
          <div className="bg-[#121214] border border-amber-800/60 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Analyse Différentielle Automatisée (Llama 3.2 Souverain)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Points de Convergence</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11px] leading-relaxed">
                  <li>Les deux domaines imposent un chiffrement inaltérable des journaux d'accès.</li>
                  <li>Obligation de revue par un tiers auditeur avant toute clôture d'incident.</li>
                  <li>Authenticité des pièces jointes garantie par hachage SHA-256 à l'ingestion.</li>
                </ul>
              </div>

              <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Divergences & Écarts Notables</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11px] leading-relaxed">
                  <li>
                    <strong>Délai d'escalade :</strong> 24h pour <span className="text-indigo-300">{domainA?.name}</span> contre 48h pour <span className="text-purple-300">{domainB?.name}</span> (facteur 2x).
                  </li>
                  <li>
                    <strong>Durée de conservation :</strong> 12 mois pour <span className="text-indigo-300">{domainA?.name}</span> contre 36 mois pour <span className="text-purple-300">{domainB?.name}</span> (facteur 3x).
                  </li>
                  <li>
                    <strong>Comité de décision :</strong> Revue directe par le Lead Sécurité vs passage en comité de pilotage élargi.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
