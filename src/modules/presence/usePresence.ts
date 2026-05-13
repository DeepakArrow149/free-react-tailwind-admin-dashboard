/**
 * usePresence — subscribe to a presence room for a given resource.
 *
 * Phase 1 of multiplayer editing: tells the UI who else is currently
 * editing the same form/report. Foundation for a CRDT layer later.
 *
 * Wire protocol (matches modules/presence/presence.routes.ts):
 *   - GET  /presence/:scope/:id/stream  (SSE; emits `session` then `presence`)
 *   - POST /presence/:scope/:id/heartbeat
 *   - POST /presence/:scope/:id/leave
 */

import { useEffect, useState } from 'react';
import { tokenService } from '@/core/services/tokenService';
import { env } from '@/core/config/env';
import { useAuthStore } from '@/store/authStore';

export interface PresenceMember {
  sessionId: string;
  userId: number;
  userName: string;
  email?: string;
  joinedAt: string;
  selection?: Record<string, unknown>;
}

export type PresenceScope = 'form' | 'report';

interface UsePresenceResult {
  /** Everyone in the room, INCLUDING the current user. UI typically filters self out. */
  members: PresenceMember[];
  /** Other members (room minus current user). Convenience for the avatar stack. */
  others: PresenceMember[];
  /** This tab's session id once the SSE handshake completes. */
  sessionId: string | null;
}

const HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * Join a presence room for `${scope}:${id}`. Joining is per-tab — opening
 * the same form in two tabs creates two sessions for the same user.
 *
 * Pass a falsy `id` (empty string / undefined) to disable; the hook will
 * tear down any open connection and return an empty list.
 */
export function usePresence(scope: PresenceScope, id: string | undefined): UsePresenceResult {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!id) {
      setMembers([]);
      setSessionId(null);
      return;
    }
    const token = tokenService.getAccessToken();
    if (!token) return;

    // EventSource can't set custom headers — auth flows via ?token=.
    const url = `${env.API_BASE_URL}/presence/${scope}/${encodeURIComponent(id)}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    let mySessionId: string | null = null;
    let heartbeatTimer: number | null = null;

    const ping = async () => {
      if (!mySessionId) return;
      try {
        await fetch(`${env.API_BASE_URL}/presence/${scope}/${encodeURIComponent(id)}/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId: mySessionId }),
          keepalive: true,
        });
      } catch {
        // Best-effort — the next ping will pick it up.
      }
    };

    es.addEventListener('session', (ev) => {
      try {
        const { sessionId: sid } = JSON.parse((ev as MessageEvent).data);
        mySessionId = sid;
        setSessionId(sid);
        // Begin heartbeat cadence once we have a session id.
        heartbeatTimer = window.setInterval(() => void ping(), HEARTBEAT_INTERVAL_MS);
      } catch { /* malformed */ }
    });

    es.addEventListener('presence', (ev) => {
      try {
        const { members: m } = JSON.parse((ev as MessageEvent).data) as { members: PresenceMember[] };
        setMembers(m);
      } catch { /* malformed */ }
    });

    es.onerror = () => {
      // The server keepalive normally prevents disconnect. If we land here
      // it's usually network blip or backend restart — EventSource will
      // auto-reconnect on its own, but the prior server-side session is
      // already evicted by TTL, so we'll get a fresh session id on reconnect.
      // No-op: rely on auto-reconnect.
    };

    return () => {
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);

      // Best-effort explicit leave so others see us disappear immediately
      // rather than after the TTL expires.
      if (mySessionId) {
        const body = JSON.stringify({ sessionId: mySessionId });
        const leaveUrl = `${env.API_BASE_URL}/presence/${scope}/${encodeURIComponent(id)}/leave`;
        // sendBeacon doesn't carry auth headers; fall back to fetch+keepalive.
        try {
          fetch(leaveUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body,
            keepalive: true,
          }).catch(() => { /* swallow */ });
        } catch { /* swallow */ }
      }

      es.close();
      setMembers([]);
      setSessionId(null);
    };
  }, [scope, id]);

  // The auth store types `user.id` as `string | number`; the server sends a
  // numeric `userId`. Coerce to compare safely.
  const myUserIdNum = currentUserId != null ? Number(currentUserId) : null;
  const others = myUserIdNum != null
    ? members.filter((m) => m.userId !== myUserIdNum)
    : members;

  return { members, others, sessionId };
}
