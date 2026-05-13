/**
 * useFormBridgeStream — React hook that subscribes to a form's schema-
 * change events via the Bridge SSE endpoint.
 *
 * On `change`, fires the `onChange` callback. The page can then either
 * auto-refresh the form definition or show a banner asking the user to
 * reload (better UX for forms currently being filled out).
 *
 * Handles:
 *   - Auto-reconnect with exponential backoff on disconnect
 *   - Heartbeat-only frames (ignored)
 *   - AbortController cleanup on unmount
 *   - Page visibility (suspend when tab hidden, resume when visible)
 */

import { useEffect, useRef } from 'react';
import { env } from '@/core/config/env';

export interface SchemaChangeEvent {
  slug: string;
  formId: number;
  version: number;
  status: string;
  etag: string;
  kind: 'created' | 'updated' | 'published' | 'unpublished' | 'rolled_back';
  summary?: string[];
  occurredAt: string;
}

export interface UseFormBridgeStreamOptions {
  slug: string | undefined;
  /** Bridge auth header (Authorization-style) — required to subscribe */
  authorizationHeader: string | undefined;
  enabled?: boolean;
  onChange: (event: SchemaChangeEvent) => void;
  onError?: (err: unknown) => void;
}

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

export function useFormBridgeStream({
  slug,
  authorizationHeader,
  enabled = true,
  onChange,
  onError,
}: UseFormBridgeStreamOptions): void {
  // Refs to keep latest values without re-running the effect.
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  onChangeRef.current = onChange;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || !slug || !authorizationHeader) return;

    const ac = new AbortController();
    let attempt = 0;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const url = `${env.API_BASE_URL}/form-bridge/forms/${encodeURIComponent(slug)}/events`;

    const connect = async () => {
      if (stopped) return;
      try {
        // Fetch with `Authorization` header (EventSource doesn't allow custom
        // headers; we hand-roll the SSE reader on top of fetch streaming).
        const res = await fetch(url, {
          headers: { Authorization: authorizationHeader },
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`Bridge SSE: HTTP ${res.status}`);
        }
        attempt = 0; // reset backoff on a successful connection

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Parse SSE frames as they arrive
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            if (!part || part.startsWith(':')) continue;  // heartbeat
            let event = 'message';
            let dataStr = '';
            for (const line of part.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (event === 'schema_change' && dataStr) {
              try {
                const parsed = JSON.parse(dataStr) as SchemaChangeEvent;
                onChangeRef.current(parsed);
              } catch { /* malformed frame — skip */ }
            }
            // We ignore the 'ready' event — it's informational
          }
        }
      } catch (err) {
        if (stopped) return;
        onErrorRef.current?.(err);
        // Exponential backoff with jitter, capped at 30 s
        const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * Math.pow(2, attempt));
        const jitter = Math.random() * RECONNECT_BASE_MS;
        attempt++;
        reconnectTimer = setTimeout(connect, delay + jitter);
      }
    };

    // Suspend when the page is hidden — saves bandwidth and avoids
    // unbounded reconnect cycles when the browser is asleep.
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        stopped = true;
        ac.abort();
        if (reconnectTimer) clearTimeout(reconnectTimer);
      } else {
        if (stopped) {
          stopped = false;
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);

    connect();

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVis);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ac.abort();
    };
  }, [enabled, slug, authorizationHeader]);
}
