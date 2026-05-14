import { useState } from 'react';
import { useLines } from '@/hooks/useLineBalancing';
import { useIncentiveCalc, useSaveIncentives, useIncentiveRecords } from '@/hooks/useIeAnalytics';
import PageMeta from '@/components/common/PageMeta';
import { toast } from 'sonner';

export default function IncentiveCalcPage() {
  const [tab, setTab] = useState<'calculate' | 'records'>('calculate');

  return (
    <>
      <PageMeta title="Incentive Calculator" description="Calculate and manage incentive records" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Incentive Calculator</h1>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['calculate', 'records'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>
              {t === 'calculate' ? 'Calculate Incentive' : 'Records'}
            </button>
          ))}
        </div>

        {tab === 'calculate' && <CalcPanel />}
        {tab === 'records' && <RecordsPanel />}
      </div>
    </>
  );
}

function CalcPanel() {
  const { data: lines } = useLines();
  const lineOptions = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: result, isLoading, refetch } = useIncentiveCalc(lineId, date);
  const calcResult = result as {
    lineEfficiency?: number;
    operators?: { operatorId: number; operatorName: string; individualEfficiency: number; weightedEfficiency: number; incentivePercent: number; incentiveAmount: number }[];
  } | undefined;

  const saveMut = useSaveIncentives();

  const handleCalc = () => {
    if (!lineId) { toast.error('Select a line'); return; }
    refetch();
  };

  const handleSave = () => {
    if (!lineId || !calcResult?.operators?.length) return;
    saveMut.mutate({ lineId, date, operators: calcResult.operators.map(o => ({ operatorId: o.operatorId, incentivePercent: o.incentivePercent })) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Line</label>
          <select value={lineId} onChange={e => setLineId(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
            <option value={0}>Select line</option>
            {lineOptions.map((l: { id: number; name: string }) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
        </div>
        <button onClick={handleCalc} disabled={isLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      {calcResult && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs text-gray-500">Line Efficiency</p>
              <p className="text-2xl font-bold text-blue-600">{(calcResult.lineEfficiency ?? 0).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs text-gray-500">Operators</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{calcResult.operators?.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">{date}</p>
            </div>
          </div>

          {/* Operator breakdown */}
          {calcResult.operators && calcResult.operators.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Operator</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Individual Eff</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Weighted Eff</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Incentive %</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Amount</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {calcResult.operators.map(o => (
                    <tr key={o.operatorId}>
                      <td className="px-3 py-2 text-gray-800 dark:text-white">{o.operatorName}</td>
                      <td className="px-3 py-2 text-right">{o.individualEfficiency.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right">{o.weightedEfficiency.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">{o.incentivePercent.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-bold">{o.incentiveAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={handleSave} disabled={saveMut.isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
            {saveMut.isPending ? 'Saving...' : 'Save Incentive Records'}
          </button>
        </>
      )}
    </div>
  );
}

function RecordsPanel() {
  const { data: lines } = useLines();
  const lineOptions = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useIncentiveRecords(lineId, from, to);
  const records = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Line</label>
          <select value={lineId} onChange={e => setLineId(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
            <option value={0}>All Lines</option>
            {lineOptions.map((l: { id: number; name: string }) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading records...</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Operator</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Line</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Efficiency</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Incentive %</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {records.map((r: { id: number; date: string; operatorName: string; lineName: string; efficiency: number; incentivePercent: number; amount: number }) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-gray-800 dark:text-white">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-gray-800 dark:text-white">{r.operatorName}</td>
                <td className="px-3 py-2 text-gray-500">{r.lineName}</td>
                <td className="px-3 py-2 text-right">{r.efficiency.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-green-600">{r.incentivePercent.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-bold">{r.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && records.length === 0 && <p className="text-center py-4 text-gray-500">No records found for the selected criteria.</p>}
    </div>
  );
}
