/**
 * Composant de Feedback Visuel Accessible pour Formulaires RAGTIME
 * Affiche les erreurs de validation, avertissements contextuels et conseils didactiques
 * en respectant la charte graphique sobre et contrastée de RAGTIME.
 */

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface FormFieldFeedbackProps {
  error?: string | null;
  warning?: string | null;
  help?: string | null;
  success?: string | null;
  className?: string;
  id?: string;
}

export const FormFieldFeedback: React.FC<FormFieldFeedbackProps> = ({
  error,
  warning,
  help,
  success,
  className = '',
  id,
}) => {
  if (!error && !warning && !help && !success) return null;

  if (error) {
    return (
      <div
        id={id}
        role="alert"
        aria-live="polite"
        className={`flex items-start gap-1.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-md px-2.5 py-1.5 mt-1.5 animate-in fade-in duration-200 ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
        <span className="leading-snug">{error}</span>
      </div>
    );
  }

  if (warning) {
    return (
      <div
        id={id}
        role="status"
        aria-live="polite"
        className={`flex items-start gap-1.5 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-md px-2.5 py-1.5 mt-1.5 animate-in fade-in duration-200 ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
        <span className="leading-snug">{warning}</span>
      </div>
    );
  }

  if (success) {
    return (
      <div
        id={id}
        role="status"
        className={`flex items-start gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-md px-2.5 py-1.5 mt-1.5 animate-in fade-in duration-200 ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
        <span className="leading-snug">{success}</span>
      </div>
    );
  }

  if (help) {
    return (
      <div
        id={id}
        className={`flex items-start gap-1.5 text-[11px] text-zinc-400 mt-1 ${className}`}
      >
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-500" />
        <span className="leading-snug">{help}</span>
      </div>
    );
  }

  return null;
};
