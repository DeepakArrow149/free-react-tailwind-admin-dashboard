import { useMultiLineDashboard } from '@/hooks/useIeFloor';
import PageMeta from '@/components/common/PageMeta';

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  GREEN: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  YELLOW: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  RED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export default function MultiLineDashboardPage() {
  const { data, isLoading } = useMultiLineDashboard();
  const dashboard = data as {
    summary?: { totalLines: number; avgEfficiency: number; totalOutput: number; totalTarget: number; totalAlerts: number; greenCount: number; yellowCount: number; redCount: number };
    lines?: { lineId: number; lineName: string; efficiency: number; output: number; target: number; dhu: number; alertCount: number; openBreakdowns: number; operatorCount: number; changeoverActive: boolean; status: string }[];
  } | undefined;

  const summary = dashboard?.summary;
  const lines = dashboard?.lines ?? [];

  return (
    <>
      <PageMeta title="Multi-Line Dashboard" description="Factory floor overview across all lines" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Factory Floor Overview</h1>

        {isLoading && <p className="text-gray-500">Loading dashboard...</p>}

        {summary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              <KpiCard label="Lines" value={summary.totalLines} />
              <KpiCard label="Avg Efficiency" value={`${summary.avgEfficiency.toFixed(1)}%`} color={summary.avgEfficiency >= 85 ? 'text-green-600' : summary.avgEfficiency >= 70 ? 'text-yellow-600' : 'text-red-600'} />
              <KpiCard label="Total Output" value={summary.totalOutput} />
              <KpiCard label="Total Target" value={summary.totalTarget} />
              <KpiCard label="Alerts" value={summary.totalAlerts} color={summary.totalAlerts > 0 ? 'text-red-600' : undefined} />
              <KpiCard label="Green" value={summary.greenCount} color="text-green-600" />
              <KpiCard label="Yellow" value={summary.yellowCount} color="text-yellow-600" />
              <KpiCard label="Red" value={summary.redCount} color="text-red-600" />
            </div>

            {/* Line Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lines.map(line => {
                const s = statusStyles[line.status] ?? statusStyles.RED;
                return (
                  <div key={line.lineId} className={`rounded-xl border p-4 ${s.bg} ${s.border} dark:bg-gray-900 dark:border-gray-700`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 dark:text-white">{line.lineName}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.text} ${s.bg}`}>{line.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Efficiency</p>
                        <p className={`font-bold ${line.efficiency >= 85 ? 'text-green-600' : line.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{line.efficiency.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Output / Target</p>
                        <p className="font-medium text-gray-800 dark:text-white">{line.output} / {line.target}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">DHU</p>
                        <p className={`font-medium ${line.dhu > 5 ? 'text-red-600' : 'text-green-600'}`}>{line.dhu.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Operators</p>
                        <p className="font-medium text-gray-800 dark:text-white">{line.operatorCount}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {line.alertCount > 0 && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{line.alertCount} Alerts</span>}
                      {line.openBreakdowns > 0 && <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{line.openBreakdowns} Breakdowns</span>}
                      {line.changeoverActive && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Changeover</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!isLoading && !summary && <p className="text-gray-500">No data available. Ensure lines have active production data.</p>}
      </div>
    </>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color ?? 'text-gray-800 dark:text-white'}`}>{value}</p>
    </div>
  );
}
