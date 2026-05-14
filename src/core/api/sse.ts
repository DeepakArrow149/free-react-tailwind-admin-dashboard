/**
 * Server-Sent Events consumer over fetch streams.
 *
 * Reads a Response body, parses SSE frames (event: + data:), and dispatches
 * each frame to the caller's handler. The handler decides what to do with
 * each event type — this utility doesn't bake in any domain knowledge.
 *
 * Returns when the stream closes naturally or the underlying AbortSignal
 * fires. Malformed frames are silently skipped (a single bad chunk
 * shouldn't tear down the whole stream).
 */

export interface SseEvent {
  /** Event name from `event: <name>` line; defaults to "message". */
  event: string;
  /** Parsed JSON from `data: <json>` line. */
  data: unknown;
}

export interface ConsumeSseOptions {
  /** Called once if the response isn't ok or stream fails to read. */
  onError?: (message: string) => void;
}

/**
 * Consume an SSE response stream. The caller is responsible for issuing
 * the `fetch` (so they can supply method/headers/body/signal); this util
 * only handles parsing and dispatch.
 */
export async function consumeSseStream(
  response: Response,
  onEvent: (event: SseEvent) => void,
  options: ConsumeSseOptions = {},
): Promise<void> {
  if (!response.ok) {
    const text = await response.text().catch(() => 'Network error');
    options.onError?.(text);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    options.onError?.('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line; pop the trailing incomplete
    // chunk back into the buffer for the next iteration.
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      if (!part.trim()) continue;
      let eventType = 'message';
      let dataStr = '';
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7);
        else if (line.startsWith('data: ')) dataStr = line.slice(6);
      }
      if (!dataStr) continue;
      try {
        const data = JSON.parse(dataStr);
        onEvent({ event: eventType, data });
      } catch {
        // Malformed frame — skip and keep streaming.
      }
    }
  }
}
