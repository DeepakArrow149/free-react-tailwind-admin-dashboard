/**
 * FormAnalytics – Dashboard showing form submission statistics,
 * daily trend chart, and field-level completion rates.
 */

import { useState, useEffect, useCallback } from 'react';
import type { FormDefinition } from '../types';
import { fetchAnalytics, type FormAnalyticsData } from '../../api/formBuilderApi';
import { toast } from 'sonner';

interface Props {
  form: FormDefinition;
  onClose: () => void;
}

export default function FormAnalytics({ form, onClose }: Props) {
  const [data, setData] = useState<FormAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const analytics = await fetchAnalytics(form.id);
      setData(analytics);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [form.id]);

  useEffect(() => {
    load();
  }, [load]);

  const maxDailyCount = data?.dailyCounts.reduce((mx, d) => Math.max(mx, d.count), 0) || 1;

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
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
            📊 Analytics: {form.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Loading analytics...</div>
      ) : !data ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">No data available</div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard title="Total Submissions" value={data.totalSubmissions} color="blue" />
              <KpiCard title="Unique Submitters" value={data.uniqueSubmitters} color="purple" />
              <KpiCard title="Avg / Day" value={data.avgPerDay} color="emerald" />
              <KpiCard title="Form Status" value={data.formStatus} color="amber" />
            </div>

            {/* Daily Submissions Chart (bar chart via CSS) */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Submissions — Last 30 Days
              </h3>
              {data.dailyCounts.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No submissions in the last 30 days</p>
              ) : (
                <div className="flex items-end gap-1" style={{ height: 140 }}>
                  {data.dailyCounts.map((d) => {
                    const pct = maxDailyCount > 0 ? (d.count / maxDailyCount) * 100 : 0;
                    return (
                      <div key={d.date} className="group relative flex flex-1 flex-col items-center">
                        <div
                          className="w-full min-w-[4px] rounded-t bg-blue-500 transition-all hover:bg-blue-600 dark:bg-blue-400"
                          style={{ height: `${Math.max(pct, 3)}%` }}
                        />
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -top-10 hidden rounded bg-gray-800 px-2 py-1 text-xs text-white shadow group-hover:block dark:bg-gray-200 dark:text-gray-900">
                          {d.date}: {d.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {data.dailyCounts.length > 0 && (
                <div className="mt-1 flex justify-between text-xs text-gray-400">
                  <span>{data.dailyCounts[0]?.date}</span>
                  <span>{data.dailyCounts[data.dailyCounts.length - 1]?.date}</span>
                </div>
              )}
            </div>

            {/* Field Completion Rates */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Field Completion Rates
              </h3>
              {data.fieldStats.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No field data available</p>
              ) : (
                <div className="space-y-2">
                  {data.fieldStats.map((fs) => (
                    <div key={fs.fieldName} className="flex items-center gap-3">
                      <div className="w-36 truncate text-sm text-gray-600 dark:text-gray-300" title={fs.label}>
                        {fs.label}
                      </div>
                      <div className="flex-1">
                        <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fs.completionRate >= 80
                                ? 'bg-emerald-500'
                                : fs.completionRate >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-400'
                            }`}
                            style={{ width: `${fs.completionRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        {fs.completionRate}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color: 'blue' | 'purple' | 'emerald' | 'amber';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  };

  return (
    <div className={`rounded-lg p-4 ${colorMap[color]}`}>
      <div className="text-xs font-medium opacity-70">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
