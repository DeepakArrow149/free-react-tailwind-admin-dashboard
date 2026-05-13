/**
 * AI Chat Drawer
 * Slide-out panel for AI-powered form generation.
 * Contains conversation list, chat messages, input, and form preview.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAiChatStore } from '../aiChatStore';
import { useFormBuilderStore } from '../store';
import { ChatMessage } from './ChatMessage';
import { ChatInput, CREATION_PROMPTS, MODIFICATION_PROMPTS, type ActionMode } from './ChatInput';
import { ConversationList } from './ConversationList';
import { ContextInspector } from './ContextInspector';
import { PostApplyTweaks } from './PostApplyTweaks';
import type { FormDiffSummary } from './diffUtils';
import type { ChatAttachment } from '../../api/aiApi';
import { RateLimitBar } from '../../../ai/shared/RateLimitBar';
import { FormPreview } from './FormPreview';
import { PlanPreview } from './PlanPreview';
import { SuggestionsBar } from './SuggestionsBar';
import { computeFormDiff } from './diffUtils';
import type { FormDefinition, FieldType } from '../types';
import { generateId } from '../types';
import { mapResponseToForm } from '../../api/formBuilderApi';

export const AiChatDrawer: React.FC = () => {
  const {
    isOpen,
    isDocked,
    closeChat,
    toggleDocked,
    messages,
    conversations,
    conversationId,
    isLoading,
    isLoadingList,
    generatedForm,
    suggestions,
    rateLimit,
    error,
    currentPlan,
    planStatus,
    builtFromPlan,
    isStreaming,
    streamingText,
    currentAction,
    sendMessage,
    buildFromPlan,
    clearPlan,
    cancelStream,
    loadConversations,
    loadConversation,
    newConversation,
    deleteConversation,
    checkRateLimit,
    clearGeneratedForm,
    clearError,
    popLastExchange,
  } = useAiChatStore();

  const { activeForm, loadForm, applyAiForm } = useFormBuilderStore();

  const [showHistory, setShowHistory] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>('auto');
  const [lastApplied, setLastApplied] = useState<FormDiffSummary | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations and rate limit on open
  useEffect(() => {
    if (isOpen) {
      loadConversations();
      checkRateLimit();
    }
  }, [isOpen, loadConversations, checkRateLimit]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset action mode when the active-form context flips — the available
  // mode set differs (plan/direct for new forms vs. modify/explain for active),
  // so a stale selection would render as "none selected".
  const hadActiveFormRef = useRef<boolean>(!!activeForm);
  useEffect(() => {
    const hasActive = !!activeForm;
    if (hasActive !== hadActiveFormRef.current) {
      hadActiveFormRef.current = hasActive;
      setActionMode('auto');
    }
  }, [activeForm]);

  // Auto-scroll when streaming text grows
  useEffect(() => {
    if (isStreaming && streamingText) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingText, isStreaming]);

  // A fresh AI preview supersedes the previous post-apply tweak card.
  useEffect(() => {
    if (generatedForm) setLastApplied(null);
  }, [generatedForm]);

  // Keyboard shortcut: Escape to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, closeChat]);

  const handleRegenerate = () => {
    if (isLoading) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    // Drop the trailing assistant + the user message before it; handleSend
    // re-adds the user message and triggers a fresh response.
    popLastExchange();
    handleSend(lastUser.content);
  };

  const handleSend = (message: string, attachments?: ChatAttachment[]) => {
    // Any new send retires the post-apply tweak card.
    setLastApplied(null);

    // Skip-plan escape: user explicitly wants to build directly
    const skipPlan = /^(just |skip plan|build directly|no plan)/i.test(message);

    // Explicit action override (mode pill) takes precedence over auto-detection
    let action: string;
    if (actionMode === 'plan') {
      action = activeForm ? 'plan_modify' : 'plan_form';
    } else if (actionMode === 'direct') {
      action = activeForm ? 'modify_form' : 'generate_form';
    } else if (actionMode === 'modify') {
      action = activeForm ? 'modify_form' : 'generate_form';
    } else if (actionMode === 'explain') {
      action = 'explain_form';
    } else {
      // Auto-detect from message content and form state
      action = skipPlan ? 'generate_form' : 'plan_form';
      if (activeForm) {
        const lower = message.toLowerCase();
        if (/add\s+(a\s+)?field|add\s+(a\s+)?section|insert|append/i.test(lower)) {
          action = 'add_fields';
        } else if (/explain|what\s+does|how\s+does|describe/i.test(lower)) {
          action = 'explain_form';
        } else if (/validat|rule|require|pattern|constraint/i.test(lower)) {
          action = 'suggest_validation';
        } else if (/layout|column|arrange|reorgani[zs]e|optimiz/i.test(lower)) {
          action = 'optimize_layout';
        } else {
          action = skipPlan ? 'modify_form' : 'plan_modify';
        }
      }
    }

    // Build rich context with validation, options, and settings
    const context = activeForm
      ? {
        name: activeForm.name,
        description: activeForm.description,
        settings: {
          layout: activeForm.settings?.layout,
          submitAction: activeForm.settings?.submitAction,
          wizardMode: activeForm.settings?.wizardMode,
          requireAuth: activeForm.settings?.requireAuth,
        },
        sections: activeForm.sections.map((s) => ({
          title: s.title,
          description: s.description,
          fields: s.fields.map((f) => ({
            type: f.type,
            label: f.label,
            name: f.name,
            width: f.width,
            ...(f.validation && Object.keys(f.validation).length > 0 ? { validation: f.validation } : {}),
            ...(f.options && f.options.length > 0 ? { options: f.options } : {}),
            ...(f.readOnly ? { readOnly: true } : {}),
            ...(f.lookupConfig ? { lookupConfig: f.lookupConfig } : {}),
            ...(f.calculated ? { calculated: f.calculated } : {}),
          })),
        })),
      }
      : undefined;
    sendMessage(message, context as Record<string, unknown> | undefined, action, attachments);
  };

  const handleApplyForm = (formDef: Record<string, unknown>) => {
    // Snapshot the diff BEFORE applying — formDiff is derived from
    // activeForm/generatedForm and both change once we apply.
    const diffSnapshot = formDiff;
    try {
      // Build a lookup of existing sections/fields by name for stable ID reuse
      const existingSectionsByTitle = new Map<string, { id: string; fieldsByName: Map<string, string> }>();
      if (activeForm) {
        for (const sec of activeForm.sections) {
          const fieldMap = new Map<string, string>();
          for (const f of sec.fields) fieldMap.set(f.name, f.id);
          existingSectionsByTitle.set(sec.title.toLowerCase().trim(), { id: sec.id, fieldsByName: fieldMap });
        }
      }

      // Convert AI response format to FormDefinition with stable IDs
      const mapped = mapResponseToForm({
        id: activeForm?.id || `ai-${Date.now()}`,
        name: (formDef.name as string) || 'AI Generated Form',
        slug: ((formDef.name as string) || 'ai-form').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: (formDef.description as string) || '',
        status: activeForm?.status || 'draft',
        layout: ((formDef.settings as Record<string, unknown>)?.layout as string) || activeForm?.settings?.layout || 'single-column',
        settings: {
          // Preserve existing advanced settings, overlay AI-provided ones
          ...(activeForm?.settings || {}),
          ...((formDef.settings as Record<string, unknown>) || {}),
        },
        sections: ((formDef.sections as unknown[]) || []).map((sec: unknown, i: number) => {
          const s = sec as Record<string, unknown>;
          const sTitle = ((s.title as string) || `Section ${i + 1}`).toLowerCase().trim();
          const existing = existingSectionsByTitle.get(sTitle);

          return {
            id: existing?.id || generateId(),
            title: (s.title as string) || `Section ${i + 1}`,
            description: (s.description as string) || '',
            collapsible: (s.collapsible as boolean) || false,
            visibility: null,
            sortOrder: i,
            fields: ((s.fields as unknown[]) || []).map((field: unknown, j: number) => {
              const f = field as Record<string, unknown>;
              const fName = (f.name as string) || `field_${j}`;
              const existingFieldId = existing?.fieldsByName.get(fName);

              // Find existing field to preserve advanced settings
              const existingField = activeForm?.sections
                .flatMap((sec) => sec.fields)
                .find((ef) => ef.name === fName);

              return {
                id: existingFieldId || generateId(),
                type: (f.type as string) || 'text',
                label: (f.label as string) || `Field ${j + 1}`,
                name: fName,
                placeholder: (f.placeholder as string) || existingField?.placeholder || '',
                helpText: (f.helpText as string) || existingField?.helpText || '',
                defaultValue: String((f.defaultValue as string) ?? existingField?.defaultValue ?? ''),
                width: (f.width as string) || existingField?.width || 'full',
                options: (f.options as Array<{ label: string; value: string }>) || existingField?.options || [],
                validation: (f.validation as Record<string, unknown>) || existingField?.validation || {},
                conditionalVisibility: existingField?.conditionalVisibility || null,
                calculated: (f.calculated as Record<string, unknown>) || existingField?.calculated || null,
                lookupConfig: (f.lookupConfig as Record<string, unknown>) || existingField?.lookupConfig || undefined,
                readOnly: (f.readOnly as boolean) ?? existingField?.readOnly ?? false,
                sortOrder: j,
              };
            }),
          };
        }),
        createdBy: '',
        createdAt: activeForm?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Parameters<typeof mapResponseToForm>[0]);

      // Use applyAiForm (undo-preserving) when modifying, loadForm when creating new
      if (activeForm) {
        applyAiForm(mapped);
      } else {
        loadForm(mapped);
      }
      clearGeneratedForm();

      // Surface quick-tweak chips when the apply produced visible field changes.
      if (diffSnapshot && diffSnapshot.hasChanges) {
        setLastApplied(diffSnapshot);
      }
    } catch (err) {
      console.error('Failed to apply AI form:', err);
    }
  };

  // Compute diff for FormPreview when we have both an active form and a generated form
  const formDiff = useMemo(() => {
    if (!generatedForm || !activeForm) return null;
    // Build a minimal FormDefinition from generatedForm for diff
    const newFormDef: FormDefinition = {
      id: 'preview',
      name: (generatedForm.name as string) || '',
      description: (generatedForm.description as string) || '',
      slug: 'preview',
      sections: ((generatedForm.sections as unknown[]) || []).map((sec: unknown) => {
        const s = sec as Record<string, unknown>;
        return {
          id: 'tmp',
          title: (s.title as string) || '',
          fields: ((s.fields as unknown[]) || []).map((f: unknown) => {
            const field = f as Record<string, unknown>;
            return {
              id: 'tmp',
              type: ((field.type as string) || 'text') as FieldType,
              label: (field.label as string) || '',
              name: (field.name as string) || '',
              width: ((field.width as string) || 'full') as 'full' | 'half' | 'third',
              validation: (field.validation as Record<string, unknown>) || {},
            };
          }),
          collapsed: false,
        };
      }),
      settings: {
        submitButtonText: 'Submit',
        successMessage: '',
        submitAction: 'store',
        allowMultiple: true,
        requireAuth: false,
        layout: 'single-column',
        wizardMode: false,
        showProgressBar: false,
        theme: { primaryColor: '#3b82f6', fontFamily: 'default', borderRadius: 'md' },
      },
      createdAt: '',
      updatedAt: '',
      status: 'draft',
    };
    return computeFormDiff(activeForm, newFormDef);
  }, [generatedForm, activeForm]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — only in floating (overlay) mode. When docked, the canvas
          shifts left to make room and remains interactive. */}
      {!isDocked && (
        <div
          className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
          onClick={closeChat}
        />
      )}

      {/* Drawer */}
      <div className={`fixed right-0 top-0 bottom-0 w-105 max-w-full bg-white dark:bg-gray-900 ${isDocked ? 'border-l border-gray-200 dark:border-gray-700 shadow-lg' : 'shadow-2xl'} z-50 flex flex-col animate-slide-in-right`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-white font-semibold text-sm">AI Form Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* History toggle */}
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                showHistory ? 'bg-white/20' : 'hover:bg-white/10'
              } text-white`}
              title="Conversation history"
              aria-label="Conversation history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {/* Dock / Undock */}
            <button
              type="button"
              onClick={toggleDocked}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                isDocked ? 'bg-white/20' : 'hover:bg-white/10'
              } text-white`}
              title={isDocked ? 'Unpin: float over canvas' : 'Pin: dock beside canvas'}
              aria-label={isDocked ? 'Unpin drawer' : 'Pin drawer'}
              aria-pressed={isDocked ? 'true' : 'false'}
            >
              {/* Pin icon — filled when docked, outline when floating. */}
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
            {/* Close */}
            <button
              type="button"
              onClick={closeChat}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors"
              title="Close (Esc)"
              aria-label="Close AI assistant"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Rate-limit progress bar — shared component, see modules/ai/shared. */}
        <RateLimitBar rateLimit={rateLimit} />

        {/* Persistent editing chip — always visible while a form is loaded so users
            stay oriented even mid-conversation. */}
        {activeForm && (() => {
          const sectionCount = activeForm.sections.length;
          const fieldCount = activeForm.sections.reduce((s, sec) => s + sec.fields.length, 0);
          return (
            <div className="px-3 py-1.5 bg-amber-50/70 dark:bg-amber-900/15 border-b border-amber-200/60 dark:border-amber-800/40 flex items-center gap-2 text-[10px] text-amber-800 dark:text-amber-300">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="truncate">
                Editing <strong className="font-semibold">{activeForm.name}</strong>
                <span className="text-amber-700/70 dark:text-amber-400/70"> · {sectionCount} section{sectionCount === 1 ? '' : 's'}, {fieldCount} field{fieldCount === 1 ? '' : 's'}</span>
              </span>
            </div>
          );
        })()}

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation history sidebar */}
          {showHistory && (
            <div className="w-48 border-r border-gray-200 dark:border-gray-700 shrink-0">
              <ConversationList
                conversations={conversations}
                activeId={conversationId}
                isLoading={isLoadingList}
                onSelect={(id) => { loadConversation(id); setShowHistory(false); }}
                onDelete={deleteConversation}
                onNew={() => { newConversation(); setShowHistory(false); }}
                onSearch={(q) => loadConversations(q || undefined)}
              />
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    AI Form Builder
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                    {activeForm
                      ? 'Ask me to modify the current form, add fields, or explain what it does.'
                      : "Describe the form you'd like to create. I'll generate the fields, validation, and layout."}
                  </p>

                  <div className="mt-5 w-full max-w-xs flex flex-col gap-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 text-left mb-0.5">
                      {activeForm ? 'Try modifying' : 'Try starting with'}
                    </p>
                    {(activeForm ? MODIFICATION_PROMPTS : CREATION_PROMPTS).slice(0, 4).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={isLoading || rateLimit?.remaining === 0}
                        className="text-xs text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    // Last assistant message index — only that one gets a Regenerate button.
                    let lastAssistantIdx = -1;
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].role === 'assistant') { lastAssistantIdx = i; break; }
                    }
                    return messages.map((msg, i) => (
                      <ChatMessage
                        key={i}
                        message={msg}
                        onRegenerate={
                          i === lastAssistantIdx && !isLoading && !isStreaming
                            ? handleRegenerate
                            : undefined
                        }
                      />
                    ));
                  })()}
                  {isLoading && (() => {
                    const isPlanning = currentAction === 'plan_form' || currentAction === 'plan_modify';
                    const isBuildingFromPlan = currentAction === 'build_from_plan' || planStatus === 'building';

                    // Once the plan card appears, hide the streaming bubble — the card
                    // already represents the planning result. Exception: the build phase
                    // continues to stream form-construction tokens, keep the bubble then.
                    if (currentPlan && planStatus === 'reviewing' && !isBuildingFromPlan) return null;

                    // Strip PLAN markers from the streaming preview so they don't
                    // surface to the user as visible HTML comments.
                    const cleanedText = streamingText
                      .replace(/<!--\s*PLAN_(START|END)\s*-->/g, '')
                      .replace(/\n{3,}/g, '\n\n');

                    const phaseLabel = isPlanning
                      ? 'Planning'
                      : isBuildingFromPlan
                        ? 'Building from plan'
                        : null;

                    const accent = isPlanning
                      ? 'border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-900/15'
                      : isBuildingFromPlan
                        ? 'border-purple-200 bg-purple-50/70 dark:border-purple-800 dark:bg-purple-900/15'
                        : 'border-transparent bg-gray-100 dark:bg-gray-800';

                    const phaseTextColor = isPlanning
                      ? 'text-blue-700 dark:text-blue-300'
                      : isBuildingFromPlan
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-gray-500 dark:text-gray-400';

                    return (
                      <div className="flex justify-start mb-3">
                        <div className="max-w-[85%]">
                          <div className={`rounded-2xl rounded-bl-md px-4 py-3 border ${accent}`}>
                            {phaseLabel && (
                              <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${phaseTextColor}`}>
                                <span className="relative flex h-3 w-3">
                                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${isPlanning ? 'bg-blue-400' : 'bg-purple-400'}`} />
                                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlanning ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                </span>
                                {phaseLabel}…
                              </div>
                            )}
                            {isStreaming && cleanedText ? (
                              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {cleanedText}
                                <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />
                              </p>
                            ) : (
                              <div className="flex gap-1 py-0.5">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            )}
                          </div>
                          {isStreaming && (
                            <button
                              type="button"
                              onClick={cancelStream}
                              className="mt-1 ml-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Stop generating
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-3 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                <button onClick={clearError} className="text-red-400 hover:text-red-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Plan preview card */}
            {currentPlan && planStatus !== 'idle' && !generatedForm && (
              <div className="animate-fade-in-up">
              <PlanPreview
                plan={currentPlan}
                onBuild={() => buildFromPlan(activeForm ? ({
                  name: activeForm.name,
                  sections: activeForm.sections.map((s) => ({
                    title: s.title,
                    fields: s.fields.map((f) => ({ type: f.type, label: f.label, name: f.name })),
                  })),
                } as Record<string, unknown>) : undefined)}
                onDismiss={clearPlan}
                isBuilding={planStatus === 'building'}
              />
              </div>
            )}

            {/* Generated form preview */}
            {generatedForm && (
              <div className="animate-fade-in-up">
              <FormPreview
                formDefinition={generatedForm}
                onApply={handleApplyForm}
                onDismiss={clearGeneratedForm}
                diffSummary={formDiff}
                fromPlan={builtFromPlan}
              />
              </div>
            )}

            {/* Suggestions */}
            <SuggestionsBar
              suggestions={suggestions}
              onSelect={(sug) => handleSend(sug)}
            />

            {/* Post-apply tweak chips — surface immediately after Apply, retire on next send. */}
            {lastApplied && (
              <PostApplyTweaks
                summary={lastApplied}
                onTweak={(prompt) => handleSend(prompt)}
                onDismiss={() => setLastApplied(null)}
              />
            )}

            {/* Context inspector — shows what the AI receives with each message. */}
            {activeForm && <ContextInspector form={activeForm} />}

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              disabled={isLoading || (rateLimit?.remaining === 0) || planStatus === 'building'}
              hasActiveForm={!!activeForm}
              planStatus={planStatus}
              actionMode={actionMode}
              onActionModeChange={setActionMode}
              placeholder={
                planStatus === 'building'
                  ? 'Building form from plan...'
                  : planStatus === 'reviewing'
                    ? 'Refine the plan... (or click Build above)'
                    : rateLimit?.remaining === 0
                      ? 'Daily limit reached. Try again tomorrow.'
                      : activeForm
                        ? 'Ask to modify the current form...'
                        : 'Describe the form you want to create...'
              }
            />
          </div>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.2s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};
