/**
 * Report Embed — postMessage protocol
 *
 * Wire format used between an embedded report (inside an iframe) and the
 * host page. ALL messages carry the `__erpEmbed: 1` discriminator so other
 * postMessage traffic on the page is ignored.
 *
 * Direction notation:
 *   IN-→  host page sends to iframe
 *   ←-OUT iframe sends to host page
 */

export const EMBED_PROTOCOL_VERSION = 1;
export const EMBED_DISCRIMINATOR = '__erpEmbed';

// ── Events emitted FROM the iframe (←-OUT) ───────────────────────

export type EmbedOutEvent =
  /** Iframe finished mounting and is ready to accept commands */
  | { type: 'ready'; reportName: string; visualization: string }
  /** Data fetch completed successfully */
  | { type: 'data-loaded'; rowCount: number; durationMs: number }
  /** Data fetch or validation failed */
  | { type: 'error'; message: string }
  /** Iframe content height changed — host SHOULD resize the iframe to match */
  | { type: 'height-change'; height: number }
  /** User clicked a table row (drill-down trigger) */
  | { type: 'row-click'; row: Record<string, unknown> }
  /** User clicked a chart segment (cross-filter trigger) */
  | { type: 'segment-click'; field: string; value: unknown };

// ── Commands sent TO the iframe (IN-→) ───────────────────────────

export type EmbedInCommand =
  /** Bind / re-bind runtime parameters and rerun the report */
  | { type: 'set-parameters'; parameters: Record<string, unknown> }
  /** Force a fresh data fetch without changing parameters */
  | { type: 'refresh' }
  /** Apply a transient cross-filter (added on top of the report's stored filters) */
  | { type: 'apply-cross-filter'; field: string; value: unknown }
  /** Clear any active cross-filter */
  | { type: 'clear-cross-filter' };

// ── Wire envelope ────────────────────────────────────────────────

interface EmbedEnvelopeBase {
  [EMBED_DISCRIMINATOR]: typeof EMBED_PROTOCOL_VERSION;
}

export type EmbedEnvelope =
  | (EmbedOutEvent & EmbedEnvelopeBase)
  | (EmbedInCommand & EmbedEnvelopeBase);

/** Wrap an outbound message with the discriminator and protocol version. */
export function wrap<T extends { type: string }>(msg: T): T & EmbedEnvelopeBase {
  return { ...msg, [EMBED_DISCRIMINATOR]: EMBED_PROTOCOL_VERSION };
}

/** Type guard — strips out unrelated postMessage traffic. */
export function isEmbedMessage(data: unknown): data is EmbedEnvelope {
  return (
    !!data
    && typeof data === 'object'
    && (data as Record<string, unknown>)[EMBED_DISCRIMINATOR] === EMBED_PROTOCOL_VERSION
    && typeof (data as Record<string, unknown>).type === 'string'
  );
}
