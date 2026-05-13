/**
 * ReportEmbedSdk — host-side helper to embed an STITCH ERP report inside any
 * web app via an iframe.
 *
 * Usage (vanilla):
 *
 *   import { ReportEmbedSdk } from '.../ReportEmbedSdk';
 *
 *   const embed = new ReportEmbedSdk({
 *     container: document.getElementById('report-host')!,
 *     baseUrl: 'https://erp.example.com',
 *     token: 'PUBLIC_SHARE_TOKEN',
 *     parameters: { from: '2026-01-01', to: '2026-12-31' },
 *     autoResize: true,
 *   });
 *
 *   embed.on('data-loaded', ({ rowCount }) => console.log('rows:', rowCount));
 *   embed.setParameters({ buyerId: '42' });
 *   embed.refresh();
 *   embed.destroy();
 *
 * The SDK speaks the protocol defined in `embedProtocol.ts`. It auto-resizes
 * the iframe to match content height (no inner scrollbars), forwards typed
 * events, and lets the host send commands at any time.
 */

import {
  EMBED_DISCRIMINATOR,
  EMBED_PROTOCOL_VERSION,
  isEmbedMessage,
  wrap,
  type EmbedInCommand,
  type EmbedOutEvent,
} from './embedProtocol';

export interface ReportEmbedOptions {
  /** Element that will host the iframe. Required. */
  container: HTMLElement;
  /** Origin where the ERP web client is served, e.g. https://erp.example.com */
  baseUrl: string;
  /** Public share token (from the shares drawer). */
  token: string;
  /** Initial parameters bound on first load. */
  parameters?: Record<string, unknown>;
  /** Auto-resize iframe based on `height-change` events. Default: true. */
  autoResize?: boolean;
  /** Initial iframe height before content reports its real size. Default: 480. */
  initialHeight?: number;
  /** Optional CSS class applied to the iframe. */
  className?: string;
  /** Optional aria-label for the iframe. */
  title?: string;
}

type Listener<E extends EmbedOutEvent['type']> = (
  payload: Extract<EmbedOutEvent, { type: E }>
) => void;

export class ReportEmbedSdk {
  private readonly opts: Required<Omit<ReportEmbedOptions, 'parameters' | 'className' | 'title'>>
    & Pick<ReportEmbedOptions, 'parameters' | 'className' | 'title'>;
  private readonly iframe: HTMLIFrameElement;
  private readonly listeners = new Map<EmbedOutEvent['type'], Set<Listener<EmbedOutEvent['type']>>>();
  private readonly originPattern: string;
  private childReady = false;
  private readonly pendingCommands: EmbedInCommand[] = [];
  private destroyed = false;

  constructor(options: ReportEmbedOptions) {
    if (!options.container) throw new Error('ReportEmbedSdk: `container` is required');
    if (!options.baseUrl) throw new Error('ReportEmbedSdk: `baseUrl` is required');
    if (!options.token) throw new Error('ReportEmbedSdk: `token` is required');

    this.opts = {
      container: options.container,
      baseUrl: options.baseUrl.replace(/\/+$/, ''),
      token: options.token,
      parameters: options.parameters,
      autoResize: options.autoResize ?? true,
      initialHeight: options.initialHeight ?? 480,
      className: options.className,
      title: options.title,
    };

    try {
      this.originPattern = new URL(this.opts.baseUrl).origin;
    } catch {
      throw new Error(`ReportEmbedSdk: invalid baseUrl "${options.baseUrl}"`);
    }

    this.iframe = this.createIframe();
    this.opts.container.appendChild(this.iframe);
    window.addEventListener('message', this.handleMessage);
  }

  // ── Public API ────────────────────────────────────────────────────

  /** Subscribe to a typed event. Returns an unsubscribe function. */
  on<E extends EmbedOutEvent['type']>(event: E, listener: Listener<E>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const widened = listener as unknown as Listener<EmbedOutEvent['type']>;
    set.add(widened);
    return () => set!.delete(widened);
  }

  /** Replace runtime parameters and re-run the report. */
  setParameters(parameters: Record<string, unknown>): void {
    this.send({ type: 'set-parameters', parameters });
  }

  /** Re-run the report without changing parameters. */
  refresh(): void {
    this.send({ type: 'refresh' });
  }

  /** Apply a transient cross-filter on top of the report's stored filters. */
  applyCrossFilter(field: string, value: unknown): void {
    this.send({ type: 'apply-cross-filter', field, value });
  }

  /** Clear any active cross-filter. */
  clearCrossFilter(): void {
    this.send({ type: 'clear-cross-filter' });
  }

  /** Tear down the iframe and remove all listeners. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener('message', this.handleMessage);
    this.listeners.clear();
    this.iframe.remove();
  }

  /** The underlying iframe element (read-only access for advanced styling). */
  getIframe(): HTMLIFrameElement {
    return this.iframe;
  }

  // ── Internals ─────────────────────────────────────────────────────

  private createIframe(): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    const params = new URLSearchParams({ embed: '1' });
    frame.src = `${this.opts.baseUrl}/reports/public/${encodeURIComponent(this.opts.token)}?${params.toString()}`;
    frame.style.width = '100%';
    frame.style.border = '0';
    frame.style.height = `${this.opts.initialHeight}px`;
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    if (this.opts.className) frame.className = this.opts.className;
    frame.title = this.opts.title ?? 'Embedded report';
    return frame;
  }

  private handleMessage = (e: MessageEvent): void => {
    if (this.destroyed) return;
    if (e.source !== this.iframe.contentWindow) return;
    // The browser reports the iframe's origin; tighten the trust check.
    if (e.origin !== this.originPattern) return;
    if (!isEmbedMessage(e.data)) return;

    const data = e.data as unknown as { type: string } & Record<string, unknown>;

    // The child sends `__hello` once it has mounted and is listening.
    if (data.type === '__hello') {
      this.childReady = true;
      // Push any queued initial parameters now that we know the child speaks the protocol
      if (this.opts.parameters) {
        this.send({ type: 'set-parameters', parameters: this.opts.parameters });
      }
      this.flushPending();
      return;
    }

    const evt = data as unknown as EmbedOutEvent;

    if (evt.type === 'height-change' && this.opts.autoResize) {
      const safe = Math.max(40, Math.floor(evt.height));
      this.iframe.style.height = `${safe}px`;
    }

    const set = this.listeners.get(evt.type);
    if (set) {
      for (const fn of set) {
        try { (fn as (p: EmbedOutEvent) => void)(evt); }
        catch (err) { console.error('[ReportEmbedSdk] listener threw:', err); }
      }
    }
  };

  private send(cmd: EmbedInCommand): void {
    if (!this.childReady) {
      this.pendingCommands.push(cmd);
      return;
    }
    this.postNow(cmd);
  }

  private flushPending(): void {
    while (this.pendingCommands.length > 0) {
      const cmd = this.pendingCommands.shift();
      if (cmd) this.postNow(cmd);
    }
  }

  private postNow(cmd: EmbedInCommand): void {
    const win = this.iframe.contentWindow;
    if (!win) return;
    try {
      win.postMessage(wrap(cmd), this.originPattern);
    } catch (err) {
      console.error('[ReportEmbedSdk] postMessage failed:', err);
    }
  }
}

/** Convenience factory matching the `new` ergonomics of the constructor. */
export function createReportEmbed(options: ReportEmbedOptions): ReportEmbedSdk {
  return new ReportEmbedSdk(options);
}

// Re-export protocol constants/types so consumers only import from this entry.
export {
  EMBED_DISCRIMINATOR,
  EMBED_PROTOCOL_VERSION,
  type EmbedInCommand,
  type EmbedOutEvent,
};
