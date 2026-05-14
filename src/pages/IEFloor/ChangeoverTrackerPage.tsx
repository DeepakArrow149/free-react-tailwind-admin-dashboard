import { useState } from 'react';
import { useChangeovers, useCreateChangeover, useCompleteChangeover, useChangeoverSummary } from '@/hooks/useIeFloor';
import { useChangeoverTypes } from '@/hooks/useMasterLookups';
import { useLines } from '@/hooks/useLineBalancing';
import PageMeta from '@/components/common/PageMeta';

const _CO_DEFAULTS = ['FULL', 'PARTIAL', 'COLOR_CHANGE', 'SIZE_CHANGE'] as const;

export default function ChangeoverTrackerPage() {
  const { data: CHANGEOVER_TYPES = [..._CO_DEFAULTS] } = useChangeoverTypes();
  const { data: linesData } = useLines();
  const lines = (linesData as { data?: { id: number; lineName: string }[] })?.data ?? linesData ?? [];
  const lineList = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const { data, isLoading } = useChangeovers(lineId);
  const { data: summary } = useChangeoverSummary(lineId);
  const create = useCreateChangeover();
  const complete = useCompleteChangeover(lineId);
  const items = Array.isArray(data) ? data : [];
  const sum = summary as { totalChangeovers?: number; avgPlannedMinutes?: number; avgActualMinutes?: number; onTimePercent?: number; byType?: Record<string, { count: number; avgPlanned: number; avgActual: number }> } | undefined;

  const [form, setForm] = useState({ changeoverType: 'FULL', plannedMinutes: 30 });

  return (
    <>
      <PageMeta title="Changeover Tracker" description="Track style changeover events" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Changeover Tracker</h1>
          <select className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={lineId} onChange={e => setLineId(Number(e.target.value))} aria-label="Select production line">
            <option value={0}>Select Line</option>
            {lineList.map((l: { id: number; lineName: string }) => <option key={l.id} value={l.id}>{l.lineName}</option>)}
          </select>
        </div>

        {!lineId && <p className="text-gray-500">Select a line to track changeovers.</p>}

        {lineId > 0 && (
          <>
            {/* Summary */}
            {sum && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SumCard label="Total Changeovers" value={sum.totalChangeovers ?? 0} />
                <SumCard label="Avg Planned" value={`${(sum.avgPlannedMinutes ?? 0).toFixed(0)} min`} />
                <SumCard label="Avg Actual" value={`${(sum.avgActualMinutes ?? 0).toFixed(0)} min`} />
                <SumCard label="On-Time %" value={`${(sum.onTimePercent ?? 0).toFixed(1)}%`} color={(sum.onTimePercent ?? 0) >= 80 ? 'text-green-600' : 'text-red-600'} />
              </div>
            )}

            {/* Create Form */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Start Changeover</h3>
              <div className="flex flex-wrap gap-3">
                <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.changeoverType} onChange={e => setForm(p => ({ ...p, changeoverType: e.target.value }))} aria-label="Changeover type">
                  {CHANGEOVER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input type="number" placeholder="Planned minutes" className="w-32 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.plannedMinutes} onChange={e => setForm(p => ({ ...p, plannedMinutes: Number(e.target.value) }))} />
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={create.isPending} onClick={() => create.mutate({ lineId, ...form })}>
                  Start
                </button>
              </div>
            </div>

            {/* List */}
            {isLoading && <p className="text-gray-500">Loading...</p>}
            <div className="space-y-2">
              {items.map((c: { id: number; changeoverType: string; plannedMinutes: number; actualMinutes: number | null; status: string; startedAt: string; completedAt: string | null; fromStyle?: { styleNo: string }; toStyle?: { styleNo: string } }) => (
                <div key={c.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{c.changeoverType}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(c.startedAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span>Planned: {c.plannedMinutes} min</span>
                    {c.actualMinutes != null && <span>Actual: {c.actualMinutes} min</span>}
                    {c.fromStyle && <span>From: {c.fromStyle.styleNo}</span>}
                    {c.toStyle && <span>To: {c.toStyle.styleNo}</span>}
                  </div>
                  {c.status !== 'COMPLETED' && (
                    <button className="mt-2 text-sm text-green-600 hover:text-green-800" onClick={() => complete.mutate({ id: c.id })}>
                      Mark Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SumCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-gray-800 dark:text-white'}`}>{value}</p>
    </div>
  );
}
