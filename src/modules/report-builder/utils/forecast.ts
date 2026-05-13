/**
 * Time-series forecasting helpers used by ChartWidget when
 * `vizConfig.forecast.enabled` is true.
 *
 * Two methods are supported:
 *
 *   • linear  — least-squares linear regression against the index. Cheap,
 *               robust on monotonic trends, ignores seasonality.
 *
 *   • holt    — Holt's two-parameter exponential smoothing (level + trend).
 *               Better when the series has a noisy local trend that drifts.
 *               Default smoothing constants α=0.5, β=0.3 — chosen for short
 *               apparel-ERP series (weeks/months) where we want the forecast
 *               to follow recent direction without being whipsawed.
 *
 * Both functions return ONLY the forecast points (length = `periods`).
 * The caller is responsible for splicing them onto the actual series and
 * extending the X-axis labels.
 *
 * Edge cases:
 *   • An empty / single-point input series produces an array of zeros (or
 *     repeats of the lone value for `holt`).
 *   • All-equal inputs collapse to a flat continuation in both methods.
 *   • NaN/non-finite values in the input are treated as zero so a sparse
 *     series doesn't blow up the regression.
 */

export type ForecastMethod = 'linear' | 'holt';

export interface ForecastOptions {
  /** How many points to predict (>=1). */
  periods: number;
  method?: ForecastMethod;
  /** Holt: level smoothing constant (0..1). Default 0.5. */
  alpha?: number;
  /** Holt: trend smoothing constant (0..1). Default 0.3. */
  beta?: number;
}

/** Coerce one input value to a finite number. NaN/null → 0. */
function clean(v: number | null | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return v;
}

/**
 * Least-squares linear regression on (i, y[i]). Returns `periods` future
 * points by extrapolating the fitted line.
 */
export function linearForecast(series: number[], periods: number): number[] {
  if (periods <= 0) return [];
  const n = series.length;
  if (n === 0) return new Array(periods).fill(0);
  if (n === 1) return new Array(periods).fill(clean(series[0]));

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = clean(series[i]);
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  // Vertical/no-variance line — fall back to the last value flat-line.
  if (denom === 0) return new Array(periods).fill(clean(series[n - 1]));

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const out: number[] = [];
  for (let k = 1; k <= periods; k += 1) {
    out.push(intercept + slope * (n - 1 + k));
  }
  return out;
}

/**
 * Holt's two-parameter exponential smoothing (additive trend, no seasonality).
 *
 *    L[t] = α y[t] + (1-α) (L[t-1] + T[t-1])
 *    T[t] = β (L[t] - L[t-1]) + (1-β) T[t-1]
 *    F[n+h] = L[n] + h · T[n]
 */
export function holtForecast(
  series: number[],
  periods: number,
  alpha = 0.5,
  beta = 0.3,
): number[] {
  if (periods <= 0) return [];
  const n = series.length;
  if (n === 0) return new Array(periods).fill(0);
  if (n === 1) return new Array(periods).fill(clean(series[0]));

  // Initial level = first observation; initial trend = first delta.
  let level = clean(series[0]);
  let trend = clean(series[1]) - clean(series[0]);

  for (let t = 1; t < n; t += 1) {
    const y = clean(series[t]);
    const prevLevel = level;
    level = alpha * y + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const out: number[] = [];
  for (let h = 1; h <= periods; h += 1) {
    out.push(level + h * trend);
  }
  return out;
}

/** Dispatch on method, with sensible fallback. */
export function forecast(series: number[], opts: ForecastOptions): number[] {
  const periods = Math.max(0, Math.floor(opts.periods));
  if (periods === 0) return [];
  switch (opts.method) {
    case 'holt':
      return holtForecast(series, periods, opts.alpha, opts.beta);
    case 'linear':
    default:
      return linearForecast(series, periods);
  }
}

// ── X-axis extension ──────────────────────────────────────────────

/**
 * Build a list of `periods` future X-axis labels by stepping forward from the
 * last category. We *infer* the cadence by inspecting the gap between the
 * last two categories rather than asking the caller. This way we don't need
 * to thread `timeGrain` all the way through the chart pipeline.
 *
 * Behavior:
 *   • If both last two categories parse as ISO dates, step by the same
 *     duration (in days) and emit dates in YYYY-MM-DD.
 *   • Otherwise, emit "+1", "+2", … — the chart still renders a usable axis
 *     even when X is non-temporal (e.g. SKU codes), but the forecast block
 *     is mostly meaningful for time series.
 */
export function extendCategories(categories: string[], periods: number): string[] {
  if (periods <= 0) return [];
  const out: string[] = [];

  if (categories.length < 2) {
    for (let i = 1; i <= periods; i += 1) out.push(`+${i}`);
    return out;
  }

  const lastA = categories[categories.length - 2]!;
  const lastB = categories[categories.length - 1]!;
  const dA = parseDate(lastA);
  const dB = parseDate(lastB);

  if (dA && dB) {
    const stepMs = dB.getTime() - dA.getTime();
    if (stepMs > 0) {
      let cursor = dB.getTime();
      for (let i = 0; i < periods; i += 1) {
        cursor += stepMs;
        out.push(formatIsoDate(new Date(cursor)));
      }
      return out;
    }
  }

  // Fallback: numeric counter
  for (let i = 1; i <= periods; i += 1) out.push(`+${i}`);
  return out;
}

function parseDate(s: string): Date | null {
  // Accept "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss…" and the common
  // localized-but-still-parseable formats. Reject pure numbers and short codes.
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
}

function formatIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
