import { useState } from 'react';
import { useBreakdowns, useCreateBreakdown, useResolveBreakdown, useBreakdownSummary } from '@/hooks/useIeFloor';
import { useLines } from '@/hooks/useLineBalancing';
import PageMeta from '@/components/common/PageMeta';

const BREAKDOWN_TYPES = ['MECHANICAL', 'ELECTRICAL', 'NEEDLE_BREAK', 'THREAD_BREAK', 'BOBBIN', 'OTHER'] as const;
const statusBadge: Record<string, string> = { OPEN: 'bg-red-100 text-red-700', RESOLVED: 'bg-green-100 text-green-700' };

export default function BreakdownManagerPage() {
  const { data: linesData } = useLines();
  const lines = (linesData as { data?: { id: number; lineName: string }[] })?.data ?? linesData ?? [];
  const lineList = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading } = useBreakdowns(lineId, { status: statusFilter || undefined });
  const { data: summary } = useBreakdownSummary(lineId);
  const create = useCreateBreakdown();
  const resolve = useResolveBreakdown(lineId);
  const items = Array.isArray(data) ? data : [];
  const sum = summary as { totalBreakdowns?: number; openBreakdowns?: number; totalDowntimeMinutes?: number; avgRepairMinutes?: number; byType?: Record<string, number> } | undefined;

  const [form, setForm] = useState({ breakdownType: 'MECHANICAL', description: '', startTime: '' });
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolution, setResolution] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rootCause, setRootCause] = useState('');

  return (
    <>
      <PageMeta title="Breakdown Manager" description="Track and resolve machine breakdowns" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Breakdown Manager</h1>
          <div className="flex gap-3">
            <select className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={lineId} onChange={e => setLineId(Number(e.target.value))} aria-label="Select production line">
              <option value={0}>Select Line</option>
              {lineList.map((l: { id: number; lineName: string }) => <option key={l.id} value={l.id}>{l.lineName}</option>)}
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {!lineId && <p className="text-gray-500">Select a line to manage breakdowns.</p>}

        {lineId > 0 && (
          <>
            {/* Summary Cards */}
            {sum && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SumCard label="Total" value={sum.totalBreakdowns ?? 0} />
                <SumCard label="Open" value={sum.openBreakdowns ?? 0} color={sum.openBreakdowns ? 'text-red-600' : undefined} />
                <SumCard label="Total Downtime" value={`${sum.totalDowntimeMinutes ?? 0} min`} />
                <SumCard label="Avg Repair" value={`${(sum.avgRepairMinutes ?? 0).toFixed(1)} min`} />
              </div>
            )}

            {/* By Type */}
            {sum?.byType && Object.keys(sum.byType).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(sum.byType).map(([type, count]) => (
                  <span key={type} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300">
                    {type}: {count as number}
                  </span>
                ))}
              </div>
            )}

            {/* Report Form */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Report Breakdown</h3>
              <div className="flex flex-wrap gap-3">
                <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.breakdownType} onChange={e => setForm(p => ({ ...p, breakdownType: e.target.value }))} aria-label="Breakdown type">
                  {BREAKDOWN_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input placeholder="Description" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                <input type="time" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} aria-label="Start time" />
                <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50" disabled={!form.description || !form.startTime || create.isPending} onClick={() => { create.mutate({ lineId, breakdownType: form.breakdownType, description: form.description, startTime: form.startTime }); setForm({ breakdownType: 'MECHANICAL', description: '', startTime: '' }); }}>
                  Report
                </button>
              </div>
            </div>

            {/* List */}
            {isLoading && <p className="text-gray-500">Loading...</p>}
            <div className="space-y-2">
              {items.map((b: { id: number; breakdownType: string; description: string; status: string; reportedAt: string; durationMinutes: number | null }) => (
                <div key={b.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">{b.breakdownType}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[b.status] ?? 'bg-gray-100'}`}>{b.status}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(b.reportedAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{b.description}</p>
                  {b.durationMinutes != null && <p className="mt-1 text-xs text-gray-400">Duration: {b.durationMinutes} min</p>}

                  {b.status === 'OPEN' && (
                    <div className="mt-3">
                      {resolveId === b.id ? (
                        <div className="flex flex-wrap gap-2">
                          <input type="time" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={endTime} onChange={e => setEndTime(e.target.value)} aria-label="End time" placeholder="End time" />
                          <input placeholder="Resolution notes" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={resolution} onChange={e => setResolution(e.target.value)} />
                          <input placeholder="Root cause (optional)" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={rootCause} onChange={e => setRootCause(e.target.value)} />
                          <button className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50" disabled={!endTime || !resolution} onClick={() => { resolve.mutate({ id: b.id, endTime, resolution, rootCause: rootCause || undefined }); setResolveId(null); setResolution(''); setEndTime(''); setRootCause(''); }}>Resolve</button>
                          <button className="rounded-lg border px-3 py-2 text-sm text-gray-600" onClick={() => { setResolveId(null); setEndTime(''); setRootCause(''); }}>Cancel</button>
                        </div>
                      ) : (
                        <button className="text-sm text-green-600 hover:text-green-800" onClick={() => { setResolveId(b.id); setEndTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })); }}>Mark Resolved</button>
                      )}
                    </div>
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
