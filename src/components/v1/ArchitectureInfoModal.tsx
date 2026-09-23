import React from 'react';
import {
  ShieldCheck,
  Database,
  Cpu,
  Layers,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
} from 'lucide-react';
import {
  SUPPORTED_EMBEDDING_MODELS,
  ARCHITECTURAL_TENANT_ISOLATION_EXPLANATION,
} from './RagEmbeddingConfig';

interface ArchitectureInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureInfoModal: React.FC<ArchitectureInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-zinc-700/90 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Architecture Souveraine & Choix d'Embedding</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  pgvector RLS
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Spécifications d'isolation multi-tenant et cycle de vie des espaces vectoriels (US-FRONT-36 à 38).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300 flex-1">
          {/* Section 1 : Quand et comment choisir le modèle d'embedding ? */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h4>1. À quel moment choisir son modèle d'Embedding ?</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Sur un Espace Vierge (0 document)</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Le modèle est <strong>100% libre et configurable</strong> dès la création du domaine ou dans le <em>Studio Presets RAG</em>. Vous pouvez tester et sélectionner le modèle adapté à votre métier (768d, 1024d, 4096d ou API).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Dès le 1er Document Indexé</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Le modèle d'embedding et la géométrie de l'espace vectoriel sont <strong>scellés</strong> pour garantir la cohérence mathématique cosinus. Pour changer de modèle, il suffit de vider les documents du domaine ou de créer un nouvel espace.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 : Faut-il créer une BDD pour chaque utilisateur ? */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <Server className="w-4 h-4 text-indigo-400" />
              <h4>2. Faut-il créer une Base de Données par Utilisateur ?</h4>
            </div>

            <p className="text-zinc-300 leading-relaxed">
              <strong>Non, ce n'est ni souhaitable ni viable à l'échelle industrielle.</strong> L'approche recommandée et implémentée dans RAGTIME est l'<strong>isolation logique stricte avec Row-Level Security (RLS)</strong> dans une instance pgvector commune optimisée.
            </p>

            <div className="space-y-2 pt-1">
              {ARCHITECTURAL_TENANT_ISOLATION_EXPLANATION.reasons.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                  <div className="font-semibold text-zinc-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 pl-5.5 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3 : Tableau récapitulatif des 4 modèles supportés */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h4>3. Modèles d'Embedding Certifiés & Prise en Charge</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-2 font-medium">Modèle</th>
                    <th className="pb-2 font-medium">Dimension</th>
                    <th className="pb-2 font-medium">Empreinte</th>
                    <th className="pb-2 font-medium">Spécificité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {SUPPORTED_EMBEDDING_MODELS.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-900/40">
                      <td className="py-2.5 font-semibold text-zinc-200">
                        <div>{m.name}</div>
                        <div className="text-[10px] text-zinc-500 font-normal">{m.provider}</div>
                      </td>
                      <td className="py-2.5 font-mono text-indigo-400 font-bold">{m.dimensionLabel}</td>
                      <td className="py-2.5 text-zinc-400">{m.vramEstimate}</td>
                      <td className="py-2.5 text-zinc-300">{m.recommendedFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Conforme aux normes souveraines RAGTIME & RGPD
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Compris, fermer
          </button>
        </div>
      </div>
    </div>
  );
};
