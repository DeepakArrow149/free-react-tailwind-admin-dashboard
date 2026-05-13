/**
 * ReportCanvas — Center workspace.
 *
 * Top: column shelf (chips for each selected column, drag to reorder, click
 * to select, X to remove).
 * Bottom: live preview of the data — calls /preview with the current draft
 * query (debounced) and renders via TableWidget.
 */

import { useEffect, useMemo, useState } from 'react';
import { useReportBuilderStore } from '../store';
import { previewReport } from '../api/reportBuilderApi';
import { TableWidget, type FieldMeta } from './TableWidget';
import { ChartWidget } from './visualizations/ChartWidget';
import { KpiWidget } from './visualizations/KpiWidget';
import { PivotWidget } from './visualizations/PivotWidget';
import { HeatmapWidget } from './visualizations/HeatmapWidget';
import { GeographicMapWidget } from './visualizations/GeographicMapWidget';
import { ScatterWidget } from './visualizations/ScatterWidget';
import { DashboardCanvas } from './DashboardCanvas';
import type { ReportColumn, SortRule } from '../types';

const PREVIEW_DEBOUNCE_MS = 700;
const PREVIEW_LIMIT = 50;

export function ReportCanvas() {
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const selectedField = useReportBuilderStore((s) => s.selectedColumnField);
  const selectColumn = useReportBuilderStore((s) => s.selectColumn);
  const removeColumn = useReportBuilderStore((s) => s.removeColumn);
  const reorderColumns = useReportBuilderStore((s) => s.reorderColumns);
  const addCalculatedColumn = useReportBuilderStore((s) => s.addCalculatedColumn);
  const setSort = useReportBuilderStore((s) => s.setSort);
  const sourceDetails = useReportBuilderStore((s) => s.sourceDetails);

  // Column header click cycles sort: none → asc → desc → none.
  // Shift-click adds the column to the multi-sort key list.
  const handleSort = (field: string, shiftKey: boolean) => {
    if (!activeReport) return;
    const current = activeReport.query.sort ?? [];
    const existing = current.find((s) => s.field === field);
    if (!existing) {
      const next: SortRule[] = shiftKey
        ? [...current, { field, direction: 'asc' }]
        : [{ field, direction: 'asc' }];
      setSort(next);
      return;
    }
    if (existing.direction === 'asc') {
      const next: SortRule[] = current.map((s) =>
        s.field === field ? { ...s, direction: 'desc' } : s
      );
      setSort(next);
      return;
    }
    setSort(current.filter((s) => s.field !== field));
  };

  // Build a per-column field-meta lookup so the table can detect enums for
  // status badge coloring. Walks the catalog through the joined-source map.
  const fieldMeta = useMemo<Record<string, FieldMeta>>(() => {
    if (!activeReport) return {};
    const root = sourceDetails.get(activeReport.query.rootSource);
    if (!root) return {};
    const out: Record<string, FieldMeta> = {};
    for (const col of activeReport.query.columns) {
      const meta = resolveFieldMeta(col.field, root, sourceDetails);
      if (meta) out[col.field] = meta;
    }
    return out;
  }, [activeReport, sourceDetails]);

  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ rowCount: number; ms: number } | null>(null);

  const querySnapshot = useMemo(
    () => JSON.stringify(activeReport?.query ?? {}),
    [activeReport?.query]
  );

  useEffect(() => {
    if (!activeReport || !activeReport.query.rootSource || activeReport.query.columns.length === 0) {
      setRows([]);
      setPreviewMeta(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);

    const handle = setTimeout(async () => {
      try {
        const result = await previewReport({
          query: activeReport.query,
          parameters: {},
          limit: PREVIEW_LIMIT,
        });
        if (cancelled) return;
        setRows(result.rows);
        setPreviewMeta({ rowCount: result.totalCount, ms: result.durationMs });
      } catch (err) {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : 'Preview failed');
        setRows([]);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [querySnapshot, activeReport]);

  if (!activeReport) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-gray-500">
        No report loaded.
      </main>
    );
  }

  // Dashboards render their own multi-widget grid; the data-source panel and
  // properties panel are still useful for setting metadata, but the canvas
  // delegates entirely.
  if (activeReport.type === 'dashboard') {
    if (!activeReport.id) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Save the dashboard first
          </h3>
          <p className="max-w-md text-sm text-gray-500">
            Click <strong>Save</strong> in the toolbar — once it has an ID, you can add widgets.
          </p>
        </main>
      );
    }
    return (
      <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-950">
        <DashboardCanvas reportId={activeReport.id} />
      </main>
    );
  }

  if (!activeReport.query.rootSource) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Pick a data source to begin
        </h3>
        <p className="max-w-md text-sm text-gray-500">
          Select a model from the left panel — Buyers, Orders, Production, etc. —
          to start building your report.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-950">
      {/* Column shelf */}
      <ColumnShelf
        columns={activeReport.query.columns}
        selectedField={selectedField}
        onSelect={selectColumn}
        onRemove={removeColumn}
        onReorder={reorderColumns}
        onAddCalculated={addCalculatedColumn}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        <div>
          {previewLoading ? (
            <span>⟳ Refreshing…</span>
          ) : previewError ? (
            <span className="text-red-600">⚠ {previewError}</span>
          ) : previewMeta ? (
            <span>
              {previewMeta.rowCount.toLocaleString()} rows · {previewMeta.ms}ms · live preview
            </span>
          ) : (
            <span>Ready</span>
          )}
        </div>
        <div className="text-[11px] text-gray-400">Showing first {PREVIEW_LIMIT}</div>
      </div>

      {/* Preview — renders the visualization chosen for this report */}
      <div className="flex-1 overflow-auto p-3">
        {activeReport.visualization === 'table' && (
          <TableWidget
            columns={activeReport.query.columns}
            rows={rows}
            loading={previewLoading && rows.length === 0}
            showRowNumbers={activeReport.settings.showRowNumbers ?? true}
            striped={activeReport.settings.striped ?? true}
            onColumnClick={selectColumn}
            selectedField={selectedField}
            sort={activeReport.query.sort}
            onSort={handleSort}
            fieldMeta={fieldMeta}
            emptyMessage={previewError ? 'Cannot preview — check filters and field types.' : 'No matching rows.'}
          />
        )}

        {activeReport.visualization === 'kpi' && (
          <KpiWidget
            columns={activeReport.query.columns}
            rows={rows}
            vizConfig={activeReport.vizConfig}
          />
        )}

        {(['bar', 'line', 'area', 'pie', 'donut'] as const).includes(
          activeReport.visualization as 'bar' | 'line' | 'area' | 'pie' | 'donut'
        ) && (
          <ChartWidget
            visualization={activeReport.visualization as 'bar' | 'line' | 'area' | 'pie' | 'donut'}
            columns={activeReport.query.columns}
            rows={rows}
            vizConfig={activeReport.vizConfig}
          />
        )}

        {activeReport.visualization === 'pivot' && (
          <PivotWidget
            columns={activeReport.query.columns}
            rows={rows}
            groupBy={activeReport.query.groupBy}
          />
        )}

        {activeReport.visualization === 'heatmap' && (
          <HeatmapWidget
            columns={activeReport.query.columns}
            rows={rows}
            groupBy={activeReport.query.groupBy}
            vizConfig={activeReport.vizConfig}
          />
        )}

        {activeReport.visualization === 'geo' && (
          <GeographicMapWidget
            columns={activeReport.query.columns}
            rows={rows}
            vizConfig={activeReport.vizConfig}
          />
        )}

        {(activeReport.visualization === 'scatter' || activeReport.visualization === 'bubble') && (
          <ScatterWidget
            variant={activeReport.visualization}
            columns={activeReport.query.columns}
            rows={rows}
            vizConfig={activeReport.vizConfig}
          />
        )}

        {activeReport.visualization === 'banded' && (
          <div className="flex h-72 items-center justify-center rounded border-2 border-dashed border-amber-300 bg-amber-50 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <div className="text-center">
              <p className="font-semibold">Banded layout</p>
              <p className="mt-1 text-xs">Pixel-perfect printable layout — coming in a later phase. Switch to Table for now.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Catalog metadata resolver ────────────────────────────────────

import type { CatalogSourceDetail } from '../types';

/**
 * Walk a dotted field path (e.g. "order.productionOrders.status") through the
 * catalog source map and return the leaf field's type/enumValues so the table
 * can decide whether to render a status badge.
 */
function resolveFieldMeta(
  fieldPath: string,
  root: CatalogSourceDetail,
  sources: Map<string, CatalogSourceDetail>
): FieldMeta | null {
  if (!fieldPath.includes('.')) {
    const f = root.fields.find((x) => x.name === fieldPath);
    return f ? { type: f.type, enumValues: f.enumValues } : null;
  }
  const [alias, rest] = fieldPath.split('.', 2);
  const join = root.joins.find((j) => j.alias === alias);
  if (!join) return null;
  const next = sources.get(join.toSource);
  if (!next) return null;
  return resolveFieldMeta(rest, next, sources);
}

// ── Column shelf ─────────────────────────────────────────────────

function ColumnShelf({
  columns, selectedField, onSelect, onRemove, onReorder, onAddCalculated,
}: {
  columns: ReportColumn[];
  selectedField: string | null;
  onSelect: (field: string) => void;
  onRemove: (field: string) => void;
  onReorder: (from: number, to: number) => void;
  onAddCalculated: () => void;
}) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  return (
    <div className="border-b border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Columns ({columns.length})
        </div>
        <button
          type="button"
          onClick={onAddCalculated}
          className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
          title="Add a calculated column with a formula"
        >
          ƒ + Calculated
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {columns.length === 0 && (
          <p className="text-xs italic text-gray-400">
            No columns yet — pick fields from the left panel.
          </p>
        )}
        {columns.map((c, idx) => (
          <div
            key={c.field}
            draggable
            onDragStart={() => setDraggingIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingIdx !== null && draggingIdx !== idx) {
                onReorder(draggingIdx, idx);
              }
              setDraggingIdx(null);
            }}
            onDragEnd={() => setDraggingIdx(null)}
            className={`group inline-flex select-none items-center gap-1 rounded-md border px-2 py-1 text-xs transition cursor-grab active:cursor-grabbing ${
              selectedField === c.field
                ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-950'
            } ${draggingIdx === idx ? 'opacity-50' : ''}`}
          >
            <button type="button" onClick={() => onSelect(c.field)} className="font-medium">
              {c.aggregation && (
                <span className="mr-1 rounded bg-purple-200 px-1 text-[9px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                  {c.aggregation.toUpperCase()}
                </span>
              )}
              {c.label ?? c.field}
            </button>
            <button
              type="button"
              onClick={() => onRemove(c.field)}
              className="text-gray-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
              aria-label={`Remove ${c.field}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
