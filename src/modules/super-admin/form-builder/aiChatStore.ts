/**
 * AI Chat Store
 * Zustand state management for the AI form builder chat panel.
 * Manages conversations, messages, loading states, and form application.
 */

import { create } from 'zustand';
import {
  streamChatMessage,
  fetchConversations,
  fetchConversation,
  deleteConversationApi,
  fetchRateLimit,
  type AiMessage,
  type ChatAttachment,
  type ConversationSummary,
  type RateLimitStatus,
} from '../api/aiApi';

export interface AiChatState {
  /** Whether the chat drawer is open */
  isOpen: boolean;
  /**
   * When docked, the drawer sits beside the canvas (which shifts to make
   * room) instead of overlaying it with a backdrop. Persisted to
   * localStorage so the user's preference survives reloads.
   */
  isDocked: boolean;
  /** Current conversation ID */
  conversationId: string | null;
  /** Chat messages in current conversation */
  messages: AiMessage[];
  /** All user conversations */
  conversations: ConversationSummary[];
  /** Whether AI is currently processing */
  isLoading: boolean;
  /** Whether conversations list is loading */
  isLoadingList: boolean;
  /** Last generated form definition from AI */
  generatedForm: Record<string, unknown> | null;
  /** AI suggestions after generation */
  suggestions: string[];
  /** Rate limit info */
  rateLimit: RateLimitStatus | null;
  /** Error message */
  error: string | null;
  /** Current plan text from planning phase */
  currentPlan: string | null;
  /** Plan workflow status */
  planStatus: 'idle' | 'reviewing' | 'building';
  /** Whether the last generated form came from a plan */
  builtFromPlan: boolean;
  /** Whether AI is currently streaming tokens */
  isStreaming: boolean;
  /** Partially accumulated streaming text */
  streamingText: string;
  /** Action of the in-flight request (e.g. 'plan_form', 'build_from_plan', 'generate_form'). */
  currentAction: string | null;

  // ── Actions ──
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  toggleDocked: () => void;
  sendMessage: (message: string, formContext?: Record<string, unknown>, action?: string, attachments?: ChatAttachment[]) => Promise<void>;
  buildFromPlan: (formContext?: Record<string, unknown>) => Promise<void>;
  clearPlan: () => void;
  cancelStream: () => void;
  loadConversations: (search?: string) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  checkRateLimit: () => Promise<void>;
  clearGeneratedForm: () => void;
  clearError: () => void;
  /** Pop the trailing assistant→user exchange so the next sendMessage replaces it. */
  popLastExchange: () => void;
}

// ── Session persistence helpers ──
const PLAN_STORAGE_KEY = 'ai-chat-plan';

function persistPlan(plan: string | null, status: 'idle' | 'reviewing' | 'building') {
  try {
    if (plan && status !== 'idle') {
      sessionStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ plan, status: status === 'building' ? 'reviewing' : status }));
    } else {
      sessionStorage.removeItem(PLAN_STORAGE_KEY);
    }
  } catch { /* quota / SSR guard */ }
}

function restorePlan(): { plan: string | null; status: 'idle' | 'reviewing' } {
  try {
    const raw = sessionStorage.getItem(PLAN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { plan: parsed.plan ?? null, status: parsed.status === 'reviewing' ? 'reviewing' : 'idle' };
    }
  } catch { /* ignore */ }
  return { plan: null, status: 'idle' };
}

const _restored = restorePlan();

// ── Drawer dock preference (persisted) ──
const DOCKED_STORAGE_KEY = 'ai-chat-docked';
function restoreDocked(): boolean {
  try {
    return sessionStorage.getItem(DOCKED_STORAGE_KEY) === '1'
      || localStorage.getItem(DOCKED_STORAGE_KEY) === '1';
  } catch { return false; }
}
function persistDocked(docked: boolean) {
  try {
    if (docked) localStorage.setItem(DOCKED_STORAGE_KEY, '1');
    else localStorage.removeItem(DOCKED_STORAGE_KEY);
  } catch { /* quota / SSR guard */ }
}

export const useAiChatStore = create<AiChatState>((set, get) => {

// Module-level abort controller for active streams
let _activeStreamAc: AbortController | null = null;

return ({
  isOpen: false,
  isDocked: restoreDocked(),
  conversationId: null,
  messages: [],
  conversations: [],
  isLoading: false,
  isLoadingList: false,
  generatedForm: null,
  suggestions: [],
  rateLimit: null,
  error: null,
  currentPlan: _restored.plan,
  planStatus: _restored.status,
  builtFromPlan: false,
  isStreaming: false,
  streamingText: '',
  currentAction: null,

  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleDocked: () => set((s) => {
    const next = !s.isDocked;
    persistDocked(next);
    return { isDocked: next };
  }),

  sendMessage: async (message, formContext, action, attachments) => {
    const { conversationId, messages } = get();

    // Surface attached file names in the user bubble so the UI shows what was sent.
    // The image bytes themselves go via `attachments` to the API and are NOT
    // stored in conversation history.
    const userContent = attachments && attachments.length > 0
      ? `${message}\n\n📎 ${attachments.map((a) => a.name || a.kind).join(', ')}`
      : message;

    const userMsg: AiMessage = {
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString(),
    };
    set({ messages: [...messages, userMsg], isLoading: true, isStreaming: true, streamingText: '', error: null, currentAction: action || 'generate_form' });

    const wasBuildingPlan = get().planStatus === 'building';

    const ac = streamChatMessage(
      message,
      conversationId || undefined,
      formContext
        ? { currentForm: formContext, action: action || 'generate_form' }
        : action
          ? { action }
          : undefined,
      {
        onToken: (token) => {
          set((s) => ({ streamingText: s.streamingText + token }));
        },
        onPlan: (plan) => {
          set({ currentPlan: plan, planStatus: 'reviewing' });
          persistPlan(plan, 'reviewing');
        },
        onForm: (formDefinition) => {
          set(() => ({ generatedForm: formDefinition, builtFromPlan: wasBuildingPlan }));
        },
        onSuggestions: (suggestions) => {
          set({ suggestions });
        },
        onDone: (data) => {
          const fullText = get().streamingText;
          const assistantMsg: AiMessage = {
            role: 'assistant',
            content: fullText,
            timestamp: new Date().toISOString(),
          };
          set((s) => ({
            conversationId: data.conversationId,
            messages: [...s.messages, assistantMsg],
            rateLimit: data.rateLimit,
            isLoading: false,
            isStreaming: false,
            streamingText: '',
            currentAction: null,
          }));
        },
        onError: (errorMsg) => {
          const partial = get().streamingText;
          // Keep partial text as a visible (incomplete) assistant message
          const msgs = partial
            ? [...get().messages, { role: 'assistant' as const, content: partial + '\n\n*(interrupted)*', timestamp: new Date().toISOString() }]
            : get().messages;
          set((s) => ({
            messages: msgs,
            isLoading: false,
            isStreaming: false,
            streamingText: '',
            error: errorMsg,
            currentAction: null,
            planStatus: wasBuildingPlan ? 'reviewing' : s.planStatus,
          }));
        },
      },
      attachments,
    );

    // Store abort controller on the module scope for cancelStream
    _activeStreamAc = ac;
  },

  loadConversations: async (search) => {
    set({ isLoadingList: true });
    try {
      const conversations = await fetchConversations(search);
      set({ conversations, isLoadingList: false });
    } catch {
      set({ isLoadingList: false });
    }
  },

  loadConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const conv = await fetchConversation(id);
      // Detect and restore the last plan from conversation messages
      let restoredPlan: string | null = null;
      const msgs = conv.messages || [];
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role === 'assistant' && m.content) {
          // Check for PLAN markers
          const planMatch = m.content.match(/<!-- PLAN_START -->\s*\n([\s\S]*?)\n\s*<!-- PLAN_END -->/);
          if (planMatch) { restoredPlan = planMatch[1].trim(); break; }
          // Fallback: structured plan pattern
          if (/\*\*Form:\*\*/i.test(m.content) && /### Section \d/i.test(m.content)) {
            restoredPlan = m.content.replace(/```[\s\S]*?```/g, '').trim();
            break;
          }
        }
      }
      set({
        conversationId: conv.id,
        messages: msgs,
        isLoading: false,
        ...(restoredPlan ? { currentPlan: restoredPlan, planStatus: 'reviewing' as const } : { currentPlan: null, planStatus: 'idle' as const }),
      });
      if (restoredPlan) persistPlan(restoredPlan, 'reviewing');
    } catch {
      set({ isLoading: false, error: 'Failed to load conversation' });
    }
  },

  newConversation: () => {
    _activeStreamAc?.abort();
    _activeStreamAc = null;
    persistPlan(null, 'idle');
    set({
      conversationId: null,
      messages: [],
      generatedForm: null,
      suggestions: [],
      error: null,
      currentPlan: null,
      planStatus: 'idle',
      builtFromPlan: false,
      isStreaming: false,
      streamingText: '',
    });
  },

  deleteConversation: async (id) => {
    try {
      await deleteConversationApi(id);
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        ...(s.conversationId === id
          ? { conversationId: null, messages: [], generatedForm: null, suggestions: [] }
          : {}),
      }));
    } catch {
      set({ error: 'Failed to delete conversation' });
    }
  },

  checkRateLimit: async () => {
    try {
      const rateLimit = await fetchRateLimit();
      set({ rateLimit });
    } catch {
      // Ignore
    }
  },

  clearGeneratedForm: () => set({ generatedForm: null, builtFromPlan: false }),
  clearError: () => set({ error: null }),

  popLastExchange: () => {
    const { messages } = get();
    let cutAt = messages.length;
    while (cutAt > 0 && messages[cutAt - 1].role === 'assistant') cutAt--;
    if (cutAt > 0 && messages[cutAt - 1].role === 'user') cutAt--;
    set({ messages: messages.slice(0, cutAt) });
  },

  cancelStream: () => {
    _activeStreamAc?.abort();
    _activeStreamAc = null;
    set({ isStreaming: false, isLoading: false, streamingText: '', currentAction: null });
  },

  buildFromPlan: async (formContext) => {
    const { conversationId, messages, currentPlan } = get();
    if (!currentPlan) return;

    const userMsg: AiMessage = {
      role: 'user',
      content: 'Build the form from the approved plan.',
      timestamp: new Date().toISOString(),
    };
    set({ messages: [...messages, userMsg], isLoading: true, isStreaming: true, streamingText: '', error: null, planStatus: 'building', currentAction: 'build_from_plan' });

    const ac = streamChatMessage(
      'Build the form from the approved plan.',
      conversationId || undefined,
      {
        currentForm: formContext,
        action: 'build_from_plan',
        plan: currentPlan,
      },
      {
        onToken: (token) => {
          set((s) => ({ streamingText: s.streamingText + token }));
        },
        onForm: (formDefinition) => {
          persistPlan(null, 'idle');
          set({ generatedForm: formDefinition, builtFromPlan: true, currentPlan: null, planStatus: 'idle' });
        },
        onSuggestions: (suggestions) => {
          set({ suggestions });
        },
        onDone: (data) => {
          const fullText = get().streamingText;
          const assistantMsg: AiMessage = {
            role: 'assistant',
            content: fullText,
            timestamp: new Date().toISOString(),
          };
          set((s) => ({
            conversationId: data.conversationId,
            messages: [...s.messages, assistantMsg],
            rateLimit: data.rateLimit,
            isLoading: false,
            isStreaming: false,
            streamingText: '',
            currentAction: null,
          }));
        },
        onError: (errorMsg) => {
          const partial = get().streamingText;
          const msgs = partial
            ? [...get().messages, { role: 'assistant' as const, content: partial + '\n\n*(interrupted)*', timestamp: new Date().toISOString() }]
            : get().messages;
          set({
            messages: msgs,
            isLoading: false,
            isStreaming: false,
            streamingText: '',
            error: errorMsg,
            planStatus: 'reviewing',
            currentAction: null,
          });
        },
      },
    );

    _activeStreamAc = ac;
  },

  clearPlan: () => { persistPlan(null, 'idle'); set({ currentPlan: null, planStatus: 'idle' }); },
});
});
