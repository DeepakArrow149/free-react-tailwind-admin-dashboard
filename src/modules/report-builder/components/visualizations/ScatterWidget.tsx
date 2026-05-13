/**
 * ScatterWidget — scatter or bubble chart.
 *
 * Both flavours share the same shape contract:
 *   • measures[0]  → X axis
 *   • measures[1]  → Y axis
 *   • measures[2]  → bubble size (BUBBLE only — falls back to scatter when absent)
 *   • dimensions[0] → optional grouping field; rows with the same value form a
 *                     single coloured series, so e.g. "PO total amount vs lead-time
 *                     by supplier-type" highlights clusters per supplier-type
 *
 * Without grouping, all rows fall into a single "All" series. This makes
 * scatter useful immediately even when the user hasn't picked a dimension.
 */

import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ReportColumn, VizConfig } from '../../types';
import { classifyColumns } from '../../types';

const DEFAULT_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

const TOOLBAR_DOWNLOAD_ONLY = {
  show: true,
  tools: {
    download: true,
    selection: false,
    zoom: false,
    zoomin: false,
    zoomout: false,
    pan: false,
    reset: false,
  },
} as const;

export interface ScatterWidgetProps {
  /** 'scatter' (no size dim) or 'bubble' (third measure drives size) */
  variant: 'scatter' | 'bubble';
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  vizConfig?: VizConfig;
  height?: number;
}

export function ScatterWidget({
  variant, columns, rows, vizConfig, height = 360,
}: ScatterWidgetProps) {
  const { dimensions, measures } = useMemo(() => classifyColumns(columns), [columns]);

  const xCol = useMemo(() => {
    const xField = vizConfig?.xField;
    return (xField && measures.find((m) => m.field === xField)) ?? measures[0];
  }, [measures, vizConfig?.xField]);

  const yCol = useMemo(() => {
    const yField = vizConfig?.yFields?.[0];
    const candidate = yField ? measures.find((m) => m.field === yField) : undefined;
    return candidate ?? measures.find((m) => m !== xCol) ?? measures[1];
  }, [measures, vizConfig?.yFields, xCol]);

  const sizeCol = useMemo(() => {
    if (variant !== 'bubble') return undefined;
    const sizeField = vizConfig?.yFields?.[1];
    const candidate = sizeField ? measures.find((m) => m.field === sizeField) : undefined;
    return candidate ?? measures.find((m) => m !== xCol && m !== yCol);
  }, [variant, measures, vizConfig?.yFields, xCol, yCol]);

  const groupCol = dimensions[0];

  const series = useMemo(
    () => buildSeries(rows, xCol, yCol, sizeCol, groupCol, variant),
    [rows, xCol, yCol, sizeCol, groupCol, variant]
  );

  // Empty states
  if (!xCol || !yCol) {
    return (
      <Empty
        title={`${variant === 'bubble' ? 'Bubble' : 'Scatter'} needs at least 2 measures`}
        subtitle={`Add ${variant === 'bubble' ? 'three' : 'two'} columns with aggregations (sum / avg / count) — they become X, Y${variant === 'bubble' ? ', and bubble size' : ''}.`}
      />
    );
  }
  if (variant === 'bubble' && !sizeCol) {
    return (
      <Empty
        title="Bubble needs a 3rd measure for size"
        subtitle="Add a third aggregated column. Without it, bubbles have no size signal — switch to Scatter instead."
      />
    );
  }
  if (rows.length === 0) {
    return <Empty title="No data" subtitle="The query returned zero rows." />;
  }

  const palette = resolvePalette(vizConfig?.palette);

  const options: ApexOptions = {
    chart: {
      type: variant,
      toolbar: TOOLBAR_DOWNLOAD_ONLY,
      fontFamily: 'inherit',
      animations: { enabled: true },
      zoom: { enabled: true, type: 'xy' },
    },
    colors: palette,
    xaxis: {
      type: 'numeric',
      title: { text: vizConfig?.xAxisTitle ?? xCol.label ?? xCol.field },
      labels: { formatter: (v) => formatAxis(v, xCol) },
      tickAmount: 8,
    },
    yaxis: {
      title: { text: vizConfig?.yAxisTitle ?? yCol.label ?? yCol.field },
      labels: { formatter: (v) => formatAxis(v, yCol) },
    },
    legend: {
      show: vizConfig?.showLegend !== false && series.length > 1,
      position: 'top',
      horizontalAlign: 'left',
    },
    dataLabels: { enabled: false },
    tooltip: {
      shared: false,
      intersect: true,
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const s = w.config.series[seriesIndex];
        const point = s?.data?.[dataPointIndex];
        if (!point) return '';
        const lines = [
          s.name && s.name !== 'All' ? `<div style="font-weight:600">${escapeHtml(String(s.name))}</div>` : '',
          `<div><span style="color:#6b7280">${escapeHtml(xCol.label ?? xCol.field)}:</span> <strong>${formatTooltip(point.x, xCol)}</strong></div>`,
          `<div><span style="color:#6b7280">${escapeHtml(yCol.label ?? yCol.field)}:</span> <strong>${formatTooltip(point.y, yCol)}</strong></div>`,
          variant === 'bubble' && sizeCol && point.z !== undefined
            ? `<div><span style="color:#6b7280">${escapeHtml(sizeCol.label ?? sizeCol.field)}:</span> <strong>${formatTooltip(point.z, sizeCol)}</strong></div>`
            : '',
        ].filter(Boolean).join('');
        return `<div style="padding:6px 10px;font-size:11px">${lines}</div>`;
      },
    },
    plotOptions: variant === 'bubble'
      ? { bubble: { minBubbleRadius: 5, maxBubbleRadius: 35 } }
      : undefined,
    markers: variant === 'scatter' ? { size: 6, strokeWidth: 0 } : undefined,
    grid: { borderColor: '#e5e7eb', strokeDashArray: 3 },
  };

  return (
    <div className="w-full">
      <Chart options={options} series={series} type={variant} height={height} />
    </div>
  );
}

// ── Series builder ───────────────────────────────────────────────

interface ScatterPoint { x: number; y: number; z?: number }

function buildSeries(
  rows: Array<Record<string, unknown>>,
  xCol: ReportColumn | undefined,
  yCol: ReportColumn | undefined,
  sizeCol: ReportColumn | undefined,
  groupCol: ReportColumn | undefined,
  variant: 'scatter' | 'bubble'
): Array<{ name: string; data: ScatterPoint[] }> {
  if (!xCol || !yCol) return [];

  const buckets = new Map<string, ScatterPoint[]>();
  for (const r of rows) {
    const x = Number(r[xCol.field]);
    const y = Number(r[yCol.field]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const point: ScatterPoint = { x, y };
    if (variant === 'bubble' && sizeCol) {
      const z = Number(r[sizeCol.field]);
      // Bubbles MUST have a positive z; ApexCharts hides points with z<=0
      if (Number.isFinite(z) && z > 0) point.z = z;
      else continue; // skip non-sizeable points in bubble mode
    }

    const groupKey = groupCol
      ? String(r[groupCol.field] ?? '—')
      : 'All';
    if (!buckets.has(groupKey)) buckets.set(groupKey, []);
    buckets.get(groupKey)!.push(point);
  }

  return Array.from(buckets.entries()).map(([name, data]) => ({ name, data }));
}

// ── Formatting ───────────────────────────────────────────────────

function formatAxis(value: number, col: ReportColumn): string {
  if (!Number.isFinite(value)) return '';
  const f = col.format;
  if (f?.kind === 'currency') {
    return Math.abs(value) >= 10_000
      ? value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })
      : value.toLocaleString();
  }
  if (Math.abs(value) >= 10_000) {
    return value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: f?.decimals ?? 2 });
}

function formatTooltip(value: number, col: ReportColumn): string {
  if (!Number.isFinite(value)) return '—';
  const f = col.format;
  if (f?.kind === 'currency') {
    return value.toLocaleString(f.locale ?? 'en-US', {
      style: 'currency',
      currency: f.currencyCode ?? 'USD',
      maximumFractionDigits: f.decimals ?? 2,
    });
  }
  if (f?.kind === 'percent') {
    return `${(value * 100).toFixed(f.decimals ?? 1)}%`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: f?.decimals ?? 2 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default:  return '&#39;';
    }
  });
}

function resolvePalette(palette: VizConfig['palette']): string[] {
  if (Array.isArray(palette)) return palette;
  return DEFAULT_PALETTE;
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      <p className="mt-1 max-w-md text-center text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
