/**
 * Console de Nettoyage & Normalisation Déterministe - US-FRONT-32 & TNR-27
 * 4 filtres mécaniques déterministes garantissant l'hygiène du texte
 * avant tokenisation et vectorisation sous pgvector.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Check,
  Eye,
  Sliders,
  FileCheck,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { CleaningDiffModal, CleaningStats } from './CleaningDiffModal';

export interface CleaningOptions {
  unicode_nfc: boolean;
  strip_invisibles: boolean;
  strip_html: boolean;
  normalize_whitespace: boolean;
}

export interface CleanTextResult {
  cleanedText: string;
  stats: CleaningStats;
}

// Moteur de nettoyage déterministe pur (TNR-27)
export const cleanDocumentText = (
  rawText: string,
  options: CleaningOptions = {
    unicode_nfc: true,
    strip_invisibles: true,
    strip_html: true,
    normalize_whitespace: true,
  }
): CleanTextResult => {
  if (!rawText) {
    return {
      cleanedText: '',
      stats: { invisiblesCount: 0, bytesSaved: 0, tagsCount: 0, charsDifference: 0 },
    };
  }

  let text = rawText;
  let invisiblesCount = 0;
  let tagsCount = 0;

  // 1. Normalisation Unicode NFC
  if (options.unicode_nfc) {
    text = text.normalize('NFC');
  }

  // 2. Éradication des Caractères Invisibles (ZWSP, ZWNJ, BOM, soft-hyphen, directionals)
  if (options.strip_invisibles) {
    const invisibleRegex = /[\u200B-\u200F\uFEFF\u00AD\u202A-\u202E]/g;
    const matches = text.match(invisibleRegex);
    if (matches) {
      invisiblesCount = matches.length;
    }
    text = text.replace(invisibleRegex, '');
  }

  // 3. Assainissement des Balises HTML Résiduelles avec stricte préservation des maths (ex: p < 0.05, a < b)
  if (options.strip_html) {
    // Regex sélective ciblant uniquement les balises HTML valides commençant par une lettre ou un slash
    const htmlTagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    const tagMatches = text.match(htmlTagRegex);
    if (tagMatches) {
      tagsCount = tagMatches.length;
    }
    text = text.replace(htmlTagRegex, '');
  }

  // 4. Normalisation Typographique des Espaces
  if (options.normalize_whitespace) {
    // Remplacement des tabulations non codées et espaces insécables multiples
    text = text.replace(/[ \t]+/g, ' ');
    // Réduction des sauts de ligne triples ou plus à un saut de ligne double (paragraphe)
    text = text.replace(/\n{3,}/g, '\n\n');
  }

  const rawBytes = new TextEncoder().encode(rawText).length;
  const cleanBytes = new TextEncoder().encode(text).length;
  const bytesSaved = Math.max(0, rawBytes - cleanBytes);
  const charsDifference = rawText.length - text.length;

  return {
    cleanedText: text,
    stats: {
      invisiblesCount,
      bytesSaved,
      tagsCount,
      charsDifference,
    },
  };
};

interface CleaningOptionsPanelProps {
  options: CleaningOptions;
  onChange: (updated: CleaningOptions) => void;
  sampleText?: string;
}

export const CleaningOptionsPanel: React.FC<CleaningOptionsPanelProps> = ({
  options,
  onChange,
  sampleText,
}) => {
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // Échantillon de test par défaut si aucun fichier n'est chargé
  const previewSample =
    sampleText ||
    `# Rapport de Synthèse\u200B\uFEFF Médicale\n\n<p>Les résultats cliniques indiquent une efficacité significative avec p < 0.05 et un taux de réponse de 94.2%.</p>\n\n\n\n<div>Source externe vérifiée.</div>`;

  const cleanResult = cleanDocumentText(previewSample, options);

  const toggleOption = (key: keyof CleaningOptions) => {
    onChange({ ...options, [key]: !options[key] });
  };

  return (
    <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-4 space-y-3" id="cleaning-options-panel">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-200">
            Nettoyage Déterministe & Hygiène Unicode (TNR-27)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsDiffModalOpen(true)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-indigo-300 flex items-center gap-1.5 transition-colors"
          title="Ouvrir l'inspecteur comparatif A/B avant / après assainissement"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>Inspecteur Diff A/B</span>
        </button>
      </div>

      {/* Grille des 4 commutateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Filtre 1 : Unicode NFC */}
        <label className="flex items-start gap-2.5 p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
          <input
            type="checkbox"
            checked={options.unicode_nfc}
            onChange={() => toggleOption('unicode_nfc')}
            className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer"
            id="toggle-clean-unicode-nfc"
          />
          <div>
            <div className="text-xs font-medium text-zinc-200">Normalisation Unicode NFC</div>
            <div className="text-[10px] text-zinc-400">
              Standardise les caractères accentués et prévient les décalages de tokenizer BPE.
            </div>
          </div>
        </label>

        {/* Filtre 2 : Eradication Invisibles */}
        <label className="flex items-start gap-2.5 p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
          <input
            type="checkbox"
            checked={options.strip_invisibles}
            onChange={() => toggleOption('strip_invisibles')}
            className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer"
            id="toggle-clean-strip-invisibles"
          />
          <div>
            <div className="text-xs font-medium text-zinc-200">Éradication des Invisibles</div>
            <div className="text-[10px] text-zinc-400">
              Purge stricte des zero-width spaces (\u200B), BOM (\uFEFF) et caractères de contrôle.
            </div>
          </div>
        </label>

        {/* Filtre 3 : Balises HTML résiduelles */}
        <label className="flex items-start gap-2.5 p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
          <input
            type="checkbox"
            checked={options.strip_html}
            onChange={() => toggleOption('strip_html')}
            className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer"
            id="toggle-clean-strip-html"
          />
          <div>
            <div className="text-xs font-medium text-zinc-200">Purge Balises HTML Résiduelles</div>
            <div className="text-[10px] text-zinc-400">
              Élimine &lt;div&gt;, &lt;p&gt; tout en préservant scrupuleusement les formules mathématiques (p &lt; 0.05).
            </div>
          </div>
        </label>

        {/* Filtre 4 : Normalisation des espaces */}
        <label className="flex items-start gap-2.5 p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
          <input
            type="checkbox"
            checked={options.normalize_whitespace}
            onChange={() => toggleOption('normalize_whitespace')}
            className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer"
            id="toggle-clean-normalize-whitespace"
          />
          <div>
            <div className="text-xs font-medium text-zinc-200">Normalisation des Espaces</div>
            <div className="text-[10px] text-zinc-400">
              Condensation des espaces multiples et réduction des sauts de ligne excessifs.
            </div>
          </div>
        </label>
      </div>

      {/* Modal Diff A/B */}
      <CleaningDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        originalText={previewSample}
        cleanedText={cleanResult.cleanedText}
        stats={cleanResult.stats}
      />
    </div>
  );
};
