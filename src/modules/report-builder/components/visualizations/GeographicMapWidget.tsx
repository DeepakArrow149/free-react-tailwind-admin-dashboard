/**
 * GeographicMapWidget — bubble map (proportional symbol map).
 *
 * Each row in the data must have a country code (ISO-3166 alpha-2 like "US",
 * "GB", "IN") in the FIRST non-aggregated column, and a numeric measure in
 * the FIRST aggregated column. The widget plots a circle at each country's
 * centroid with:
 *   • size  proportional to value (sqrt-scaled so area, not radius, is linear)
 *   • color intensity also proportional to value (5-bucket gradient)
 *
 * No external map library — uses an embedded centroid table and a stylised
 * world graticule (longitude/latitude grid + minimal continent outlines)
 * drawn with SVG. Fully offline, ~10 KB total.
 */

import { useMemo, useState } from 'react';
import type { ReportColumn, VizConfig } from '../../types';
import { classifyColumns } from '../../types';
import { COUNTRY_CENTROIDS, lookupCentroid, lookupCountryName } from './countryCentroids';

// ── Public API ────────────────────────────────────────────────────

export interface GeographicMapWidgetProps {
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  vizConfig?: VizConfig;
  height?: number;
}

export function GeographicMapWidget({
  columns, rows, vizConfig, height = 360,
}: GeographicMapWidgetProps) {
  const { dimensions, measures } = useMemo(() => classifyColumns(columns), [columns]);
  const dimField = vizConfig?.xField ?? dimensions[0]?.field;
  const measureCol = measures[0];

  const points = useMemo(
    () => buildPoints(rows, dimField, measureCol?.field),
    [rows, dimField, measureCol?.field]
  );

  if (!dimField) {
    return (
      <Empty
        title="Geographic map needs a country dimension"
        subtitle="Add a non-aggregated column whose values are ISO-3166 alpha-2 country codes (e.g. US, GB, IN)."
      />
    );
  }
  if (!measureCol) {
    return (
      <Empty
        title="Geographic map needs a measure"
        subtitle="Add a column with an aggregation (sum / count / avg) — its value drives bubble size and color."
      />
    );
  }
  if (rows.length === 0 || points.length === 0) {
    return (
      <Empty
        title="No geographic data"
        subtitle={
          rows.length === 0
            ? 'The query returned zero rows.'
            : `None of the values in "${dimField}" matched a known country code.`
        }
      />
    );
  }

  const maxValue = Math.max(...points.map((p) => p.value));
  const palette = resolvePalette(vizConfig?.palette);

  return (
    <MapBoard
      points={points}
      maxValue={maxValue}
      palette={palette}
      measureLabel={measureCol.label ?? measureCol.field}
      height={height}
    />
  );
}

// ── Geometry ─────────────────────────────────────────────────────

interface Point {
  code: string;
  countryName: string;
  lat: number;
  lng: number;
  value: number;
  /** Cached projected x/y in viewBox coords (set on render) */
  x: number;
  y: number;
}

const VIEW_W = 1000;
const VIEW_H = 500;

/**
 * Equirectangular projection (a.k.a. plate carrée) — simplest possible map
 * projection. Distorts shape near the poles but reads naturally for a global
 * bubble overlay. Returns SVG x/y in [0..VIEW_W, 0..VIEW_H].
 */
function project(lat: number, lng: number): { x: number; y: number } {
  // lng [-180..180] → x [0..VIEW_W]
  const x = ((lng + 180) / 360) * VIEW_W;
  // lat [-90..90] → y [0..VIEW_H], flipped (north is up)
  const y = ((90 - lat) / 180) * VIEW_H;
  return { x, y };
}

function buildPoints(
  rows: Array<Record<string, unknown>>,
  dimField: string | undefined,
  measureField: string | undefined
): Point[] {
  if (!dimField || !measureField) return [];
  // Aggregate values per country (in case the data has duplicates for the
  // same code — e.g. multiple rows from a non-aggregated query)
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const codeRaw = r[dimField];
    if (codeRaw === null || codeRaw === undefined) continue;
    const code = String(codeRaw).trim().toUpperCase();
    const v = Number(r[measureField]);
    if (!Number.isFinite(v)) continue;
    if (!lookupCentroid(code)) continue; // skip codes we don't know
    buckets.set(code, (buckets.get(code) ?? 0) + v);
  }
  const points: Point[] = [];
  for (const [code, value] of buckets) {
    const centroid = COUNTRY_CENTROIDS[code];
    if (!centroid) continue;
    const [lat, lng] = centroid;
    const { x, y } = project(lat, lng);
    points.push({
      code,
      countryName: lookupCountryName(code),
      lat,
      lng,
      value,
      x,
      y,
    });
  }
  // Sort smallest-first so the biggest bubbles draw last (on top)
  return points.sort((a, b) => a.value - b.value);
}

// ── Map rendering ────────────────────────────────────────────────

function MapBoard({
  points, maxValue, palette, measureLabel, height,
}: {
  points: Point[];
  maxValue: number;
  palette: string[];
  measureLabel: string;
  height: number;
}) {
  const [hover, setHover] = useState<Point | null>(null);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="Geographic bubble map"
      >
        {/* Background — light water tone */}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#f1f5f9" />

        {/* Latitude/longitude graticule — every 30° */}
        <g stroke="#e2e8f0" strokeWidth={0.5} fill="none">
          {[-60, -30, 0, 30, 60].map((lat) => (
            <line key={`la-${lat}`}
              x1={0} x2={VIEW_W}
              y1={project(lat, 0).y} y2={project(lat, 0).y}
            />
          ))}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => (
            <line key={`lo-${lng}`}
              x1={project(0, lng).x} x2={project(0, lng).x}
              y1={0} y2={VIEW_H}
            />
          ))}
        </g>

        {/* Continent outline strokes — a stylised silhouette so the map
            isn't just a blank rectangle. These paths are intentionally low-fidelity
            (single-line abstractions) — the bubbles carry the real signal. */}
        <g fill="#cbd5e1" opacity={0.7} stroke="#94a3b8" strokeWidth={0.4} strokeLinejoin="round">
          {CONTINENT_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Equator emphasis */}
        <line
          x1={0} x2={VIEW_W}
          y1={project(0, 0).y} y2={project(0, 0).y}
          stroke="#94a3b8" strokeWidth={0.6} strokeDasharray="2 2"
        />

        {/* Bubbles — sqrt-scaled radius so AREA is proportional to value */}
        {points.map((p) => {
          const r = bubbleRadius(p.value, maxValue);
          const color = bucketColor(p.value, maxValue, palette);
          return (
            <g key={p.code}>
              <circle
                cx={p.x} cy={p.y} r={r}
                fill={color}
                fillOpacity={0.7}
                stroke={color}
                strokeWidth={0.8}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              />
              {r > 9 && (
                <text
                  x={p.x} y={p.y + 3}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight="bold"
                  fill="#ffffff"
                  pointerEvents="none"
                >
                  {p.code}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-xs shadow-md backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {hover.countryName} <span className="text-[10px] text-gray-500">({hover.code})</span>
          </p>
          <p className="mt-0.5 text-gray-600 dark:text-gray-400">
            {measureLabel}: <span className="font-mono font-semibold">{formatValue(hover.value)}</span>
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-[10px] shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
        <span className="text-gray-500">Low</span>
        {palette.slice(0, 5).map((c, i) => (
          <span
            key={i}
            className="inline-block h-3 w-3 rounded-sm border border-gray-300 dark:border-gray-700"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="text-gray-500">High</span>
      </div>
    </div>
  );
}

// ── Visual helpers ────────────────────────────────────────────────

function bubbleRadius(value: number, maxValue: number): number {
  if (maxValue <= 0) return 4;
  const fraction = Math.max(0, value / maxValue);
  // sqrt scaling: bubble AREA is proportional to value, not radius
  return 4 + Math.sqrt(fraction) * 28;
}

function bucketColor(value: number, maxValue: number, palette: string[]): string {
  if (maxValue <= 0) return palette[0];
  const fraction = value / maxValue;
  const idx = Math.min(palette.length - 1, Math.floor(fraction * palette.length));
  return palette[idx];
}

function resolvePalette(palette: VizConfig['palette']): string[] {
  if (Array.isArray(palette) && palette.length >= 5) return palette;
  return ['#bfdbfe', '#60a5fa', '#3b82f6', '#1d4ed8', '#1e3a8a'];
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 10_000) {
    return v.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  }
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

// ── Stylised continent outlines ───────────────────────────────────
// Hand-drawn low-fidelity SVG paths that hint at continent shapes without
// the bundle cost of a full topojson. The map's job is to position the
// data, not to be a precise reference atlas. Coordinates are in viewBox
// space (0..1000 wide, 0..500 tall) — equirectangular projection.
const CONTINENT_PATHS: string[] = [
  // North America
  'M 130 80 L 180 65 L 250 70 L 305 95 L 320 130 L 290 170 L 250 200 L 220 230 L 200 220 L 195 180 L 170 150 L 140 130 Z',
  // Central America
  'M 220 230 L 245 240 L 240 260 L 220 250 Z',
  // South America
  'M 280 280 L 320 270 L 340 310 L 335 380 L 305 425 L 285 410 L 280 360 L 290 320 Z',
  // Europe
  'M 470 95 L 540 85 L 555 110 L 540 135 L 510 145 L 490 135 L 475 120 Z',
  // Africa
  'M 480 190 L 550 175 L 590 210 L 600 290 L 565 360 L 530 370 L 500 330 L 485 270 Z',
  // Middle East / Arabia
  'M 580 195 L 640 185 L 650 230 L 615 250 L 590 240 Z',
  // Asia (generic Eurasia mass)
  'M 555 95 L 700 70 L 820 80 L 870 110 L 875 165 L 820 195 L 760 200 L 700 195 L 650 175 L 600 160 L 560 140 Z',
  // South Asia (India subcontinent)
  'M 690 195 L 730 195 L 740 230 L 720 255 L 700 240 L 690 215 Z',
  // Southeast Asia + Indonesia
  'M 760 225 L 810 220 L 820 245 L 800 280 L 770 285 L 755 260 Z',
  // Australia
  'M 820 365 L 890 360 L 905 395 L 880 415 L 830 410 L 815 390 Z',
  // Greenland (top)
  'M 380 35 L 430 30 L 440 65 L 410 80 L 385 65 Z',
  // Antarctica strip
  'M 0 470 L 1000 470 L 1000 500 L 0 500 Z',
];
