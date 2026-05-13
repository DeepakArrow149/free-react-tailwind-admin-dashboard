/**
 * WidgetEditorModal — configure a single dashboard widget.
 *
 * Two-step layout:
 *   1. Widget type (KPI / Bar / Line / Pie / Table / Markdown)
 *   2. Data source + columns (skipped for markdown widgets)
 *
 * Live preview at the bottom mirrors what the widget will look like on the
 * dashboard. Save commits to the backend via the parent's onSave.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchDataSources,
  fetchDataSource,
  previewReport,
} from '../api/reportBuilderApi';
import type {
  Widget,
  WidgetType,
  CreateWidgetPayload,
  CatalogSourceSummary,
  CatalogSourceDetail,
  ReportColumn,
  AggregationFn,
} from '../types';
import { TableWidget } from './TableWidget';
import { ChartWidget } from './visualizations/ChartWidget';
import { KpiWidget } from './visualizations/KpiWidget';
import { PivotWidget } from './visualizations/PivotWidget';
import { HeatmapWidget } from './visualizations/HeatmapWidget';
import { GeographicMapWidget } from './visualizations/GeographicMapWidget';
import { ScatterWidget } from './visualizations/ScatterWidget';

const WIDGET_TYPES: Array<{ id: WidgetType; label: string; icon: string; description: string }> = [
  { id: 'kpi',   label: 'KPI',      icon: '#', description: 'Single big-number metric' },
  { id: 'table', label: 'Table',    icon: '⊞', description: 'Tabular grid' },
  { id: 'bar',   label: 'Bar',      icon: '▥', description: 'Compare values across categories' },
  { id: 'line',  label: 'Line',     icon: '╱', description: 'Trends over time' },
  { id: 'area',  label: 'Area',     icon: '◢', description: 'Trend with filled area' },
  { id: 'pie',   label: 'Pie',      icon: '◐', description: 'Proportional breakdown' },
  { id: 'donut', label: 'Donut',    icon: '◯', description: 'Donut chart' },
  { id: 'pivot', label: 'Pivot',    icon: '⊟', description: '2-D matrix: rows × columns × measure' },
  { id: 'heatmap', label: 'Heatmap',  icon: '▦', description: 'Cell-intensity matrix (2 dims × measure)' },
  { id: 'geo',     label: 'Geo Map',  icon: '🌍', description: 'World bubble map (country code × measure)' },
  { id: 'scatter', label: 'Scatter',  icon: '⋯', description: 'Correlation between two measures (X, Y)' },
  { id: 'bubble',  label: 'Bubble',   icon: '◉', description: 'Scatter + a 3rd measure for size' },
  { id: 'markdown', label: 'Markdown', icon: '¶', description: 'Static text/notes' },
];

export interface WidgetEditorModalProps {
  /** null = create mode, Widget = edit mode */
  widget: Widget | null;
  onClose: () => void;
  onSave: (payload: CreateWidgetPayload) => void | Promise<void>;
}

export function WidgetEditorModal({ widget, onClose, onSave }: WidgetEditorModalProps) {
  const [widgetType, setWidgetType] = useState<WidgetType>(widget?.widgetType ?? 'kpi');
  const [title, setTitle] = useState(widget?.title ?? '');
  const [markdown, setMarkdown] = useState(widget?.markdown ?? '');
  const [rootSource, setRootSource] = useState(widget?.query?.rootSource ?? '');
  const [columns, setColumns] = useState<ReportColumn[]>(widget?.query?.columns ?? []);

  const [catalog, setCatalog] = useState<CatalogSourceSummary[]>([]);
  const [sourceDetail, setSourceDetail] = useState<CatalogSourceDetail | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, unknown>>>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Load catalog
  useEffect(() => {
    fetchDataSources().then(setCatalog).catch(() => undefined);
  }, []);

  // Load source detail when rootSource changes
  useEffect(() => {
    if (!rootSource) { setSourceDetail(null); return; }
    let cancelled = false;
    fetchDataSource(rootSource).then((d) => { if (!cancelled) setSourceDetail(d); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [rootSource]);

  // Preview when query is complete enough
  const canPreview = widgetType !== 'markdown' && rootSource && columns.length > 0;
  const querySig = useMemo(
    () => JSON.stringify({ rootSource, columns }),
    [rootSource, columns]
  );

  useEffect(() => {
    if (!canPreview) {
      setPreviewRows([]);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    setPreviewError(null);
    const handle = setTimeout(async () => {
      try {
        const r = await previewReport({
          query: { rootSource, columns },
          limit: 50,
        });
        if (!cancelled) setPreviewRows(r.rows);
      } catch (err) {
        if (!cancelled) setPreviewError(err instanceof Error ? err.message : 'Preview failed');
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySig, canPreview]);

  function handleSave() {
    if (widgetType !== 'markdown') {
      if (!rootSource) { toast.error('Pick a data source'); return; }
      if (columns.length === 0) { toast.error('Add at least one column'); return; }
    }
    void onSave({
      widgetType,
      title: title.trim(),
      markdown: widgetType === 'markdown' ? markdown : undefined,
      query: widgetType === 'markdown' ? undefined : { rootSource, columns },
      vizConfig: widget?.vizConfig,
      gridX: widget?.gridX,
      gridY: widget?.gridY,
      gridW: widget?.gridW,
      gridH: widget?.gridH,
      sortOrder: widget?.sortOrder,
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto flex max-h-[90vh] w-215 max-w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {widget ? 'Edit Widget' : 'Add Widget'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              aria-label="Close"
            >✕</button>
          </header>

          <div className="grid grid-cols-2 gap-4 overflow-y-auto p-4">
            {/* ── Left column: configuration ── */}
            <div className="space-y-3">
              <Field label="Widget type">
                <div className="grid grid-cols-2 gap-1.5">
                  {WIDGET_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setWidgetType(t.id)}
                      className={`flex items-start gap-2 rounded-md border p-2 text-left text-xs transition ${
                        widgetType === t.id
                          ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950'
                      }`}
                    >
                      <span className="text-base leading-none">{t.icon}</span>
                      <div className="min-w-0">
                        <div className="font-semibold">{t.label}</div>
                        <div className="truncate text-[10px] text-gray-500">{t.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Widget title (optional)"
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </Field>

              {widgetType === 'markdown' ? (
                <Field label="Markdown content">
                  <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    rows={8}
                    placeholder="# Heading&#10;&#10;Some text…"
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
                  />
                </Field>
              ) : (
                <>
                  <Field label="Data source">
                    <select
                      aria-label="Data source"
                      value={rootSource}
                      onChange={(e) => {
                        const next = e.target.value;
                        setRootSource(next);
                        // Pre-fill default columns when switching
                        setColumns([]);
                        if (next) {
                          fetchDataSource(next).then((d) => {
                            const defaults = d.defaultColumns.map((field) => {
                              const f = d.fields.find((x) => x.name === field);
                              return { field, label: f?.label ?? field };
                            });
                            setColumns(defaults.slice(0, widgetType === 'kpi' ? 1 : defaults.length));
                          }).catch(() => undefined);
                        }
                      }}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">— Select —</option>
                      {catalog.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.label} ({s.module})
                        </option>
                      ))}
                    </select>
                  </Field>

                  {sourceDetail && (
                    <ColumnsEditor
                      detail={sourceDetail}
                      columns={columns}
                      onChange={setColumns}
                      widgetType={widgetType}
                    />
                  )}
                </>
              )}
            </div>

            {/* ── Right column: live preview ── */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Live preview
              </p>
              <div className="h-100 overflow-auto rounded bg-white p-2 dark:bg-gray-800">
                {widgetType === 'markdown' && (
                  <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {markdown || <span className="italic text-gray-400">Add content on the left.</span>}
                  </div>
                )}
                {widgetType !== 'markdown' && !canPreview && (
                  <p className="text-xs italic text-gray-500">Pick a source and columns to see the preview.</p>
                )}
                {widgetType !== 'markdown' && previewError && (
                  <p className="text-xs text-red-600">⚠ {previewError}</p>
                )}
                {widgetType !== 'markdown' && canPreview && !previewError && (
                  <PreviewRender widgetType={widgetType} columns={columns} rows={previewRows} loading={previewing} />
                )}
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {widget ? 'Save changes' : 'Add widget'}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}

// ── Field wrapper ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

// ── Columns editor ──

function ColumnsEditor({
  detail, columns, onChange, widgetType,
}: {
  detail: CatalogSourceDetail;
  columns: ReportColumn[];
  onChange: (cols: ReportColumn[]) => void;
  widgetType: WidgetType;
}) {
  const visibleFields = detail.fields.filter((f) => !f.hidden);

  function addColumn(field: string) {
    if (columns.some((c) => c.field === field)) return;
    const f = detail.fields.find((x) => x.name === field);
    onChange([...columns, { field, label: f?.label ?? field }]);
  }

  function removeColumn(field: string) {
    onChange(columns.filter((c) => c.field !== field));
  }

  function updateColumn(field: string, patch: Partial<ReportColumn>) {
    onChange(columns.map((c) => c.field === field ? { ...c, ...patch } : c));
  }

  return (
    <div>
      <p className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Columns ({columns.length})
      </p>
      <ul className="mb-2 space-y-1 max-h-44 overflow-y-auto">
        {columns.map((c) => {
          const f = detail.fields.find((x) => x.name === c.field);
          const aggOpts: AggregationFn[] = ['count', 'count_distinct', ...(f?.aggregations ?? [])];
          return (
            <li key={c.field} className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white p-1.5 text-xs dark:border-gray-700 dark:bg-gray-800">
              <span className="flex-1 truncate font-medium">{f?.label ?? c.field}</span>
              {widgetType !== 'table' && (
                <select
                  aria-label={`Aggregation for ${c.field}`}
                  value={c.aggregation ?? ''}
                  onChange={(e) => updateColumn(c.field, { aggregation: (e.target.value || undefined) as AggregationFn | undefined })}
                  className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="">no agg</option>
                  {Array.from(new Set(aggOpts)).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => removeColumn(c.field)}
                className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                aria-label={`Remove ${c.field}`}
              >✕</button>
            </li>
          );
        })}
      </ul>
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
          + Add column
        </summary>
        <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto rounded border border-gray-200 p-1 dark:border-gray-700">
          {visibleFields.map((f) => {
            const added = columns.some((c) => c.field === f.name);
            return (
              <li key={f.name}>
                <button
                  type="button"
                  onClick={() => addColumn(f.name)}
                  disabled={added}
                  className={`w-full rounded px-2 py-1 text-left text-xs ${
                    added ? 'cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-950'
                  }`}
                >
                  {f.label} <span className="text-[10px] text-gray-400">({f.type})</span>
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}

// ── Preview render ──

function PreviewRender({
  widgetType, columns, rows, loading,
}: {
  widgetType: WidgetType;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  loading: boolean;
}) {
  if (loading) return <p className="text-xs text-gray-500">Refreshing…</p>;

  if (widgetType === 'table') {
    return <TableWidget columns={columns} rows={rows} showRowNumbers={false} />;
  }
  if (widgetType === 'kpi') {
    return <KpiWidget columns={columns} rows={rows} />;
  }
  if (widgetType === 'pivot') {
    // Derive groupBy from the first two non-aggregated columns for the preview.
    const groupBy = columns.filter((c) => !c.aggregation).slice(0, 2).map((c) => c.field);
    return <PivotWidget columns={columns} rows={rows} groupBy={groupBy} />;
  }
  if (widgetType === 'heatmap') {
    const groupBy = columns.filter((c) => !c.aggregation).slice(0, 2).map((c) => c.field);
    return <HeatmapWidget columns={columns} rows={rows} groupBy={groupBy} height={320} />;
  }
  if (widgetType === 'geo') {
    return <GeographicMapWidget columns={columns} rows={rows} height={320} />;
  }
  if (widgetType === 'scatter' || widgetType === 'bubble') {
    return <ScatterWidget variant={widgetType} columns={columns} rows={rows} height={320} />;
  }
  if (widgetType === 'bar' || widgetType === 'line' || widgetType === 'area' || widgetType === 'pie' || widgetType === 'donut') {
    return <ChartWidget visualization={widgetType} columns={columns} rows={rows} height={320} />;
  }
  return null;
}
