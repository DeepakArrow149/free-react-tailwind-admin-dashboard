import { useState } from 'react';
import { useGarmentTypes, useAnalyseGarment } from '@/hooks/useIeTools';
import PageMeta from '@/components/common/PageMeta';

export default function GarmentAnalyserPage() {
  const { data: typesData } = useGarmentTypes();
  const analyse = useAnalyseGarment();
  const types = Array.isArray(typesData) ? typesData : [];

  const [garmentType, setGarmentType] = useState('');
  const [complexity, setComplexity] = useState('MEDIUM');

  const result = analyse.data as {
    data?: {
      garmentType: string;
      complexity: string;
      operations: { seqNo: number; operationName: string; machineType: string; estimatedSAM: number; isOptional: boolean }[];
      totalSAM: number;
      estimatedPcsPerHour85: number;
      machineRequirements: Record<string, number>;
    };
  } | undefined;

  const analysis = result?.data;

  return (
    <>
      <PageMeta title="Garment Analyser" description="Analyse garment construction and estimate SAM" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Garment Analyser</h1>

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Select Garment</h3>
          <div className="flex flex-wrap gap-4">
            <select className="rounded-lg border px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={garmentType} onChange={e => setGarmentType(e.target.value)}>
              <option value="">Select Garment Type</option>
              {types.map((t: { type: string; complexities: string[] }) => (
                <option key={t.type} value={t.type}>{t.type}</option>
              ))}
            </select>
            <select className="rounded-lg border px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={complexity} onChange={e => setComplexity(e.target.value)}>
              <option value="SIMPLE">Simple</option>
              <option value="MEDIUM">Medium</option>
              <option value="COMPLEX">Complex</option>
            </select>
            <button className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!garmentType || analyse.isPending} onClick={() => analyse.mutate({ garmentType, complexity })}>
              {analyse.isPending ? 'Analysing...' : 'Analyse'}
            </button>
          </div>
        </div>

        {/* Results */}
        {analysis && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Garment Type" value={analysis.garmentType} />
              <KpiCard label="Complexity" value={analysis.complexity} />
              <KpiCard label="Total SAM" value={analysis.totalSAM.toFixed(2)} color="text-blue-600" />
              <KpiCard label="Est. Pcs/Hr (85%)" value={analysis.estimatedPcsPerHour85.toFixed(1)} color="text-green-600" />
            </div>

            {/* Operations Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">#</th>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Operation</th>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Machine</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">SAM</th>
                  <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">Optional</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {analysis.operations.map(op => (
                    <tr key={op.seqNo} className={op.isOptional ? 'opacity-60' : ''}>
                      <td className="px-3 py-2 text-gray-500">{op.seqNo}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-white">{op.operationName}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{op.machineType}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-white">{op.estimatedSAM.toFixed(3)}</td>
                      <td className="px-3 py-2 text-center">{op.isOptional ? '✓' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Machine Requirements */}
            {Object.keys(analysis.machineRequirements).length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Machine Requirements</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(analysis.machineRequirements).map(([machine, count]) => (
                    <div key={machine} className="rounded-lg border border-gray-200 px-4 py-3 text-center dark:border-gray-600 dark:bg-gray-800">
                      <p className="text-xs text-gray-500">{machine}</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">{count as number}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Available Types */}
        {types.length > 0 && !analysis && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Available Garment Types</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {types.map((t: { type: string; complexities: string[] }) => (
                <div key={t.type} className="rounded-lg border border-gray-200 p-3 dark:border-gray-600 dark:bg-gray-800">
                  <p className="font-medium text-gray-800 dark:text-white">{t.type}</p>
                  <div className="mt-1 flex gap-1">
                    {t.complexities.map(c => (
                      <span key={c} className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
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
