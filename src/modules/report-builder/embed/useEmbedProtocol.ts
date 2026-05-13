/**
 * useEmbedProtocol — React hook that turns a public report page into a
 * postMessage-controlled iframe. Activated automatically when:
 *   • the page is rendered INSIDE an iframe (window !== window.parent)
 *   • OR the URL contains `?embed=1` (lets us test outside an iframe)
 *
 * What it does:
 *   • Posts `ready`, `data-loaded`, `error`, `height-change` events upward
 *   • Listens for `set-parameters`, `refresh`, `apply-cross-filter` commands
 *   • Tracks content height with ResizeObserver and emits height-change so
 *     the host can shrink-wrap the iframe (no internal scrollbars).
 */

import { useEffect, useRef, useState } from 'react';
import {
  EMBED_DISCRIMINATOR,
  EMBED_PROTOCOL_VERSION,
  isEmbedMessage,
  wrap,
  type EmbedInCommand,
  type EmbedOutEvent,
} from './embedProtocol';

export interface EmbedState {
  /** True when running inside a parent iframe context */
  isEmbedded: boolean;
  /** Parameters bound from postMessage commands */
  embedParameters: Record<string, unknown>;
  /** Cross-filter requested by the host */
  embedCrossFilter: { field: string; value: unknown } | null;
  /** Counter increments when host calls `refresh` */
  refreshTick: number;
  /** Emit an event upstream */
  emit: (event: EmbedOutEvent) => void;
  /** Ref to attach to the outermost element so height-change tracking works */
  containerRef: React.RefObject<HTMLElement | null>;
}

export function useEmbedProtocol(): EmbedState {
  const [embedParameters, setEmbedParameters] = useState<Record<string, unknown>>({});
  const [embedCrossFilter, setEmbedCrossFilter] = useState<EmbedState['embedCrossFilter']>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const isEmbedded = (() => {
    if (typeof window === 'undefined') return false;
    if (window !== window.parent) return true;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('embed') === '1';
    } catch { return false; }
  })();

  // Outbound emitter — no-op when not embedded
  const emit = (event: EmbedOutEvent): void => {
    if (typeof window === 'undefined' || !isEmbedded) return;
    try {
      window.parent.postMessage(wrap(event), '*');
    } catch {
      // postMessage to a cross-origin parent can fail — swallow silently
    }
  };

  // Inbound command listener
  useEffect(() => {
    if (!isEmbedded) return;
    function onMessage(e: MessageEvent) {
      if (!isEmbedMessage(e.data)) return;
      const cmd = e.data as EmbedInCommand & { [EMBED_DISCRIMINATOR]: number };
      switch (cmd.type) {
        case 'set-parameters':
          setEmbedParameters(cmd.parameters ?? {});
          setRefreshTick((t) => t + 1);
          break;
        case 'refresh':
          setRefreshTick((t) => t + 1);
          break;
        case 'apply-cross-filter':
          setEmbedCrossFilter({ field: cmd.field, value: cmd.value });
          break;
        case 'clear-cross-filter':
          setEmbedCrossFilter(null);
          break;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isEmbedded]);

  // Height tracking — emit height-change whenever the container resizes
  useEffect(() => {
    if (!isEmbedded || typeof window === 'undefined') return;
    const el = containerRef.current;
    if (!el) return;

    let lastHeight = 0;
    const post = (height: number) => {
      if (Math.abs(height - lastHeight) < 4) return; // debounce small jitter
      lastHeight = height;
      emit({ type: 'height-change', height });
    };

    // Initial measurement
    post(el.offsetHeight);

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => post(el.offsetHeight));
      ro.observe(el);
      return () => ro.disconnect();
    }
    // Fallback: poll every 500ms
    const handle = setInterval(() => post(el.offsetHeight), 500);
    return () => clearInterval(handle);
    // We deliberately don't list emit as a dep — its identity is stable enough
    // and including it would re-create the observer every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbedded]);

  // Mark protocol version once on mount so the host knows we speak it
  useEffect(() => {
    if (!isEmbedded) return;
    // Tiny advertising message — the host's SDK uses this to confirm the
    // child speaks the same protocol version.
    if (typeof window !== 'undefined') {
      window.parent.postMessage(
        { [EMBED_DISCRIMINATOR]: EMBED_PROTOCOL_VERSION, type: '__hello' },
        '*'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbedded]);

  return {
    isEmbedded,
    embedParameters,
    embedCrossFilter,
    refreshTick,
    emit,
    containerRef,
  };
}
