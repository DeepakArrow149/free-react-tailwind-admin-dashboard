/**
 * TableWidget — Renders a tabular result for a report.
 *
 * Used inside the builder canvas (live preview) and on the run page.
 *
 * UX features:
 *   - Click column header to cycle sort (asc → desc → off). Shift-click
 *     adds it as a secondary sort key.
 *   - Smart auto-formatting: dates render as "Jan 17, 2026" (not ISO),
 *     integers/decimals use thousand separators automatically when the
 *     column carries no explicit format.
 *   - Status enum auto-coloring: columns whose value matches a known status
 *     keyword (CLOSED, IN_PROGRESS, CANCELLED, ...) render as a colored
 *     badge — green for completed, red for cancelled/delayed, amber for
 *     pending, blue for in-progress.
 */

import { useMemo, useState } from 'react';
import type { ReportColumn, SortRule } from '../types';
import { matchRule, findRowScopedStyle, type ConditionalStyle } from '../utils/conditionalFormat';

export interface FieldMeta {
  type?: string;
  enumValues?: string[];
}

export interface TableWidgetProps {
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  loading?: boolean;
  emptyMessage?: string;
  showRowNumbers?: boolean;
  striped?: boolean;
  /** Optional: clicking a column header invokes this for the properties panel. */
  onColumnClick?: (field: string) => void;
  selectedField?: string | null;
  /** Current sort spec — for showing arrows and computing the next state. */
  sort?: SortRule[];
  /** Header click handler. Receives shiftKey to support multi-sort. */
  onSort?: (field: string, shiftKey: boolean) => void;
  /** Catalog metadata per field path — used for status badge auto-coloring. */
  fieldMeta?: Record<string, FieldMeta>;
}

export function TableWidget({
  columns, rows, loading, emptyMessage = 'No data', showRowNumbers = true,
  striped = true, onColumnClick, selectedField, sort, onSort, fieldMeta,
}: TableWidgetProps) {
  const visibleCols = useMemo(() => columns.filter((c) => !c.hidden), [columns]);
  const sortByField = useMemo(() => {
    const m = new Map<string, { direction: 'asc' | 'desc'; index: number }>();
    (sort ?? []).forEach((s, i) => m.set(s.field, { direction: s.direction, index: i }));
    return m;
  }, [sort]);

  // Live row search — filters rows in-memory by any column's stringified value.
  const [searchTerm, setSearchTerm] = useState('');
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const needle = searchTerm.toLowerCase();
    return rows.filter((row) =>
      visibleCols.some((c) => {
        const v = row[c.field];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(needle);
      })
    );
  }, [rows, searchTerm, visibleCols]);

  // Per-column footer totals (computed on visible/filtered rows only).
  const columnTotals = useMemo(() => computeColumnTotals(visibleCols, filteredRows), [visibleCols, filteredRows]);
  const hasAnyTotal = Object.values(columnTotals).some((t) => t !== null);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (visibleCols.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700">
        <p className="font-medium">No columns yet</p>
        <p className="text-xs">Click fields in the left panel to add columns.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      {rows.length > 0 && (
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <div className="relative flex-1 max-w-xs">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Filter visible rows…"
              className="w-full rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {searchTerm ? (
              <span>{filteredRows.length} of {rows.length} match</span>
            ) : (
              <span>{rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>
            )}
          </div>
        </div>
      )}
      <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
          <tr>
            {showRowNumbers && (
              <th className="w-10 border-b border-gray-300 px-2 py-2 text-right text-xs font-semibold text-gray-500 dark:border-gray-600">
                #
              </th>
            )}
            {visibleCols.map((c) => {
              const sortInfo = sortByField.get(c.field);
              const isSelected = selectedField === c.field;
              return (
                <th
                  key={c.field}
                  style={{ width: c.width, textAlign: c.align ?? 'left' }}
                  className={`group select-none border-b border-gray-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 transition dark:border-gray-600 dark:text-gray-200 ${
                    isSelected
                      ? 'bg-blue-200 dark:bg-blue-900'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (onSort) onSort(c.field, e.shiftKey);
                        else onColumnClick?.(c.field);
                      }}
                      className="flex flex-1 cursor-pointer items-center gap-1.5 truncate text-left"
                      title={
                        onSort
                          ? `Click to sort. Shift-click for multi-sort.${sortInfo ? ` Currently ${sortInfo.direction}.` : ''}`
                          : c.field
                      }
                    >
                      {c.aggregation && (
                        <span className="rounded bg-purple-200 px-1 text-[10px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                          {c.aggregation.toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{c.label ?? c.field}</span>
                      {sortInfo && (
                        <span className="ml-0.5 inline-flex items-center text-blue-600 dark:text-blue-400">
                          <span className="text-[11px] font-bold">
                            {sortInfo.direction === 'asc' ? '▲' : '▼'}
                          </span>
                          {(sort?.length ?? 0) > 1 && (
                            <span className="ml-0.5 text-[9px] font-bold">
                              {sortInfo.index + 1}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                    {onColumnClick && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onColumnClick(c.field); }}
                        className="opacity-0 transition group-hover:opacity-100 hover:text-blue-600"
                        title="Edit column properties"
                        aria-label="Edit column"
                      >
                        <span className="text-[10px]">⚙</span>
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td
                colSpan={visibleCols.length + (showRowNumbers ? 1 : 0)}
                className="p-8 text-center text-sm italic text-gray-400"
              >
                {searchTerm && rows.length > 0
                  ? `No rows match "${searchTerm}".`
                  : emptyMessage}
              </td>
            </tr>
          ) : (
            filteredRows.map((row, idx) => {
              // Drill-down: pick the FIRST column that declares a drill target
              // (most reports drill from a single key column; if multiple, the
              // leftmost wins for full-row click — column-specific clicks are
              // handled at the cell level below).
              const drillCol = visibleCols.find((c) => c.drillTarget);
              const rowClickable = Boolean(drillCol);
              const rowStyle = findRowScopedStyle(visibleCols, row);

              function performDrill(target: ReportColumn['drillTarget']) {
                if (!target) return;
                const params = new URLSearchParams();
                Object.entries(target.paramMapping ?? {}).forEach(([rowKey, paramKey]) => {
                  const v = row[rowKey];
                  if (v !== null && v !== undefined) params.set(paramKey, String(v));
                });
                const url = `/reports/builder/${target.reportId}${params.size ? `?${params.toString()}` : ''}`;
                if (target.newTab !== false) {
                  window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                  window.location.href = url;
                }
              }

              return (
                <tr
                  key={idx}
                  className={
                    // Skip the zebra background when a row-scoped rule paints
                    // its own background, otherwise the stripes win on alt rows.
                    (rowStyle?.backgroundColor ? '' :
                      striped && idx % 2 === 1 ? 'bg-gray-50 dark:bg-gray-900' : '') +
                    (rowClickable ? ' cursor-pointer transition hover:bg-blue-50 dark:hover:bg-blue-950' : '')
                  }
                  style={cssFromStyle(rowStyle)}
                  onClick={rowClickable && drillCol
                    ? () => performDrill(drillCol.drillTarget)
                    : undefined}
                  title={rowStyle?.title ?? (rowClickable ? 'Click to open detail report ↗' : undefined)}
                >
                  {showRowNumbers && (
                    <td className="border-b border-gray-200 px-2 py-1.5 text-right font-mono text-xs text-gray-500 dark:border-gray-800">
                      {idx + 1}
                    </td>
                  )}
                  {visibleCols.map((c) => {
                    const raw = row[c.field];
                    const meta = fieldMeta?.[c.field];
                    const cellHasDrill = Boolean(c.drillTarget);
                    // Row-scoped rules win over cell-scoped rules — they've
                    // already painted the row, so don't double-paint here.
                    const cellStyle = rowStyle ? undefined : matchRule(c.conditionalFormats, raw);
                    return (
                      <td
                        key={c.field}
                        style={{
                          textAlign: c.align ?? defaultAlign(c, raw),
                          ...cssFromStyle(cellStyle),
                        }}
                        className={`border-b border-gray-200 px-3 py-1.5 text-gray-900 dark:border-gray-800 dark:text-gray-100${
                          cellHasDrill ? ' text-blue-600 underline-offset-2 hover:underline dark:text-blue-400' : ''
                        }`}
                        onClick={cellHasDrill
                          ? (e) => { e.stopPropagation(); performDrill(c.drillTarget); }
                          : undefined}
                        title={cellStyle?.title}
                      >
                        <CellContent value={raw} column={c} meta={meta} />
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
        {hasAnyTotal && filteredRows.length > 0 && (
          <tfoot className="sticky bottom-0 bg-gray-100 font-semibold dark:bg-gray-800">
            <tr>
              {showRowNumbers && (
                <td className="border-t-2 border-gray-300 px-2 py-1.5 text-right text-[11px] font-bold text-gray-500 dark:border-gray-600">
                  Σ
                </td>
              )}
              {visibleCols.map((c) => {
                const t = columnTotals[c.field];
                return (
                  <td
                    key={c.field}
                    style={{ textAlign: c.align ?? defaultAlign(c) }}
                    className="border-t-2 border-gray-300 px-3 py-1.5 text-gray-800 dark:border-gray-600 dark:text-gray-100"
                    title={t ? `Computed across ${filteredRows.length} visible row${filteredRows.length === 1 ? '' : 's'}` : undefined}
                  >
                    {t ? (
                      <div className="flex flex-col items-end gap-0 leading-tight">
                        <span className="text-sm">{formatCell(t.sum, c)}</span>
                        <span className="text-[9px] font-normal uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          sum · avg {formatCell(t.avg, c)}
                        </span>
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Cell rendering: enum badges → explicit format → smart auto-format
// ─────────────────────────────────────────────────────────────────

function CellContent({
  value, column, meta,
}: {
  value: unknown;
  column: ReportColumn;
  meta?: FieldMeta;
}) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-300 dark:text-gray-600">—</span>;
  }

  // Status enum coloring (catalog-driven OR keyword-detected)
  if (meta?.type === 'enum' || (typeof value === 'string' && isStatusLike(value))) {
    const v = String(value);
    const cls = statusColor(v);
    if (cls) {
      return (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
          {humanizeEnum(v)}
        </span>
      );
    }
  }

  return <>{formatCell(value, column)}</>;
}

function isStatusLike(s: string): boolean {
  // Heuristic: ALL_CAPS_WITH_UNDERSCORES and reasonably short
  return /^[A-Z][A-Z0-9_]{2,40}$/.test(s) && s.length <= 40;
}

function humanizeEnum(s: string): string {
  return s.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

const STATUS_COLORS: Array<[RegExp, string]> = [
  [/^(COMPLETED|CLOSED|SHIPPED|INVOICED|FULLY_RECEIVED|APPROVED|PUBLISHED|ACTIVE|ON_TRACK|PAID|RECEIVED|SUCCESS)$/,
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'],
  [/^(CANCELLED|REJECTED|FAILED|OVERDUE|CRITICAL_DELAY|TERMINATED|RESIGNED|ERROR)$/,
    'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'],
  [/^(IN_PROGRESS|IN_PRODUCTION|PROCESSING|CONFIRMED|READY_TO_SHIP|PARTIALLY_RECEIVED|ON_LEAVE)$/,
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'],
  [/^(PENDING|DRAFT|PLANNED|MINOR_DELAY|MODERATE_DELAY|REQUESTED|TIMEOUT)$/,
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'],
  [/^(SOFT|HARD|HIGH|MEDIUM|LOW|FOB|CIF|CFR|EXW|SEA|AIR|ROAD|INHOUSE|OUTSOURCE|KNIT|WOVEN|DENIM|LEATHER)$/,
    'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200'],
];

function statusColor(v: string): string | null {
  for (const [re, cls] of STATUS_COLORS) {
    if (re.test(v)) return cls;
  }
  return null;
}

/** Map our ConditionalStyle to the CSS subset accepted by inline `style`. */
function cssFromStyle(s: ConditionalStyle | undefined): React.CSSProperties | undefined {
  if (!s) return undefined;
  const out: React.CSSProperties = {};
  if (s.backgroundColor) out.backgroundColor = s.backgroundColor;
  if (s.color) out.color = s.color;
  if (s.fontWeight) out.fontWeight = s.fontWeight;
  if (s.fontStyle) out.fontStyle = s.fontStyle;
  return out;
}

function defaultAlign(col: ReportColumn, value?: unknown): 'left' | 'right' {
  if (col.aggregation) return 'right';
  if (col.format?.kind && ['number', 'currency', 'percent'].includes(col.format.kind)) {
    return 'right';
  }
  if (typeof value === 'number') return 'right';
  return 'left';
}

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatCell(value: unknown, col: ReportColumn): string {
  if (value === null || value === undefined) return '—';
  const fmt = col.format;

  // Explicit format wins
  if (fmt?.kind && fmt.kind !== 'plain') {
    return applyExplicitFormat(value, fmt);
  }

  // Smart auto-format when no explicit format is set
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  if (typeof value === 'string') {
    if (ISO_DATETIME_RE.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        // Render as "Jan 17, 2026" — drop the time when it's exactly midnight UTC
        const isMidnight =
          d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
        return isMidnight
          ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
          : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit' });
      }
    }
    if (ISO_DATE_RE.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
    return value;
  }

  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Per-column totals over the visible/filtered rows. A column qualifies for
 * totals when at least one of its values is a finite number — strings, dates,
 * enums, and booleans are skipped. Aggregated columns also get totals (sum of
 * sums, average of averages over the visible page is informative for finance).
 */
function computeColumnTotals(
  cols: ReportColumn[],
  rows: Array<Record<string, unknown>>
): Record<string, { sum: number; avg: number; count: number } | null> {
  const out: Record<string, { sum: number; avg: number; count: number } | null> = {};
  for (const col of cols) {
    let sum = 0;
    let count = 0;
    for (const row of rows) {
      const v = row[col.field];
      const n = typeof v === 'number' ? v : (v != null && v !== '' ? Number(v) : NaN);
      if (Number.isFinite(n)) {
        sum += n;
        count += 1;
      }
    }
    out[col.field] = count > 0 ? { sum, avg: sum / count, count } : null;
  }
  return out;
}

function applyExplicitFormat(value: unknown, fmt: NonNullable<ReportColumn['format']>): string {
  switch (fmt.kind) {
    case 'number':
      return Number(value).toLocaleString(fmt.locale, {
        maximumFractionDigits: fmt.decimals ?? 2,
      });
    case 'currency':
      return Number(value).toLocaleString(fmt.locale ?? 'en-IN', {
        style: 'currency',
        currency: fmt.currencyCode ?? 'INR',
        maximumFractionDigits: fmt.decimals ?? 2,
      });
    case 'percent':
      return `${(Number(value) * 100).toFixed(fmt.decimals ?? 1)}%`;
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(fmt.locale,
        { year: 'numeric', month: 'short', day: 'numeric' });
    }
    case 'datetime': {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(fmt.locale,
        { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    default:
      return String(value);
  }
}
