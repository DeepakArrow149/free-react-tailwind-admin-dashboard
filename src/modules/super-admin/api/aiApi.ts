/**
 * AI Form Builder API Client
 * Frontend API layer for AI chat, conversations, and admin endpoints.
 */

import type { AxiosRequestConfig } from 'axios';
import { api, apiRoutes } from '@/core/api';
import { tokenService } from '@/core/services/tokenService';
import { env } from '@/core/config/env';
import { consumeSseStream } from '@/core/api/sse';

// ─── Types ───────────────────────────────────────────────────

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  formDefinition?: Record<string, unknown>;
  suggestions?: string[];
  /** Structured plan text returned during planning phase */
  plan?: string;
  rateLimit: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
}

export interface ConversationSummary {
  id: string;
  title: string;
  formId: string | null;
  status: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: AiMessage[];
  summary: string | null;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: string;
}

export interface AiProvider {
  id: number;
  provider: string;
  model: string;
  isActive: boolean;
  isDefault: boolean;
  maxTokens: number;
  temperature: number;
  apiKeyMasked: string;
  createdAt: string;
}

export interface AiUsageStats {
  totalRequests: number;
  totalTokens: number;
  recentLogs: Array<{
    id: string;
    userId: number;
    action: string;
    totalTokens: number;
    success: boolean;
    createdAt: string;
    provider: { provider: string; model: string };
  }>;
}

// ─── Chat API ────────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  conversationId?: string,
  context?: {
    currentForm?: Record<string, unknown>;
    action?: string;
    plan?: string;
  },
): Promise<ChatResponse> {
  const res = await api.post<{ success: boolean; data: ChatResponse }>(
    apiRoutes.ai.chat,
    { message, conversationId, context },
    { timeout: 120_000 } as AxiosRequestConfig, // AI calls can take 30-90s; override default 30s timeout
  );
  return res.data;
}

/** SSE streaming callbacks for progressive token delivery */
export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onPlan?: (plan: string) => void;
  onForm?: (formDefinition: Record<string, unknown>) => void;
  onSuggestions?: (suggestions: string[]) => void;
  onDone?: (data: { conversationId: string; rateLimit: RateLimitStatus }) => void;
  onError?: (error: string) => void;
}

/** Image attachment sent only on the current turn. */
export interface ChatAttachment {
  kind: 'image';
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  dataBase64: string;
  name?: string;
}

/**
 * Stream a chat message via SSE (Server-Sent Events).
 * Tokens arrive progressively; plan/form/suggestions arrive after completion.
 * Returns an AbortController to cancel the stream.
 */
export function streamChatMessage(
  message: string,
  conversationId: string | undefined,
  context: { currentForm?: Record<string, unknown>; action?: string; plan?: string } | undefined,
  callbacks: StreamChatCallbacks,
  attachments?: ChatAttachment[],
): AbortController {
  const ac = new AbortController();

  const baseUrl = env.API_BASE_URL;
  const url = `${baseUrl}${apiRoutes.ai.chatStream}`;
  const token = tokenService.getAccessToken();

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversationId, context, attachments }),
    signal: ac.signal,
  })
    .then((response) =>
      consumeSseStream(
        response,
        ({ event, data }) => {
          const d = data as Record<string, unknown>;
          switch (event) {
            case 'token': callbacks.onToken(d.token as string); break;
            case 'plan': callbacks.onPlan?.(d.plan as string); break;
            case 'form': callbacks.onForm?.(d.formDefinition as Record<string, unknown>); break;
            case 'suggestions': callbacks.onSuggestions?.(d.suggestions as string[]); break;
            case 'done': callbacks.onDone?.(d as unknown as { conversationId: string; rateLimit: RateLimitStatus }); break;
            case 'error': callbacks.onError?.(d.message as string); break;
          }
        },
        { onError: (msg) => callbacks.onError?.(msg) },
      ),
    )
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err.message || 'Stream failed');
      }
    });

  return ac;
}

// ─── Conversations ───────────────────────────────────────────

export async function fetchConversations(search?: string): Promise<ConversationSummary[]> {
  const params = search ? { search } : undefined;
  const res = await api.get<{ success: boolean; data: ConversationSummary[] }>(
    apiRoutes.ai.conversations,
    { params },
  );
  return res.data;
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const res = await api.get<{ success: boolean; data: ConversationDetail }>(
    apiRoutes.ai.conversationDetail(id),
  );
  return res.data;
}

export async function deleteConversationApi(id: string): Promise<void> {
  await api.delete(apiRoutes.ai.conversationDetail(id));
}

export async function linkConversationToForm(conversationId: string, formId: string): Promise<void> {
  await api.post(apiRoutes.ai.conversationLink(conversationId), { formId });
}

// ─── Rate Limit ──────────────────────────────────────────────

export async function fetchRateLimit(): Promise<RateLimitStatus> {
  const res = await api.get<{ success: boolean; data: RateLimitStatus }>(
    apiRoutes.ai.rateLimit,
  );
  return res.data;
}

// ─── Admin: Providers ────────────────────────────────────────

export async function fetchProviders(): Promise<AiProvider[]> {
  const res = await api.get<{ success: boolean; data: AiProvider[] }>(
    apiRoutes.ai.adminProviders,
  );
  return res.data;
}

export async function createProviderApi(data: {
  provider: string;
  model: string;
  apiKey: string;
  isActive: boolean;
  isDefault: boolean;
  maxTokens: number;
  temperature: number;
}): Promise<{ id: number }> {
  const res = await api.post<{ success: boolean; data: { id: number } }>(
    apiRoutes.ai.adminProviders,
    data,
  );
  return res.data;
}

export async function updateProviderApi(id: number, data: Partial<{
  provider: string;
  model: string;
  apiKey: string;
  isActive: boolean;
  isDefault: boolean;
  maxTokens: number;
  temperature: number;
}>): Promise<void> {
  await api.put(apiRoutes.ai.adminProviderDetail(id), data);
}

export async function deleteProviderApi(id: number): Promise<void> {
  await api.delete(apiRoutes.ai.adminProviderDetail(id));
}

// ─── Admin: Limits ───────────────────────────────────────────

export async function fetchDefaultLimits(): Promise<{ maxRequestsPerDay: number; maxTokensPerReq: number } | null> {
  const res = await api.get<{ success: boolean; data: { maxRequestsPerDay: number; maxTokensPerReq: number } | null }>(
    apiRoutes.ai.adminDefaultLimits,
  );
  return res.data;
}

export async function updateDefaultLimitsApi(data: {
  maxRequestsPerDay: number;
  maxTokensPerReq: number;
}): Promise<void> {
  await api.put(apiRoutes.ai.adminDefaultLimits, data);
}

export async function fetchCompanyLimits(): Promise<Array<{
  id: number;
  companyId: number;
  maxRequestsPerDay: number;
  maxTokensPerReq: number;
  isEnabled: boolean;
}>> {
  const res = await api.get<{ success: boolean; data: Array<Record<string, unknown>> }>(
    apiRoutes.ai.adminCompanyLimits,
  );
  return res.data as never;
}

export async function setCompanyLimitApi(data: {
  companyId: number;
  maxRequestsPerDay: number;
  maxTokensPerReq: number;
  isEnabled: boolean;
}): Promise<void> {
  await api.put(apiRoutes.ai.adminCompanyLimit, data);
}

// ─── Admin: Usage ────────────────────────────────────────────

export async function fetchUsageStats(filters?: {
  companyId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<AiUsageStats> {
  const params = new URLSearchParams();
  if (filters?.companyId) params.set('companyId', String(filters.companyId));
  if (filters?.userId) params.set('userId', String(filters.userId));
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  const url = qs ? `${apiRoutes.ai.adminUsage}?${qs}` : apiRoutes.ai.adminUsage;
  const res = await api.get<{ success: boolean; data: AiUsageStats }>(url);
  return res.data;
}

// ─── ERP Schema & Lookups ────────────────────────────────────

export interface ErpMasterMeta {
  label: string;
  model: string;
  module: string;
  columns: Record<string, string>;
  displayField: string;
  valueField: string;
}

/** Fetch all ERP master tables grouped by module */
export async function fetchErpMasters(): Promise<Record<string, ErpMasterMeta[]>> {
  const res = await api.get<{ success: boolean; data: Record<string, ErpMasterMeta[]> }>(
    apiRoutes.ai.erpMasters,
  );
  return res.data;
}

/** Fetch flat list of ERP master tables */
export async function fetchErpMastersFlat(): Promise<ErpMasterMeta[]> {
  const res = await api.get<{ success: boolean; data: ErpMasterMeta[] }>(
    apiRoutes.ai.erpMastersFlat,
  );
  return res.data;
}

/** Fetch live lookup data from an ERP master table (for dropdown population) */
export async function fetchErpLookupData(
  model: string,
  search?: string,
  limit: number = 50,
): Promise<Array<{ id: number; label: string; code?: string }>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const url = qs ? `${apiRoutes.ai.erpLookup(model)}?${qs}` : apiRoutes.ai.erpLookup(model);
  const res = await api.get<{ success: boolean; data: Array<{ id: number; label: string; code?: string }> }>(url);
  return res.data;
}
