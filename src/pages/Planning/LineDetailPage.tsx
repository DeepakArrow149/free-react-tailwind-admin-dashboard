import { useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useBoardData, useLineSummary } from '@/hooks/usePlanningBoard';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * LineDetailPage — drills into a single production line showing its jobs,
 * efficiency metrics, daily plan, and progress tracking.
 */
export default function LineDetailPage() {
  const { lineId } = useParams<{ lineId: string }>();
  const parsedLineId = Number(lineId);
  const { activeScenarioId, fromDate, toDate, openJobPopup } = usePlanningBoardStore();

  const { data: boardData, isLoading } = useBoardData(activeScenarioId, fromDate, toDate);
  const { data: lineSummaries } = useLineSummary(activeScenarioId, fromDate, toDate);

  /* ── Derive line data ── */
  const line = useMemo(
    () => boardData?.lines.find((l) => l.id === parsedLineId) ?? null,
    [boardData, parsedLineId],
  );

  const summary = useMemo(
    () => lineSummaries?.find((s) => s.lineId === parsedLineId) ?? null,
    [lineSummaries, parsedLineId],
  );

  /* ── Derived job stats ── */
  const jobStats = useMemo(() => {
    if (!line) return null;
    const jobs = line.jobs;

    const totalAllocated = jobs.reduce((s, j) => s + j.allocatedQty, 0);
    const totalCompleted = jobs.reduce((s, j) => s + (j.completedQty ?? 0), 0);
    const completionPct = totalAllocated > 0 ? Math.round((totalCompleted / totalAllocated) * 100) : 0;
    const effJobs = jobs.filter((j) => j.efficiency && j.efficiency > 0);
    const avgEfficiency = effJobs.length > 0
      ? Math.round(effJobs.reduce((s, j) => s + (j.efficiency ?? 0), 0) / effJobs.length)
      : 0;
    const lateJobs = jobs.filter((j) => {
      if (!j.endDate || !j.exFactoryDate) return false;
      return new Date(j.endDate) > new Date(j.exFactoryDate);
    });
    const inProgress = jobs.filter((j) => j.status === 'IN_PROGRESS').length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;

    return {
      totalJobs: jobs.length,
      totalAllocated,
      totalCompleted,
      completionPct,
      avgEfficiency,
      lateCount: lateJobs.length,
      inProgress,
      completed,
    };
  }, [line]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading line details…</div>
      </div>
    );
  }

  if (!line) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <p className="text-gray-600 dark:text-gray-400 font-medium">Line not found</p>
          <Link to="/planning/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/planning/dashboard" className="hover:text-blue-600">
              Dashboard
            </Link>
            <span>/</span>
            <span>{line.lineName}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {line.lineName}
            <span className="ml-3 text-base font-normal text-gray-500 dark:text-gray-400">
              {line.department}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/planning/board"
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Open Board
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {jobStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Operators', value: line.operators, color: 'blue' },
            { label: 'Total Jobs', value: jobStats.totalJobs, color: 'indigo' },
            { label: 'Allocated Qty', value: jobStats.totalAllocated.toLocaleString(), color: 'green' },
            { label: 'Completed', value: `${jobStats.completionPct}%`, color: jobStats.completionPct >= 70 ? 'emerald' : 'amber' },
            { label: 'Efficiency', value: `${jobStats.avgEfficiency}%`, color: jobStats.avgEfficiency >= 70 ? 'green' : 'amber' },
            {
              label: 'Utilization',
              value: `${Math.round(summary?.utilizationPct ?? 0)}%`,
              color:
                (summary?.utilizationPct ?? 0) >= 90
                  ? 'red'
                  : (summary?.utilizationPct ?? 0) >= 70
                    ? 'green'
                    : 'amber',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Late delivery warning */}
      {jobStats && jobStats.lateCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 flex items-center gap-3">
          <span className="text-red-600 dark:text-red-400 text-sm font-medium">
            🔴 {jobStats.lateCount} job(s) will miss their ex-factory date
          </span>
        </div>
      )}

      {/* Jobs Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          Jobs on {line.lineName}
        </h3>
        {line.jobs.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500">
            No jobs allocated to this line yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {[
                    'Order #',
                    'Buyer',
                    'Style',
                    'Qty',
                    'SAM',
                    'Start',
                    'End',
                    'Ex-Factory',
                    'Daily Target',
                    'Completed',
                    'Progress',
                    'Efficiency',
                    'Status',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {line.jobs
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((job) => {
                    const completionPct =
                      job.allocatedQty > 0
                        ? Math.round(((job.completedQty ?? 0) / job.allocatedQty) * 100)
                        : 0;
                    const isLate =
                      job.endDate && job.exFactoryDate
                        ? new Date(job.endDate) > new Date(job.exFactoryDate)
                        : false;

                    const statusColor: Record<string, string> = {
                      DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                      PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      IN_PROGRESS:
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                      COMPLETED:
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    };

                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                        onClick={() => openJobPopup(job.id)}
                      >
                        <td className="px-4 py-3 font-medium text-blue-600 hover:underline whitespace-nowrap">
                          {job.orderNo}
                          {job.splitIndex != null && (
                            <span className="ml-1 text-xs text-gray-400">#{job.splitIndex}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{job.buyerName ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{job.styleNo ?? '—'}</td>
                        <td className="px-4 py-3 text-right">{job.allocatedQty.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{job.sam?.toFixed(2) ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{fmtDate(job.startDate)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{job.endDate ? fmtDate(job.endDate) : '—'}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isLate ? 'text-red-600 font-medium' : ''}`}>
                          {job.exFactoryDate ? fmtDate(job.exFactoryDate) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">{job.dailyTarget ?? '—'}</td>
                        <td className="px-4 py-3 text-right">{(job.completedQty ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${completionPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{completionPct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {job.efficiency != null ? (
                            <span
                              className={`font-medium ${
                                job.efficiency >= 70
                                  ? 'text-green-600'
                                  : job.efficiency >= 50
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {job.efficiency.toFixed(1)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              statusColor[job.status] ?? statusColor.DRAFT
                            }`}
                          >
                            {job.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Capacity / Daily plan summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Capacity Overview
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Available Days</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {summary.totalDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Booked Days</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {summary.bookedDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Free Days</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {summary.freeDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Utilization</span>
                <span
                  className={`font-medium ${
                    summary.utilizationPct >= 90
                      ? 'text-red-600'
                      : summary.utilizationPct >= 70
                        ? 'text-green-600'
                        : 'text-amber-600'
                  }`}
                >
                  {Math.round(summary.utilizationPct)}%
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Production Summary
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Allocated Qty</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {jobStats?.totalAllocated.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Completed Qty</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {jobStats?.totalCompleted.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">In Progress</span>
                <span className="font-medium text-amber-600">{jobStats?.inProgress} jobs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium text-green-600">{jobStats?.completed} jobs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Average Efficiency</span>
                <span
                  className={`font-medium ${
                    (jobStats?.avgEfficiency ?? 0) >= 70 ? 'text-green-600' : 'text-amber-600'
                  }`}
                >
                  {jobStats?.avgEfficiency}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
