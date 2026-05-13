/**
 * PublicReportPage — read-only viewer for shared reports.
 *
 * Mounted at /reports/public/:token. No authentication required — the share
 * token is the capability check (32 random bytes, hashed in the DB).
 *
 * Routes for table/chart/KPI/dashboard reports through the same widget
 * components used in the editor, so the rendering is identical to what the
 * report owner sees.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useEmbedProtocol, type EmbedState } from '../embed/useEmbedProtocol';
import {
  fetchPublicReport,
  runPublicReport,
  fetchPublicWidgets,
  runPublicWidget,
  type PublicReportPayload,
  type RuntimeFilterRule,
} from '../api/reportBuilderApi';
import { TableWidget } from '../components/TableWidget';
import { ChartWidget } from '../components/visualizations/ChartWidget';
import { KpiWidget } from '../components/visualizations/KpiWidget';
import { PivotWidget } from '../components/visualizations/PivotWidget';
import { HeatmapWidget } from '../components/visualizations/HeatmapWidget';
import { GeographicMapWidget } from '../components/visualizations/GeographicMapWidget';
import { ScatterWidget } from '../components/visualizations/ScatterWidget';
import type { Widget, WidgetRunResult } from '../types';

export default function PublicReportPage() {
  const { token = '' } = useParams<{ token: string }>();

  const [meta, setMeta] = useState<PublicReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Embedding protocol — only activates when the page is loaded inside an
  // iframe (or `?embed=1` is set for testing). All hooks fire in both cases.
  const embed = useEmbedProtocol();

  // Once metadata loads, tell the host page we're ready
  useEffect(() => {
    if (meta) {
      embed.emit({ type: 'ready', reportName: meta.name, visualization: meta.visualization });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  // If loading errored, surface to the host
  useEffect(() => {
    if (error) embed.emit({ type: 'error', message: error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicReport(token)
      .then((m) => { if (!cancelled) setMeta(m); })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load shared report');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-gray-500">Loading report…</p>
      </Shell>
    );
  }

  if (error || !meta) {
    return (
      <Shell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <h2 className="text-base font-semibold text-red-800 dark:text-red-200">
            Cannot open this report
          </h2>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error ?? 'The link may have been revoked or expired.'}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell innerRef={embed.containerRef as React.RefObject<HTMLDivElement>}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {meta.name}
        </h1>
        {meta.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {meta.description}
          </p>
        )}
      </header>

      {meta.type === 'dashboard'
        ? <PublicDashboardView token={token} embed={embed} />
        : <PublicSingleReportView token={token} meta={meta} embed={embed} />
      }

      {!embed.isEmbedded && (
        <footer className="mt-8 text-center text-[11px] text-gray-400">
          Shared via STITCH ERP · {meta.permissions === 'view,export' ? 'View + Export' : 'View only'}
        </footer>
      )}
    </Shell>
  );
}

// ── Layout shell ──

function Shell({
  children,
  innerRef,
}: {
  children: React.ReactNode;
  innerRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
    >
      <div className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </div>
    </div>
  );
}

// ── Single report view (table / chart / KPI) ──

function PublicSingleReportView({
  token, meta, embed,
}: {
  token: string;
  meta: PublicReportPayload;
  embed: EmbedState;
}) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [running, setRunning] = useState(true);
  const [runError, setRunError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ rowCount: number; ms: number } | null>(null);

  const canExport = meta.permissions === 'view,export';
  const emitRef = useRef(embed.emit);
  emitRef.current = embed.emit;

  function downloadCsv() {
    const cols = meta.query.columns;
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.map((c) => escape(c.label ?? c.field)).join(',')];
    for (const row of rows) {
      lines.push(cols.map((c) => escape(row[c.field])).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = meta.name.replace(/[^a-z0-9]+/gi, '_');
    a.href = url;
    a.download = `${safe}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  useEffect(() => {
    let cancelled = false;
    setRunning(true);
    setRunError(null);
    runPublicReport(token, {
      page: 1,
      pageSize: 200,
      parameters: embed.embedParameters,
    })
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows);
        setStats({ rowCount: r.totalCount, ms: r.durationMs });
        emitRef.current({
          type: 'data-loaded',
          rowCount: r.totalCount,
          durationMs: r.durationMs,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Run failed';
        setRunError(msg);
        emitRef.current({ type: 'error', message: msg });
      })
      .finally(() => { if (!cancelled) setRunning(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, embed.embedParameters, embed.refreshTick]);

  const renderViz = useMemo(() => {
    if (running && rows.length === 0) {
      return <p className="text-sm text-gray-500">Loading data…</p>;
    }
    if (runError) {
      return <p className="text-sm text-red-600">⚠ {runError}</p>;
    }
    if (meta.visualization === 'kpi') {
      return <KpiWidget columns={meta.query.columns} rows={rows} vizConfig={meta.vizConfig} />;
    }
    if (meta.visualization === 'pivot') {
      return (
        <PivotWidget
          columns={meta.query.columns}
          rows={rows}
          groupBy={meta.query.groupBy}
        />
      );
    }
    if (meta.visualization === 'heatmap') {
      return (
        <HeatmapWidget
          columns={meta.query.columns}
          rows={rows}
          groupBy={meta.query.groupBy}
          vizConfig={meta.vizConfig}
          height={420}
        />
      );
    }
    if (meta.visualization === 'geo') {
      return (
        <GeographicMapWidget
          columns={meta.query.columns}
          rows={rows}
          vizConfig={meta.vizConfig}
          height={420}
        />
      );
    }
    if (meta.visualization === 'scatter' || meta.visualization === 'bubble') {
      return (
        <ScatterWidget
          variant={meta.visualization}
          columns={meta.query.columns}
          rows={rows}
          vizConfig={meta.vizConfig}
          height={420}
        />
      );
    }
    if (['bar', 'line', 'area', 'pie', 'donut'].includes(meta.visualization)) {
      return (
        <ChartWidget
          visualization={meta.visualization as 'bar' | 'line' | 'area' | 'pie' | 'donut'}
          columns={meta.query.columns}
          rows={rows}
          vizConfig={meta.vizConfig}
          height={420}
        />
      );
    }
    // Default: table
    return (
      <TableWidget
        columns={meta.query.columns}
        rows={rows}
        showRowNumbers
        striped
      />
    );
  }, [meta, rows, running, runError]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] text-gray-500">
          {stats ? `${stats.rowCount.toLocaleString()} rows · ${stats.ms} ms` : ''}
        </p>
        {canExport && rows.length > 0 && (
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            ⬇ Download CSV
          </button>
        )}
      </div>
      {renderViz}
    </div>
  );
}

// ── Dashboard view (multi-widget grid) ──

function PublicDashboardView({ token, embed }: { token: string; embed: EmbedState }) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicWidgets(token)
      .then((rows) => { if (!cancelled) setWidgets(rows); })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load widgets');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <p className="text-sm text-gray-500">Loading dashboard…</p>;
  if (error) return <p className="text-sm text-red-600">⚠ {error}</p>;
  if (widgets.length === 0) return <p className="text-sm italic text-gray-500">This dashboard has no widgets.</p>;

  const totalRows = Math.max(6, ...widgets.map((w) => w.gridY + w.gridH));

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gridAutoRows: '80px',
        minHeight: `${totalRows * 92}px`,
      }}
    >
      {widgets.map((w) => (
        <PublicWidgetCell key={w.id} token={token} widget={w} embed={embed} />
      ))}
    </div>
  );
}

function PublicWidgetCell({
  token, widget, embed,
}: {
  token: string;
  widget: Widget;
  embed: EmbedState;
}) {
  const [result, setResult] = useState<WidgetRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const emitRef = useRef(embed.emit);
  emitRef.current = embed.emit;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const overrideFilters: RuntimeFilterRule[] | undefined = embed.embedCrossFilter
      ? [{ field: embed.embedCrossFilter.field, operator: 'eq', value: embed.embedCrossFilter.value }]
      : undefined;
    runPublicWidget(token, widget.id, {
      pageSize: 100,
      parameters: embed.embedParameters,
      overrideFilters,
    })
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        emitRef.current({
          type: 'data-loaded',
          rowCount: r.totalCount ?? r.rows.length,
          durationMs: r.durationMs ?? 0,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Widget failed';
        setError(msg);
        emitRef.current({ type: 'error', message: msg });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, widget.id, embed.embedParameters, embed.embedCrossFilter, embed.refreshTick]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      style={{
        gridColumn: `${widget.gridX + 1} / span ${widget.gridW}`,
        gridRow: `${widget.gridY + 1} / span ${widget.gridH}`,
      }}
    >
      <header className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
          {widget.title || `${widget.widgetType[0].toUpperCase()}${widget.widgetType.slice(1)} widget`}
        </h3>
      </header>
      <div className="flex-1 overflow-auto p-2">
        {loading && <p className="text-xs text-gray-500">Loading…</p>}
        {error && <p className="text-xs text-red-600">⚠ {error}</p>}
        {!loading && !error && result && <PublicWidgetBody widget={widget} result={result} />}
      </div>
    </div>
  );
}

function PublicWidgetBody({ widget, result }: { widget: Widget; result: WidgetRunResult }) {
  if (widget.widgetType === 'markdown') {
    return (
      <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
        {widget.markdown ?? ''}
      </div>
    );
  }
  if (!widget.query) {
    return <p className="text-xs italic text-gray-500">Widget has no query.</p>;
  }
  switch (widget.widgetType) {
    case 'table':
      return <TableWidget columns={widget.query.columns} rows={result.rows} showRowNumbers={false} />;
    case 'kpi':
      return (
        <KpiWidget
          columns={widget.query.columns}
          rows={result.rows}
          priorRows={result.priorRows}
          vizConfig={widget.vizConfig}
        />
      );
    case 'pivot':
      return (
        <PivotWidget
          columns={widget.query.columns}
          rows={result.rows}
          groupBy={widget.query.groupBy}
        />
      );
    case 'heatmap':
      return (
        <HeatmapWidget
          columns={widget.query.columns}
          rows={result.rows}
          groupBy={widget.query.groupBy}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * 80 - 80)}
        />
      );
    case 'geo':
      return (
        <GeographicMapWidget
          columns={widget.query.columns}
          rows={result.rows}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * 80 - 80)}
        />
      );
    case 'scatter':
    case 'bubble':
      return (
        <ScatterWidget
          variant={widget.widgetType}
          columns={widget.query.columns}
          rows={result.rows}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * 80 - 80)}
        />
      );
    case 'bar':
    case 'line':
    case 'area':
    case 'pie':
    case 'donut':
      return (
        <ChartWidget
          visualization={widget.widgetType}
          columns={widget.query.columns}
          rows={result.rows}
          priorRows={result.priorRows}
          vizConfig={widget.vizConfig}
          height={Math.max(180, widget.gridH * 80 - 80)}
        />
      );
    default:
      return <p className="text-xs italic text-gray-500">Unsupported widget</p>;
  }
}
