/**
 * Dialogue de Confirmation de Suppression - RAGTIME (2026)
 * Alerte l'utilisateur sur la purge irréversible des chunks vectoriels et de la métadonnée
 */

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Supprimer définitivement',
  isDeleting = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-lg text-xs text-rose-300 flex items-center gap-2">
            <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Tous les vecteurs 768d associés seront purgés de la table pgvector.</span>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Suppression en cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
