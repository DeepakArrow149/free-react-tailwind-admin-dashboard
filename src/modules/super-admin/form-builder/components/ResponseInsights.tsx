/**
 * ResponseInsights – Visual summary of submission data distributions.
 * Shows value distributions for choice fields, numeric stats for number fields,
 * and top values for text fields. Phase 9.
 */

import { useState, useEffect, useCallback } from 'react';
import type { FormDefinition } from '../types';
import { fetchResponseInsights, type FieldInsight, type ResponseInsightsData } from '../../api/formBuilderApi';
import { toast } from 'sonner';

interface Props {
  form: FormDefinition;
  onClose: () => void;
}

export default function ResponseInsights({ form, onClose }: Props) {
  const [data, setData] = useState<ResponseInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchResponseInsights(form.id);
      setData(result);
    } catch {
      toast.error('Failed to load response insights');
    } finally {
      setLoading(false);
    }
  }, [form.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col" role="region" aria-label="Response insights">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            ← Back
          </button>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            📊 Response Insights: {form.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
          aria-label="Refresh insights"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <span className="animate-pulse">Loading insights…</span>
          </div>
        )}

        {!loading && data && data.sampleSize === 0 && (
          <div className="py-20 text-center text-gray-400">
            <span className="mb-4 block text-4xl">📭</span>
            <p className="text-lg font-medium">No submissions yet</p>
            <p className="text-sm">Insights will appear once responses are collected.</p>
          </div>
        )}

        {!loading && data && data.sampleSize > 0 && (
          <>
            <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
              Based on {data.sampleSize} most recent submission{data.sampleSize !== 1 ? 's' : ''}
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              {data.insights.map((insight) => (
                <InsightCard key={insight.fieldName} insight={insight} sampleSize={data.sampleSize} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Individual Insight Card ─────────────────────────────────

function InsightCard({ insight, sampleSize }: { insight: FieldInsight; sampleSize: number }) {
  const completionPct = sampleSize > 0 ? Math.round((insight.filledCount / sampleSize) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white truncate">{insight.label}</h4>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{insight.type} · {insight.fieldName}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          completionPct >= 80
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : completionPct >= 50
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {completionPct}% filled
        </span>
      </div>

      {/* Distribution (choice fields) */}
      {insight.distribution && <DistributionChart distribution={insight.distribution} total={insight.filledCount} />}

      {/* Numeric stats */}
      {insight.numericStats && <NumericStatsDisplay stats={insight.numericStats} />}

      {/* Top values (text fields) */}
      {insight.topValues && insight.topValues.length > 0 && (
        <TopValuesDisplay values={insight.topValues} total={insight.filledCount} />
      )}

      {/* Empty indicator for fields with no special display */}
      {!insight.distribution && !insight.numericStats && (!insight.topValues || insight.topValues.length === 0) && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          {insight.filledCount} response{insight.filledCount !== 1 ? 's' : ''}, {insight.emptyCount} empty
        </p>
      )}
    </div>
  );
}

// ─── Distribution Horizontal Bar Chart ──────────────────────

function DistributionChart({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-2">
      {sorted.map(([label, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
        return (
          <div key={label}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-gray-700 dark:text-gray-300 max-w-[60%]">{label}</span>
              <span className="text-gray-400 dark:text-gray-500">{count} ({pct}%)</span>
            </div>
            <div className="mt-0.5 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Numeric Stats Display ──────────────────────────────────

function NumericStatsDisplay({ stats }: { stats: { min: number; max: number; avg: number; median: number } }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {([
        ['Min', stats.min],
        ['Max', stats.max],
        ['Avg', stats.avg],
        ['Median', stats.median],
      ] as const).map(([label, value]) => (
        <div key={label} className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-700/40">
          <p className="text-lg font-bold text-gray-800 dark:text-white">{value}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Top Values Display ─────────────────────────────────────

function TopValuesDisplay({ values, total }: { values: Array<{ value: string; count: number }>; total: number }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        Top Values
      </p>
      {values.slice(0, 5).map(({ value, count }) => (
        <div key={value} className="flex items-center justify-between text-xs">
          <span className="truncate text-gray-700 dark:text-gray-300 max-w-[70%]">"{value}"</span>
          <span className="text-gray-400 dark:text-gray-500">
            {count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)
          </span>
        </div>
      ))}
    </div>
  );
}
