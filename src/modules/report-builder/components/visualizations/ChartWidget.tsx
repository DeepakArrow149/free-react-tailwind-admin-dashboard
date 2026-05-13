/**
 * ChartWidget — Unified ApexCharts wrapper for bar, line, area, pie, donut.
 *
 * Auto-infers dimensions/measures from the report columns when `vizConfig`
 * doesn't pin axes explicitly. Renders a friendly empty state when the data
 * doesn't satisfy the visualization's contract (e.g. pie needs a measure).
 */

import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type {
  ReportColumn,
  Visualization,
  VizConfig,
  ChartAnnotation,
} from '../../types';
import { classifyColumns, inferChartAxes, VISUALIZATIONS } from '../../types';
import { forecast as computeForecast, extendCategories } from '../../utils/forecast';

const DEFAULT_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

/**
 * ApexCharts toolbar — keeps only the download menu (PNG / SVG / CSV) and
 * hides selection/zoom/pan tools that don't apply to small dashboard tiles.
 */
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

export interface ChartSegmentClick {
  /** The catalog field used as the X-axis dimension */
  field: string;
  /** The clicked category value (raw, before formatting) */
  value: unknown;
}

export interface ChartWidgetProps {
  visualization: Exclude<Visualization, 'table' | 'kpi' | 'banded' | 'pivot'>;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  /**
   * Prior-period rows for comparison (YoY etc.). When present and the chart
   * supports twin series (bar/line/area), rendered as a second series labelled
   * "Prior". Pie/donut ignore this — comparison doesn't fit those shapes.
   */
  priorRows?: Array<Record<string, unknown>>;
  vizConfig?: VizConfig;
  height?: number;
  /** Fires when the user clicks a bar / pie slice / line point. Used for cross-filtering. */
  onSegmentClick?: (selection: ChartSegmentClick) => void;
}

export function ChartWidget({
  visualization, columns, rows, priorRows, vizConfig, height = 360, onSegmentClick,
}: ChartWidgetProps) {
  const axes = useMemo(() => inferChartAxes(columns, vizConfig), [columns, vizConfig]);
  const measures = useMemo(() => classifyColumns(columns).measures, [columns]);

  const meta = VISUALIZATIONS.find((v) => v.id === visualization);

  // Validate contract
  const isPieFamily = visualization === 'pie' || visualization === 'donut';
  const needsX = !isPieFamily; // pie/donut use category dimension but only one series
  const hasX = axes.xField !== null;
  const hasY = axes.yFields.length > 0;

  if (rows.length === 0) {
    return <ChartEmpty title="No data" subtitle="The query returned zero rows." />;
  }
  if (needsX && !hasX) {
    return (
      <ChartEmpty title={`${meta?.label ?? visualization} needs a dimension`}
        subtitle="Add a non-aggregated column for the X-axis." />
    );
  }
  if (!hasY) {
    return (
      <ChartEmpty title={`${meta?.label ?? visualization} needs a measure`}
        subtitle="Add a column with an aggregation (sum / avg / count)." />
    );
  }

  // ── Pie / Donut ──
  if (isPieFamily) {
    const labels: string[] = [];
    const values: number[] = [];
    const xField = axes.xField!;
    const yField = axes.yFields[0];
    for (const row of rows) {
      labels.push(formatLabel(row[xField]));
      values.push(Number(row[yField]) || 0);
    }
    const options: ApexOptions = {
      chart: {
        type: visualization,
        toolbar: TOOLBAR_DOWNLOAD_ONLY,
        fontFamily: 'inherit',
        events: onSegmentClick && axes.xField
          ? {
              dataPointSelection: (_e, _ctx, cfg) => {
                // For pie/donut, dataPointIndex points into labels[]
                const idx = cfg?.dataPointIndex;
                if (typeof idx === 'number' && idx >= 0 && idx < rows.length) {
                  onSegmentClick({ field: axes.xField!, value: rows[idx][axes.xField!] });
                }
              },
            }
          : undefined,
      },
      labels,
      colors: resolvePalette(vizConfig?.palette),
      legend: { show: vizConfig?.showLegend !== false, position: 'right' },
      dataLabels: { enabled: vizConfig?.dataLabels !== false },
      stroke: { width: 0 },
      tooltip: { y: { formatter: (v) => formatNumber(v) } },
      plotOptions: visualization === 'donut'
        ? { pie: { donut: { size: '60%' } } }
        : undefined,
    };
    return (
      <div className="w-full">
        <Chart options={options} series={values} type={visualization} height={height} />
      </div>
    );
  }

  // ── Bar / Line / Area ──
  const xField = axes.xField!;

  // Build series. When priorRows is present, emit twin series per measure:
  //   "<measure>" → current values
  //   "<measure> (prior)" → prior values aligned to the SAME x-axis as current
  // Prior rows already carry `_periodAlignedX` from the engine.
  const hasPrior = Array.isArray(priorRows) && priorRows.length > 0;

  // Forecast — only for line/area, and only when no prior comparison is
  // active (combining backward + forward extrapolations gets visually noisy).
  const fc = vizConfig?.forecast;
  const showForecast = Boolean(
    fc?.enabled
    && fc.periods > 0
    && (visualization === 'line' || visualization === 'area')
    && !hasPrior
    && rows.length >= 2,
  );
  const forecastPeriods = showForecast ? fc!.periods : 0;

  type SeriesEntry = { name: string; data: Array<number | null>; isForecast?: boolean };
  const series: SeriesEntry[] = [];
  for (const y of axes.yFields) {
    const col = measures.find((m) => m.field === y);
    const baseName = col?.label ?? y;
    const actualValues = rows.map((r) => Number(r[y]) || 0);

    if (showForecast) {
      const projected = computeForecast(actualValues, {
        periods: forecastPeriods,
        method: fc!.method,
      });
      // Actual series — values for actual range, null in forecast tail so the
      // solid line stops at the forecast boundary.
      series.push({
        name: baseName,
        data: [
          ...actualValues,
          ...new Array(forecastPeriods).fill(null),
        ],
      });
      // Forecast series — null up to (but not including) the bridge point,
      // duplicate the last actual value so the dashed line connects without a
      // gap, then the projected values.
      const lastActual = actualValues[actualValues.length - 1] ?? 0;
      series.push({
        name: `${baseName} (forecast)`,
        data: [
          ...new Array(actualValues.length - 1).fill(null),
          lastActual,
          ...projected,
        ],
        isForecast: true,
      });
      continue;
    }

    series.push({
      name: hasPrior ? `${baseName} (current)` : baseName,
      data: actualValues,
    });
    if (hasPrior) {
      // Index prior rows by the aligned-x value so the data points line up
      // with the current series at matching positions.
      const priorByX = new Map<string, number>();
      for (const pr of priorRows!) {
        const alignedX = String(pr._periodAlignedX ?? pr[xField] ?? '');
        const key = alignedX.slice(0, 10);
        priorByX.set(key, (priorByX.get(key) ?? 0) + (Number(pr[y]) || 0));
      }
      const priorData = rows.map((r) => {
        const key = String(r[xField] ?? '').slice(0, 10);
        return priorByX.get(key) ?? 0;
      });
      series.push({ name: `${baseName} (prior)`, data: priorData });
    }
  }

  const baseCategories = rows.map((r) => formatLabel(r[xField]));
  const categories = showForecast
    ? [...baseCategories, ...extendCategories(baseCategories, forecastPeriods)]
    : baseCategories;

  const xCol = columns.find((c) => c.field === xField);
  const xIsDateLike = xCol?.format?.kind === 'date'
    || xCol?.format?.kind === 'datetime'
    || /date|month|year/i.test(xField);

  const apexType = visualization === 'area' ? 'area' : visualization === 'line' ? 'line' : 'bar';
  // ── Forecast styling ─────────────────────────────────────────────
  // Each measure becomes an actual+forecast pair when forecast is enabled.
  // Match the forecast series to its actual series's color, and dash only the
  // forecast lines so the boundary is visually obvious.
  const palette = resolvePalette(vizConfig?.palette);
  const seriesColors: string[] = [];
  const seriesDashArray: number[] = [];
  const seriesStrokeWidth: number[] = [];
  const baseLineWidth = visualization === 'line' ? 3 : visualization === 'area' ? 2 : 0;
  let nextColorIdx = 0;
  for (const s of series) {
    if (s.isForecast) {
      // Reuse the previous (actual) series's color
      seriesColors.push(palette[(nextColorIdx - 1 + palette.length) % palette.length]);
      seriesDashArray.push(6);
      seriesStrokeWidth.push(Math.max(2, baseLineWidth));
    } else {
      seriesColors.push(palette[nextColorIdx % palette.length]);
      seriesDashArray.push(0);
      seriesStrokeWidth.push(baseLineWidth);
      nextColorIdx += 1;
    }
  }

  const baseAnnotations = xIsDateLike
    ? buildApexAnnotations(vizConfig?.annotations, categories)
    : undefined;
  const forecastBoundary: ApexOptions['annotations'] = showForecast
    ? {
        xaxis: [
          {
            x: categories[rows.length - 1],
            borderColor: '#9ca3af',
            strokeDashArray: 4,
            label: {
              borderColor: '#9ca3af',
              style: { color: '#fff', background: '#6b7280', fontSize: '10px' },
              text: 'Forecast →',
            },
          },
        ],
      }
    : undefined;
  const mergedAnnotations: ApexOptions['annotations'] = (baseAnnotations || forecastBoundary)
    ? {
        ...(baseAnnotations ?? {}),
        xaxis: [
          ...((baseAnnotations?.xaxis ?? []) as never[]),
          ...((forecastBoundary?.xaxis ?? []) as never[]),
        ],
      }
    : undefined;

  const options: ApexOptions = {
    chart: {
      type: apexType,
      toolbar: TOOLBAR_DOWNLOAD_ONLY,
      stacked: vizConfig?.stacked ?? false,
      fontFamily: 'inherit',
      animations: { enabled: true },
      events: onSegmentClick && xField
        ? {
            dataPointSelection: (_e, _ctx, cfg) => {
              const idx = cfg?.dataPointIndex;
              if (typeof idx === 'number' && idx >= 0 && idx < rows.length) {
                onSegmentClick({ field: xField, value: rows[idx][xField] });
              }
            },
          }
        : undefined,
    },
    colors: seriesColors,
    xaxis: {
      categories,
      title: vizConfig?.xAxisTitle
        ? { text: vizConfig.xAxisTitle }
        : undefined,
      labels: { rotate: xIsDateLike ? 0 : -25, hideOverlappingLabels: true, trim: true },
    },
    yaxis: vizConfig?.yAxisTitle ? { title: { text: vizConfig.yAxisTitle } } : undefined,
    dataLabels: { enabled: vizConfig?.dataLabels ?? false },
    legend: { show: vizConfig?.showLegend !== false, position: 'top', horizontalAlign: 'left' },
    stroke: visualization === 'line' || visualization === 'area'
      ? { curve: 'smooth', width: seriesStrokeWidth, dashArray: seriesDashArray }
      : { width: 0 },
    fill: visualization === 'area' ? { type: 'gradient', gradient: { shadeIntensity: 0.4, opacityFrom: 0.6, opacityTo: 0.05 } } : undefined,
    tooltip: { y: { formatter: (v) => formatNumber(v) } },
    plotOptions: visualization === 'bar'
      ? { bar: { borderRadius: 4, columnWidth: '60%' } }
      : undefined,
    grid: { borderColor: '#e5e7eb', strokeDashArray: 3 },
    // Time-series annotations + forecast boundary
    annotations: mergedAnnotations,
  };

  return (
    <div className="w-full">
      <Chart options={options} series={series} type={apexType} height={height} />
    </div>
  );
}

// ── Annotation conversion ───────────────────────────────────────

/**
 * Convert our portable annotation shape into the ApexCharts `xaxis` annotation
 * structure. Two cases:
 *   • Point annotation (no endDate) → vertical line with label badge
 *   • Range annotation (with endDate) → shaded band with label
 *
 * For category-axis charts (which is what bar/line/area on a date dim use),
 * x-values must be the SAME STRING as the category (e.g. "2026-05-01"), not a
 * timestamp. We match each annotation date against the rendered categories
 * and skip ones that fall outside the visible range.
 */
function buildApexAnnotations(
  list: ChartAnnotation[] | undefined,
  categories: string[]
): ApexOptions['annotations'] {
  if (!list || list.length === 0) return undefined;
  const xaxis: NonNullable<NonNullable<ApexOptions['annotations']>['xaxis']> = [];
  const categorySet = new Set(categories);

  for (const a of list) {
    const color = a.color ?? '#f59e0b';
    const xValue = matchCategory(a.date, categorySet);
    if (!xValue) continue;

    if (a.endDate) {
      const x2Value = matchCategory(a.endDate, categorySet);
      if (!x2Value) continue;
      // Range annotation — shaded band
      xaxis.push({
        x: xValue,
        x2: x2Value,
        fillColor: color,
        opacity: 0.15,
        borderColor: color,
        label: {
          text: a.label,
          borderColor: color,
          orientation: 'horizontal',
          style: {
            background: color,
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 600,
          },
        },
      });
    } else {
      // Point annotation — vertical line + label badge
      xaxis.push({
        x: xValue,
        strokeDashArray: 4,
        borderColor: color,
        borderWidth: 1.5,
        label: {
          text: a.label,
          borderColor: color,
          orientation: 'horizontal',
          style: {
            background: color,
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 600,
          },
        },
      });
    }
  }

  return xaxis.length > 0 ? { xaxis } : undefined;
}

/**
 * Annotation dates may be ISO datetimes (`2026-05-01T00:00:00Z`) or short
 * dates (`2026-05-01`). Categories from time-grain rollups are always
 * `YYYY-MM-DD`. Match by leading 10 chars so both formats work.
 */
function matchCategory(date: string, categorySet: Set<string>): string | null {
  const short = date.slice(0, 10);
  // Exact match first
  if (categorySet.has(short)) return short;
  // Try the full input
  if (categorySet.has(date)) return date;
  return null;
}

// ── Helpers ──

function ChartEmpty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function resolvePalette(palette: VizConfig['palette']): string[] {
  if (Array.isArray(palette)) return palette;
  return DEFAULT_PALETTE;
}

function formatLabel(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (v instanceof Date) return v.toLocaleDateString();
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 10);
  }
  return String(v);
}

function formatNumber(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
