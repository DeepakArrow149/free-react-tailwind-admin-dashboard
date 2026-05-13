/**
 * HeatmapWidget — 2-D matrix where cell intensity encodes the measure.
 *
 * Same query shape as PivotWidget:
 *   • groupBy[0] → Y-axis category (each forms one ApexCharts series)
 *   • groupBy[1] → X-axis category
 *   • first measure column → cell value (intensity)
 *
 * Useful for "buyer × month revenue", "product × region sales density",
 * "operator × hour productivity", etc.
 */

import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ReportColumn, VizConfig } from '../../types';
import { classifyColumns } from '../../types';

export interface HeatmapWidgetProps {
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  groupBy?: string[];
  vizConfig?: VizConfig;
  height?: number;
}

export function HeatmapWidget({
  columns, rows, groupBy, vizConfig, height = 360,
}: HeatmapWidgetProps) {
  const yField = groupBy?.[0];
  const xField = groupBy?.[1];
  const measureCol = useMemo(
    () => classifyColumns(columns).measures[0],
    [columns]
  );

  const matrix = useMemo(() => {
    if (!yField || !xField || !measureCol) return null;
    return buildMatrix(rows, yField, xField, measureCol.field);
  }, [rows, yField, xField, measureCol]);

  if (!yField || !xField) {
    return (
      <Empty
        title="Heatmap needs two dimensions"
        subtitle="Add two non-aggregated columns and put them in groupBy. The first becomes Y-axis (rows), the second becomes X-axis (columns)."
      />
    );
  }
  if (!measureCol) {
    return (
      <Empty
        title="Heatmap needs a measure"
        subtitle="Add a column with an aggregation (sum / avg / count) — its values determine cell intensity."
      />
    );
  }
  if (rows.length === 0 || !matrix) {
    return <Empty title="No data" subtitle="The query returned zero rows." />;
  }

  // ApexCharts heatmap shape:
  //   series: [{ name: 'YCat A', data: [{ x: 'XCat 1', y: 22 }, ...] }, ...]
  const series = matrix.yKeys.map((y) => ({
    name: y,
    data: matrix.xKeys.map((x) => ({
      x,
      y: matrix.cells[y]?.[x] ?? 0,
    })),
  }));

  const palette = resolvePalette(vizConfig?.palette);

  const options: ApexOptions = {
    chart: {
      type: 'heatmap',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
      fontFamily: 'inherit',
    },
    dataLabels: { enabled: vizConfig?.dataLabels !== false },
    colors: [palette[0] ?? '#3b82f6'],
    plotOptions: {
      heatmap: {
        radius: 2,
        useFillColorAsStroke: true,
        colorScale: {
          ranges: buildColorRanges(matrix.maxValue, palette),
        },
      },
    },
    xaxis: {
      type: 'category',
      title: vizConfig?.xAxisTitle ? { text: vizConfig.xAxisTitle } : undefined,
      labels: { rotate: -25, hideOverlappingLabels: true, trim: true },
    },
    yaxis: vizConfig?.yAxisTitle ? { title: { text: vizConfig.yAxisTitle } } : undefined,
    legend: { show: vizConfig?.showLegend !== false, position: 'right' },
    tooltip: { y: { formatter: (v) => formatNumber(v) } },
    grid: { borderColor: '#e5e7eb', strokeDashArray: 3 },
  };

  return (
    <div className="w-full">
      <Chart options={options} series={series} type="heatmap" height={height} />
    </div>
  );
}

// ── Matrix builder (same shape as PivotWidget) ───────────────────────

interface HeatmapMatrix {
  yKeys: string[];
  xKeys: string[];
  cells: Record<string, Record<string, number>>;
  maxValue: number;
}

function buildMatrix(
  rows: Array<Record<string, unknown>>,
  yField: string,
  xField: string,
  measureField: string
): HeatmapMatrix {
  const cells: Record<string, Record<string, number>> = {};
  const yKeySet = new Set<string>();
  const xKeySet = new Set<string>();
  let maxValue = 0;

  for (const r of rows) {
    const y = stringify(r[yField]);
    const x = stringify(r[xField]);
    const v = Number(r[measureField]) || 0;
    yKeySet.add(y);
    xKeySet.add(x);
    if (!cells[y]) cells[y] = {};
    cells[y][x] = (cells[y][x] ?? 0) + v;
    if (cells[y][x]! > maxValue) maxValue = cells[y][x]!;
  }

  return {
    yKeys: Array.from(yKeySet).sort(),
    xKeys: Array.from(xKeySet).sort(),
    cells,
    maxValue,
  };
}

/**
 * Build 5 color stops from 0 → maxValue. ApexCharts uses these to map cell
 * values to intensity buckets, producing a smooth heat gradient.
 */
function buildColorRanges(maxValue: number, palette: string[]): Array<{
  from: number; to: number; color: string;
}> {
  if (maxValue <= 0) return [];
  const stops = 5;
  const step = maxValue / stops;
  const colors = palette.length >= stops ? palette.slice(0, stops) : [
    '#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a',
  ];
  const ranges: Array<{ from: number; to: number; color: string }> = [];
  for (let i = 0; i < stops; i += 1) {
    ranges.push({
      from: i * step,
      to: (i + 1) * step,
      color: colors[i],
    });
  }
  return ranges;
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return String(v);
}

function resolvePalette(palette: VizConfig['palette']): string[] {
  if (Array.isArray(palette)) return palette;
  return ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'];
}

function formatNumber(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      <p className="mt-1 max-w-md text-center text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
