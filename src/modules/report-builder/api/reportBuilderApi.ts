/**
 * Report Builder API Client
 *
 * Thin wrappers over the unified Axios client. The API returns the standard
 * `{ success, message, data }` envelope — every helper unwraps `.data` so
 * callers get the typed payload directly.
 */

import { api } from '@/core/api';
import { useAuthStore } from '@/store/authStore';
import { tokenService } from '@/core/services/tokenService';
import { env } from '@/core/config/env';
import { consumeSseStream } from '@/core/api/sse';
import type {
  ReportDefinition,
  ReportListItem,
  ReportQuery,
  ReportParameter,
  ReportRunResponse,
  ReportVersion,
  CatalogSourceSummary,
  CatalogSourceDetail,
  Visualization,
  VizConfig,
  Widget,
  CreateWidgetPayload,
  WidgetRunResult,
} from '../types';

const BASE = '/reports/builder';

// ── Envelope unwrap ────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

/** All API helpers go through this — extracts the inner `data` payload. */
async function unwrap<T>(promise: Promise<ApiEnvelope<T>>): Promise<T> {
  const env = await promise;
  if (env && typeof env === 'object' && 'data' in env) {
    return env.data as T;
  }
  // Some endpoints (e.g. CSV streams handled via raw response) return the body
  // directly; fall through with the raw value cast.
  return env as unknown as T;
}

// ── Company scope helper ───────────────────────────────────────────

function appendCompanyParam(url: string): string {
  const user = useAuthStore.getState().user;
  if (user?.isSuperAdmin) {
    const selectedCompanyId = (useAuthStore.getState() as unknown as Record<string, unknown>).selectedCompanyId;
    if (selectedCompanyId) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}companyId=${selectedCompanyId}`;
    }
  }
  return url;
}

// ── Catalog ────────────────────────────────────────────────────────

export async function fetchDataSources(): Promise<CatalogSourceSummary[]> {
  return unwrap(api.get<ApiEnvelope<CatalogSourceSummary[]>>(`${BASE}/data-sources`));
}

export async function fetchDataSource(name: string): Promise<CatalogSourceDetail> {
  return unwrap(api.get<ApiEnvelope<CatalogSourceDetail>>(`${BASE}/data-sources/${encodeURIComponent(name)}`));
}

// ── Reports CRUD ───────────────────────────────────────────────────

export interface ReportListFilter {
  search?: string;
  type?: string;
  status?: string;
}

export async function fetchReports(filter?: ReportListFilter): Promise<ReportListItem[]> {
  const params = new URLSearchParams();
  if (filter?.search) params.set('search', filter.search);
  if (filter?.type) params.set('type', filter.type);
  if (filter?.status) params.set('status', filter.status);
  const url = appendCompanyParam(`${BASE}${params.toString() ? `?${params.toString()}` : ''}`);
  return unwrap(api.get<ApiEnvelope<ReportListItem[]>>(url));
}

export async function fetchReport(id: string): Promise<ReportDefinition> {
  return unwrap(api.get<ApiEnvelope<ReportDefinition>>(appendCompanyParam(`${BASE}/${id}`)));
}

export interface CreateReportPayload {
  name: string;
  slug?: string;
  description?: string;
  type?: 'operational' | 'analytical' | 'dashboard' | 'banded';
  visualization?: Visualization;
  vizConfig?: VizConfig;
  category?: string;
  icon?: string;
  query: ReportQuery;
  parameters?: ReportParameter[];
  settings?: Record<string, unknown>;
}

export async function createReport(payload: CreateReportPayload): Promise<ReportDefinition> {
  return unwrap(api.post<ApiEnvelope<ReportDefinition>>(appendCompanyParam(BASE), payload));
}

export async function updateReport(
  id: string,
  payload: Partial<CreateReportPayload> & { etag?: string }
): Promise<ReportDefinition> {
  return unwrap(api.put<ApiEnvelope<ReportDefinition>>(appendCompanyParam(`${BASE}/${id}`), payload));
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export async function publishReport(id: string, label?: string): Promise<ReportDefinition> {
  return unwrap(api.post<ApiEnvelope<ReportDefinition>>(`${BASE}/${id}/publish`, { label }));
}

export async function duplicateReport(id: string): Promise<ReportDefinition> {
  return unwrap(api.post<ApiEnvelope<ReportDefinition>>(`${BASE}/${id}/duplicate`, {}));
}

// ── Versions ───────────────────────────────────────────────────────

export async function fetchVersions(id: string): Promise<ReportVersion[]> {
  return unwrap(api.get<ApiEnvelope<ReportVersion[]>>(`${BASE}/${id}/versions`));
}

export async function restoreVersion(reportId: string, versionId: string): Promise<ReportDefinition> {
  return unwrap(api.post<ApiEnvelope<ReportDefinition>>(`${BASE}/${reportId}/versions/${versionId}/restore`, {}));
}

// ── Widgets (for dashboards) ───────────────────────────────────────

export async function fetchWidgets(reportId: string): Promise<Widget[]> {
  return unwrap(api.get<ApiEnvelope<Widget[]>>(`${BASE}/${reportId}/widgets`));
}

export async function createWidget(
  reportId: string,
  payload: CreateWidgetPayload
): Promise<Widget> {
  return unwrap(api.post<ApiEnvelope<Widget>>(`${BASE}/${reportId}/widgets`, payload));
}

export async function updateWidget(
  reportId: string,
  widgetId: string,
  payload: Partial<CreateWidgetPayload>
): Promise<Widget> {
  return unwrap(api.put<ApiEnvelope<Widget>>(`${BASE}/${reportId}/widgets/${widgetId}`, payload));
}

export async function deleteWidget(reportId: string, widgetId: string): Promise<void> {
  await api.delete(`${BASE}/${reportId}/widgets/${widgetId}`);
}

export async function reorderWidgets(
  reportId: string,
  widgets: Array<{ id: number; gridX: number; gridY: number; gridW: number; gridH: number; sortOrder?: number }>
): Promise<Widget[]> {
  return unwrap(api.put<ApiEnvelope<Widget[]>>(`${BASE}/${reportId}/widgets/_reorder`, { widgets }));
}

/** A transient cross-filter pushed onto a widget's stored query at runtime. */
export interface RuntimeFilterRule {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  value?: unknown;
}

export async function runWidget(
  reportId: string,
  widgetId: string,
  payload: {
    parameters?: Record<string, unknown>;
    page?: number;
    pageSize?: number;
    overrideFilters?: RuntimeFilterRule[];
  } = {}
): Promise<WidgetRunResult> {
  return unwrap(api.post<ApiEnvelope<WidgetRunResult>>(`${BASE}/${reportId}/widgets/${widgetId}/run`, payload));
}

// ── Templates ──────────────────────────────────────────────────────

export interface ReportTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  isSystem: boolean;
}

export async function fetchTemplates(): Promise<ReportTemplate[]> {
  return unwrap(api.get<ApiEnvelope<ReportTemplate[]>>(`${BASE}/templates/list`));
}

export async function instantiateTemplate(templateId: string): Promise<ReportDefinition> {
  return unwrap(api.post<ApiEnvelope<ReportDefinition>>(`${BASE}/templates/${templateId}/instantiate`, {}));
}

// ── Shares (tokenized read-only links) ────────────────────────────

export interface Share {
  id: string;
  reportId: string;
  shareKind: 'link' | 'user' | 'role';
  shareTarget: string | null;
  permissions: 'view' | 'view,export';
  parameters: Record<string, unknown>;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  /** Returned ONLY at creation time. */
  token?: string;
}

export interface CreateSharePayload {
  shareKind?: 'link' | 'user' | 'role';
  shareTarget?: string;
  permissions?: 'view' | 'view,export';
  parameters?: Record<string, unknown>;
  expiresAt?: string | null;
}

export async function fetchShares(reportId: string): Promise<Share[]> {
  return unwrap(api.get<ApiEnvelope<Share[]>>(`${BASE}/${reportId}/shares`));
}

export async function createShare(
  reportId: string,
  payload: CreateSharePayload = {}
): Promise<Share> {
  return unwrap(api.post<ApiEnvelope<Share>>(`${BASE}/${reportId}/shares`, payload));
}

export async function deleteShare(reportId: string, shareId: string): Promise<void> {
  await api.delete(`${BASE}/${reportId}/shares/${shareId}`);
}

// ── Public (unauthenticated) — used by the public viewer page ─────

export interface PublicReportPayload {
  name: string;
  description: string;
  type: string;
  visualization: Visualization;
  vizConfig: VizConfig;
  query: ReportQuery;
  parameters: ReportParameter[];
  settings: Record<string, unknown>;
  permissions: 'view' | 'view,export';
  lockedParameters: Record<string, unknown>;
}

const PUBLIC_BASE = '/reports/public';

export async function fetchPublicReport(token: string): Promise<PublicReportPayload> {
  return unwrap(api.get<ApiEnvelope<PublicReportPayload>>(`${PUBLIC_BASE}/${token}`));
}

export async function runPublicReport(
  token: string,
  payload: { parameters?: Record<string, unknown>; page?: number; pageSize?: number } = {}
): Promise<{
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  page: number;
  pageSize: number;
  durationMs: number;
  report: { name: string; columns: import('../types').ReportColumn[] };
}> {
  return unwrap(api.post<ApiEnvelope<never>>(`${PUBLIC_BASE}/${token}/run`, payload)) as never;
}

export async function fetchPublicWidgets(token: string): Promise<Widget[]> {
  return unwrap(api.get<ApiEnvelope<Widget[]>>(`${PUBLIC_BASE}/${token}/widgets`));
}

export async function runPublicWidget(
  token: string,
  widgetId: string,
  payload: {
    parameters?: Record<string, unknown>;
    page?: number;
    pageSize?: number;
    overrideFilters?: RuntimeFilterRule[];
  } = {}
): Promise<WidgetRunResult> {
  return unwrap(api.post<ApiEnvelope<WidgetRunResult>>(
    `${PUBLIC_BASE}/${token}/widgets/${widgetId}/run`,
    payload
  ));
}

// ── Subscriptions (scheduled email delivery) ──────────────────────

export type AlertCondition =
  | { mode: 'rows_returned'; op: 'gt' | 'gte' | 'eq'; value: number }
  | { mode: 'aggregate'; field: string; rollup: 'sum' | 'avg' | 'min' | 'max' | 'count';
      op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'; value: number }
  /** Anomaly / trend: triggers when value changes by deltaPct% / deltaAbs since last run */
  | { mode: 'anomaly'; field: string; rollup: 'sum' | 'avg' | 'min' | 'max' | 'count';
      deltaPct?: number; deltaAbs?: number; direction?: 'up' | 'down' | 'either' };

export interface Subscription {
  id: string;
  reportId: string;
  name: string;
  scheduleCron: string;
  format: 'xlsx' | 'csv' | 'pdf';
  recipients: Array<{ email: string; name?: string }>;
  slackWebhookUrl: string | null;
  parameters: Record<string, unknown>;
  alertCondition: AlertCondition | null;
  alertOnly: boolean;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateSubscriptionPayload {
  name: string;
  scheduleCron: string;
  format: 'xlsx' | 'csv' | 'pdf';
  recipients: Array<{ email: string; name?: string }>;
  slackWebhookUrl?: string | null;
  parameters?: Record<string, unknown>;
  alertCondition?: AlertCondition;
  alertOnly?: boolean;
}

export async function fetchSubscriptions(reportId: string): Promise<Subscription[]> {
  return unwrap(api.get<ApiEnvelope<Subscription[]>>(`${BASE}/${reportId}/subscriptions`));
}

export async function createSubscription(
  reportId: string,
  payload: CreateSubscriptionPayload
): Promise<Subscription> {
  return unwrap(api.post<ApiEnvelope<Subscription>>(`${BASE}/${reportId}/subscriptions`, payload));
}

export async function updateSubscription(
  reportId: string,
  subId: string,
  payload: Partial<CreateSubscriptionPayload> & { isActive?: boolean }
): Promise<Subscription> {
  return unwrap(api.put<ApiEnvelope<Subscription>>(`${BASE}/${reportId}/subscriptions/${subId}`, payload));
}

export async function deleteSubscription(reportId: string, subId: string): Promise<void> {
  await api.delete(`${BASE}/${reportId}/subscriptions/${subId}`);
}

// ── Saved Views (Phase 6.12) ──────────────────────────────────────

import type { FilterRule, SortRule } from '../types';

export interface SavedView {
  id: string;
  reportId: string;
  userId: number;
  companyId: number | null;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  filters: FilterRule[];
  sort: SortRule[];
  isDefault: boolean;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedViewPayload {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  filters?: FilterRule[];
  sort?: SortRule[];
  isDefault?: boolean;
  isShared?: boolean;
}

export type UpdateSavedViewPayload = Partial<CreateSavedViewPayload>;

export async function fetchSavedViews(reportId: string): Promise<SavedView[]> {
  return unwrap(api.get<ApiEnvelope<SavedView[]>>(`${BASE}/${reportId}/views`));
}

export async function createSavedView(
  reportId: string,
  payload: CreateSavedViewPayload
): Promise<SavedView> {
  return unwrap(api.post<ApiEnvelope<SavedView>>(`${BASE}/${reportId}/views`, payload));
}

export async function updateSavedView(
  reportId: string,
  viewId: string,
  payload: UpdateSavedViewPayload
): Promise<SavedView> {
  return unwrap(api.put<ApiEnvelope<SavedView>>(`${BASE}/${reportId}/views/${viewId}`, payload));
}

export async function deleteSavedView(reportId: string, viewId: string): Promise<void> {
  await api.delete(`${BASE}/${reportId}/views/${viewId}`);
}

// ── AI Assistant ───────────────────────────────────────────────────

export interface AiGenerateRequest {
  prompt: string;
  currentQuery?: ReportQuery;
  currentVisualization?: Visualization;
}

export interface AiGenerateResponse {
  query: ReportQuery;
  visualization: Visualization;
  message: string;
  suggestions: string[];
  tokensUsed: { prompt: number; completion: number; total: number };
  durationMs: number;
  /** 'ai' = LLM produced this; 'fallback' = deterministic heuristic used (no provider, bad key, parse failure, etc.) */
  source?: 'ai' | 'fallback';
  fallbackReason?: string;
}

export async function aiGenerateReport(payload: AiGenerateRequest): Promise<AiGenerateResponse> {
  return unwrap(api.post<ApiEnvelope<AiGenerateResponse>>(`${BASE}/ai/generate`, payload));
}

// ── AI streaming chat ─────────────────────────────────────────────

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ReportAiAction = 'generate' | 'plan' | 'build';

/** Image attachment sent only on the current turn. */
export interface ReportChatAttachment {
  kind: 'image';
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  /** Base64-encoded payload (no data: prefix). */
  dataBase64: string;
  name?: string;
}

export interface StreamReportAiBody {
  prompt: string;
  currentQuery?: ReportQuery;
  currentVisualization?: Visualization;
  /** Oldest-first prior turns for multi-turn refinement. */
  history?: ChatHistoryMessage[];
  /** generate (default) | plan | build. Plan emits a `plan` event only. */
  action?: ReportAiAction;
  /** Approved plan text — required when action='build'. */
  plan?: string;
  /** Images attached to this turn only — not persisted in history. */
  attachments?: ReportChatAttachment[];
}

export interface StreamReportAiCallbacks {
  onToken: (text: string) => void;
  onResult: (result: AiGenerateResponse) => void;
  /** Fired in plan mode after streaming completes; no result follows. */
  onPlan?: (plan: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

/**
 * Stream a report-AI message via SSE. Token events are emitted as the model
 * writes its JSON+explanation; once complete, a `result` event carries the
 * validated query, visualization, and suggestions. Returns an
 * AbortController so the caller can cancel mid-stream.
 */
export function streamReportAi(
  body: StreamReportAiBody,
  callbacks: StreamReportAiCallbacks,
): AbortController {
  const ac = new AbortController();
  const token = tokenService.getAccessToken();
  const url = `${env.API_BASE_URL}/reports/builder/ai/stream`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: ac.signal,
  })
    .then((response) =>
      consumeSseStream(
        response,
        ({ event, data }) => {
          const d = data as Record<string, unknown>;
          switch (event) {
            case 'token': callbacks.onToken(d.text as string); break;
            case 'result': callbacks.onResult(d as unknown as AiGenerateResponse); break;
            case 'plan': callbacks.onPlan?.(d.plan as string); break;
            case 'done': callbacks.onDone?.(); break;
            case 'error': callbacks.onError?.((d.message as string) || 'Stream error'); break;
          }
        },
        { onError: (msg) => callbacks.onError?.(msg) },
      ),
    )
    .catch((err) => {
      if (err.name !== 'AbortError') callbacks.onError?.(err.message || 'Stream failed');
    });

  return ac;
}

// ── Run / preview ──────────────────────────────────────────────────

export interface PreviewPayload {
  query: ReportQuery;
  parameters?: Record<string, unknown>;
  limit?: number;
}

export interface PreviewResult {
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  page: number;
  pageSize: number;
  durationMs: number;
}

export async function previewReport(payload: PreviewPayload): Promise<PreviewResult> {
  return unwrap(api.post<ApiEnvelope<PreviewResult>>(`${BASE}/preview`, payload));
}

export interface RunPayload {
  parameters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}

export async function runReport(id: string, payload: RunPayload = {}): Promise<ReportRunResponse> {
  return unwrap(api.post<ApiEnvelope<ReportRunResponse>>(`${BASE}/${id}/run`, payload));
}

// ── Export ─────────────────────────────────────────────────────────

/**
 * Trigger a browser download for an exported report.
 * Uses raw axios `responseType: blob` (no envelope), so it bypasses unwrap().
 */
export async function downloadReport(
  id: string,
  reportName: string,
  format: 'xlsx' | 'csv' | 'pdf' = 'xlsx',
  parameters?: Record<string, unknown>
): Promise<void> {
  const blob = await api.post<Blob>(`${BASE}/${id}/export`, { format, parameters }, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(blob as Blob);
  const a = document.createElement('a');
  const safeName = reportName.replace(/[^a-z0-9]+/gi, '_');
  a.href = url;
  a.download = `${safeName}_${Date.now()}.${format}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}
