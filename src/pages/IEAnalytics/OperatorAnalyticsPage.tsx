import { useState } from 'react';
import { useOperatorPerformanceCard, useCoverageReport, useSwingCandidates } from '@/hooks/useIeAnalytics';
import PageMeta from '@/components/common/PageMeta';

const riskColor: Record<string, string> = { NO_COVERAGE: 'bg-red-100 text-red-700', CRITICAL: 'bg-orange-100 text-orange-700', LOW: 'bg-yellow-100 text-yellow-700', HEALTHY: 'bg-green-100 text-green-700' };

export default function OperatorAnalyticsPage() {
  const [tab, setTab] = useState<'performance' | 'coverage' | 'swing'>('performance');

  return (
    <>
      <PageMeta title="Operator Analytics" description="Operator performance, coverage & swing candidates" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Operator Analytics</h1>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['performance', 'coverage', 'swing'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>
              {t === 'swing' ? 'Swing Candidates' : t === 'coverage' ? 'Skill Coverage' : 'Performance Card'}
            </button>
          ))}
        </div>

        {tab === 'performance' && <PerformancePanel />}
        {tab === 'coverage' && <CoveragePanel />}
        {tab === 'swing' && <SwingPanel />}
      </div>
    </>
  );
}

function PerformancePanel() {
  const [operatorId, setOperatorId] = useState<number>(0);
  const { data, isLoading } = useOperatorPerformanceCard(operatorId);
  const card = data as {
    operator?: { empCode: string; firstName: string; lastName: string };
    skills?: { machineType: string; skillLevel: number }[];
    incentiveHistory?: { date: string; efficiency: number; incentivePercent: number }[];
    defects?: { total: number; byType: Record<string, number> };
    currentAssignment?: { lineName: string; operationName: string } | null;
  } | undefined;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="number" placeholder="Enter Operator ID" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={operatorId || ''} onChange={e => setOperatorId(Number(e.target.value))} />
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {card?.operator && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{card.operator.firstName} {card.operator.lastName}</h3>
            <p className="text-sm text-gray-500">{card.operator.empCode}</p>
            {card.currentAssignment && (
              <p className="mt-2 text-sm text-blue-600">Currently: {card.currentAssignment.operationName} on {card.currentAssignment.lineName}</p>
            )}
          </div>

          {/* Skills */}
          {card.skills && card.skills.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <h4 className="mb-3 font-semibold text-gray-800 dark:text-white">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {card.skills.map((s, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600">
                    <p className="text-xs text-gray-500">{s.machineType}</p>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(l => (
                        <div key={l} className={`h-2 w-4 rounded-sm ${l <= s.skillLevel ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Defects */}
          {card.defects && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <h4 className="mb-2 font-semibold text-gray-800 dark:text-white">Defects (30 days)</h4>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.defects.total}</p>
              {Object.keys(card.defects.byType).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(card.defects.byType).map(([type, count]) => (
                    <span key={type} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{type}: {count as number}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incentive History */}
          {card.incentiveHistory && card.incentiveHistory.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Efficiency</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Incentive %</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {card.incentiveHistory.map((h, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-800 dark:text-white">{new Date(h.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right">{h.efficiency.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">{h.incentivePercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CoveragePanel() {
  const { data, isLoading } = useCoverageReport();
  const entries = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-gray-500">Loading...</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e: { operationId: number; operationName: string; operatorCount: number; riskLevel: string }) => (
          <div key={e.operationId} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-800 dark:text-white">{e.operationName}</h4>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskColor[e.riskLevel] ?? 'bg-gray-100'}`}>{e.riskLevel}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{e.operatorCount}</p>
            <p className="text-xs text-gray-500">skilled operators</p>
          </div>
        ))}
      </div>
      {!isLoading && entries.length === 0 && <p className="text-center text-gray-500">No coverage data available.</p>}
    </div>
  );
}

function SwingPanel() {
  const [minSkills, setMinSkills] = useState(2);
  const { data, isLoading } = useSwingCandidates({ minSkills });
  const candidates = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Min Skills:</span>
        {[2, 3, 4].map(n => (
          <button key={n} onClick={() => setMinSkills(n)} className={`rounded-lg px-3 py-1.5 text-sm ${minSkills === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{n}+</button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Operator</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Skills</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Avg Eff.</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Swing Score</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Skill Types</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {candidates.map((c: { operatorId: number; operatorName: string; skillCount: number; avgEfficiency: number; swingScore: number; skills: string[] }) => (
              <tr key={c.operatorId}>
                <td className="px-3 py-2 text-gray-800 dark:text-white">{c.operatorName}</td>
                <td className="px-3 py-2 text-right font-medium">{c.skillCount}</td>
                <td className="px-3 py-2 text-right">{c.avgEfficiency.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-bold text-blue-600">{c.swingScore.toFixed(1)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.skills.map(s => (
                      <span key={s} className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">{s}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && candidates.length === 0 && <p className="text-center text-gray-500">No swing candidates found.</p>}
    </div>
  );
}
