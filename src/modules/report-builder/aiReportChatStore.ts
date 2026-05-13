/**
 * Report AI Chat Store
 * Zustand state for the report builder's chat-style AI assistant.
 *
 * Conversation is in-memory for this iteration — persistence to the
 * AiConversation table will come once a `domain` discriminator is added.
 */

import { create } from 'zustand';
import {
  streamReportAi,
  fetchDataSources,
  type AiGenerateResponse,
  type ChatHistoryMessage,
  type ReportAiAction,
  type ReportChatAttachment,
} from './api/reportBuilderApi';
// Reuse the shared AI rate-limit endpoint — quota is per-user, not per-domain.
import { fetchRateLimit, type RateLimitStatus } from '../super-admin/api/aiApi';
import type { ReportQuery, Visualization } from './types';

/** Snapshot taken before an Apply so the user can Undo. */
export interface UndoSnapshot {
  query: ReportQuery | undefined;
  visualization: Visualization | undefined;
  /** Pretty label for the action that's about to be reverted. */
  appliedLabel: string;
  /** Epoch ms when the snapshot was taken — used for TTL. */
  takenAt: number;
}

/** Undo offer survives 30 seconds before fading out. */
const UNDO_TTL_MS = 30_000;

/** localStorage key for the persisted dock preference. */
const DOCKED_STORAGE_KEY = 'ai-report-chat-docked';

function restoreDocked(): boolean {
  try { return localStorage.getItem(DOCKED_STORAGE_KEY) === '1'; } catch { return false; }
}
function persistDocked(docked: boolean) {
  try {
    if (docked) localStorage.setItem(DOCKED_STORAGE_KEY, '1');
    else localStorage.removeItem(DOCKED_STORAGE_KEY);
  } catch { /* quota / SSR guard */ }
}

/** User-facing action override; 'auto' uses direct generate. */
export type ChatActionMode = 'auto' | 'plan' | 'direct';

/** Plan-then-build workflow state for the current conversation. */
export type PlanStatus = 'idle' | 'reviewing' | 'building';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Final AI result attached to the assistant turn that produced it. */
  result?: AiGenerateResponse;
  /** Plan text attached to the assistant turn that produced a plan. */
  plan?: string;
  /** Phase the message came from (drives bubble accents). */
  phase?: 'generate' | 'plan' | 'build';
  timestamp: string;
}

export interface AiReportChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  /** Latest AI result — what Apply will commit. Cleared on new send / dismiss. */
  pendingResult: AiGenerateResponse | null;
  error: string | null;
  /** Explicit action override the user picked from the mode pills. */
  actionMode: ChatActionMode;
  /** Latest plan text awaiting review. Cleared once built or dismissed. */
  currentPlan: string | null;
  /** Plan-then-build phase: 'reviewing' once a plan lands, 'building' during Build. */
  planStatus: PlanStatus;
  /** The action the in-flight stream is running (for streaming-bubble label). */
  currentAction: ReportAiAction | null;

  /** Pre-Apply snapshot for the Undo pill. Null when no Undo is offered. */
  undoSnapshot: UndoSnapshot | null;
  /**
   * Source names the user is permitted to query (e.g. ["BuyerOrder", ...]).
   * Cached for the session; populated by `loadAccessibleSources()`.
   * `null` = not loaded yet; empty array = no access (rare; usually means a
   * misconfigured role).
   */
  accessibleSources: string[] | null;
  /** Whether `loadAccessibleSources()` has fired (avoids dup fetches). */
  sourcesLoading: boolean;
  /**
   * When docked, the drawer sits beside the canvas (which shifts to make
   * room) instead of overlaying it with a backdrop. Persisted to
   * localStorage so the user's preference survives reloads.
   */
  isDocked: boolean;
  /** Latest AI quota; null until first fetched. */
  rateLimit: RateLimitStatus | null;

  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  newConversation: () => void;
  cancelStream: () => void;
  /** Record the pre-Apply state. Drawer calls this immediately before swapping. */
  recordUndoSnapshot: (snapshot: UndoSnapshot) => void;
  /** Clear the offer (timer fired, user dismissed, or new turn). */
  clearUndoSnapshot: () => void;
  /** Lazily populate accessibleSources. Idempotent — safe to call on every open. */
  loadAccessibleSources: () => Promise<void>;
  /** Toggle dock vs floating. Persisted. */
  toggleDocked: () => void;
  /** Refresh the AI quota — called on open and after each stream completes. */
  checkRateLimit: () => Promise<void>;
  /** Drop the trailing user→assistant exchange so the next send replaces it. */
  popLastExchange: () => void;
  sendMessage: (
    prompt: string,
    current?: { query?: ReportQuery; visualization?: Visualization },
    attachments?: ReportChatAttachment[],
  ) => void;
  setActionMode: (mode: ChatActionMode) => void;
  /** Commit a reviewed plan — fires a second streaming request with action='build'. */
  buildFromPlan: (current?: { query?: ReportQuery; visualization?: Visualization }) => void;
  dismissPlan: () => void;
  clearPendingResult: () => void;
  clearError: () => void;
}

// Max prior turns shipped to the server with each request — keeps the
// token budget bounded and matches the server-side cap (30).
const MAX_HISTORY_TURNS = 24;

export const useAiReportChatStore = create<AiReportChatState>((set, get) => {
  let activeStreamAc: AbortController | null = null;

  return {
    isOpen: false,
    messages: [],
    isStreaming: false,
    streamingText: '',
    pendingResult: null,
    error: null,
    actionMode: 'auto',
    currentPlan: null,
    planStatus: 'idle',
    currentAction: null,
    undoSnapshot: null,
    accessibleSources: null,
    sourcesLoading: false,
    isDocked: restoreDocked(),
    rateLimit: null,

    openChat: () => set({ isOpen: true }),
    closeChat: () => set({ isOpen: false }),
    toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
    setActionMode: (mode) => set({ actionMode: mode }),
    dismissPlan: () => set({ currentPlan: null, planStatus: 'idle' }),

    toggleDocked: () => set((s) => {
      const next = !s.isDocked;
      persistDocked(next);
      return { isDocked: next };
    }),

    checkRateLimit: async () => {
      try {
        const rl = await fetchRateLimit();
        set({ rateLimit: rl });
      } catch {
        // Best-effort — the bar just stays hidden on failure.
      }
    },

    loadAccessibleSources: async () => {
      const { accessibleSources, sourcesLoading } = get();
      // Already loaded or in-flight — bail out (idempotent).
      if (accessibleSources !== null || sourcesLoading) return;
      set({ sourcesLoading: true });
      try {
        const sources = await fetchDataSources();
        set({ accessibleSources: sources.map((s) => s.name), sourcesLoading: false });
      } catch {
        // Best-effort — fall back to empty so the UI shows a generic fallback
        // rather than spinning forever.
        set({ accessibleSources: [], sourcesLoading: false });
      }
    },

    recordUndoSnapshot: (snapshot) => {
      // Auto-clear after TTL — the offer should fade out, not pile up.
      set({ undoSnapshot: snapshot });
      window.setTimeout(() => {
        const cur = get().undoSnapshot;
        if (cur && cur.takenAt === snapshot.takenAt) {
          set({ undoSnapshot: null });
        }
      }, UNDO_TTL_MS);
    },
    clearUndoSnapshot: () => set({ undoSnapshot: null }),

    newConversation: () => {
      activeStreamAc?.abort();
      activeStreamAc = null;
      set({
        messages: [],
        isStreaming: false,
        streamingText: '',
        pendingResult: null,
        error: null,
        currentPlan: null,
        planStatus: 'idle',
        currentAction: null,
        undoSnapshot: null,
      });
    },

    cancelStream: () => {
      activeStreamAc?.abort();
      activeStreamAc = null;
      set({ isStreaming: false, streamingText: '', currentAction: null });
    },

    popLastExchange: () => {
      const { messages } = get();
      let cutAt = messages.length;
      while (cutAt > 0 && messages[cutAt - 1].role === 'assistant') cutAt--;
      if (cutAt > 0 && messages[cutAt - 1].role === 'user') cutAt--;
      set({ messages: messages.slice(0, cutAt) });
    },

    clearPendingResult: () => set({ pendingResult: null }),
    clearError: () => set({ error: null }),

    sendMessage: (prompt, current, attachments) => {
      const trimmed = prompt.trim();
      // Allow attachment-only sends — a default prompt is supplied below.
      if (!trimmed && (!attachments || attachments.length === 0)) return;
      if (get().isStreaming) return;

      const { messages, actionMode, planStatus } = get();
      // If the user dropped an image with no text, give the LLM a default
      // instruction to clone what it sees.
      const finalText = trimmed || 'Build a report that reproduces what this image shows.';

      // Action resolution (same as before).
      const action: ReportAiAction =
        planStatus === 'reviewing'
          ? 'plan'
          : actionMode === 'plan'
            ? 'plan'
            : 'generate';

      // User bubble surfaces the attached filename so the chat shows what was sent.
      const userContent = attachments && attachments.length > 0
        ? `${finalText}\n\n📎 ${attachments.map((a) => a.name || a.kind).join(', ')}`
        : finalText;

      const userMsg: ChatMessage = {
        role: 'user',
        content: userContent,
        timestamp: new Date().toISOString(),
      };
      const history: ChatHistoryMessage[] = messages
        .slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content }));

      set({
        messages: [...messages, userMsg],
        isStreaming: true,
        streamingText: '',
        pendingResult: null,
        error: null,
        currentAction: action,
      });

      activeStreamAc = streamReportAi(
        {
          prompt: finalText,
          currentQuery: current?.query,
          currentVisualization: current?.visualization,
          history,
          action,
          attachments,
        },
        buildStreamCallbacks(set, get, action, () => { activeStreamAc = null; }),
      );
    },

    buildFromPlan: (current) => {
      const { currentPlan, messages, isStreaming } = get();
      if (!currentPlan || isStreaming) return;

      // Synthesize a user message for the conversation so the build is visible
      // in the chat history.
      const userMsg: ChatMessage = {
        role: 'user',
        content: 'Build the report from the approved plan.',
        timestamp: new Date().toISOString(),
      };
      const history: ChatHistoryMessage[] = messages
        .slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content }));

      set({
        messages: [...messages, userMsg],
        isStreaming: true,
        streamingText: '',
        pendingResult: null,
        error: null,
        planStatus: 'building',
        currentAction: 'build',
      });

      activeStreamAc = streamReportAi(
        {
          prompt: 'Build the report from the approved plan.',
          currentQuery: current?.query,
          currentVisualization: current?.visualization,
          history,
          action: 'build',
          plan: currentPlan,
        },
        buildStreamCallbacks(set, get, 'build', () => { activeStreamAc = null; }),
      );
    },
  };

  /**
   * Shared SSE callbacks. Knowing the in-flight action lets us route the
   * `plan` vs `result` event correctly and tag the assistant message with
   * the phase it came from.
   */
  function buildStreamCallbacks(
    set: (partial: Partial<AiReportChatState> | ((s: AiReportChatState) => Partial<AiReportChatState>)) => void,
    get: () => AiReportChatState,
    action: ReportAiAction,
    onClose: () => void,
  ) {
    return {
      onToken: (text: string) => {
        set((s: AiReportChatState) => ({ streamingText: s.streamingText + text }));
      },
      onPlan: (plan: string) => {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: 'Here\'s the proposed plan — review and click Build when ready, or refine in chat.',
          plan,
          phase: 'plan',
          timestamp: new Date().toISOString(),
        };
        set((s: AiReportChatState) => ({
          messages: [...s.messages, assistantMsg],
          streamingText: '',
          currentPlan: plan,
          planStatus: 'reviewing',
        }));
      },
      onResult: (result: AiGenerateResponse) => {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.message || 'Generated a report.',
          result,
          phase: action === 'build' ? 'build' : 'generate',
          timestamp: new Date().toISOString(),
        };
        // Once Build completes, the plan workflow is done — clear plan state.
        set((s: AiReportChatState) => ({
          messages: [...s.messages, assistantMsg],
          streamingText: '',
          pendingResult: result,
          currentPlan: action === 'build' ? null : s.currentPlan,
          planStatus: action === 'build' ? 'idle' : s.planStatus,
        }));
      },
      onDone: () => {
        onClose();
        set({ isStreaming: false, currentAction: null });
        // Refresh the quota now that a turn has been billed.
        void get().checkRateLimit();
      },
      onError: (message: string) => {
        onClose();
        const partial = get().streamingText;
        const interrupted: ChatMessage | null = partial
          ? {
              role: 'assistant',
              content: partial + '\n\n*(interrupted)*',
              timestamp: new Date().toISOString(),
            }
          : null;
        set((s: AiReportChatState) => ({
          messages: interrupted ? [...s.messages, interrupted] : s.messages,
          isStreaming: false,
          streamingText: '',
          error: message,
          currentAction: null,
          // If we failed mid-Build, drop back to 'reviewing' so the user
          // can retry the build without losing the plan.
          planStatus: action === 'build' ? 'reviewing' : s.planStatus,
        }));
      },
    };
  }
});
