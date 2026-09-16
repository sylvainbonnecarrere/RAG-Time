/**
 * Console de Chat RAG avec Streaming SSE Réactif - US-FRONT-04
 * Traite les 8 événements SSE réels
 * Timeline observable à 5 étapes sans "pensée simulée"
 * Chips de citation inaltérables ouvrant le tiroir d'inspection
 * Sélecteur direct de Domaine RAG & Onboarding Compte Vierge
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useSSEStream, PipelineStage } from '../../hooks/useSSEStream';
import { defaultApiClient } from '../../services/apiClient';
import {
  ChatMessageDTO,
  MessageSourceDTO,
  SavedConversationSession,
} from '../../contracts/api-types';
import { DomainConfigModal } from './DomainConfigModal';
import { validateChatQuery } from '../../lib/validation/schemas';
import { FormFieldFeedback } from './FormFieldFeedback';
import {
  Send,
  Square,
  Bot,
  User,
  Sparkles,
  Zap,
  Activity,
  Layers,
  FileCheck,
  Search,
  ExternalLink,
  ShieldCheck,
  CornerDownLeft,
  UploadCloud,
  ArrowRight,
  FolderPlus,
  Plus,
  ChevronDown,
  Sliders,
  Check,
  Compass,
  AlertCircle,
  BookOpen,
  Cpu,
  Scale,
  Stethoscope,
  Building2,
  FileText,
  Download,
  Printer,
  Copy,
  History,
  Save,
  RotateCcw,
  FileJson,
  Archive,
  FolderArchive,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';

interface SourcedChatViewProps {
  onInspectChunk: (source: MessageSourceDTO) => void;
  onNavigateToDocuments?: () => void;
}

export const SourcedChatView: React.FC<SourcedChatViewProps> = ({
  onInspectChunk,
  onNavigateToDocuments,
}) => {
  const { activeTenant, tenants, switchTenant, tenantSwitchCount } = useTenant();
  const { streamState, startStream, abortStream } = useSSEStream();

  const [inputQuery, setInputQuery] = useState('');
  const [chatValidationError, setChatValidationError] = useState<string | null>(null);
  const [chatValidationWarning, setChatValidationWarning] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // État local des documents pour le domaine actif
  const [domainDocCount, setDomainDocCount] = useState<number>(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  // Gestion du sélecteur de domaine et modal
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [domainModalMode, setDomainModalMode] = useState<'create' | 'edit'>('create');

  // État de l'historique de conversation et persistance (Phase 6 - US-FRONT-26)
  const [isHistoryEnabled, setIsHistoryEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ragtime_history_enabled') !== 'false';
  });
  const [savedSessions, setSavedSessions] = useState<SavedConversationSession[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [savedModalSearch, setSavedModalSearch] = useState<string>('');
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isCopiedConversation, setIsCopiedConversation] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Chargement des sessions enregistrées du domaine actif
  useEffect(() => {
    if (!activeTenant) {
      setSavedSessions([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`ragtime_saved_sessions_${activeTenant.id}`);
      if (raw) {
        setSavedSessions(JSON.parse(raw));
      } else {
        setSavedSessions([]);
      }
    } catch {
      setSavedSessions([]);
    }
  }, [activeTenant?.id]);

  // Chargement / Restauration de l'historique lors du changement de domaine
  useEffect(() => {
    if (!activeTenant) {
      setMessages([]);
      return;
    }
    if (isHistoryEnabled) {
      try {
        const cached = localStorage.getItem(`ragtime_active_conv_${activeTenant.id}`);
        if (cached) {
          setMessages(JSON.parse(cached));
          return;
        }
      } catch {
        // En cas d'erreur de parsing, démarrer vide
      }
    }
    setMessages([]);
  }, [tenantSwitchCount, activeTenant?.id, isHistoryEnabled]);

  // Sauvegarde automatique du fil actif dans localStorage si historique activé
  useEffect(() => {
    if (!activeTenant) return;
    if (isHistoryEnabled) {
      if (messages.length > 0) {
        localStorage.setItem(`ragtime_active_conv_${activeTenant.id}`, JSON.stringify(messages));
      } else {
        localStorage.removeItem(`ragtime_active_conv_${activeTenant.id}`);
      }
    }
  }, [messages, activeTenant?.id, isHistoryEnabled]);

  // Activation / Désactivation de l'historique
  const toggleHistory = () => {
    const nextVal = !isHistoryEnabled;
    setIsHistoryEnabled(nextVal);
    localStorage.setItem('ragtime_history_enabled', String(nextVal));
    if (!nextVal && activeTenant) {
      localStorage.removeItem(`ragtime_active_conv_${activeTenant.id}`);
    }
    setActionNotice(
      nextVal
        ? 'Historique de conversation activé : les échanges sont mémorisés pour ce domaine.'
        : 'Historique désactivé : les échanges ne seront plus conservés en session.'
    );
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Enregistrement manuel d'une conversation dans les archives du domaine
  const handleSaveConversation = () => {
    if (!activeTenant || messages.length === 0) return;
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
      : `Discussion du ${new Date().toLocaleDateString('fr-FR')} (${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`;

    const newSession: SavedConversationSession = {
      id: 'sess-' + Date.now(),
      tenant_id: activeTenant.id,
      domain_name: activeTenant.name,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages_count: messages.length,
      messages: [...messages],
    };

    const updated = [newSession, ...savedSessions.filter((s) => s.id !== newSession.id)];
    setSavedSessions(updated);
    localStorage.setItem(`ragtime_saved_sessions_${activeTenant.id}`, JSON.stringify(updated));
    setActionNotice(`Conversation « ${title} » enregistrée dans les archives du domaine !`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Copie complète de la conversation dans le presse-papier
  const handleCopyFullConversation = async () => {
    if (messages.length === 0) return;
    let transcript = `=== RAGTIME — TRANSCRIPT CONVERSATION SOUVERAINE ===\n`;
    transcript += `Domaine : ${activeTenant?.name || 'Général'} (${activeTenant?.domain || ''})\n`;
    transcript += `Date : ${new Date().toLocaleString('fr-FR')}\n`;
    transcript += `Messages : ${messages.length}\n\n`;

    messages.forEach((m, idx) => {
      const roleLabel = m.role === 'user' ? 'QUESTION UTILISATEUR' : 'RÉPONSE RAGTIME (Llama 3.2:3b)';
      transcript += `--- [${idx + 1}] ${roleLabel} (${new Date(m.created_at).toLocaleTimeString('fr-FR')}) ---\n`;
      transcript += `${m.content}\n\n`;
      if (m.sources && m.sources.length > 0) {
        transcript += `Sources certifiées injectées (${m.sources.length}) :\n`;
        m.sources.forEach((s, sIdx) => {
          transcript += `  • [${sIdx + 1}] ${s.document_name} (Page ${s.page_number || 1}) - Cosinus: ${s.similarity_score.toFixed(3)}\n`;
        });
        transcript += `\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(transcript);
      setIsCopiedConversation(true);
      setTimeout(() => setIsCopiedConversation(false), 2500);
      setActionNotice('Conversation intégrale copiée dans le presse-papier avec succès !');
      setTimeout(() => setActionNotice(null), 3000);
    } catch {
      setActionNotice('Erreur lors de la copie de la conversation.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Exportation complète multi-formats (Markdown, JSON, Texte)
  const handleExportFullConversation = (format: 'md' | 'json' | 'txt') => {
    if (!activeTenant || messages.length === 0) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const domainSlug = activeTenant.slug || 'domaine';

    if (format === 'json') {
      const payload = {
        app: 'RAGTIME Sovereign On-Premise',
        format_version: 'RAGTIME_CHAT_EXPORT_V1',
        exported_at: new Date().toISOString(),
        tenant: {
          id: activeTenant.id,
          name: activeTenant.name,
          domain: activeTenant.domain,
          category: activeTenant.domain_category,
        },
        messages_count: messages.length,
        conversation: messages,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ragtime-chat-${domainSlug}-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      let txt = `RAGTIME — TRANSCRIPT DISCUSSION SOUVERAINE\n`;
      txt += `Domaine: ${activeTenant.name} (${activeTenant.domain})\nDate: ${new Date().toLocaleString('fr-FR')}\n\n`;
      messages.forEach((m, idx) => {
        txt += `[${idx + 1}] ${m.role === 'user' ? 'UTILISATEUR' : 'RAGTIME'} :\n${m.content}\n\n`;
      });
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ragtime-chat-${domainSlug}-${dateStr}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let md = `# Transcription de Conversation Souveraine RAGTIME\n\n`;
      md += `> **Espace / Domaine :** ${activeTenant.name} (\`${activeTenant.domain}\`)\n`;
      md += `> **Tenant ID :** \`${activeTenant.id}\`\n`;
      md += `> **Date d'Export :** ${new Date().toLocaleString('fr-FR')}\n`;
      md += `> **Moteur :** Ollama Llama 3.2 3B GGUF Q4_K_M • pgvector 768d\n\n---\n\n`;

      messages.forEach((m, idx) => {
        if (m.role === 'user') {
          md += `## ❓ Question #${Math.floor(idx / 2) + 1}\n\n${m.content}\n\n`;
        } else {
          md += `## 💡 Réponse RAGTIME\n\n${m.content}\n\n`;
          if (m.sources && m.sources.length > 0) {
            md += `### 📑 Citations Certifiées\n\n`;
            m.sources.forEach((s, sIdx) => {
              md += `- **[${sIdx + 1}] ${s.document_name}** (p.${s.page_number || 1}) — Score cosinus : \`${s.similarity_score.toFixed(3)}\`\n`;
              md += `  > *« ${s.excerpt.replace(/\n/g, ' ')} »*\n\n`;
            });
          }
          if (m.metrics) {
            md += `*TTFT : ${m.metrics.ttft_ms} ms • Débit : ${m.metrics.tokens_per_sec} tokens/s*\n\n`;
          }
          md += `---\n\n`;
        }
      });
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ragtime-chat-${domainSlug}-${dateStr}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setActionNotice(`Discussion exportée avec succès au format ${format.toUpperCase()}.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Réinitialiser la discussion
  const handleClearConversation = () => {
    if (messages.length === 0) return;
    setMessages([]);
    if (activeTenant) {
      localStorage.removeItem(`ragtime_active_conv_${activeTenant.id}`);
    }
    setActionNotice('Fil de discussion réinitialisé.');
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Restaurer / Récupérer une conversation antérieure enregistrée (US-FRONT-26)
  const handleRestoreSession = (session: SavedConversationSession) => {
    setMessages(session.messages);
    setIsSavedModalOpen(false);
    setActionNotice(`Conversation antérieure « ${session.title} » récupérée avec succès dans votre discussion.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Supprimer une session archivée
  const handleDeleteSession = (sessionId: string) => {
    if (!activeTenant) return;
    const session = savedSessions.find((s) => s.id === sessionId);
    const updated = savedSessions.filter((s) => s.id !== sessionId);
    setSavedSessions(updated);
    localStorage.setItem(`ragtime_saved_sessions_${activeTenant.id}`, JSON.stringify(updated));
    setActionNotice(`Conversation « ${session?.title || 'archivée'} » supprimée.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Supprimer toutes les sessions archivées de ce domaine
  const handleDeleteAllSessions = () => {
    if (!activeTenant) return;
    setSavedSessions([]);
    localStorage.removeItem(`ragtime_saved_sessions_${activeTenant.id}`);
    setIsConfirmingDeleteAll(false);
    setActionNotice(`Toutes les conversations antérieures du domaine « ${activeTenant.name} » ont été supprimées.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Exporter directement une session archivée (MD ou JSON)
  const handleExportSavedSession = (session: SavedConversationSession, format: 'md' | 'json') => {
    const dateStr = session.created_at.slice(0, 10);
    const domainSlug = activeTenant?.slug || 'domaine';

    if (format === 'json') {
      const payload = {
        app: 'RAGTIME Sovereign On-Premise',
        format_version: 'RAGTIME_CHAT_EXPORT_V1',
        session_id: session.id,
        tenant: {
          id: session.tenant_id,
          name: session.domain_name,
        },
        title: session.title,
        created_at: session.created_at,
        messages_count: session.messages_count,
        conversation: session.messages,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ragtime-archive-${domainSlug}-${session.id.slice(-6)}-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let md = `# Transcription de Conversation Souveraine RAGTIME — Archive\n\n`;
      md += `> **Titre :** ${session.title}\n`;
      md += `> **Espace / Domaine :** ${session.domain_name}\n`;
      md += `> **Date d'Enregistrement :** ${new Date(session.created_at).toLocaleString('fr-FR')}\n\n---\n\n`;
      session.messages.forEach((m, idx) => {
        if (m.role === 'user') {
          md += `## ❓ Question #${Math.floor(idx / 2) + 1}\n\n${m.content}\n\n`;
        } else {
          md += `## 💡 Réponse RAGTIME\n\n${m.content}\n\n`;
          if (m.sources && m.sources.length > 0) {
            md += `### 📑 Citations Certifiées (${m.sources.length})\n\n`;
            m.sources.forEach((s, sIdx) => {
              md += `- **[${sIdx + 1}] ${s.document_name}** (p.${s.page_number || 1}) — Cosinus : \`${s.similarity_score.toFixed(3)}\`\n`;
            });
          }
          md += `---\n\n`;
        }
      });
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ragtime-archive-${domainSlug}-${session.id.slice(-6)}-${dateStr}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setActionNotice(`Archive exportée en format ${format.toUpperCase()}.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Chargement réactif des documents pour le domaine actif
  useEffect(() => {
    let isMounted = true;
    if (!activeTenant) {
      setDomainDocCount(0);
      setIsLoadingDocs(false);
      return;
    }
    setIsLoadingDocs(true);
    defaultApiClient.getDocuments(activeTenant.id).then((docs) => {
      if (isMounted) {
        setDomainDocCount(docs.length);
        setIsLoadingDocs(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeTenant?.id, tenantSwitchCount]);

  // Défilement automatique fluide
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamState.streamedText, streamState.currentStage]);

  // Exportation Souveraine Markdown (Phase 5 - US-FRONT-17 / TNR-16)
  const handleExportMarkdown = (assistantMsg: ChatMessageDTO) => {
    if (!activeTenant) return;
    const msgIndex = messages.findIndex((m) => m.id === assistantMsg.id);
    const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
    const questionText = userMsg ? userMsg.content : 'Question non spécifiée';
    const timestamp = new Date().toISOString();

    let mdContent = `# Synthèse RAGTIME Souveraine & Citations Vérifiables\n\n`;
    mdContent += `> **Espace / Domaine :** ${activeTenant.name} (\`${activeTenant.domain}\`)\n`;
    mdContent += `> **Tenant ID :** \`${activeTenant.id}\`\n`;
    mdContent += `> **Horodatage d'Audit :** ${timestamp}\n`;
    mdContent += `> **Moteur d'Inférence :** Llama 3.2 3B GGUF (Quantification Q4_K_M Souveraine)\n`;
    mdContent += `> **Embeddings :** pgvector 768d (nomic-embed-text-v1.5)\n\n`;
    mdContent += `---\n\n`;
    mdContent += `## ❓ Question Soumise\n\n${questionText}\n\n`;
    mdContent += `## 💡 Synthèse Générée\n\n${assistantMsg.content}\n\n`;
    mdContent += `---\n\n`;
    mdContent += `## 📑 Sources & Citations Vérifiables (pgvector)\n\n`;

    if (assistantMsg.sources && assistantMsg.sources.length > 0) {
      mdContent += `| N° | Document Source | Page | Score Cosinus | Identifiant Chunk |\n`;
      mdContent += `|:--:|:----------------|:----:|:-------------:|:------------------|\n`;
      assistantMsg.sources.forEach((src, idx) => {
        const chunkTag = src.chunk_id ? src.chunk_id.slice(0, 16) : `chk-${idx + 1}`;
        mdContent += `| [${idx + 1}] | **${src.document_name}** | p.${src.page_number || 1} | \`${src.similarity_score.toFixed(3)}\` | \`${chunkTag}\` |\n`;
      });
      mdContent += `\n### Détail des Extraits Indexés\n\n`;
      assistantMsg.sources.forEach((src, idx) => {
        mdContent += `#### Source [${idx + 1}] : ${src.document_name} (Page ${src.page_number || 1})\n`;
        mdContent += `> *Score de similarité : ${src.similarity_score.toFixed(4)}*\n\n`;
        mdContent += `\`\`\`text\n${src.excerpt}\n\`\`\`\n\n`;
      });
    } else {
      mdContent += `*Aucune source externe n'a été injectée pour cette réponse.*\n\n`;
    }

    if (assistantMsg.metrics) {
      mdContent += `\n## ⏱️ Métriques de Performance & Télémétrie\n\n`;
      mdContent += `- **TTFT (Time to First Token) :** ${assistantMsg.metrics.ttft_ms} ms\n`;
      mdContent += `- **Débit d'inférence :** ${assistantMsg.metrics.tokens_per_sec} tokens/seconde\n`;
      mdContent += `- **Tokens totaux :** ${assistantMsg.metrics.total_tokens}\n`;
    }

    mdContent += `\n---\n*Rapport généré automatiquement par RAGTIME - Développé par Bonnecarrere Sylvain*\n`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ragtime-synthese-${activeTenant.slug || 'espace'}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Impression / PDF épuré (Phase 5 - US-FRONT-17)
  const handlePrintSynthesis = (assistantMsg: ChatMessageDTO) => {
    const msgIndex = messages.findIndex((m) => m.id === assistantMsg.id);
    const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer la synthèse.');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>RAGTIME - Synthèse d'Audit et Citations</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
            .meta { font-size: 12px; color: #555; margin-bottom: 24px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
            .question-box { background: #f5f5f5; border-left: 4px solid #4f46e5; padding: 12px; margin-bottom: 20px; font-size: 14px; font-style: italic; }
            .answer-box { font-size: 14px; margin-bottom: 24px; white-space: pre-wrap; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
            .footer { margin-top: 40px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>RAGTIME — Synthèse Souveraine Certifiée</h1>
          <div class="meta">
            <strong>Domaine :</strong> ${activeTenant?.name} (${activeTenant?.domain}) | 
            <strong>Date :</strong> ${new Date().toLocaleString('fr-FR')} | 
            <strong>Isolation :</strong> pgvector X-Tenant-ID ${activeTenant?.id}
          </div>
          <div class="section">
            <div class="section-title">Question Posée</div>
            <div class="question-box">${userMsg ? userMsg.content : 'Question utilisateur'}</div>
          </div>
          <div class="section">
            <div class="section-title">Synthèse Formulée</div>
            <div class="answer-box">${assistantMsg.content}</div>
          </div>
          ${assistantMsg.sources && assistantMsg.sources.length > 0 ? `
            <div class="section">
              <div class="section-title">Sources & Extraits Vérifiables (${assistantMsg.sources.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Document</th>
                    <th>Page</th>
                    <th>Score Similarité</th>
                    <th>Extrait vérifié</th>
                  </tr>
                </thead>
                <tbody>
                  ${assistantMsg.sources.map((s, idx) => `
                    <tr>
                      <td>#${idx + 1}</td>
                      <td><strong>${s.document_name}</strong></td>
                      <td>Page ${s.page_number || 1}</td>
                      <td>${s.similarity_score.toFixed(3)}</td>
                      <td>${s.excerpt.slice(0, 140)}...</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          <div class="footer">
            Document généré par RAGTIME — Développé par Bonnecarrere Sylvain — Reproduction certifiée pour audit d'entreprise
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTenant) return;

    const validation = validateChatQuery(inputQuery, domainDocCount, isStreamingActive);
    if (!validation.isValid) {
      setChatValidationError(validation.error || 'Requête invalide');
      return;
    }

    setChatValidationError(null);
    if (validation.warning) {
      setChatValidationWarning(validation.warning);
    } else {
      setChatValidationWarning(null);
    }

    const sanitizedQuery = validation.sanitizedQuery || inputQuery.trim();

    const userMessage: ChatMessageDTO = {
      id: 'msg-usr-' + Date.now(),
      conversation_id: 'conv-' + activeTenant.id,
      role: 'user',
      content: sanitizedQuery,
      created_at: new Date().toISOString(),
      status: 'completed',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');

    // Démarrage du streaming SSE avec les 8 événements
    await startStream(sanitizedQuery, activeTenant.id, (completedMsg) => {
      setMessages((prev) => [...prev, completedMsg]);
    });
  };

  const handleQuickQuestion = (q: string) => {
    setInputQuery(q);
  };

  // Helper pour badges de catégories de domaines
  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'tech':
        return { label: 'Tech & Systèmes', icon: Cpu, color: 'text-sky-400 bg-sky-950/60 border-sky-800/60' };
      case 'legal':
        return { label: 'Droit & RGPD', icon: Scale, color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' };
      case 'health':
        return { label: 'Santé & Clinique', icon: Stethoscope, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' };
      case 'finance':
        return { label: 'Finance & Risques', icon: Building2, color: 'text-rose-400 bg-rose-950/60 border-rose-800/60' };
      default:
        return { label: 'Général', icon: BookOpen, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60' };
    }
  };

  // Parser de texte Markdown avec conversion des citations [Document, p.X] en chips cliquables
  const renderFormattedContent = (content: string, sources?: MessageSourceDTO[]) => {
    // Regex pour détecter les motifs de citations du type [Rapport_Financier_T4_2025.pdf, p.14]
    const citationRegex = /\[(.*?), p\.(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      // Texte avant la citation
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      const docName = match[1];
      const pageNum = parseInt(match[2], 10);

      // Trouver la source correspondante parmi les sources certifiées
      const matchedSource = sources?.find(
        (s) => s.document_name.includes(docName) || s.page_number === pageNum
      ) || sources?.[0];

      parts.push(
        <button
          key={match.index}
          onClick={() => matchedSource && onInspectChunk(matchedSource)}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 font-medium transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
          title="Cliquer pour inspecter l'extrait certifié et le score vectoriel"
        >
          <FileCheck className="w-3 h-3 text-indigo-400" />
          <span>{docName.length > 20 ? docName.slice(0, 18) + '...' : docName} (p.{pageNum})</span>
          <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm text-zinc-200 space-y-2">
        {parts}
      </div>
    );
  };

  const renderPipelineTimeline = (stage: PipelineStage) => {
    const steps = [
      { id: 'question_received', label: '1. Reçu', icon: Activity },
      { id: 'pgvector_search', label: '2. pgvector', icon: Search },
      { id: 'tenant_filter', label: '3. Isolation', icon: ShieldCheck },
      { id: 'sources_ready', label: '4. Chunks', icon: Layers },
      { id: 'ollama_streaming', label: '5. Ollama SSE', icon: Sparkles },
    ];

    const getStepState = (stepId: string) => {
      const order = ['idle', 'question_received', 'pgvector_search', 'tenant_filter', 'sources_ready', 'ollama_streaming', 'done'];
      const currentIndex = order.indexOf(stage);
      const stepIndex = order.indexOf(stepId);

      if (stage === 'done') return 'completed';
      if (currentIndex === stepIndex) return 'active';
      if (currentIndex > stepIndex) return 'completed';
      return 'pending';
    };

    return (
      <div className="bg-[#121214] border border-zinc-800/80 rounded-lg p-2.5 mb-3">
        <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-2 flex items-center justify-between">
          <span>Observable RAG Pipeline (US-FRONT-06)</span>
          <span className="font-mono text-zinc-400">Sans pensée simulée</span>
        </div>
        <div className="grid grid-cols-5 gap-1 text-center">
          {steps.map((step) => {
            const state = getStepState(step.id);
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`py-1.5 px-1 rounded flex flex-col items-center gap-1 transition-all ${
                  state === 'active'
                    ? 'bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 animate-pulse'
                    : state === 'completed'
                    ? 'bg-zinc-900 border border-zinc-800 text-emerald-400'
                    : 'bg-zinc-900/40 text-zinc-400 border border-zinc-800/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium leading-none">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isStreamingActive = streamState.status === 'retrieving' || streamState.status === 'generating';

  // Domaines alternatifs possédant des documents
  const otherTenantsWithDocs = tenants.filter(
    (t) => t.id !== activeTenant?.id && (t.documents_count || 0) > 0
  );

  return (
    <div className="flex flex-col h-[740px] bg-[#121214] border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl animate-in fade-in-50 duration-300">
      
      {/* Barre de titre et télémétrie */}
      <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <span>Console RAG Sourcée — Ollama Llama-3.2</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                US-FRONT-04
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Inférence souveraine locale • Isolation pgvector stricte
            </div>
          </div>
        </div>

        {/* Télémétrie en direct */}
        <div className="flex items-center gap-3 text-xs">
          {streamState.latencyTTFTMs && (
            <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>TTFT: {streamState.latencyTTFTMs} ms</span>
            </div>
          )}
          {streamState.tokensPerSec && (
            <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{streamState.tokensPerSec} tokens/s</span>
            </div>
          )}
        </div>
      </div>

      {/* SÉLECTEUR DE DOMAINE RAG DANS LE CHAT (Exigence Utilisateur) */}
      <div className="px-5 py-2.5 bg-zinc-950/80 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 relative z-20">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Domaine RAG interrogé :</span>
          </div>

          {/* Menu déroulant sélecteur de domaine */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-700/80 hover:border-indigo-500/70 rounded-lg px-3 py-1.5 text-xs text-zinc-200 transition-all font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <span className={`w-2 h-2 rounded-full ${domainDocCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-indigo-300">{activeTenant?.name || 'Sélectionner un domaine'}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                domainDocCount === 0
                  ? 'bg-amber-950/70 text-amber-300 border-amber-800/50'
                  : 'bg-zinc-800/90 text-zinc-400 border-zinc-700/50'
              }`}>
                {domainDocCount} {domainDocCount > 1 ? 'docs' : 'doc'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {isDomainDropdownOpen && (
              <div className="absolute left-0 mt-1 w-84 sm:w-96 bg-[#121214] border border-zinc-700/90 rounded-lg shadow-2xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
                  <span>Domaines RAG créés ({tenants.length})</span>
                  <span className="text-zinc-500 font-mono text-[10px]">Isolation pgvector</span>
                </div>
                <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                  {tenants.map((t) => {
                    const badge = getCategoryBadge(t.domain_category);
                    const Icon = badge.icon;
                    const isSelected = t.id === activeTenant?.id;
                    const docCount = t.documents_count || 0;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          switchTenant(t.id);
                          setIsDomainDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-md flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/80 border border-indigo-700/60 text-indigo-200'
                            : 'hover:bg-zinc-900 text-zinc-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium truncate flex items-center gap-1.5">
                              <span>{t.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">{t.domain}</div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 border ${
                            docCount === 0
                              ? 'bg-amber-950/70 text-amber-300 border-amber-800/50'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700/50'
                          }`}
                        >
                          {docCount} doc{docCount > 1 ? 's' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 mt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDomainDropdownOpen(false);
                      setDomainModalMode('create');
                      setIsDomainModalOpen(true);
                    }}
                    className="w-full py-1.5 px-2 rounded text-[11px] font-semibold text-indigo-300 hover:bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer un Nouveau Domaine</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bouton rapide de création de domaine */}
          <button
            type="button"
            onClick={() => {
              setDomainModalMode('create');
              setIsDomainModalOpen(true);
            }}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-600/50 text-indigo-300 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 font-medium"
            title="Créer un nouveau domaine RAG sur-mesure"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Nouveau Domaine</span>
          </button>

          {/* Bouton de personnalisation système du domaine actif (Exigence Utilisateur) */}
          <button
            type="button"
            onClick={() => {
              setDomainModalMode('edit');
              setIsDomainModalOpen(true);
            }}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium"
            title="Personnaliser les instructions système et le persona de ce domaine"
            id="btn-custom-system-instructions"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Personnalisation système</span>
            <span className="sm:hidden">Système</span>
          </button>

          {/* Bouton d'activation d'historique de conversation (Exigence Utilisateur & US-FRONT-26) */}
          <button
            type="button"
            onClick={toggleHistory}
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-all border flex items-center gap-1.5 font-medium ${
              isHistoryEnabled
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title={isHistoryEnabled ? 'Historique activé : vos discussions sont mémorisées pour ce domaine' : 'Historique désactivé'}
            id="btn-toggle-chat-history"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Historique :</span>
            <span>{isHistoryEnabled ? 'Actif' : 'Inactif'}</span>
          </button>

          {/* Bouton de récupération et suppression des conversations antérieures (US-FRONT-26) */}
          <button
            type="button"
            onClick={() => setIsSavedModalOpen(true)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              savedSessions.length > 0
                ? 'bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border-indigo-700/60 shadow-sm'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Récupérer ou supprimer des conversations antérieures que vous avez enregistrées"
            id="btn-manage-saved-conversations"
          >
            <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Récupérer / Supprimer conversations</span>
            <span className="sm:hidden">Archives</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                savedSessions.length > 0 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {savedSessions.length}
            </span>
          </button>
        </div>

        {/* Persona / Directives brèves */}
        <div className="text-[11px] text-zinc-400 truncate max-w-sm sm:max-w-md hidden md:flex items-center gap-1.5">
          <span className="text-zinc-500">Persona actif :</span>
          <span className="text-zinc-300 font-medium truncate">{activeTenant?.domain || 'Général'}</span>
        </div>
      </div>

      {/* Notification d'action rapide */}
      {actionNotice && (
        <div className="px-5 py-2 bg-emerald-950/80 border-b border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {actionNotice}
          </span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-sm font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Barre d'action de la conversation active : Enregistrer, Exporter, Copier, Effacer (US-FRONT-26) */}
      {messages.length > 0 && (
        <div className="px-5 py-2 bg-zinc-900/90 border-b border-zinc-800/90 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="font-medium text-[11px] text-zinc-300">
              Discussion active : <strong className="text-zinc-100">{messages.length}</strong> message{messages.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* 1. Enregistrer la conversation */}
            <button
              type="button"
              onClick={handleSaveConversation}
              className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 flex items-center gap-1.5 font-medium transition-colors"
              title="Enregistrer cette discussion dans les archives de ce domaine"
              id="btn-save-conversation"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enregistrer</span>
            </button>

            {/* 2. Menu Exporter la conversation */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 flex items-center gap-1.5 font-medium transition-colors"
                id="btn-export-conversation-menu"
                title="Exporter l'ensemble de la discussion"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Exporter</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-[#121214] border border-zinc-700 rounded-lg shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportFullConversation('md');
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>Markdown complet (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportFullConversation('json');
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <FileJson className="w-3.5 h-3.5 text-amber-400" />
                    <span>JSON Structuré (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportFullConversation('txt');
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Texte Brut (.txt)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Copier la conversation */}
            <button
              type="button"
              onClick={handleCopyFullConversation}
              className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 flex items-center gap-1.5 font-medium transition-colors"
              title="Copier l'intégralité des échanges dans le presse-papier"
              id="btn-copy-conversation"
            >
              {isCopiedConversation ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copier</span>
                </>
              )}
            </button>

            {/* 4. Récupérer / Supprimer les conversations antérieures enregistrées (US-FRONT-26) */}
            <button
              type="button"
              onClick={() => setIsSavedModalOpen(true)}
              className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              title="Récupérer ou supprimer des conversations antérieures enregistrées"
              id="btn-open-saved-sessions-bar"
            >
              <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Antérieures ({savedSessions.length})</span>
            </button>

            {/* 5. Effacer / Nouvelle discussion */}
            <button
              type="button"
              onClick={handleClearConversation}
              className="px-2.5 py-1.5 rounded-md bg-zinc-800/80 hover:bg-rose-950/70 hover:text-rose-300 text-zinc-400 border border-zinc-800 hover:border-rose-800/50 flex items-center gap-1.5 font-medium transition-colors"
              title="Réinitialiser l'échange courant"
              id="btn-clear-conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>
          </div>
        </div>
      )}

      {/* Zone principale des messages de discussion ou de l'Onboarding */}
      <div ref={chatScrollRef} className="flex-1 p-5 overflow-y-auto space-y-4">
        
        {/* CAS A : COMPTE VIERGE OU AUCUN DOCUMENT INDEXÉ DANS LE DOMAINE (Exigence Utilisateur) */}
        {domainDocCount === 0 && !isLoadingDocs && messages.length === 0 && !isStreamingActive && (
          <div className="h-full flex flex-col justify-center py-4 px-2 sm:px-4 max-w-3xl mx-auto space-y-5 animate-in fade-in-50 duration-300">
            {/* Badge d'alerte explicative */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs w-fit mx-auto shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold">
                Initialisation Requise : Aucun document indexé pour le domaine « {activeTenant?.domain || 'Sélectionné'} »
              </span>
            </div>

            {/* Titre & Explication Pédagogique */}
            <div className="text-center space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                Configurez votre espace et alimentez votre base documentaire
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Pour garantir des réponses factuelles, infalsifiables et rigoureusement sourcées sans hallucinations, le moteur souverain Ollama s'appuie exclusivement sur vos documents d'entreprise partitionnés en chunks 768d dans PostgreSQL pgvector.
              </p>
            </div>

            {/* Guide Pédagogique Pas-à-Pas (3 Étapes) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
              {/* Étape 1 */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50">
                      Étape 1
                    </span>
                    <Compass className="w-4 h-4 text-zinc-400" />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-200">Créer vos Domaines RAG</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Créez des espaces thématiques (Tech, Santé, Droit, RH, Finance) et définissez le persona et les instructions de l'IA.
                  </p>
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium pt-1">
                  <Check className="w-3 h-3" />
                  <span>Domaine « {activeTenant?.name} » actif</span>
                </div>
              </div>

              {/* Étape 2 (Clé) */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-700/60 flex flex-col justify-between space-y-2 ring-1 ring-indigo-500/20 shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                      Étape 2 (Indispensable)
                    </span>
                    <UploadCloud className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="text-xs font-bold text-indigo-200">Insérer vos Documents</h4>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Glissez vos fichiers PDF, Markdown ou SQL sur l'écran Ingestion. Le moteur ARQ les vectorisera en chunks sous isolation stricte.
                  </p>
                </div>
                <div className="text-[10px] text-indigo-300 font-mono pt-1">
                  Checksum SHA-256 & chunks 768d
                </div>
              </div>

              {/* Étape 3 */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      Étape 3
                    </span>
                    <Sparkles className="w-4 h-4 text-zinc-400" />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-200">Interroger & Auditer</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Posez vos questions ici. Recevez une réponse en streaming SSE avec badges de citations et vérification des extraits.
                  </p>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono pt-1">
                  Timeline observable en direct
                </div>
              </div>
            </div>

            {/* Boutons d'Action Principaux */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onNavigateToDocuments}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Accéder à l'Écran Ingestion & Jobs ARQ</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDomainModalMode('create');
                  setIsDomainModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 border border-zinc-700/60 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                <span>Créer un Nouveau Domaine</span>
              </button>
            </div>

            {/* Suggestion d'autres domaines disposant déjà de documents */}
            {otherTenantsWithDocs.length > 0 && (
              <div className="pt-3 border-t border-zinc-800/80 text-center">
                <div className="text-[11px] text-zinc-400 mb-2">
                  Ou interrogez directement un autre domaine disposant déjà de documents indexés :
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {otherTenantsWithDocs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => switchTenant(t.id)}
                      className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 hover:border-indigo-500 text-zinc-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium">{t.name}</span>
                      <span className="text-[10px] text-indigo-300 font-mono">({t.documents_count} docs)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CAS B : LE DOMAINE DISPOSE DE DOCUMENTS ET AUCUN MESSAGE ENCORE SAISI */}
        {domainDocCount > 0 && messages.length === 0 && !isStreamingActive && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-zinc-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center justify-center gap-2">
                <span>Interrogation RAG Sécurisée et Sourcée</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Posez une question sur les documents du domaine{' '}
                <strong className="text-indigo-400 font-medium">« {activeTenant?.domain || 'Général'} »</strong>.
                Le modèle Llama 3.2 s'appuie exclusivement sur les chunks pgvector de l'espace{' '}
                <strong className="text-zinc-300">{activeTenant?.name}</strong>.
              </p>
            </div>

            {/* Suggestions de requêtes adaptées au domaine choisi par l'utilisateur */}
            <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-lg">
              {(() => {
                const cat = activeTenant?.domain_category || 'general';
                if (cat === 'tech') {
                  return [
                    {
                      icon: '💻',
                      label: 'Isolation pgvector & SQLModel',
                      q: 'Comment fonctionne l\'isolation multi-tenant pgvector par tenant_id et l\'index HNSW ?',
                    },
                    {
                      icon: '⚙️',
                      label: 'Pipeline Ollama & Nomic',
                      q: 'Quelle est l\'architecture d\'inférence locale et la stratégie d\'embedding 768d ?',
                    },
                    {
                      icon: '🛡️',
                      label: 'Zéro fuite cross-tenant',
                      q: 'Comment RAGTIME garantit-il l\'absence totale de fuite cross-tenant lors du retrieval ?',
                    },
                  ];
                }
                if (cat === 'legal') {
                  return [
                    {
                      icon: '⚖️',
                      label: 'Registre RGPD (Art. 30)',
                      q: 'Quelles sont les obligations de tenue du registre selon l\'article 30 du RGPD ?',
                    },
                    {
                      icon: '🔒',
                      label: 'Mesures de sécurité imposées',
                      q: 'Quelles mesures techniques et organisationnelles sont requises pour protéger les données ?',
                    },
                    {
                      icon: '📄',
                      label: 'Conformité sous-traitance',
                      q: 'Quelles sont les clauses de conformité applicables aux sous-traitants ?',
                    },
                  ];
                }
                if (cat === 'health') {
                  return [
                    {
                      icon: '🏥',
                      label: 'Suivi clinique & surveillance',
                      q: 'Quels sont les protocoles cliniques et la surveillance biologique à J+7 et J+21 ?',
                    },
                    {
                      icon: '⚠️',
                      label: 'Pharmacovigilance (Grade ≥ 3)',
                      q: 'Quelle est la procédure immédiate en cas d\'effet indésirable de grade 3 ou supérieur ?',
                    },
                    {
                      icon: '🩺',
                      label: 'Recommandations & posologie',
                      q: 'Quelles sont les recommandations posologiques et précautions d\'emploi validées ?',
                    },
                  ];
                }
                if (cat === 'finance') {
                  return [
                    {
                      icon: '📊',
                      label: 'Solvabilité Bâle III & CET1',
                      q: 'Quelles sont les exigences de solvabilité Bâle III et le ratio CET1 ?',
                    },
                    {
                      icon: '📉',
                      label: 'Coût du risque IFRS 9',
                      q: 'Quel est le coût du risque et la politique de provisionnement IFRS 9 ?',
                    },
                    {
                      icon: '🛡️',
                      label: 'Cloisonnement strict tenant_id',
                      q: 'Expliquer le cloisonnement pgvector par tenant_id et la sécurité du RAG.',
                    },
                  ];
                }
                return [
                  {
                    icon: '📁',
                    label: 'Synthèse des connaissances',
                    q: `Quels sont les points clés de la documentation indexée dans le domaine « ${activeTenant?.domain || 'Général'} » ?`,
                  },
                  {
                    icon: '🛡️',
                    label: 'Cloisonnement pgvector',
                    q: 'Expliquer comment RAGTIME garantit la souveraineté locale et la sécurité des données.',
                  },
                  {
                    icon: '🔍',
                    label: 'Recherche & Citations',
                    q: 'Résumer les directives opérationnelles et citer précisément les documents sources.',
                  },
                ];
              })().map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(item.q)}
                  className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-600/50 text-zinc-300 px-3 py-1.5 rounded-lg transition-all text-left flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Accès direct aux conversations antérieures enregistrées pour ce domaine (US-FRONT-26) */}
            {savedSessions.length > 0 && (
              <div className="pt-3 w-full max-w-lg">
                <div className="bg-zinc-900/90 border border-indigo-800/50 rounded-xl p-3.5 flex items-center justify-between gap-3 text-left shadow-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderArchive className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 truncate">
                        {savedSessions.length} conversation{savedSessions.length > 1 ? 's' : ''} antérieure{savedSessions.length > 1 ? 's' : ''} enregistrée{savedSessions.length > 1 ? 's' : ''}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Dernier enregistrement le {new Date(savedSessions[0].created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSavedModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-sm"
                    id="btn-restore-empty-state"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Récupérer / Gérer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historique des messages utilisateur / assistant */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-4 text-xs sm:text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-md'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="space-y-3">
                  {renderFormattedContent(msg.content, msg.sources)}

                  {/* Badges de sources certifiées au bas de la réponse */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Sources certifiées ({msg.sources.length}) :
                      </span>
                      {msg.sources.map((src) => (
                        <button
                          key={src.id}
                          onClick={() => onInspectChunk(src)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-300 transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-medium">{src.document_name}</span>
                          <span className="text-[10px] font-mono text-indigo-300">
                            p.{src.page_number}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded">
                            score: {src.similarity_score.toFixed(3)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Métriques d'observabilité de la réponse et Boutons d'exportation souveraine */}
                  <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2">
                    {msg.metrics && (
                      <div className="flex items-center gap-2.5 text-[10px] font-mono text-zinc-400">
                        <span>TTFT: {msg.metrics.ttft_ms}ms</span>
                        <span>•</span>
                        <span>Débit: {msg.metrics.tokens_per_sec} tok/s</span>
                        <span>•</span>
                        <span>{msg.metrics.total_tokens} tok</span>
                      </div>
                    )}

                    {/* Actions d'Exportation Souveraine (US-FRONT-17) */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => handleExportMarkdown(msg)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-[11px] font-medium text-zinc-200 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Télécharger la synthèse structurée avec tableau des sources au format Markdown (.md)"
                      >
                        <Download className="w-3 h-3 text-indigo-400" />
                        <span>Export .MD</span>
                      </button>

                      <button
                        onClick={() => handlePrintSynthesis(msg)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-[11px] font-medium text-zinc-200 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Imprimer ou enregistrer au format PDF avec signature d'audit"
                      >
                        <Printer className="w-3 h-3 text-emerald-400" />
                        <span>Imprimer / PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Message en cours de streaming avec le hook useSSEStream */}
        {isStreamingActive && (
          <div className="flex gap-3 justify-start animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] bg-zinc-900/90 border border-indigo-900/60 rounded-xl p-4 text-xs sm:text-sm text-zinc-200 shadow-md">
              {/* Timeline à 5 étapes */}
              {renderPipelineTimeline(streamState.currentStage)}

              {/* Texte en streaming progressif */}
              {streamState.streamedText ? (
                <div className="space-y-3">
                  {renderFormattedContent(streamState.streamedText, streamState.sources)}
                  <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-indigo-300 font-mono py-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>Traitement de l'événement SSE : {streamState.currentStage}...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie du prompt ou bannière de déblocage si 0 document */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50">
        {domainDocCount === 0 && !isLoadingDocs ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/80 border border-amber-900/40 rounded-lg p-3">
            <div className="flex items-center gap-2.5 text-xs text-zinc-400">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Ce domaine ne contient aucun document. Déposez des fichiers pour débloquer l'interrogation RAG sourcée.
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateToDocuments}
              className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Insérer des documents</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => {
                  setInputQuery(e.target.value);
                  if (chatValidationError) setChatValidationError(null);
                }}
                disabled={isStreamingActive}
                placeholder={`Interroger les documents certifiés du domaine « ${activeTenant?.domain || activeTenant?.name} »...`}
                className={`flex-1 bg-zinc-950 rounded-lg px-4 py-2.5 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none transition-all disabled:opacity-60 ${
                  chatValidationError
                    ? 'border border-rose-500/80 focus:ring-1 focus:ring-rose-500'
                    : 'border border-zinc-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
                id="input-chat-query"
              />

              {isStreamingActive ? (
                <button
                  type="button"
                  onClick={abortStream}
                  className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Interrompre immédiatement la génération (AbortController)"
                  id="btn-abort-stream"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Arrêter</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputQuery.trim()}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  id="btn-submit-chat-query"
                >
                  <span>Envoyer</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            <FormFieldFeedback
              error={chatValidationError || undefined}
              warning={chatValidationWarning || undefined}
            />
          </div>
        )}
      </div>

      {/* Modal de Configuration / Création de Domaine */}
      <DomainConfigModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        initialMode={domainModalMode}
      />

      {/* Modal / Tiroir de Gestion des conversations antérieures du domaine (US-FRONT-26) */}
      {isSavedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <span>Gestion des conversations antérieures</span>
                    <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                      {savedSessions.length} sauvée{savedSessions.length > 1 ? 's' : ''}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Domaine : <strong className="text-zinc-300">{activeTenant?.name}</strong> • Récupérez ou supprimez vos échanges
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSavedModalOpen(false);
                  setIsConfirmingDeleteAll(false);
                }}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                id="btn-close-saved-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Moteur de recherche des conversations antérieures */}
            {savedSessions.length > 0 && (
              <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={savedModalSearch}
                    onChange={(e) => setSavedModalSearch(e.target.value)}
                    placeholder="Filtrer les conversations antérieures (mot-clé, question, date)..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    id="input-search-saved-sessions"
                  />
                  {savedModalSearch && (
                    <button
                      type="button"
                      onClick={() => setSavedModalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Corps de la liste */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {savedSessions.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2.5">
                  <FolderArchive className="w-10 h-10 mx-auto text-zinc-600 opacity-60" />
                  <p className="text-sm font-medium text-zinc-300">Aucune conversation enregistrée pour ce domaine.</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                    Lorsque vous échangez avec le RAG souverain, cliquez sur le bouton « Enregistrer » au-dessus des messages pour conserver la transcription complète.
                  </p>
                </div>
              ) : (() => {
                const filtered = savedSessions.filter((s) => {
                  if (!savedModalSearch.trim()) return true;
                  const q = savedModalSearch.toLowerCase().trim();
                  const matchTitle = s.title.toLowerCase().includes(q);
                  const matchDate = new Date(s.created_at).toLocaleString('fr-FR').toLowerCase().includes(q);
                  const matchContent = s.messages.some((m) => m.content.toLowerCase().includes(q));
                  return matchTitle || matchDate || matchContent;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-zinc-500 text-xs">
                      Aucune conversation ne correspond à votre recherche « {savedModalSearch} ».
                    </div>
                  );
                }

                return filtered.map((session) => {
                  const firstUserMsg = session.messages.find((m) => m.role === 'user');
                  const firstBotMsg = session.messages.find((m) => m.role === 'assistant');

                  return (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-xl border border-zinc-800/90 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900/90 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                            <span className="text-indigo-400">💬</span>
                            <span className="truncate">{session.title}</span>
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                            <span>{new Date(session.created_at).toLocaleString('fr-FR')}</span>
                            <span>•</span>
                            <span className="text-indigo-300 font-mono">
                              {session.messages_count} message{session.messages_count > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Actions par conversation : Récupérer / Exporter / Supprimer */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreSession(session)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Récupérer cette conversation dans la fenêtre de chat active"
                            id={`btn-restore-session-${session.id.slice(-6)}`}
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-400" />
                            <span>Récupérer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportSavedSession(session, 'md')}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 text-xs transition-colors cursor-pointer"
                            title="Exporter en Markdown (.md)"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="px-2 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Supprimer définitivement cette conversation de l'historique"
                            id={`btn-delete-session-${session.id.slice(-6)}`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </div>

                      {/* Aperçu textuel de la discussion */}
                      <div className="bg-black/30 border border-zinc-800/60 rounded-lg p-2.5 text-[11px] space-y-1.5 text-zinc-400 font-sans">
                        {firstUserMsg && (
                          <div className="truncate">
                            <strong className="text-zinc-300">Question :</strong> « {firstUserMsg.content} »
                          </div>
                        )}
                        {firstBotMsg && (
                          <div className="truncate text-zinc-400">
                            <strong className="text-indigo-400">Réponse :</strong> {firstBotMsg.content.slice(0, 140)}...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer avec suppression globale et statut */}
            <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span>
                  {savedSessions.length} conversation{savedSessions.length > 1 ? 's' : ''} enregistrée{savedSessions.length > 1 ? 's' : ''}
                </span>

                {savedSessions.length > 0 && (
                  <div>
                    {isConfirmingDeleteAll ? (
                      <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-800 px-2 py-1 rounded-lg">
                        <span className="text-rose-300 font-medium">Tout supprimer ?</span>
                        <button
                          type="button"
                          onClick={handleDeleteAllSessions}
                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                          id="btn-confirm-delete-all-sessions"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDeleteAll(false)}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteAll(true)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                        title="Supprimer toutes les conversations enregistrées de ce domaine"
                        id="btn-trigger-delete-all-sessions"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Supprimer tout</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSavedModalOpen(false);
                  setIsConfirmingDeleteAll(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
