import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { PageMeta } from '@/components/common';
import { useSimulation, useBulletinsForLayout } from '@/hooks/useLineBalancing';
import type { SimulationResult, SimulationScenario, BulletinForLayout } from '@/api/lineBalancing';

const fmtMin = (m: number) => `${m.toFixed(2)} min`;

export default function SimulationPage() {
  const simulation = useSimulation();
  const { data: bulletins } = useBulletinsForLayout();
  const bulletinList = Array.isArray(bulletins) ? bulletins : [];
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    bulletinId: '',
    manpowerMin: '10',
    manpowerMax: '30',
    manpowerStep: '2',
    workingMinutes: '480',
  });

  // Pre-fill bulletinId from URL query param (e.g. from Line Balancing page)
  useEffect(() => {
    const bid = searchParams.get('bulletinId');
    if (bid) setForm(prev => ({ ...prev, bulletinId: bid }));
  }, [searchParams]);

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  const handleSimulate = async () => {
    const res = await simulation.mutateAsync({
      bulletinId: Number(form.bulletinId),
      manpowerMin: Number(form.manpowerMin),
      manpowerMax: Number(form.manpowerMax),
      manpowerStep: Number(form.manpowerStep),
      workingMinutes: Number(form.workingMinutes),
    });
    const data = (res as { data?: SimulationResult })?.data ?? res;
    setResult(data as SimulationResult);
    if ((data as SimulationResult).scenarios.length > 0) {
      setSelectedScenario(0);
    }
  };

  const activeScenario: SimulationScenario | null =
    result && selectedScenario !== null ? result.scenarios[selectedScenario] : null;

  return (
    <>
      <PageMeta title="Manpower Simulation" description="Simulate manpower scenarios for production line planning" />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manpower Simulation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sweep manpower levels to find optimal production targets per line.
        </p>

        {/* Input form */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
          <h3 className="text-sm font-semibold dark:text-white">Simulation Parameters</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bulletin</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.bulletinId}
                onChange={(e) => setForm({ ...form, bulletinId: e.target.value })}
                aria-label="Select bulletin"
              >
                <option value="">Select Bulletin</option>
                {bulletinList.map((b: BulletinForLayout) => (
                  <option key={b.id} value={b.id}>
                    {b.bulletinNo} — {b.style.styleName} ({b._count.items} ops, SAM {Number(b.totalSam).toFixed(1)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Manpower</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.manpowerMin}
                onChange={(e) => setForm({ ...form, manpowerMin: e.target.value })}
                aria-label="Minimum manpower"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Manpower</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.manpowerMax}
                onChange={(e) => setForm({ ...form, manpowerMax: e.target.value })}
                aria-label="Maximum manpower"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Step</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.manpowerStep}
                onChange={(e) => setForm({ ...form, manpowerStep: e.target.value })}
                aria-label="Manpower step"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Working Minutes</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.workingMinutes}
                onChange={(e) => setForm({ ...form, workingMinutes: e.target.value })}
                aria-label="Working minutes per day"
              />
            </div>
          </div>
          <button
            onClick={handleSimulate}
            disabled={simulation.isPending || !form.bulletinId}
            className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            aria-label="Run simulation"
          >
            {simulation.isPending ? 'Simulating…' : 'Run Simulation'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Bulletin info */}
            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Bulletin: <strong className="text-gray-900 dark:text-white">{result.bulletin.bulletinNo}</strong> ·
                Total SAM: <strong>{Number(result.bulletin.totalSam).toFixed(2)} min</strong> ·
                Operations: <strong>{result.operations.length}</strong>
              </div>
            </div>

            {/* Scenario selector — horizontal cards */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {result.scenarios.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedScenario(idx)}
                  className={`shrink-0 rounded-xl border p-3 text-center transition min-w-[120px] ${
                    selectedScenario === idx
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
                  }`}
                  aria-label={`Scenario: ${sc.manpower} MP`}
                >
                  <div className="text-lg font-bold dark:text-white">{sc.manpower}</div>
                  <div className="text-[10px] uppercase text-gray-400">Manpower</div>
                  <div className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">{sc.targetPerHour}/hr</div>
                  <div className="text-xs text-gray-500">{sc.targetPerDay}/day</div>
                </button>
              ))}
            </div>

            {/* Scenario detail */}
            {activeScenario && (
              <div className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <div className="text-xs text-gray-400">Manpower</div>
                    <div className="text-xl font-bold dark:text-white">{activeScenario.manpower}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <div className="text-xs text-gray-400">Pitch Time</div>
                    <div className="text-xl font-bold dark:text-white">{fmtMin(activeScenario.pitchTime)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <div className="text-xs text-gray-400">Target / Hour</div>
                    <div className="text-xl font-bold text-brand-600 dark:text-brand-400">{activeScenario.targetPerHour}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <div className="text-xs text-gray-400">Target / Day</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{activeScenario.targetPerDay}</div>
                  </div>
                </div>

                {/* Operations table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 font-medium">Operation</th>
                        <th className="px-4 py-3 font-medium">Machine Type</th>
                        <th className="px-4 py-3 font-medium text-right">SAM</th>
                        <th className="px-4 py-3 font-medium text-right">Theor. MP</th>
                        <th className="px-4 py-3 font-medium text-right">Assigned MP</th>
                        <th className="px-4 py-3 font-medium text-right">Utilization</th>
                        <th className="px-4 py-3 font-medium text-center">Grade</th>
                        <th className="px-4 py-3 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {activeScenario.operations.map((op) => {
                        // Look up grade from top-level operations list
                        const opMeta = result.operations.find(o => o.id === op.operationId);
                        const grade = opMeta?.grade ?? '—';
                        const GRADE_STYLE: Record<string, string> = {
                          A: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                          C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        };
                        return (
                        <tr
                          key={op.operationId}
                          className={op.isBottleneck ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                        >
                          <td className="px-4 py-2 font-medium dark:text-white">{op.operationName}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{op.machineType ?? '—'}</td>
                          <td className="px-4 py-2 text-right font-mono text-xs">{Number(op.sam).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono text-xs">{op.theoreticalMp.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono text-xs font-bold">{op.assignedMp}</td>
                          <td className="px-4 py-2 text-right font-mono text-xs">
                            <span className={op.utilization > 100 ? 'text-red-600 font-bold' : ''}>
                              {op.utilization.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GRADE_STYLE[grade] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {grade}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {op.isBottleneck ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                BTN
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
