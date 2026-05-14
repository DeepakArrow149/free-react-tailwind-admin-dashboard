import { useState } from 'react';
import { useRealtimeDashboard, useUpsertCount, useHourlyTrend, useWip, useAssignments } from '@/hooks/useIeFloor';
import { useLines } from '@/hooks/useLineBalancing';
import PageMeta from '@/components/common/PageMeta';

const statusColor = (eff: number) => eff >= 85 ? 'text-green-600' : eff >= 70 ? 'text-yellow-600' : 'text-red-600';
const statusBg = (eff: number) => eff >= 85 ? 'bg-green-50 border-green-200' : eff >= 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

export default function RealtimeDashboardPage() {
  const { data: linesData } = useLines();
  const lines = (linesData as { data?: { id: number; lineName: string }[] })?.data ?? linesData ?? [];
  const lineList = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const { data: dashboard, isLoading } = useRealtimeDashboard(lineId);
  const { data: hourly } = useHourlyTrend(lineId);
  const { data: wip } = useWip(lineId);
  const { data: assignments } = useAssignments(lineId);
  const upsertCount = useUpsertCount(lineId);

  const [countOp, setCountOp] = useState<number>(0);
  const [countVal, setCountVal] = useState('');

  const db = dashboard as Record<string, unknown> | undefined;
  const ops = (db?.operations ?? []) as { operationId: number; operationName: string; target: number; actual: number; efficiency: number; isBottleneck: boolean }[];

  return (
    <>
      <PageMeta title="Realtime Dashboard" description="Live production floor monitoring" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Realtime Dashboard</h1>
          <select
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={lineId}
            onChange={e => setLineId(Number(e.target.value))}
            aria-label="Select production line"
          >
            <option value={0}>Select Line</option>
            {lineList.map((l: { id: number; lineName: string }) => (
              <option key={l.id} value={l.id}>{l.lineName}</option>
            ))}
          </select>
        </div>

        {!lineId && <p className="text-gray-500">Please select a line to view the real-time dashboard.</p>}

        {lineId > 0 && isLoading && <p className="text-gray-500">Loading dashboard...</p>}

        {db && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Overall Efficiency" value={`${Number(db.overallEfficiency ?? 0).toFixed(1)}%`} color={statusColor(Number(db.overallEfficiency ?? 0))} />
              <KpiCard label="Actual / Target" value={`${db.totalActual ?? 0} / ${db.totalTarget ?? 0}`} />
              <KpiCard label="Prorated Target" value={String(db.proratedTarget ?? '-')} />
              <KpiCard label="Elapsed Minutes" value={String(db.elapsedMinutes ?? '-')} />
            </div>

            {/* Operations Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Operation</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Target</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Actual</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Efficiency</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ops.map(op => (
                    <tr key={op.operationId} className={op.isBottleneck ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{op.operationName}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{op.target}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{op.actual}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${statusColor(op.efficiency)}`}>{op.efficiency.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        {op.isBottleneck && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Bottleneck</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Count Entry */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Quick Count Entry</h2>
              <div className="flex flex-wrap gap-3">
                <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={countOp} onChange={e => setCountOp(Number(e.target.value))} aria-label="Select operation">
                  <option value={0}>Select Operation</option>
                  {ops.map(op => <option key={op.operationId} value={op.operationId}>{op.operationName}</option>)}
                </select>
                <input type="number" placeholder="Actual count" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={countVal} onChange={e => setCountVal(e.target.value)} />
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={!countOp || !countVal || upsertCount.isPending}
                  onClick={() => { upsertCount.mutate({ operationId: countOp, actual: Number(countVal) }); setCountVal(''); }}
                >
                  {upsertCount.isPending ? 'Saving...' : 'Update Count'}
                </button>
              </div>
            </div>

            {/* WIP Overview */}
            {Array.isArray(wip) && wip.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">WIP by Operation</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(wip as { operationId: number; wipQty: number }[]).map((w) => (
                    <div key={w.operationId} className={`rounded-lg border p-3 ${w.wipQty > 50 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} dark:border-gray-600 dark:bg-gray-800`}>
                      <p className="text-xs text-gray-500">Op #{w.operationId}</p>
                      <p className="text-xl font-bold text-gray-800 dark:text-white">{w.wipQty}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly Trend */}
            {Array.isArray(hourly) && hourly.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Hourly Trend</h2>
                <div className="flex items-end gap-1" style={{ height: 120 }}>
                  {(hourly as { hour: number; actual: number; efficiency: number }[]).map(h => (
                    <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{h.efficiency.toFixed(0)}%</span>
                      <div className={`w-full rounded-t ${statusBg(h.efficiency)}`} style={{ height: Math.max(4, h.efficiency * 1.1) }} />
                      <span className="text-xs text-gray-400">H{h.hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments */}
            {Array.isArray(assignments) && assignments.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Operator Assignments</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(assignments as { id: number; operationId: number; operator?: { firstName: string; lastName: string; empCode: string }; operation?: { operationName: string } }[]).map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-600 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{a.operator?.firstName} {a.operator?.lastName}</p>
                        <p className="text-xs text-gray-500">{a.operator?.empCode}</p>
                      </div>
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">{a.operation?.operationName ?? `Op #${a.operationId}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-gray-800 dark:text-white'}`}>{value}</p>
    </div>
  );
}
