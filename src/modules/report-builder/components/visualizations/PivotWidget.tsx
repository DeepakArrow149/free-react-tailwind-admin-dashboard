/**
 * PivotWidget — 2-D matrix renderer.
 *
 * Convention:
 *   • groupBy[0] becomes ROWS (Y axis)
 *   • groupBy[1] becomes COLUMNS (X axis — pivoted)
 *   • measure columns (with `aggregation`) become CELL VALUES
 *
 * Example:
 *   query.groupBy   = ['buyer.name', 'status']
 *   query.columns[] = [{ field: 'buyer.name' }, { field: 'status' },
 *                      { field: 'totalValue', aggregation: 'sum' }]
 *
 *   →    Buyer       │ DRAFT  │ CONFIRMED │ SHIPPED │ TOTAL
 *        ────────────┼────────┼───────────┼─────────┼───────
 *        H&M         │ 25,400 │   180,300 │  98,200 │ 303,900
 *        Zara        │      0 │   220,500 │ 124,000 │ 344,500
 *        ────────────┼────────┼───────────┼─────────┼───────
 *        TOTAL       │ 25,400 │   400,800 │ 222,200 │ 648,400
 *
 * Picks the FIRST measure column to populate the cells. Multi-measure
 * pivot tables can be added later (a pivot per measure stacked vertically).
 *
 * Falls back to a friendly message when the query shape isn't pivotable.
 */

import { useMemo } from 'react';
import type { ReportColumn } from '../../types';

export interface PivotWidgetProps {
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  /** ['rowField', 'colField'] — first becomes rows, second becomes columns. */
  groupBy?: string[];
  /** Hide the row/column totals when false (default true). */
  showTotals?: boolean;
}

export function PivotWidget({ columns, rows, groupBy, showTotals = true }: PivotWidgetProps) {
  const rowField = groupBy?.[0];
  const colField = groupBy?.[1];
  const measureCol = useMemo(() => columns.find((c) => c.aggregation), [columns]);

  // All hooks must run on every render — compute the matrix unconditionally
  // and use safe placeholders when the inputs aren't pivotable yet.
  const matrix = useMemo(
    () => (rowField && colField && measureCol)
      ? buildMatrix(rows, rowField, colField, measureCol.field)
      : null,
    [rows, rowField, colField, measureCol]
  );

  if (!rowField || !colField) {
    return (
      <Empty
        title="Pivot needs two group-by dimensions"
        subtitle="Add two non-aggregated columns and put them in groupBy. The first becomes rows, the second becomes columns."
      />
    );
  }
  if (!measureCol) {
    return (
      <Empty
        title="Pivot needs a measure"
        subtitle="Add a column with an aggregation (sum / count / avg) — its values populate the cells."
      />
    );
  }
  if (rows.length === 0 || !matrix) {
    return <Empty title="No data" subtitle="The query returned zero rows." />;
  }

  const fmt = makeFormatter(measureCol);

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-gray-200 bg-gray-100 px-3 py-1.5 text-left font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {rowLabel(columns, rowField)}
            </th>
            {matrix.colKeys.map((c) => (
              <th
                key={c}
                className="border-b border-gray-200 bg-gray-100 px-3 py-1.5 text-right font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {formatHeaderCell(c)}
              </th>
            ))}
            {showTotals && (
              <th className="border-b border-l border-gray-200 bg-gray-200 px-3 py-1.5 text-right font-bold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                Total
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {matrix.rowKeys.map((rk) => (
            <tr key={rk} className="hover:bg-blue-50 dark:hover:bg-blue-950">
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-gray-100 bg-white px-3 py-1.5 text-left font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                {formatHeaderCell(rk)}
              </th>
              {matrix.colKeys.map((ck) => (
                <td
                  key={ck}
                  className="border-b border-gray-100 px-3 py-1.5 text-right text-gray-700 tabular-nums dark:border-gray-800 dark:text-gray-300"
                >
                  {matrix.cells[rk]?.[ck] !== undefined ? fmt(matrix.cells[rk][ck]) : <span className="text-gray-300">—</span>}
                </td>
              ))}
              {showTotals && (
                <td className="border-b border-l border-gray-200 bg-gray-50 px-3 py-1.5 text-right font-bold text-gray-900 tabular-nums dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                  {fmt(matrix.rowTotals[rk] ?? 0)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {showTotals && (
          <tfoot>
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 border-t-2 border-gray-300 bg-gray-200 px-3 py-1.5 text-left font-bold text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                Total
              </th>
              {matrix.colKeys.map((ck) => (
                <td
                  key={ck}
                  className="border-t-2 border-gray-300 bg-gray-200 px-3 py-1.5 text-right font-bold text-gray-900 tabular-nums dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {fmt(matrix.colTotals[ck] ?? 0)}
                </td>
              ))}
              <td className="border-t-2 border-l border-gray-300 bg-gray-300 px-3 py-1.5 text-right font-bold text-gray-900 tabular-nums dark:border-gray-500 dark:bg-gray-600 dark:text-white">
                {fmt(matrix.grandTotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ── Pivot logic ─────────────────────────────────────────────────────

interface PivotMatrix {
  rowKeys: string[];
  colKeys: string[];
  cells: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

function buildMatrix(
  rows: Array<Record<string, unknown>>,
  rowField: string,
  colField: string,
  measureField: string
): PivotMatrix {
  const rowKeySet = new Set<string>();
  const colKeySet = new Set<string>();
  const cells: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const r of rows) {
    const rk = stringify(r[rowField]);
    const ck = stringify(r[colField]);
    const value = Number(r[measureField]) || 0;

    rowKeySet.add(rk);
    colKeySet.add(ck);

    if (!cells[rk]) cells[rk] = {};
    cells[rk][ck] = (cells[rk][ck] ?? 0) + value;
    rowTotals[rk] = (rowTotals[rk] ?? 0) + value;
    colTotals[ck] = (colTotals[ck] ?? 0) + value;
    grandTotal += value;
  }

  // Sort row keys by total desc (so biggest customer/buyer is at top)
  const rowKeys = Array.from(rowKeySet).sort(
    (a, b) => (rowTotals[b] ?? 0) - (rowTotals[a] ?? 0)
  );

  // Sort column keys alphabetically (or chronologically when they're dates)
  const colKeys = Array.from(colKeySet).sort();

  return { rowKeys, colKeys, cells, rowTotals, colTotals, grandTotal };
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return String(v);
}

function formatHeaderCell(s: string): string {
  // If it looks like an ISO date, format as YYYY-MM-DD; else passthrough.
  return s;
}

function rowLabel(columns: ReportColumn[], field: string): string {
  return columns.find((c) => c.field === field)?.label ?? humanize(field);
}

function humanize(field: string): string {
  return field
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeFormatter(col: ReportColumn): (v: number) => string {
  const fmt = col.format;
  if (fmt?.kind === 'currency') {
    return (v) => v.toLocaleString(fmt.locale ?? 'en-US', {
      style: 'currency',
      currency: fmt.currencyCode ?? 'USD',
      maximumFractionDigits: fmt.decimals ?? 0,
    });
  }
  if (fmt?.kind === 'percent') {
    return (v) => `${(v * 100).toFixed(fmt.decimals ?? 1)}%`;
  }
  return (v) => v.toLocaleString(undefined, { maximumFractionDigits: fmt?.decimals ?? 2 });
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      <p className="mt-1 max-w-md text-center text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
