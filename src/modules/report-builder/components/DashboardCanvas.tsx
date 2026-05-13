/**
 * DashboardCanvas — Multi-widget grid for `type: 'dashboard'` reports.
 *
 * Layout: a 12-column grid where each widget occupies a rectangle (gridX, gridY,
 * gridW, gridH). Each widget fetches its own data and renders the appropriate
 * visualization (table / chart / KPI / markdown).
 *
 * Widgets can be added, edited (data source / viz / title), removed, and
 * resized/repositioned. Persisted to backend via the widget API.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchWidgets,
  createWidget as apiCreateWidget,
  updateWidget as apiUpdateWidget,
  deleteWidget as apiDeleteWidget,
  reorderWidgets as apiReorderWidgets,
  runWidget,
} from '../api/reportBuilderApi';
import type {
  Widget,
  WidgetRunResult,
  CreateWidgetPayload,
} from '../types';
import { TableWidget } from './TableWidget';
import { ChartWidget } from './visualizations/ChartWidget';
import { KpiWidget } from './visualizations/KpiWidget';
import { PivotWidget } from './visualizations/PivotWidget';
import { HeatmapWidget } from './visualizations/HeatmapWidget';
import { GeographicMapWidget } from './visualizations/GeographicMapWidget';
import { ScatterWidget } from './visualizations/ScatterWidget';
import { WidgetEditorModal } from './WidgetEditorModal';

const GRID_COLUMNS = 12;
const ROW_HEIGHT_PX = 80;

export interface DashboardCanvasProps {
  reportId: string;
}

const REFRESH_PRESETS: Array<{ label: string; seconds: number }> = [
  { label: 'Off',  seconds: 0 },
  { label: '30s',  seconds: 30 },
  { label: '1m',   seconds: 60 },
  { label: '5m',   seconds: 300 },
  { label: '15m',  seconds: 900 },
];

/**
 * Cross-filter — a transient filter that the user activates by clicking a
 * chart segment. Threaded into every peer widget's runWidget call as
 * `overrideFilters`. Cleared by clicking the same segment again or the pill.
 */
export interface CrossFilter {
  field: string;
  value: unknown;
  /** Display value (formatted for the pill UI) */
  label: string;
  /** ID of the widget that published this filter — that widget skips applying it. */
  publisherId: string;
}

export function DashboardCanvas({ reportId }: DashboardCanvasProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWidget, setEditingWidget] = useState<Widget | 'new' | null>(null);
  /** A counter that increments each tick — widgets read it to re-fetch their data. */
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshSeconds, setRefreshSeconds] = useState<number>(0);
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);

  // Auto-refresh: bump the tick counter every N seconds. Children that depend
  // on `refreshTick` in their effect deps re-run their data fetch.
  useEffect(() => {
    if (refreshSeconds <= 0) return;
    const handle = setInterval(() => setRefreshTick((t) => t + 1), refreshSeconds * 1000);
    return () => clearInterval(handle);
  }, [refreshSeconds]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWidgets(reportId)
      .then((rows) => { if (!cancelled) setWidgets(rows); })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load widgets'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reportId]);

  const reload = useCallback(async () => {
    try {
      const rows = await fetchWidgets(reportId);
      setWidgets(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reload widgets');
    }
  }, [reportId]);

  async function handleSaveWidget(payload: CreateWidgetPayload, existingId?: string) {
    try {
      if (existingId) {
        await apiUpdateWidget(reportId, existingId, payload);
        toast.success('Widget updated');
      } else {
        await apiCreateWidget(reportId, {
          ...payload,
          // Place new widget below the lowest existing one
          gridX: payload.gridX ?? 0,
          gridY: payload.gridY ?? findNextRow(widgets),
          gridW: payload.gridW ?? 6,
          gridH: payload.gridH ?? 4,
        });
        toast.success('Widget added');
      }
      setEditingWidget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function handleDelete(widget: Widget) {
    if (!confirm(`Delete widget "${widget.title || widget.widgetType}"?`)) return;
    try {
      await apiDeleteWidget(reportId, widget.id);
      toast.success('Widget deleted');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleResize(widget: Widget, newSize: { gridW: number; gridH: number }) {
    try {
      await apiReorderWidgets(reportId, [{
        id: Number(widget.id),
        gridX: widget.gridX,
        gridY: widget.gridY,
        gridW: newSize.gridW,
        gridH: newSize.gridH,
      }]);
      // Optimistic update
      setWidgets((ws) => ws.map((w) => w.id === widget.id ? { ...w, ...newSize } : w));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resize failed');
      void reload();
    }
  }

  /**
   * Called by ChartWidget inside any widget cell when the user clicks a
   * bar / pie / line segment. Toggles: same selection clears; different
   * selection replaces.
   */
  function handlePublishCrossFilter(publisherId: string, field: string, value: unknown) {
    setCrossFilter((prev) => {
      // Toggle off if clicking the same segment again
      if (prev && prev.field === field && JSON.stringify(prev.value) === JSON.stringify(value)) {
        return null;
      }
      return {
        field,
        value,
        label: value === null || value === undefined ? '—' : String(value),
        publisherId,
      };
    });
  }

  async function handleMove(widget: Widget, newPos: { gridX: number; gridY: number }) {
    // Skip if no actual change
    if (widget.gridX === newPos.gridX && widget.gridY === newPos.gridY) return;
    try {
      await apiReorderWidgets(reportId, [{
        id: Number(widget.id),
        gridX: newPos.gridX,
        gridY: newPos.gridY,
        gridW: widget.gridW,
        gridH: widget.gridH,
      }]);
      setWidgets((ws) => ws.map((w) => w.id === widget.id ? { ...w, ...newPos } : w));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Move failed');
      void reload();
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Loading dashboard…
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Empty dashboard
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Add widgets — each widget is its own chart, table, or KPI.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingWidget('new')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add your first widget
        </button>
        {editingWidget && (
          <WidgetEditorModal
            widget={editingWidget === 'new' ? null : editingWidget}
            onClose={() => setEditingWidget(null)}
            onSave={(payload) => handleSaveWidget(payload, editingWidget === 'new' ? undefined : editingWidget.id)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {widgets.length} widget{widgets.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
            <span>Auto-refresh:</span>
            <select
              aria-label="Auto-refresh interval"
              value={refreshSeconds}
              onChange={(e) => setRefreshSeconds(Number(e.target.value))}
              className="rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
            >
              {REFRESH_PRESETS.map((p) => (
                <option key={p.seconds} value={p.seconds}>{p.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            title="Refresh now"
            className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            ⟳
          </button>
          <button
            type="button"
            onClick={() => setEditingWidget('new')}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Add Widget
          </button>
        </div>
      </div>

      {crossFilter && (
        <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800 dark:bg-blue-950">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
            Cross-filter active:
          </span>
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">
            {humanizeField(crossFilter.field)} = {crossFilter.label}
          </span>
          <button
            type="button"
            onClick={() => setCrossFilter(null)}
            className="rounded px-1.5 py-0.5 text-[11px] text-blue-700 hover:bg-blue-100 hover:underline dark:text-blue-300 dark:hover:bg-blue-900"
          >
            Clear
          </button>
          <span className="ml-2 text-[10px] text-blue-700 dark:text-blue-300">
            Click any chart segment to apply a filter, or click the same segment again to clear.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        <DashboardGrid
          widgets={widgets}
          refreshTick={refreshTick}
          crossFilter={crossFilter}
          onEdit={(w) => setEditingWidget(w)}
          onDelete={handleDelete}
          onResize={handleResize}
          onMove={handleMove}
          onPublishCrossFilter={handlePublishCrossFilter}
        />
      </div>

      {editingWidget && (
        <WidgetEditorModal
          widget={editingWidget === 'new' ? null : editingWidget}
          onClose={() => setEditingWidget(null)}
          onSave={(payload) => handleSaveWidget(payload, editingWidget === 'new' ? undefined : editingWidget.id)}
        />
      )}
    </div>
  );
}

// ── Grid layout ───────────────────────────────────────────────────

function DashboardGrid({
  widgets, refreshTick, crossFilter, onEdit, onDelete, onResize, onMove, onPublishCrossFilter,
}: {
  widgets: Widget[];
  refreshTick: number;
  crossFilter: CrossFilter | null;
  onEdit: (w: Widget) => void;
  onDelete: (w: Widget) => void;
  onResize: (w: Widget, size: { gridW: number; gridH: number }) => void;
  onMove: (w: Widget, pos: { gridX: number; gridY: number }) => void;
  onPublishCrossFilter: (publisherId: string, field: string, value: unknown) => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Tallest row used → grid container height
  const totalRows = useMemo(() => {
    let max = 0;
    for (const w of widgets) {
      max = Math.max(max, w.gridY + w.gridH);
    }
    return Math.max(max, 6); // minimum visual height
  }, [widgets]);

  /** Convert a viewport mouse position into (gridX, gridY) coordinates. */
  function pixelToGrid(clientX: number, clientY: number): { gridX: number; gridY: number } {
    const el = gridRef.current;
    if (!el) return { gridX: 0, gridY: 0 };
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const colWidth = rect.width / GRID_COLUMNS;
    const rowHeight = ROW_HEIGHT_PX + 12; // include gap
    return {
      gridX: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(x / colWidth))),
      gridY: Math.max(0, Math.floor(y / rowHeight)),
    };
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const widgetId = e.dataTransfer.getData('text/widget-id');
    if (!widgetId) return;
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    const pos = pixelToGrid(e.clientX, e.clientY);
    // Clamp so the widget stays within the grid horizontally
    const gridX = Math.max(0, Math.min(GRID_COLUMNS - widget.gridW, pos.gridX));
    onMove(widget, { gridX, gridY: pos.gridY });
  }

  return (
    <div
      ref={gridRef}
      className="relative grid gap-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      style={{
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_HEIGHT_PX}px`,
        minHeight: `${totalRows * (ROW_HEIGHT_PX + 12)}px`,
      }}
    >
      {widgets.map((w) => (
        <WidgetCell
          key={w.id}
          widget={w}
          refreshTick={refreshTick}
          crossFilter={crossFilter}
          onEdit={() => onEdit(w)}
          onDelete={() => onDelete(w)}
          onResize={(size) => onResize(w, size)}
          onPublishCrossFilter={(field, value) => onPublishCrossFilter(w.id, field, value)}
        />
      ))}
    </div>
  );
}

function WidgetCell({
  widget, refreshTick, crossFilter, onEdit, onDelete, onResize, onPublishCrossFilter,
}: {
  widget: Widget;
  refreshTick: number;
  crossFilter: CrossFilter | null;
  onEdit: () => void;
  onDelete: () => void;
  onResize: (size: { gridW: number; gridH: number }) => void;
  onPublishCrossFilter: (field: string, value: unknown) => void;
}) {
  function handleDragStart(e: React.DragEvent<HTMLElement>) {
    e.dataTransfer.setData('text/widget-id', widget.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      style={{
        gridColumn: `${widget.gridX + 1} / span ${widget.gridW}`,
        gridRow: `${widget.gridY + 1} / span ${widget.gridH}`,
      }}
    >
      <header
        draggable
        onDragStart={handleDragStart}
        title="Drag to reposition"
        className="flex cursor-move items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
          <span className="text-gray-400 transition group-hover:text-gray-600" aria-hidden>⋮⋮</span>
          {widget.title || `${widget.widgetType[0].toUpperCase()}${widget.widgetType.slice(1)} widget`}
        </h3>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <ResizeButton onResize={onResize} widget={widget} />
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            title="Edit widget"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-0.5 text-xs text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
            title="Delete widget"
          >
            ✕
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-2">
        <WidgetContent
          widget={widget}
          refreshTick={refreshTick}
          crossFilter={crossFilter}
          onPublishCrossFilter={onPublishCrossFilter}
        />
      </div>
    </div>
  );
}

function ResizeButton({
  widget, onResize,
}: {
  widget: Widget;
  onResize: (size: { gridW: number; gridH: number }) => void;
}) {
  const sizes = [
    { label: '½', w: 6, h: widget.gridH },
    { label: 'full', w: 12, h: widget.gridH },
    { label: 'tall', w: widget.gridW, h: 8 },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded p-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        title="Resize widget"
      >
        ⤢
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 flex gap-0.5 rounded-md border border-gray-200 bg-white p-1 shadow-md dark:border-gray-700 dark:bg-gray-900">
          {sizes.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => { onResize({ gridW: s.w, gridH: s.h }); setOpen(false); }}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-blue-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-950 dark:hover:text-blue-300"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Widget content (per-widget data fetch + render) ─────────────────

function WidgetContent({
  widget, refreshTick, crossFilter, onPublishCrossFilter,
}: {
  widget: Widget;
  refreshTick: number;
  crossFilter: CrossFilter | null;
  onPublishCrossFilter: (field: string, value: unknown) => void;
}) {
  const [result, setResult] = useState<WidgetRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The widget that PUBLISHED the cross-filter doesn't apply it to itself —
  // the user clicked one of its segments; filtering the publisher would be
  // disorienting (the clicked segment would shrink to be the only data).
  const isPublisher = crossFilter?.publisherId === widget.id;
  const applyOverride =
    crossFilter && !isPublisher && widget.query
      // Only apply if the cross-filter's field exists on this widget's source
      && fieldExistsOnQuery(widget.query, crossFilter.field);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const overrideFilters = applyOverride
      ? [{ field: crossFilter!.field, operator: 'eq' as const, value: crossFilter!.value }]
      : undefined;
    runWidget(widget.reportId, widget.id, { pageSize: 100, overrideFilters })
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load widget');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // refreshTick triggers a re-fetch on auto-refresh / manual refresh
    // applyOverride / crossFilter trigger a re-fetch when cross-filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id, widget.reportId, widget.widgetType, refreshTick,
      applyOverride, crossFilter?.field, JSON.stringify(crossFilter?.value)]);

  if (widget.widgetType === 'markdown') {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
        {widget.markdown || <span className="italic text-gray-400">Empty markdown widget. Edit to add content.</span>}
      </div>
    );
  }

  if (loading) return <p className="text-xs text-gray-500">Loading…</p>;
  if (error) return <p className="text-xs text-red-600">⚠ {error}</p>;
  if (!result) return <p className="text-xs text-gray-500">No data</p>;
  if (!widget.query) {
    return <p className="text-xs italic text-gray-500">Click ✎ to configure this widget.</p>;
  }

  switch (widget.widgetType) {
    case 'table':
      return (
        <TableWidget
          columns={widget.query.columns}
          rows={result.rows}
          showRowNumbers={false}
          striped
        />
      );
    case 'kpi':
      return (
        <KpiWidget
          columns={widget.query.columns}
          rows={result.rows}
          priorRows={result.priorRows}
          vizConfig={widget.vizConfig}
        />
      );
    case 'pivot':
      return (
        <PivotWidget
          columns={widget.query.columns}
          rows={result.rows}
          groupBy={widget.query.groupBy}
        />
      );
    case 'heatmap':
      return (
        <HeatmapWidget
          columns={widget.query.columns}
          rows={result.rows}
          groupBy={widget.query.groupBy}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * ROW_HEIGHT_PX - 80)}
        />
      );
    case 'geo':
      return (
        <GeographicMapWidget
          columns={widget.query.columns}
          rows={result.rows}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * ROW_HEIGHT_PX - 80)}
        />
      );
    case 'scatter':
    case 'bubble':
      return (
        <ScatterWidget
          variant={widget.widgetType}
          columns={widget.query.columns}
          rows={result.rows}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * ROW_HEIGHT_PX - 80)}
        />
      );
    case 'bar':
    case 'line':
    case 'area':
    case 'pie':
    case 'donut':
      return (
        <ChartWidget
          visualization={widget.widgetType}
          columns={widget.query.columns}
          rows={result.rows}
          priorRows={result.priorRows}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * ROW_HEIGHT_PX - 80)}
          onSegmentClick={(sel) => onPublishCrossFilter(sel.field, sel.value)}
        />
      );
    default:
      return <p className="text-xs italic text-gray-500">Unsupported widget type: {widget.widgetType}</p>;
  }
}

// ── Helpers ──

/**
 * True iff `field` (e.g. "status" or "buyer.name") appears as a column on the
 * widget's query — used by cross-filter to decide whether a peer widget can
 * apply the filter without crashing the engine.
 */
function fieldExistsOnQuery(query: { columns: Array<{ field: string }> }, field: string): boolean {
  return query.columns.some((c) => c.field === field);
}

/** "buyer.name" → "Buyer Name" for the cross-filter pill. */
function humanizeField(field: string): string {
  return field
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function findNextRow(widgets: Widget[]): number {
  let max = 0;
  for (const w of widgets) max = Math.max(max, w.gridY + w.gridH);
  return max;
}
