/**
 * Form Bridge — Typed frontend client.
 *
 * Wraps the bridge HTTP/SSE API for use in browser-based AI form
 * generation flows. Intentionally minimal: no global state, no auth-
 * handling beyond passing a token. The caller (admin UI) supplies the
 * Bridge credential.
 *
 * Re-uses the project's existing `api` axios instance ONLY for admin
 * endpoints (which need the user JWT). The data-plane endpoints
 * (/ingest, /forms/:slug, /forms/:slug/events) MUST go through `fetch`
 * with the Bridge authorization header — they bypass user auth by
 * design.
 */

import { api } from '@/core/api';
import { env } from '@/core/config/env';

// ─── Bridge data-plane types ──────────────────────────────────

export interface BridgeChangeItem {
  kind:
    | 'field_added'
    | 'field_removed'
    | 'field_renamed'
    | 'field_type_changed'
    | 'field_required_changed'
    | 'section_added'
    | 'section_removed'
    | 'settings_changed';
  detail: string;
  fieldName?: string;
}

export interface IngestResult {
  formId: string;
  slug: string;
  version: number;
  status: 'draft' | 'published';
  etag: string;
  changes: BridgeChangeItem[];
  warnings: string[];
  durationMs: number;
}

export interface IngestRequestBody {
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
  sections: Array<{
    title?: string;
    description?: string;
    collapsible?: boolean;
    visibility?: unknown;
    fields: Array<Record<string, unknown>>;
  }>;
  meta?: { generator: string; generatorVersion?: string; sourceRef?: string; confidence?: number };
  target: {
    mode?: 'create' | 'update' | 'upsert';
    slug?: string;
    autoPublish?: boolean;
    expectedEtag?: string;
  };
}

export interface BridgeCredentials {
  /** Format "Bridge <keyId>:<secret>" exactly as returned at key creation */
  authorizationHeader: string;
  /** Secret half — needed to HMAC-sign request bodies */
  secret: string;
}

// ─── Body HMAC ────────────────────────────────────────────────

/**
 * Compute the SHA-256 HMAC of `body` using `secret` and return a
 * lowercase hex string. Uses Web Crypto so the secret never leaves the
 * browser memory; works in any modern browser without a third-party
 * crypto dependency.
 */
async function hmacSign(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// ─── Errors ──────────────────────────────────────────────────

export class BridgeApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = 'BridgeApiError';
  }
}

async function readError(res: Response): Promise<never> {
  let body: { code?: string; message?: string; detail?: unknown } = {};
  try { body = await res.json(); } catch { /* */ }
  throw new BridgeApiError(
    res.status,
    body.code ?? `HTTP_${res.status}`,
    body.message ?? res.statusText ?? 'Bridge error',
    body.detail,
  );
}

// ─── Resilient POST with retry ──────────────────────────────

interface PostOptions {
  /** Idempotency key — auto-generated if omitted */
  idempotencyKey?: string;
  /** Max retry attempts on transient errors (default 3) */
  retries?: number;
  /** Base backoff in ms (default 500) */
  backoffMs?: number;
  /** Caller-supplied AbortSignal */
  signal?: AbortSignal;
}

function isTransient(status: number): boolean {
  // 5xx + the bridge-specific "busy" code returned by the lock contention path
  return status === 423 || status === 503 || status === 504 || (status >= 500 && status < 600);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function newUuid(): string {
  // crypto.randomUUID is available in all evergreen browsers
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as unknown as { randomUUID: () => string }).randomUUID();
  }
  // Fallback (non-cryptographic) — only hit on very old browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function bridgePost<T>(
  path: string,
  body: unknown,
  creds: BridgeCredentials,
  opts: PostOptions = {},
): Promise<T> {
  const bodyStr = JSON.stringify(body);
  const sig = await hmacSign(bodyStr, creds.secret);
  const idempKey = opts.idempotencyKey ?? newUuid();
  const retries = opts.retries ?? 3;
  const base = opts.backoffMs ?? 500;
  const url = `${env.API_BASE_URL}/form-bridge${path}`;

  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': creds.authorizationHeader,
          'X-Bridge-Signature': sig,
          'Idempotency-Key': idempKey,
        },
        body: bodyStr,
        signal: opts.signal,
      });
      if (!res.ok) {
        if (isTransient(res.status) && attempt < retries) {
          await sleep(base * Math.pow(2, attempt) + Math.random() * base);
          attempt++;
          continue;
        }
        await readError(res);
      }
      const wrapped = (await res.json()) as { success: boolean; data?: T; message?: string };
      if (!wrapped.success) {
        throw new BridgeApiError(res.status, 'BRIDGE_FAILED', wrapped.message ?? 'Failed');
      }
      return wrapped.data as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof BridgeApiError && !isTransient(err.status)) throw err;
      if (attempt >= retries) throw err;
      await sleep(base * Math.pow(2, attempt) + Math.random() * base);
      attempt++;
    }
  }
  throw lastErr ?? new Error('bridgePost exhausted retries');
}

async function bridgeGet<T>(path: string, creds: BridgeCredentials, opts: { signal?: AbortSignal } = {}): Promise<T> {
  const url = `${env.API_BASE_URL}/form-bridge${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': creds.authorizationHeader },
    signal: opts.signal,
  });
  if (!res.ok) await readError(res);
  const wrapped = (await res.json()) as { success: boolean; data?: T };
  return wrapped.data as T;
}

// ─── Public API ──────────────────────────────────────────────

export async function bridgeIngest(
  body: IngestRequestBody,
  creds: BridgeCredentials,
  opts?: PostOptions,
): Promise<IngestResult> {
  return bridgePost<IngestResult>('/ingest', body, creds, opts);
}

export async function bridgeDryRun(
  body: IngestRequestBody,
  creds: BridgeCredentials,
  opts?: { signal?: AbortSignal },
): Promise<{ valid: boolean; changes: BridgeChangeItem[]; warnings: string[]; errors: string[] }> {
  // Dry-run is NOT idempotent in the persistence sense, but a fresh
  // Idempotency-Key prevents accidental double-execution under retries.
  const bodyStr = JSON.stringify(body);
  const sig = await hmacSign(bodyStr, creds.secret);
  const res = await fetch(`${env.API_BASE_URL}/form-bridge/ingest/dry-run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': creds.authorizationHeader,
      'X-Bridge-Signature': sig,
    },
    body: bodyStr,
    signal: opts?.signal,
  });
  if (!res.ok) await readError(res);
  const wrapped = (await res.json()) as { success: boolean; data: ReturnType<typeof bridgeDryRun> extends Promise<infer X> ? X : never };
  return wrapped.data;
}

export async function bridgeFetch(slug: string, creds: BridgeCredentials): Promise<{
  formId: string;
  slug: string;
  name: string;
  description: string;
  status: string;
  version: number;
  etag: string;
  layout: string | null;
  settings: Record<string, unknown>;
  sections: unknown[];
  updatedAt: string;
}> {
  return bridgeGet(`/forms/${encodeURIComponent(slug)}`, creds);
}

export async function bridgeRollback(slug: string, toVersion: number, creds: BridgeCredentials): Promise<{ version: number; etag: string }> {
  return bridgePost(`/forms/${encodeURIComponent(slug)}/rollback`, { toVersion }, creds);
}

// ─── Admin endpoints (use the user JWT via existing `api`) ────────

export interface BridgeKeyRow {
  id: number;
  key_id: string;
  name: string;
  company_id: number | null;
  is_active: boolean;
  rate_limit_per_min: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function listBridgeKeys(): Promise<BridgeKeyRow[]> {
  const r = await api.get<{ success: boolean; data: BridgeKeyRow[] }>('/form-bridge/admin/keys');
  return r.data;
}

export async function createBridgeKey(input: {
  name: string;
  companyId?: number | null;
  rateLimit?: number;
  expiresAt?: string | null;
}): Promise<{
  keyId: string;
  secret: string;
  authorizationHeader: string;
  name: string;
  companyId: number | null;
}> {
  const r = await api.post<{ success: boolean; data: {
    keyId: string; secret: string; authorizationHeader: string; name: string; companyId: number | null;
  } }>('/form-bridge/admin/keys', input);
  return r.data;
}

export async function revokeBridgeKey(keyId: string): Promise<void> {
  await api.delete(`/form-bridge/admin/keys/${encodeURIComponent(keyId)}`);
}
