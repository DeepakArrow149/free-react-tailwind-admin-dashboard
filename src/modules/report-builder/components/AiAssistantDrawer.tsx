/**
 * AiAssistantDrawer — Chat-style natural-language → report.
 *
 * Multi-turn refinement with streaming. The user types a prompt; tokens
 * stream into a bubble; once the assistant turn completes, a result card
 * surfaces the validated query + visualization plus refinement chips and
 * an Apply button.
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReportBuilderStore } from '../store';
import { useAiReportChatStore, type ChatMessage, type ChatActionMode } from '../aiReportChatStore';
import type { AiGenerateResponse, ReportChatAttachment } from '../api/reportBuilderApi';
import { computeReportDiff, type ReportDiff } from '../ai/diffUtils';
import type { ReportQuery, Visualization } from '../types';
import { RateLimitBar } from '../../ai/shared/RateLimitBar';
import { MessageActions } from '../../ai/shared/MessageActions';
import { InspectorPopover } from '../../ai/shared/InspectorPopover';

// ── Attachment helpers ────────────────────────────────────────────

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB raw → ~5.3 MB base64

interface AttachmentDraft extends ReportChatAttachment {
  /** Object URL for inline preview; revoked when removed. */
  previewUrl: string;
}

async function fileToAttachment(file: File): Promise<AttachmentDraft | { error: string }> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { error: `Only PNG, JPEG, WEBP, or GIF images are supported (got "${file.type || 'unknown'}").` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `Image too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max 4 MB).` };
  }
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
  return {
    kind: 'image',
    mimeType: file.type as AttachmentDraft['mimeType'],
    dataBase64,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
  };
}

// Generic refinement chips shown when the user already has a report loaded.
// Phrased so they work against any source — the AI's intent classifier maps
// them to the active rootSource.
const REFINEMENT_PROMPTS = [
  'Show as a bar chart',
  'Group by month',
  'Limit to top 10',
  'Filter to the last 90 days',
  'Switch to two-column layout',
] as const;

/**
 * Starter prompts paired with the source(s) each touches, so we can filter
 * by what the current user actually has access to. A prompt is shown only
 * when ALL its required sources are accessible — partial-match would
 * generate runtime errors against the catalog.
 *
 * `requires: []` = source-agnostic, always shown (rare; used for fallbacks).
 */
const STARTER_PROMPTS: ReadonlyArray<{ text: string; requires: readonly string[] }> = [
  { text: 'Top 10 buyers by total order value this year', requires: ['BuyerOrder'] },
  { text: 'Active suppliers by country, as a pie chart', requires: ['Supplier'] },
  { text: 'Production orders in progress this month, sorted by start date', requires: ['ProductionOrder'] },
  { text: 'Total purchase order value by supplier (this year)', requires: ['PurchaseOrder'] },
  { text: 'Employees joined in the last 90 days', requires: ['Employee'] },
  // Extra one-source-each prompts so users with narrow access still get suggestions:
  { text: 'Stock balance by warehouse', requires: ['StockLedger'] },
  { text: 'Open buyer orders sorted by ship date', requires: ['BuyerOrder'] },
  { text: 'Top 5 styles by order quantity', requires: ['StyleMaster'] },
] as const;

export interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AiAssistantDrawer({ open, onClose }: AiAssistantDrawerProps) {
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const updateMeta = useReportBuilderStore((s) => s.updateMeta);

  const {
    messages,
    isStreaming,
    streamingText,
    error,
    sendMessage,
    cancelStream,
    newConversation,
    popLastExchange,
    clearError,
    actionMode,
    setActionMode,
    currentPlan,
    planStatus,
    currentAction,
    buildFromPlan,
    dismissPlan,
    undoSnapshot,
    recordUndoSnapshot,
    clearUndoSnapshot,
    accessibleSources,
    loadAccessibleSources,
    isDocked,
    toggleDocked,
    rateLimit,
    checkRateLimit,
  } = useAiReportChatStore();

  const [prompt, setPrompt] = useState('');
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs when the draft changes / drawer closes to avoid leaks.
  useEffect(() => {
    return () => {
      if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);

  const handleFiles = async (files: FileList | File[]) => {
    setAttachmentError(null);
    const file = Array.from(files)[0];
    if (!file) return;
    const result = await fileToAttachment(file);
    if ('error' in result) {
      setAttachmentError(result.error);
      return;
    }
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(result);
  };

  const removeAttachment = () => {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    setAttachmentError(null);
  };

  // Mirror open prop into the store so other modules can read isOpen later.
  useEffect(() => {
    if (open) useAiReportChatStore.setState({ isOpen: true });
    else useAiReportChatStore.setState({ isOpen: false });
  }, [open]);

  // Lazily fetch which sources the user can query — filters starter chips.
  useEffect(() => {
    if (open) void loadAccessibleSources();
  }, [open, loadAccessibleSources]);

  // Refresh the AI quota each time the drawer opens.
  useEffect(() => {
    if (open) void checkRateLimit();
  }, [open, checkRateLimit]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Autoscroll to latest message / streaming token.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  if (!open) return null;

  // Generic submit — no attachments. Used by chip clicks and regenerate.
  const submit = (text: string) => {
    sendMessage(text, {
      query: activeReport?.query,
      visualization: activeReport?.visualization,
    });
    setPrompt('');
  };

  // Send the current input plus any draft attachment. Strips the previewUrl
  // (UI-only) before sending so the wire payload matches the schema.
  const handleSend = () => {
    const trimmed = prompt.trim();
    if (isStreaming) return;
    if (!trimmed && !attachment) return;
    const wireAttachments: ReportChatAttachment[] | undefined = attachment
      ? [{ kind: attachment.kind, mimeType: attachment.mimeType, dataBase64: attachment.dataBase64, name: attachment.name }]
      : undefined;
    sendMessage(
      trimmed || 'Build a report that reproduces what this image shows.',
      { query: activeReport?.query, visualization: activeReport?.visualization },
      wireAttachments,
    );
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    setAttachmentError(null);
    setPrompt('');
  };

  const handleRegenerate = () => {
    if (isStreaming) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    popLastExchange();
    submit(lastUser.content);
  };

  const applyResult = (result: AiGenerateResponse) => {
    if (!activeReport) return;
    try {
      // Snapshot the pre-Apply state so the user can revert in one click.
      recordUndoSnapshot({
        query: activeReport.query,
        visualization: activeReport.visualization,
        appliedLabel: result.message.split('.')[0].slice(0, 80) || 'AI report',
        takenAt: Date.now(),
      });

      const store = useReportBuilderStore.getState();
      // Auto-name a fresh report from the AI's explanation.
      if (!activeReport.name || activeReport.name === 'Untitled Report') {
        updateMeta({ name: result.message.split('.')[0].slice(0, 80) });
      }
      // Seed the catalog columns by switching source, then atomically
      // overlay the AI's full query + viz.
      void store.setRootSource(result.query.rootSource).then(() => {
        const next = useReportBuilderStore.getState().activeReport;
        if (!next) return;
        useReportBuilderStore.setState({
          activeReport: {
            ...next,
            query: result.query,
            visualization: result.visualization,
          },
          dirty: true,
        });
        toast.success('Report applied. Review and save.');
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Apply failed');
    }
  };

  const undoLastApply = () => {
    if (!undoSnapshot || !activeReport) return;
    try {
      useReportBuilderStore.setState({
        activeReport: {
          ...activeReport,
          query: undoSnapshot.query ?? activeReport.query,
          visualization: undoSnapshot.visualization ?? activeReport.visualization,
        },
        dirty: true,
      });
      clearUndoSnapshot();
      toast.success('Reverted to previous report.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Undo failed');
    }
  };

  // Find the index of the last assistant message — only that one gets a
  // Regenerate button.
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') { lastAssistantIdx = i; break; }
  }

  return (
    <>
      {/* Backdrop — only in floating mode. When docked the canvas shifts
          left to make room and remains interactive. */}
      {!isDocked && (
        <div
          className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
          onClick={onClose}
          aria-hidden
        />
      )}
      {/* Drawer */}
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-105 max-w-full flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${
        isDocked ? 'shadow-lg' : 'shadow-xl'
      }`}>
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700 bg-linear-to-r from-purple-600 to-blue-600">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">✨ AI Report Assistant</h2>
            <p className="mt-0.5 text-[11px] text-white/80 truncate">
              {messages.length === 0
                ? 'Describe a report, refine over multiple turns.'
                : `${messages.filter((m) => m.role === 'user').length} turn${messages.filter((m) => m.role === 'user').length === 1 ? '' : 's'} in this conversation`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={newConversation}
                title="Start a new conversation"
                aria-label="New conversation"
                className="rounded-full w-7 h-7 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            {/* Pin / unpin. aria-pressed coerced to a literal-string union to
                satisfy jsx-a11y/aria-proptypes. */}
            <button
              type="button"
              onClick={toggleDocked}
              title={isDocked ? 'Unpin: float over canvas' : 'Pin: dock beside canvas'}
              aria-label={isDocked ? 'Unpin drawer' : 'Pin drawer'}
              aria-pressed={(isDocked ? 'true' : 'false') as 'true' | 'false'}
              className={`rounded-full w-7 h-7 flex items-center justify-center text-white transition-colors ${
                isDocked ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              {isDocked ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close AI assistant"
              className="rounded-full w-7 h-7 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Rate-limit progress bar — shared component, see modules/ai/shared. */}
        <RateLimitBar rateLimit={rateLimit} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {messages.length === 0 && !isStreaming ? (
            <EmptyState
              onPick={submit}
              accessibleSources={accessibleSources}
              activeRootSource={activeReport?.query?.rootSource}
            />
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  currentQuery={activeReport?.query}
                  currentViz={activeReport?.visualization}
                  isLatestPlan={
                    !!msg.plan
                    && msg.plan === currentPlan
                    && planStatus === 'reviewing'
                  }
                  onApply={msg.result ? () => applyResult(msg.result!) : undefined}
                  onRefine={msg.result ? (s) => submit(s) : undefined}
                  onBuildPlan={() => buildFromPlan({
                    query: activeReport?.query,
                    visualization: activeReport?.visualization,
                  })}
                  onDismissPlan={dismissPlan}
                  onRegenerate={
                    i === lastAssistantIdx && !isStreaming
                      ? handleRegenerate
                      : undefined
                  }
                />
              ))}
              {isStreaming && (
                <StreamingBubble
                  streamingText={streamingText}
                  currentAction={currentAction}
                  onCancel={cancelStream}
                />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            <p className="truncate" title={error}>{error}</p>
            <button
              type="button"
              onClick={clearError}
              aria-label="Dismiss error"
              title="Dismiss"
              className="text-red-500 hover:text-red-700 dark:text-red-300"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Undo last apply — transient (30s) */}
        {undoSnapshot && (
          <UndoBanner
            label={undoSnapshot.appliedLabel}
            onUndo={undoLastApply}
            onDismiss={clearUndoSnapshot}
          />
        )}

        {/* Context inspector */}
        {activeReport?.query?.rootSource && (
          <ContextInspector
            query={activeReport.query}
            visualization={activeReport.visualization}
          />
        )}

        {/* Input */}
        <div
          className={`relative border-t bg-white p-3 transition-colors dark:bg-gray-900 ${
            isDragging
              ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          onDragEnter={(e) => {
            if (e.dataTransfer?.types?.includes('Files')) {
              e.preventDefault();
              setIsDragging(true);
            }
          }}
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes('Files')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setIsDragging(false);
          }}
          onDrop={(e) => {
            if (!e.dataTransfer?.files?.length) return;
            e.preventDefault();
            setIsDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-900/30">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Drop image to attach
              </span>
            </div>
          )}

          {/* Attachment preview */}
          {attachment && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-800">
              <img
                src={attachment.previewUrl}
                alt={attachment.name || 'attachment'}
                className="h-10 w-10 rounded object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-700 dark:text-gray-200 truncate">
                  {attachment.name || 'attachment'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {attachment.mimeType.replace('image/', '').toUpperCase()} · {(attachment.dataBase64.length * 0.75 / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={removeAttachment}
                aria-label="Remove attachment"
                title="Remove attachment"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {attachmentError && (
            <p className="mb-2 text-[10px] text-red-600 dark:text-red-400">{attachmentError}</p>
          )}

          {/* Hidden file picker, triggered by the paperclip button below. */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            aria-label="Attach image"
            title="Attach image"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Mode pills — locked to 'plan' while reviewing so refinement stays cheap. */}
          {planStatus !== 'building' && (
            <div className="mb-2 flex items-center gap-1 text-[10px]">
              <span className="mr-1 text-gray-400 dark:text-gray-500">Mode</span>
              {([
                { id: 'auto', label: 'Auto', hint: 'Generate directly' },
                { id: 'plan', label: 'Plan', hint: 'Review outline before building' },
                { id: 'direct', label: 'Direct', hint: 'Skip plan, build immediately' },
              ] as const).map((m) => {
                const isSelected = planStatus === 'reviewing'
                  ? m.id === 'plan'
                  : actionMode === m.id;
                const disabled = planStatus === 'reviewing' && m.id !== 'plan';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActionMode(m.id as ChatActionMode)}
                    disabled={disabled}
                    title={disabled ? 'Mode locked while a plan is under review' : m.hint}
                    className={`px-2 py-0.5 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Attach image */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              title="Attach image (PNG / JPEG / WEBP / GIF, max 4 MB)"
              aria-label="Attach image"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={
                isStreaming
                  ? currentAction === 'plan'
                    ? 'Planning…'
                    : currentAction === 'build'
                      ? 'Building from plan…'
                      : 'Generating…'
                  : attachment
                    ? 'Add a note (or send as-is to clone the image)'
                    : planStatus === 'reviewing'
                      ? 'Refine the plan — e.g. smaller, just top 5'
                      : messages.length === 0
                        ? 'e.g. Top 10 buyers by order value this year'
                        : 'Refine — e.g. now group by month'
              }
              disabled={isStreaming}
              className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={(!prompt.trim() && !attachment) || isStreaming}
              aria-label="Send"
              title="Send (Enter)"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">
            Enter to send · Shift+Enter for newline · Drop / 📎 to clone from a screenshot
          </p>
        </div>
      </aside>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────

function EmptyState({
  onPick,
  accessibleSources,
  activeRootSource,
}: {
  onPick: (text: string) => void;
  /** null = still loading; [] = no access (rare); [...] = filter against. */
  accessibleSources: string[] | null;
  /** When set, switch chips to source-aware refinement prompts. */
  activeRootSource?: string;
}) {
  // Two distinct chip sets:
  //  - Fresh start (no active report) → starter prompts filtered by accessible sources.
  //  - Refining an existing report → generic refinement chips. They're phrased
  //    to work against any source — the AI's intent classifier maps them
  //    onto the active rootSource.
  const isRefining = !!activeRootSource;

  const visiblePrompts = (() => {
    if (isRefining) {
      return REFINEMENT_PROMPTS.map((text) => ({ text }));
    }
    if (accessibleSources === null) return STARTER_PROMPTS.slice(0, 5);
    const set = new Set(accessibleSources);
    return STARTER_PROMPTS
      .filter((p) => p.requires.length === 0 || p.requires.every((src) => set.has(src)))
      .slice(0, 5);
  })();

  return (
    <div className="flex flex-col items-center justify-center h-full px-2 text-center">
      <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m4-12a2 2 0 100 4 2 2 0 000-4zM5 5a2 2 0 100 4 2 2 0 000-4zm0 14a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
        {isRefining ? 'Refine your report' : 'Describe a report'}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        {isRefining ? (
          <>Editing <strong className="font-mono">{activeRootSource}</strong>. Ask me to change columns, filters, viz, or anything else — or drop a screenshot to clone an existing report.</>
        ) : (
          <>Tell me what you want to see and I'll build it. Refine with follow-ups
          like "now group by month" or "as a pie chart".</>
        )}
      </p>

      <div className="mt-5 w-full max-w-xs flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 text-left mb-0.5">
          {visiblePrompts.length === 0
            ? 'No starter ideas matched your access — type freely'
            : isRefining
              ? 'Try refining with'
              : 'Try starting with'}
        </p>
        {visiblePrompts.map((p) => (
          <button
            key={p.text}
            type="button"
            onClick={() => onPick(p.text)}
            className="text-xs text-left px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
          >
            {p.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────

function MessageBubble({
  message,
  currentQuery,
  currentViz,
  isLatestPlan,
  onApply,
  onRefine,
  onBuildPlan,
  onDismissPlan,
  onRegenerate,
}: {
  message: ChatMessage;
  currentQuery?: ReportQuery;
  currentViz?: Visualization;
  /** True only for the plan that's currently awaiting review. */
  isLatestPlan?: boolean;
  onApply?: () => void;
  onRefine?: (suggestion: string) => void;
  onBuildPlan?: () => void;
  onDismissPlan?: () => void;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[88%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }`}
        >
          <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
        </div>

        {/* Plan card — assistant emitted a structured plan awaiting review */}
        {!isUser && message.plan && (
          <PlanCard
            plan={message.plan}
            isLatest={!!isLatestPlan}
            onBuild={isLatestPlan ? onBuildPlan : undefined}
            onDismiss={isLatestPlan ? onDismissPlan : undefined}
          />
        )}

        {/* Result card — only on assistant turns that produced a validated report */}
        {!isUser && message.result && (
          <ResultCard
            result={message.result}
            currentQuery={currentQuery}
            currentViz={currentViz}
            onApply={onApply}
            onRefine={onRefine}
          />
        )}

        {/* Hover actions on assistant bubbles — shared component. */}
        {!isUser && (
          <MessageActions
            copyText={message.plan || message.content}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────

function ResultCard({
  result,
  currentQuery,
  currentViz,
  onApply,
  onRefine,
}: {
  result: AiGenerateResponse;
  currentQuery?: ReportQuery;
  currentViz?: Visualization;
  onApply?: () => void;
  onRefine?: (s: string) => void;
}) {
  const isFallback = result.source === 'fallback';
  const diff = computeReportDiff(currentQuery, currentViz, result.query, result.visualization);
  const hasPriorState = !!currentQuery && currentQuery.rootSource;

  return (
    <div className="mt-2 w-full space-y-2 max-w-110">
      {isFallback && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-semibold">⚙ Built deterministically</span> · AI was unavailable
          {result.fallbackReason && (
            <span className="block mt-0.5 italic text-amber-600 dark:text-amber-400">
              {result.fallbackReason.length > 100 ? result.fallbackReason.slice(0, 100) + '…' : result.fallbackReason}
            </span>
          )}
        </div>
      )}

      {/* Show diff when there's a prior state to compare against; otherwise
          fall back to the plain "Plan" summary. */}
      {hasPriorState && diff.hasChanges ? (
        <DiffSummary diff={diff} result={result} />
      ) : (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] dark:border-gray-700 dark:bg-gray-800">
          <p className="font-semibold text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Plan</p>
          <ul className="space-y-0.5">
            <li><strong>Source:</strong> {result.query.rootSource}</li>
            <li>
              <strong>Columns ({result.query.columns.length}):</strong>{' '}
              <span className="text-gray-500">{result.query.columns.map((c) => c.field).join(', ')}</span>
            </li>
            {result.query.filters && (
              <li><strong>Filters:</strong> {result.query.filters.rules.length} rule(s)</li>
            )}
            {result.query.groupBy && result.query.groupBy.length > 0 && (
              <li><strong>Group by:</strong> {result.query.groupBy.join(', ')}</li>
            )}
            <li><strong>Viz:</strong> {result.visualization}</li>
          </ul>
        </div>
      )}

      {result.suggestions.length > 0 && onRefine && (
        <div className="flex flex-wrap gap-1">
          {result.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onRefine(s)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              → {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {onApply && (
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Apply to canvas
          </button>
        )}
        <span className="text-[9px] text-gray-400 shrink-0">
          {result.tokensUsed.total.toLocaleString()}t · {result.durationMs}ms
        </span>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────

function PlanCard({
  plan,
  isLatest,
  onBuild,
  onDismiss,
}: {
  plan: string;
  isLatest: boolean;
  onBuild?: () => void;
  onDismiss?: () => void;
}) {
  // Strip the PLAN_REPORT markers from display (extraction left them in if
  // the model wrapped the body itself).
  const cleaned = plan
    .replace(/<!--\s*PLAN_REPORT_(START|END)\s*-->/g, '')
    .trim();

  return (
    <div className="mt-2 w-full max-w-110 rounded-md border border-purple-300 bg-purple-50/70 px-3 py-2 dark:border-purple-700 dark:bg-purple-900/15">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
          Proposed plan
        </span>
        {!isLatest && (
          <span className="text-[9px] italic text-gray-400">superseded</span>
        )}
      </div>
      <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-700 dark:text-gray-200 font-sans">
        {cleaned}
      </pre>
      {isLatest && (onBuild || onDismiss) && (
        <div className="mt-2 flex items-center gap-2 border-t border-purple-200/70 pt-2 dark:border-purple-800/60">
          {onBuild && (
            <button
              type="button"
              onClick={onBuild}
              className="flex-1 rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
            >
              ✓ Build report from plan
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              title="Discard this plan"
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              Discard
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Diff summary ──────────────────────────────────────────────────

function DiffSummary({
  diff,
  result,
}: {
  diff: ReportDiff;
  result: AiGenerateResponse;
}) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-[11px] dark:border-blue-800 dark:bg-blue-900/15">
      <p className="font-semibold text-[10px] uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1">
        Changes if you apply
      </p>
      <ul className="space-y-0.5">
        {diff.sourceChanged && (
          <li className="text-gray-700 dark:text-gray-200">
            <strong>Source:</strong>{' '}
            <span className="text-red-600 line-through dark:text-red-400">{diff.sourceChanged.from}</span>
            {' → '}
            <span className="font-mono text-emerald-700 dark:text-emerald-400">{diff.sourceChanged.to}</span>
          </li>
        )}
        {diff.vizChanged && (
          <li className="text-gray-700 dark:text-gray-200">
            <strong>Viz:</strong>{' '}
            <span className="text-red-600 line-through dark:text-red-400">{diff.vizChanged.from}</span>
            {' → '}
            <span className="font-mono text-emerald-700 dark:text-emerald-400">{diff.vizChanged.to}</span>
          </li>
        )}
        {(diff.columnsAdded.length > 0 || diff.columnsRemoved.length > 0 || diff.columnsModified.length > 0) && (
          <li className="text-gray-700 dark:text-gray-200">
            <strong>Columns:</strong>{' '}
            {diff.columnsAdded.length > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400">+{diff.columnsAdded.length}</span>
            )}
            {diff.columnsRemoved.length > 0 && (
              <span className="ml-1.5 text-red-600 dark:text-red-400">−{diff.columnsRemoved.length}</span>
            )}
            {diff.columnsModified.length > 0 && (
              <span className="ml-1.5 text-amber-700 dark:text-amber-400">±{diff.columnsModified.length}</span>
            )}
            <span className="ml-1.5 text-gray-500">({result.query.columns.length} total)</span>
            {diff.columnsAdded.length > 0 && (
              <div className="ml-3 text-[10px] text-emerald-700/80 dark:text-emerald-300/80 truncate">
                + {diff.columnsAdded.map((c) => c.field).slice(0, 4).join(', ')}
                {diff.columnsAdded.length > 4 && ` (+${diff.columnsAdded.length - 4} more)`}
              </div>
            )}
            {diff.columnsRemoved.length > 0 && (
              <div className="ml-3 text-[10px] text-red-600/80 dark:text-red-300/80 truncate">
                − {diff.columnsRemoved.map((c) => c.field).slice(0, 4).join(', ')}
                {diff.columnsRemoved.length > 4 && ` (−${diff.columnsRemoved.length - 4} more)`}
              </div>
            )}
          </li>
        )}
        {diff.filterCount.from !== diff.filterCount.to && (
          <li className="text-gray-700 dark:text-gray-200">
            <strong>Filters:</strong>{' '}
            <span className="text-red-600 line-through dark:text-red-400">{diff.filterCount.from}</span>
            {' → '}
            <span className="text-emerald-700 dark:text-emerald-400">{diff.filterCount.to}</span>
            <span className="ml-1.5 text-gray-400">rule(s)</span>
          </li>
        )}
        {(diff.groupByAdded.length > 0 || diff.groupByRemoved.length > 0) && (
          <li className="text-gray-700 dark:text-gray-200">
            <strong>Group by:</strong>{' '}
            {diff.groupByAdded.length > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400">+{diff.groupByAdded.join(', ')}</span>
            )}
            {diff.groupByRemoved.length > 0 && (
              <span className="ml-1.5 text-red-600 line-through dark:text-red-400">{diff.groupByRemoved.join(', ')}</span>
            )}
          </li>
        )}
        {diff.sortChanged && diff.newSort.length > 0 && (
          <li className="text-gray-700 dark:text-gray-200">
            <strong>Sort:</strong>{' '}
            <span className="text-gray-500">
              {diff.newSort.map((s) => `${s.field} ${s.direction}`).join(', ')}
            </span>
          </li>
        )}
        {diff.limitChanged && (
          <li className="text-gray-700 dark:text-gray-200">
            <strong>Limit:</strong>{' '}
            <span className="text-red-600 line-through dark:text-red-400">{diff.limitChanged.from ?? '∞'}</span>
            {' → '}
            <span className="text-emerald-700 dark:text-emerald-400">{diff.limitChanged.to ?? '∞'}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

// ── Undo banner ───────────────────────────────────────────────────

function UndoBanner({
  label,
  onUndo,
  onDismiss,
}: {
  label: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-md border border-green-300 bg-green-50/80 px-2.5 py-1.5 text-[11px] text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200 animate-fade-in-up">
      <div className="min-w-0 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="truncate" title={label}>
          Applied <strong className="font-semibold">{label}</strong>
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onUndo}
          className="rounded-full border border-green-400 px-2 py-0.5 text-[10px] font-medium hover:bg-green-100 dark:border-green-600 dark:hover:bg-green-900/40"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss undo offer"
          title="Dismiss"
          className="rounded-full p-1 text-green-700/60 hover:bg-green-100 hover:text-green-900 dark:text-green-300/60 dark:hover:bg-green-900/40"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Context inspector ─────────────────────────────────────────────

function ContextInspector({ query, visualization }: { query: ReportQuery; visualization: Visualization }) {
  const filterCount = query.filters
    ? (function flat(g): number {
        let n = 0;
        for (const r of g.rules) {
          if ('rules' in r) n += flat(r);
          else n += 1;
        }
        return n;
      })(query.filters)
    : 0;

  return (
    <InspectorPopover
      title="See exactly what the AI receives with each message"
      dialogLabel="AI context snapshot"
      label={
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>
            Context: <strong className="font-semibold">{query.rootSource}</strong>
            {' · '}<strong>{query.columns.length}</strong> col{query.columns.length === 1 ? '' : 's'}
            {filterCount > 0 && (
              <>
                {' · '}<strong>{filterCount}</strong> filter{filterCount === 1 ? '' : 's'}
              </>
            )}
          </span>
        </>
      }
    >
      <div className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-200 font-semibold">{query.rootSource}</p>
        <p className="mt-0.5 text-[10px] text-gray-400">
          Viz: <span className="font-mono">{visualization}</span>
          {query.limit !== undefined && <> · limit {query.limit}</>}
        </p>
      </div>

      <div className="mb-2">
        <p className="font-semibold text-gray-600 dark:text-gray-300 mb-0.5">
          Columns <span className="ml-1 font-normal text-gray-400">· {query.columns.length}</span>
        </p>
        {query.columns.length === 0 ? (
          <p className="ml-3 text-[10px] italic text-gray-400">none</p>
        ) : (
          <ul className="ml-3 space-y-0.5">
            {query.columns.map((c, i) => (
              <li key={`${c.field}-${i}`} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300">{c.field}</span>
                {c.aggregation && (
                  <span className="px-1 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {c.aggregation}
                  </span>
                )}
                {c.label && c.label !== c.field && (
                  <span className="text-gray-400 italic truncate max-w-40">"{c.label}"</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {filterCount > 0 && (
        <div className="mb-2">
          <p className="font-semibold text-gray-600 dark:text-gray-300 mb-0.5">
            Filters <span className="ml-1 font-normal text-gray-400">· {filterCount}</span>
          </p>
          <ul className="ml-3 space-y-0.5">
            {flattenFilterRules(query.filters!).map((r, i) => (
              <li key={i} className="text-gray-500 dark:text-gray-400">
                <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300">{r.field}</span>
                <span className="ml-1 text-gray-400">{r.operator}</span>
                {r.value !== undefined && (
                  <span className="ml-1 text-gray-500 truncate inline-block max-w-48 align-bottom">
                    {Array.isArray(r.value) ? r.value.join(', ') : String(r.value)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {query.groupBy && query.groupBy.length > 0 && (
        <div className="mb-2">
          <p className="font-semibold text-gray-600 dark:text-gray-300 mb-0.5">Group by</p>
          <ul className="ml-3 space-y-0.5">
            {query.groupBy.map((g) => (
              <li key={g} className="font-mono text-[10px] text-gray-700 dark:text-gray-300">{g}</li>
            ))}
          </ul>
        </div>
      )}

      {query.sort && query.sort.length > 0 && (
        <div>
          <p className="font-semibold text-gray-600 dark:text-gray-300 mb-0.5">Sort</p>
          <ul className="ml-3 space-y-0.5">
            {query.sort.map((s) => (
              <li key={`${s.field}-${s.direction}`} className="text-gray-500 dark:text-gray-400">
                <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300">{s.field}</span>
                <span className="ml-1 text-gray-400">{s.direction}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400">
        This is the snapshot sent with each message.
      </p>
    </InspectorPopover>
  );
}

function flattenFilterRules(g: { combinator: string; rules: Array<{ field?: string; operator?: string; value?: unknown; rules?: unknown[] }> }): Array<{ field: string; operator: string; value?: unknown }> {
  const out: Array<{ field: string; operator: string; value?: unknown }> = [];
  for (const r of g.rules) {
    if ('rules' in r && Array.isArray((r as { rules?: unknown[] }).rules)) {
      out.push(...flattenFilterRules(r as unknown as { combinator: string; rules: Array<{ field?: string; operator?: string; value?: unknown; rules?: unknown[] }> }));
    } else if (r.field && r.operator) {
      out.push({ field: r.field, operator: r.operator, value: r.value });
    }
  }
  return out;
}

// ── Streaming bubble ──────────────────────────────────────────────

function StreamingBubble({
  streamingText,
  currentAction,
  onCancel,
}: {
  streamingText: string;
  currentAction: 'generate' | 'plan' | 'build' | null;
  onCancel: () => void;
}) {
  // Strip the JSON code fence from the live preview so it reads naturally —
  // the AI's JSON is just noise to the user mid-stream. The validated result
  // arrives separately as a structured card. Plan markers also hidden.
  const cleaned = streamingText
    .replace(/```[a-z]*\n?[\s\S]*?(?:```|$)/gi, '')
    .replace(/<!--\s*PLAN_REPORT_(START|END)\s*-->/g, '')
    .trim();

  const isPlanning = currentAction === 'plan';
  const isBuilding = currentAction === 'build';

  const label = isPlanning
    ? 'Planning…'
    : isBuilding
      ? 'Building from plan…'
      : 'Building report…';

  const accentBg = isPlanning
    ? 'border-purple-200 bg-purple-50/70 dark:border-purple-800 dark:bg-purple-900/15'
    : isBuilding
      ? 'border-indigo-200 bg-indigo-50/70 dark:border-indigo-800 dark:bg-indigo-900/15'
      : 'border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-900/15';

  const accentText = isPlanning
    ? 'text-purple-700 dark:text-purple-300'
    : isBuilding
      ? 'text-indigo-700 dark:text-indigo-300'
      : 'text-blue-700 dark:text-blue-300';

  const dotColor = isPlanning
    ? 'bg-purple-500'
    : isBuilding
      ? 'bg-indigo-500'
      : 'bg-blue-500';

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[88%]">
        <div className={`rounded-2xl rounded-bl-md border px-3.5 py-2.5 ${accentBg}`}>
          <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${accentText}`}>
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${dotColor}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`} />
            </span>
            {label}
          </div>
          {cleaned ? (
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              {cleaned}
              <span className={`inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm ${dotColor}`} />
            </p>
          ) : (
            <div className="flex gap-1 py-0.5">
              <span className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} />
              <span className={`w-2 h-2 ${dotColor} rounded-full animate-bounce [animation-delay:150ms]`} />
              <span className={`w-2 h-2 ${dotColor} rounded-full animate-bounce [animation-delay:300ms]`} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-1 ml-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Stop
        </button>
      </div>
    </div>
  );
}
