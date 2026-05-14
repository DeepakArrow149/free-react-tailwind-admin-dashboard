import { useMemo } from 'react';
import { Link } from 'react-router';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useBoardData, useLineSummary, useScenarios } from '@/hooks/usePlanningBoard';

/**
 * ProductionDashboard — overview page showing KPI cards, line utilization bars,
 * order completion radar, and capacity heat map for the active scenario.
 * Matches the reference screenshots for "Production Dashboard" view.
 */
export default function ProductionDashboard() {
  const { activeScenarioId, setActiveScenario, fromDate, toDate } = usePlanningBoardStore();
  const { data: scenarios } = useScenarios();
  const { data: boardData, isLoading } = useBoardData(activeScenarioId, fromDate, toDate);
  const { data: lineSummaries } = useLineSummary(activeScenarioId, fromDate, toDate);

  /* ── Auto-select first scenario ── */
  if (!activeScenarioId && scenarios && scenarios.length > 0) {
    setActiveScenario(scenarios[0].id);
  }

  /* ── Derived KPIs ── */
  const kpis = useMemo(() => {
    if (!boardData) return null;

    const totalJobs = boardData.lines.reduce((n, l) => n + l.jobs.length, 0);
    const totalQty = boardData.lines.reduce(
      (n, l) => n + l.jobs.reduce((q, j) => q + j.allocatedQty, 0),
      0,
    );
    const completedQty = boardData.lines.reduce(
      (n, l) => n + l.jobs.reduce((q, j) => q + (j.completedQty ?? 0), 0),
      0,
    );
    const lateJobs = boardData.alerts.filter((a) => a.type === 'DELIVERY_RISK').length;
    const overAllocated = boardData.alerts.filter((a) => a.type === 'OVER_ALLOCATION').length;
    const avgEfficiency = (() => {
      const effJobs = boardData.lines
        .flatMap((l) => l.jobs)
        .filter((j) => j.efficiency && j.efficiency > 0);
      if (effJobs.length === 0) return 0;
      return Math.round(effJobs.reduce((s, j) => s + (j.efficiency ?? 0), 0) / effJobs.length);
    })();

    return {
      totalLines: boardData.lines.length,
      totalJobs,
      totalQty,
      completedQty,
      completionPct: totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0,
      lateJobs,
      overAllocated,
      avgEfficiency,
      totalAlerts: boardData.alerts.length,
    };
  }, [boardData]);

  /* ── Order-type breakdown ── */
  const orderTypeBreakdown = useMemo(() => {
    if (!boardData) return [];
    const counts = new Map<string, { qty: number; jobs: number }>();
    for (const line of boardData.lines) {
      for (const job of line.jobs) {
        const ot = (job as unknown as Record<string, unknown>).orderType as string ?? 'CONFIRMED';
        const entry = counts.get(ot) ?? { qty: 0, jobs: 0 };
        entry.qty += job.allocatedQty;
        entry.jobs += 1;
        counts.set(ot, entry);
      }
    }
    const colorMap: Record<string, string> = {
      CONFIRMED: 'bg-green-500',
      PROJECT: 'bg-blue-500',
      SAMPLE: 'bg-purple-500',
      CMT: 'bg-amber-500',
      FOB: 'bg-indigo-500',
    };
    return Array.from(counts.entries()).map(([type, data]) => ({
      type, ...data, color: colorMap[type] ?? 'bg-gray-400',
    }));
  }, [boardData]);

  /* ── Line cards derived data ── */
  const lineCards = useMemo(() => {
    if (!boardData) return [];
    return boardData.lines.map((line) => {
      const jobCount = line.jobs.length;
      const allocatedQty = line.jobs.reduce((s, j) => s + j.allocatedQty, 0);
      const completedQty = line.jobs.reduce((s, j) => s + (j.completedQty ?? 0), 0);
      const completionPct = allocatedQty > 0 ? Math.round((completedQty / allocatedQty) * 100) : 0;
      const summaryItem = lineSummaries?.find((s) => s.lineId === line.id);
      const utilization = summaryItem?.utilizationPct ?? 0;
      const lateCount = line.jobs.filter((j) => {
        if (!j.endDate || !j.exFactoryDate) return false;
        return new Date(j.endDate) > new Date(j.exFactoryDate);
      }).length;

      return {
        id: line.id,
        lineName: line.lineName,
        department: line.department,
        operators: line.totalOperators ?? 0,
        jobCount,
        allocatedQty,
        completedQty,
        completionPct,
        utilization,
        lateCount,
      };
    });
  }, [boardData, lineSummaries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Production Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overview of all production lines &amp; order status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            title="Select planning scenario"
            value={activeScenarioId ?? ''}
            onChange={(e) => setActiveScenario(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
          >
            <option value="">Select Scenario</option>
            {scenarios?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isPublished ? '(Published)' : '(Draft)'}
              </option>
            ))}
          </select>
          <Link
            to="/planning/board"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Open Planning Board
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Lines', value: kpis.totalLines, icon: '🏭', color: 'blue' },
            { label: 'Total Jobs', value: kpis.totalJobs, icon: '📦', color: 'indigo' },
            { label: 'Allocated Qty', value: kpis.totalQty.toLocaleString(), icon: '👕', color: 'green' },
            { label: 'Completion', value: `${kpis.completionPct}%`, icon: '✅', color: 'emerald' },
            { label: 'Avg Efficiency', value: `${kpis.avgEfficiency}%`, icon: '⚡', color: kpis.avgEfficiency >= 70 ? 'green' : 'amber' },
            { label: 'Alerts', value: kpis.totalAlerts, icon: '⚠️', color: kpis.totalAlerts > 0 ? 'red' : 'gray' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert Summary Strip */}
      {kpis && (kpis.lateJobs > 0 || kpis.overAllocated > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 flex items-center gap-4">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">⚠ Attention:</span>
          {kpis.lateJobs > 0 && (
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {kpis.lateJobs} order(s) at delivery risk
            </span>
          )}
          {kpis.overAllocated > 0 && (
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {kpis.overAllocated} line(s) over-allocated
            </span>
          )}
        </div>
      )}

      {/* Order-type Breakdown */}
      {orderTypeBreakdown.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            Order Classification
          </h3>
          <div className="flex gap-4 flex-wrap">
            {orderTypeBreakdown.map((ot) => (
              <div
                key={ot.type}
                className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-3"
              >
                <div className={`w-3 h-3 rounded-full ${ot.color}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{ot.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ot.jobs} jobs · {ot.qty.toLocaleString()} pcs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line Utilization Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          Line Utilization & Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lineCards.map((line) => {
            const utilizationColor =
              line.utilization >= 90
                ? 'bg-red-500'
                : line.utilization >= 70
                  ? 'bg-green-500'
                  : line.utilization >= 40
                    ? 'bg-amber-500'
                    : 'bg-gray-400';

            return (
              <Link
                key={line.id}
                to={`/planning/line/${line.id}`}
                className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {line.lineName}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {line.department}
                    </span>
                  </div>
                  {line.lateCount > 0 && (
                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-xs font-medium">
                      {line.lateCount} late
                    </span>
                  )}
                </div>

                {/* Utilization bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Utilization</span>
                    <span className="font-medium">{Math.round(line.utilization)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                    <div
                      className={`h-2 rounded-full ${utilizationColor} transition-all`}
                      style={{ width: `${Math.min(100, line.utilization)}%` }}
                    />
                  </div>
                </div>

                {/* Completion bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Completion</span>
                    <span className="font-medium">{line.completionPct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${line.completionPct}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">{line.operators}</p>
                    <p className="text-[10px] text-gray-500">Operators</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">{line.jobCount}</p>
                    <p className="text-[10px] text-gray-500">Jobs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      {line.allocatedQty > 999
                        ? `${(line.allocatedQty / 1000).toFixed(1)}K`
                        : line.allocatedQty}
                    </p>
                    <p className="text-[10px] text-gray-500">Qty</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick summary table */}
      {boardData && boardData.lines.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            Orders on Lines
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Line', 'Department', 'Operators', 'Jobs', 'Allocated', 'Completed', 'Completion %', 'Utilization %'].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {lineCards.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to={`/planning/line/${line.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {line.lineName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{line.department}</td>
                    <td className="px-4 py-3 text-right">{line.operators}</td>
                    <td className="px-4 py-3 text-right">{line.jobCount}</td>
                    <td className="px-4 py-3 text-right">{line.allocatedQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{line.completedQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          line.completionPct >= 80
                            ? 'text-green-600'
                            : line.completionPct >= 50
                              ? 'text-amber-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {line.completionPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          line.utilization >= 90
                            ? 'text-red-600'
                            : line.utilization >= 70
                              ? 'text-green-600'
                              : 'text-amber-600'
                        }`}
                      >
                        {Math.round(line.utilization)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
