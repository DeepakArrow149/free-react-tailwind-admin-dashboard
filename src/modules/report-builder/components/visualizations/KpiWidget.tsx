/**
 * KpiWidget — Big-number metric with optional comparison delta.
 *
 * Picks the first measure column from the data. If `vizConfig.comparisonField`
 * is set, displays a delta (current − comparison) with up/down arrow.
 * If multiple measures are defined, renders them as a grid of KPI cards.
 */

import { useMemo } from 'react';
import type { ReportColumn, VizConfig } from '../../types';
import { classifyColumns } from '../../types';

export interface KpiWidgetProps {
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  /** Prior-period rows (YoY) — when set, the KPI shows a delta vs the prior period sum. */
  priorRows?: Array<Record<string, unknown>>;
  vizConfig?: VizConfig;
}

export function KpiWidget({ columns, rows, priorRows, vizConfig }: KpiWidgetProps) {
  const measures = useMemo(() => classifyColumns(columns).measures, [columns]);

  // For YoY: roll up the prior rows by summing each measure across all rows.
  // (When the user picked compareWith, the prior set is the same shape as
  // current — typically a single row for ungrouped KPIs.)
  const priorTotals = useMemo(() => {
    if (!priorRows || priorRows.length === 0) return null;
    const totals: Record<string, number> = {};
    for (const m of measures) {
      let sum = 0;
      for (const r of priorRows) sum += Number(r[m.field]) || 0;
      totals[m.field] = sum;
    }
    return totals;
  }, [priorRows, measures]);

  if (measures.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">KPI needs a measure</p>
        <p className="mt-1 text-xs text-gray-500">
          Add a column with an aggregation (sum / avg / count) to display its value.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded border border-gray-200 text-sm text-gray-500 dark:border-gray-700">
        No data
      </div>
    );
  }

  const firstRow = rows[0];

  return (
    <div className={`grid gap-3 ${gridCols(measures.length)}`}>
      {measures.map((m) => {
        // Comparison resolution priority:
        //   1. Explicit comparisonField (per-row column)
        //   2. priorTotals[m.field] (YoY rollup from priorRows)
        const explicit = vizConfig?.comparisonField ? firstRow[vizConfig.comparisonField] : undefined;
        const prior = priorTotals?.[m.field];
        const comparison = explicit !== undefined ? explicit : prior;
        return (
          <KpiCard
            key={m.field}
            column={m}
            value={firstRow[m.field]}
            comparison={comparison}
            comparisonLabel={prior !== undefined && explicit === undefined ? 'vs prior' : undefined}
          />
        );
      })}
    </div>
  );
}

function gridCols(n: number): string {
  if (n === 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-3';
  return 'grid-cols-2 lg:grid-cols-4';
}

function KpiCard({
  column, value, comparison, comparisonLabel,
}: {
  column: ReportColumn;
  value: unknown;
  comparison?: unknown;
  /** Optional small text shown next to the delta (e.g. "vs prior"). */
  comparisonLabel?: string;
}) {
  const formatted = formatKpiValue(value, column);

  let delta: number | null = null;
  let deltaPct: number | null = null;
  if (comparison !== undefined && comparison !== null
      && typeof value !== 'undefined' && value !== null) {
    const cur = Number(value);
    const prev = Number(comparison);
    if (Number.isFinite(cur) && Number.isFinite(prev) && prev !== 0) {
      delta = cur - prev;
      deltaPct = (delta / Math.abs(prev)) * 100;
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {column.aggregation && (
          <span className="mr-1 rounded bg-purple-100 px-1 text-[9px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-200">
            {column.aggregation.toUpperCase()}
          </span>
        )}
        {column.label ?? column.field}
      </p>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {formatted}
      </p>
      {delta !== null && deltaPct !== null && (
        <p className={`mt-1 text-xs font-medium ${
          delta >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {delta >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(delta))} ({deltaPct.toFixed(1)}%)
          {comparisonLabel && (
            <span className="ml-1 text-[10px] font-normal text-gray-500 dark:text-gray-400">
              {comparisonLabel}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function formatKpiValue(value: unknown, col: ReportColumn): string {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);

  const fmt = col.format;
  if (fmt?.kind === 'currency') {
    return num.toLocaleString(fmt.locale ?? 'en-IN', {
      style: 'currency',
      currency: fmt.currencyCode ?? 'INR',
      maximumFractionDigits: fmt.decimals ?? 0,
      notation: Math.abs(num) >= 10_000_000 ? 'compact' : 'standard',
    });
  }
  if (fmt?.kind === 'percent') {
    return `${(num * 100).toFixed(fmt.decimals ?? 1)}%`;
  }
  // Default: compact for big numbers
  if (Math.abs(num) >= 10_000) {
    return num.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: fmt?.decimals ?? 2 });
}

function formatNumber(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
