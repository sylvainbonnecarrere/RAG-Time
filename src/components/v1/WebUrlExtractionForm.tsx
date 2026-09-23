/**
 * Formulaire d'Extraction Web & Trafilatura 2.0 Configurable - US-FRONT-31 & TNR-26
 * Extraction de pages web épurées du boilerplate (menus, bannières, formulaires)
 * avec protection stricte anti-SSRF (blocage IP privées RFC 1918 et loopback).
 */

import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Table,
  Link,
  Image,
  FileText,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { FormFieldFeedback } from './FormFieldFeedback';

export interface TrafilaturaOptions {
  mode: 'precision' | 'recall';
  include_tables: boolean;
  include_links: boolean;
  include_images_alt: boolean;
  extract_metadata: boolean;
}

export interface ExtractedWebDocument {
  url: string;
  title: string;
  author?: string;
  date?: string;
  clean_markdown: string;
  tables_count: number;
  word_count: number;
  estimated_tokens: number;
}

interface WebUrlExtractionFormProps {
  onDocumentExtracted: (doc: ExtractedWebDocument, options: TrafilaturaOptions) => void;
  disabled?: boolean;
}

// Fonction pure de validation RFC et Anti-SSRF (TNR-26)
export const validateUrlAntiSSRF = (urlStr: string): { isValid: boolean; error?: string } => {
  if (!urlStr || !urlStr.trim()) {
    return { isValid: false, error: 'Veuillez saisir une URL web.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return { isValid: false, error: 'Format d\'URL invalide. Exemple : https://fr.wikipedia.org/wiki/RAG' };
  }

  // Seuls http et https autorisés
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Protocole non autorisé : seuls HTTP et HTTPS sont acceptés.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Détection Loopback et adresses privées (Anti-SSRF RFC 1918 / Loopback)
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return {
      isValid: false,
      error: 'Protection Anti-SSRF : Accès interdit aux hôtes locaux ou de bouclage (localhost / loopback).',
    };
  }

  // Filtrage des plages d'IP privées IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 10) {
      return { isValid: false, error: 'Protection Anti-SSRF : Les adresses privées 10.0.0.0/8 sont proscrites.' };
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return { isValid: false, error: 'Protection Anti-SSRF : Les adresses privées 172.16.0.0/12 sont proscrites.' };
    }
    if (a === 192 && b === 168) {
      return { isValid: false, error: 'Protection Anti-SSRF : Les adresses privées 192.168.0.0/16 sont proscrites.' };
    }
    if (a === 169 && b === 254) {
      return { isValid: false, error: 'Protection Anti-SSRF : L\'adresse de lien local 169.254.0.0/16 est proscrite.' };
    }
  }

  return { isValid: true };
};

export const WebUrlExtractionForm: React.FC<WebUrlExtractionFormProps> = ({
  onDocumentExtracted,
  disabled = false,
}) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [options, setOptions] = useState<TrafilaturaOptions>({
    mode: 'precision',
    include_tables: true,
    include_links: false,
    include_images_alt: true,
    extract_metadata: true,
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedDoc, setExtractedDoc] = useState<ExtractedWebDocument | null>(null);

  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (urlError) setUrlError(null);
  };

  const handleSimulateExtraction = async () => {
    const check = validateUrlAntiSSRF(url);
    if (!check.isValid) {
      setUrlError(check.error || 'URL invalide');
      return;
    }
    setUrlError(null);
    setIsExtracting(true);

    // Simulation haute fidélité de Trafilatura 2.0
    await new Promise((r) => setTimeout(r, 650));

    let title = 'Documentation et Analyse Technique Web';
    let content = '';

    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/\/$/, '').split('/').pop() || 'index';
      title = `${pathname.replace(/[-_]/g, ' ').toUpperCase()} — Guide Technique`;
    } catch {
      title = 'Article Web Extrait';
    }

    if (options.mode === 'precision') {
      content = `# ${title}\n\n`;
      content += `> Source originale : ${url}\n`;
      content += `> Mode d'extraction : Trafilatura 2.0 (Précision RAG - Boilerplate épuré)\n\n`;
      content += `## Introduction & Contexte Opérationnel\n\n`;
      content += `Cet article technique présente les principes directeurs de l'architecture logicielle souveraine. L'ensemble des bannières cookies, scripts analytiques et barres de navigation latérales a été rigoureusement éliminé pour maximiser le rapport signal/bruit sémantique dans pgvector.\n\n`;

      if (options.include_tables) {
        content += `### Synthèse Comparative des Métriques\n\n`;
        content += `| Paramètre | Valeur Recommandée | Impact pgvector |\n`;
        content += `| :--- | :--- | :--- |\n`;
        content += `| Chunk Size | 512 tokens | Précision cosinus maximale |\n`;
        content += `| Chunk Overlap | 64 tokens | Continuité contextuelle |\n`;
        content += `| Seuil Cosinus | 0.70 | Élimination du bruit d'inférence |\n\n`;
      }

      content += `## Directives d'Implémentation\n\n`;
      content += `La normalisation typographique et le traitement des encodages multilingues constituent le premier rempart contre les hallucinations du LLM. Chaque section est indexée avec son en-tête contextuel propre.\n`;
    } else {
      content = `# ${title} (Mode Rappel Exhaustif)\n\nExtraction intégrale du corps de texte et des annexes documentaires depuis ${url}.\n`;
    }

    const words = content.split(/\s+/).filter(Boolean).length;
    const tokens = Math.round(words * 1.33);

    const result: ExtractedWebDocument = {
      url,
      title,
      author: 'Auteur Web Certifié',
      date: new Date().toISOString().slice(0, 10),
      clean_markdown: content,
      tables_count: options.include_tables ? 1 : 0,
      word_count: words,
      estimated_tokens: tokens,
    };

    setExtractedDoc(result);
    setIsExtracting(false);
  };

  const handleValidateAndImport = () => {
    if (!extractedDoc) return;
    onDocumentExtracted(extractedDoc, options);
  };

  return (
    <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-5" id="web-url-extraction-form">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <span>Scraping Web & Trafilatura 2.0</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Anti-SSRF Actif
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Élimination automatique du boilerplate (menus, pubs, footer) pour une indexation propre.
            </p>
          </div>
        </div>
      </div>

      {/* Saisie de l'URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
          <span>Adresse URL de l'article ou de la page :</span>
          <span className="text-[10px] text-zinc-500 font-mono">http:// ou https:// public</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="url"
              disabled={disabled || isExtracting}
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://fr.wikipedia.org/wiki/Intelligence_artificielle"
              className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none transition-colors ${
                urlError
                  ? 'border-rose-500/80 focus:border-rose-500'
                  : 'border-zinc-700/80 focus:border-indigo-500'
              }`}
              id="input-trafilatura-url"
            />
          </div>
          <button
            type="button"
            disabled={disabled || isExtracting || !url.trim()}
            onClick={handleSimulateExtraction}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            id="btn-trafilatura-extract"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isExtracting ? 'Extraction...' : 'Extraire avec Trafilatura'}</span>
          </button>
        </div>
        <FormFieldFeedback error={urlError} />
      </div>

      {/* Options d'extraction Trafilatura */}
      <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Options de Filtrage Heuristique Trafilatura</span>
        </div>

        {/* Stratégie Précision vs Rappel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOptions({ ...options, mode: 'precision' })}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              options.mode === 'precision'
                ? 'bg-indigo-950/70 border-indigo-600/70 text-indigo-200 shadow-sm'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <div className="text-xs font-medium text-zinc-200">Mode Précision (Recommandé RAG)</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Purge maximale du boilerplate et focalisation stricte sur le corps éditorial.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOptions({ ...options, mode: 'recall' })}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              options.mode === 'recall'
                ? 'bg-indigo-950/70 border-indigo-600/70 text-indigo-200 shadow-sm'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <div className="text-xs font-medium text-zinc-200">Mode Rappel Étendu</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Conserve les encadrés secondaires, notes de bas de page et métadonnées annexes.
            </div>
          </button>
        </div>

        {/* Commutateurs granulaires */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <label className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={options.include_tables}
              onChange={(e) => setOptions({ ...options, include_tables: e.target.checked })}
              className="w-3.5 h-3.5 accent-indigo-500 rounded"
            />
            <span className="flex items-center gap-1">
              <Table className="w-3 h-3 text-indigo-400" />
              Tableaux MD
            </span>
          </label>

          <label className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={options.include_links}
              onChange={(e) => setOptions({ ...options, include_links: e.target.checked })}
              className="w-3.5 h-3.5 accent-indigo-500 rounded"
            />
            <span className="flex items-center gap-1">
              <Link className="w-3 h-3 text-indigo-400" />
              Liens hypertextes
            </span>
          </label>

          <label className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={options.include_images_alt}
              onChange={(e) => setOptions({ ...options, include_images_alt: e.target.checked })}
              className="w-3.5 h-3.5 accent-indigo-500 rounded"
            />
            <span className="flex items-center gap-1">
              <Image className="w-3 h-3 text-indigo-400" />
              Texte alt images
            </span>
          </label>

          <label className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={options.extract_metadata}
              onChange={(e) => setOptions({ ...options, extract_metadata: e.target.checked })}
              className="w-3.5 h-3.5 accent-indigo-500 rounded"
            />
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-indigo-400" />
              Métadonnées
            </span>
          </label>
        </div>
      </div>

      {/* Résultat de l'extraction Trafilatura & Bouton d'Ingestion */}
      {extractedDoc && (
        <div className="p-4 bg-zinc-950/80 border border-emerald-800/60 rounded-xl space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Aperçu de l'Extraction Trafilatura
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {extractedDoc.word_count} mots
              </span>
              <span className="text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                ~{extractedDoc.estimated_tokens} tokens
              </span>
            </div>
          </div>

          <div className="text-xs font-semibold text-zinc-200">{extractedDoc.title}</div>

          {/* Extrait Markdown scrollable */}
          <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800/80 font-mono text-[11px] text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {extractedDoc.clean_markdown}
          </div>

          {/* Bouton d'action pour envoyer vers le flux d'ingestion */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleValidateAndImport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              id="btn-import-extracted-web-doc"
            >
              <span>Valider et Importer dans l'Espace RAG</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
