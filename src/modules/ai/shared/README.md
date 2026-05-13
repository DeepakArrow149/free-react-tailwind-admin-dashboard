# AI — shared primitives

Cross-domain AI infrastructure. Each consumer (form-builder, report-builder,
future modules) owns its own drawer + store, but pulls these primitives in
to avoid re-implementing the same pieces.

## What lives here

- **`RateLimitBar.tsx`** — Thin colored progress bar with red/amber/blue
  thresholds and a reset-time chip. Renders nothing when its `rateLimit`
  prop is `null`. Consumed by both AI drawers.
- **`MessageActions.tsx`** — Hover-revealed Copy + (optional) Regenerate
  row that sits beneath an assistant chat bubble. Clipboard logic and
  "Copied!" feedback timing live here. Caller wraps in an element with
  the `group` class so hover state propagates.
- **`InspectorPopover.tsx`** — A pill-trigger + popover wrapper used by
  per-domain "what context is being sent to the AI" inspectors. Owns the
  click-outside / Escape / chevron-rotation / aria-expanded plumbing.
  Caller passes the pill label (icon + summary text) and the popover
  body content.

## What's intentionally NOT shared

- **Chat store** — Each domain has its own (`aiChatStore` for forms,
  `aiReportChatStore` for reports). Their action sets, result shapes,
  and apply handlers have diverged enough that a generic store would
  be props-bloat. Extract again only if a third consumer arrives with
  near-identical needs.
- **Drawer skeleton** — Same reason. The header, plan card, result card,
  and empty-state copy are domain-specific. A "shell" component would
  need a dozen slot props.
- **Diff utilities** — `FormDiffSummary` and `ReportDiff` describe
  different shapes; a generic diff abstraction would have no real
  invariants. Keep them per-domain.

## Other shared bits (not in this folder)

- **`@/core/api/sse.ts`** — `consumeSseStream()` parses SSE frames from a
  fetch response and dispatches each `{ event, data }` to a handler.
  Both `streamChatMessage` (forms) and `streamReportAi` (reports) use it.
- **AI rate-limit endpoint** — Lives at `/ai/rate-limit` and is per-user
  (not per-domain). The report-builder store imports `fetchRateLimit`
  from the form-builder's `aiApi.ts` rather than duplicate the call.

## Adding a new AI consumer

1. Define its `<domain>ChatStore.ts` with the actions it needs.
2. Use `consumeSseStream` for any streaming endpoint it talks to.
3. Render `<RateLimitBar>` in its drawer header.
4. Borrow shapes from the existing chat stores — `messages`,
   `isStreaming`, `streamingText`, `currentAction`, `error`,
   `pendingResult` are the standard vocabulary.
