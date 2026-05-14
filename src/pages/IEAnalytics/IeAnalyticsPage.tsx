import { useState } from 'react';
import { useProductionTrend, useFatigueAnalysis, useSmvVariance, useHeadcountTrend } from '@/hooks/useIeAnalytics';
import { useLines } from '@/hooks/useLineBalancing';
import PageMeta from '@/components/common/PageMeta';

const flagColor: Record<string, string> = { HIGH_VARIANCE: 'bg-red-100 text-red-700', MODERATE: 'bg-yellow-100 text-yellow-700', OK: 'bg-green-100 text-green-700' };

export default function IeAnalyticsPage() {
  const { data: linesData } = useLines();
  const lines = (linesData as { data?: { id: number; lineName: string }[] })?.data ?? linesData ?? [];
  const lineList = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const [tab, setTab] = useState<'trend' | 'fatigue' | 'smv' | 'headcount'>('trend');

  return (
    <>
      <PageMeta title="IE Analytics" description="Production analytics and insights" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">IE Analytics</h1>
          <select className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={lineId} onChange={e => setLineId(Number(e.target.value))}>
            <option value={0}>Select Line</option>
            {lineList.map((l: { id: number; lineName: string }) => <option key={l.id} value={l.id}>{l.lineName}</option>)}
          </select>
        </div>

        {!lineId && <p className="text-gray-500">Select a line to view analytics.</p>}

        {lineId > 0 && (
          <>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {(['trend', 'fatigue', 'smv', 'headcount'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>
                  {t === 'smv' ? 'SMV Variance' : t === 'trend' ? 'Production Trend' : t === 'fatigue' ? 'Fatigue Analysis' : 'Headcount'}
                </button>
              ))}
            </div>

            {tab === 'trend' && <TrendPanel lineId={lineId} />}
            {tab === 'fatigue' && <FatiguePanel lineId={lineId} />}
            {tab === 'smv' && <SmvPanel lineId={lineId} />}
            {tab === 'headcount' && <HeadcountPanel lineId={lineId} />}
          </>
        )}
      </div>
    </>
  );
}

function TrendPanel({ lineId }: { lineId: number }) {
  const [days, setDays] = useState(14);
  const { data, isLoading } = useProductionTrend(lineId, { days });
  const points = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Period:</span>
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-sm ${days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{d}d</button>
        ))}
      </div>
      {isLoading && <p className="text-gray-500">Loading...</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Output</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Target</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Efficiency</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">7d MA</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {points.map((p: { date: string; output: number; target: number; efficiency: number; movingAvg7d: number | null }) => (
              <tr key={p.date}>
                <td className="px-3 py-2 text-gray-800 dark:text-white">{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right text-gray-600">{p.output}</td>
                <td className="px-3 py-2 text-right text-gray-600">{p.target}</td>
                <td className={`px-3 py-2 text-right font-semibold ${p.efficiency >= 85 ? 'text-green-600' : p.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{p.efficiency.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.movingAvg7d != null ? p.movingAvg7d.toFixed(1) + '%' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FatiguePanel({ lineId }: { lineId: number }) {
  const { data, isLoading } = useFatigueAnalysis(lineId);
  const fatigue = data as { peakEfficiency?: number; endEfficiency?: number; fatigueScore?: number; trend?: string; hourlyData?: { hour: number; efficiency: number }[] } | undefined;

  if (isLoading) return <p className="text-gray-500">Analysing fatigue...</p>;
  if (!fatigue) return <p className="text-gray-500">No fatigue data available.</p>;

  const trendColor = fatigue.trend === 'DECLINING' ? 'text-red-600' : fatigue.trend === 'MODERATE_DECLINE' ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Fatigue Score" value={`${(fatigue.fatigueScore ?? 0).toFixed(0)}/100`} color={(fatigue.fatigueScore ?? 0) > 50 ? 'text-red-600' : 'text-green-600'} />
        <KpiCard label="Peak Efficiency" value={`${(fatigue.peakEfficiency ?? 0).toFixed(1)}%`} />
        <KpiCard label="End Efficiency" value={`${(fatigue.endEfficiency ?? 0).toFixed(1)}%`} />
        <KpiCard label="Trend" value={fatigue.trend ?? 'N/A'} color={trendColor} />
      </div>
      {fatigue.hourlyData && fatigue.hourlyData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Hourly Efficiency</h3>
          <div className="flex items-end gap-2" style={{ height: 150 }}>
            {fatigue.hourlyData.map(h => (
              <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{h.efficiency.toFixed(0)}%</span>
                <div className={`w-full rounded-t ${h.efficiency >= 85 ? 'bg-green-400' : h.efficiency >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ height: Math.max(4, h.efficiency * 1.4) }} />
                <span className="text-xs text-gray-400">H{h.hour}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SmvPanel({ lineId }: { lineId: number }) {
  const { data, isLoading } = useSmvVariance(lineId);
  const items = Array.isArray(data) ? data : [];

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800"><tr>
          <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Operation</th>
          <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Standard SAM</th>
          <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Actual SAM</th>
          <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Variance %</th>
          <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">Flag</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item: { operationId: number; operationName: string; standardSAM: number; actualSAM: number; variancePercent: number; flag: string }) => (
            <tr key={item.operationId}>
              <td className="px-3 py-2 text-gray-800 dark:text-white">{item.operationName}</td>
              <td className="px-3 py-2 text-right text-gray-600">{item.standardSAM.toFixed(3)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{item.actualSAM.toFixed(3)}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-white">{item.variancePercent.toFixed(1)}%</td>
              <td className="px-3 py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${flagColor[item.flag] ?? 'bg-gray-100'}`}>{item.flag}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="p-4 text-center text-gray-500">No SMV variance data available.</p>}
    </div>
  );
}

function HeadcountPanel({ lineId }: { lineId: number }) {
  const [days, setDays] = useState(14);
  const { data, isLoading } = useHeadcountTrend(lineId, { days });
  const points = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Period:</span>
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-sm ${days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{d}d</button>
        ))}
      </div>
      {isLoading && <p className="text-gray-500">Loading...</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Operator Count</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {points.map((p: { date: string; operatorCount: number }) => (
              <tr key={p.date}>
                <td className="px-3 py-2 text-gray-800 dark:text-white">{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-white">{p.operatorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color ?? 'text-gray-800 dark:text-white'}`}>{value}</p>
    </div>
  );
}
