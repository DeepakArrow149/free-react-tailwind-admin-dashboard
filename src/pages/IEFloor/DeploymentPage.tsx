import { useState } from 'react';
import { useDeployment, usePreviewRebalance, useApplyRebalance } from '@/hooks/useIeFloor';
import { useLines } from '@/hooks/useLineBalancing';
import PageMeta from '@/components/common/PageMeta';

export default function DeploymentPage() {
  const { data: linesData } = useLines();
  const lines = (linesData as { data?: { id: number; lineName: string }[] })?.data ?? linesData ?? [];
  const lineList = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const { data: deployment, isLoading } = useDeployment(lineId);
  const preview = usePreviewRebalance();
  const apply = useApplyRebalance(lineId);

  const entries = Array.isArray(deployment) ? deployment : [];
  const [absentIds, setAbsentIds] = useState<string>('');
  const previewData = preview.data as { data?: { reassignments?: { operatorId: number; operatorName: string; fromOperationId: number; toOperationId: number; reason: string }[]; unassigned?: number[] } } | undefined;

  return (
    <>
      <PageMeta title="Deployment & Rebalance" description="Manage operator deployment and rebalancing" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Deployment & Rebalance</h1>
          <select className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={lineId} onChange={e => setLineId(Number(e.target.value))} aria-label="Select production line">
            <option value={0}>Select Line</option>
            {lineList.map((l: { id: number; lineName: string }) => <option key={l.id} value={l.id}>{l.lineName}</option>)}
          </select>
        </div>

        {!lineId && <p className="text-gray-500">Select a line to view deployment.</p>}

        {lineId > 0 && (
          <>
            {/* Current Deployment */}
            {isLoading && <p className="text-gray-500">Loading...</p>}
            {entries.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Current Deployment</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry: { operationId: number; operationName: string; operators: { id: number; empCode: string; firstName: string; lastName: string }[] }) => (
                    <div key={entry.operationId} className="rounded-lg border border-gray-200 p-3 dark:border-gray-600 dark:bg-gray-800">
                      <p className="font-medium text-gray-800 dark:text-white">{entry.operationName}</p>
                      {entry.operators.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {entry.operators.map(op => (
                            <li key={op.id} className="text-sm text-gray-600 dark:text-gray-300">
                              {op.firstName} {op.lastName} <span className="text-gray-400">({op.empCode})</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-red-500">No operator assigned</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rebalance */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Rebalance (Absent Operators)</h2>
              <p className="mb-3 text-sm text-gray-500">Enter comma-separated operator IDs who are absent today.</p>
              <div className="flex flex-wrap gap-3">
                <input placeholder="e.g. 12, 34, 56" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={absentIds} onChange={e => setAbsentIds(e.target.value)} />
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={!absentIds.trim() || preview.isPending}
                  onClick={() => {
                    const ids = absentIds.split(',').map(s => Number(s.trim())).filter(Boolean);
                    preview.mutate({ lineId, absentOperatorIds: ids });
                  }}
                >
                  Preview Rebalance
                </button>
              </div>
            </div>

            {/* Preview Results */}
            {previewData?.data && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
                <h3 className="mb-4 font-semibold text-blue-800 dark:text-blue-300">Rebalance Preview</h3>
                {previewData.data.reassignments && previewData.data.reassignments.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead><tr>
                          <th className="px-3 py-2 text-left text-blue-700">Operator</th>
                          <th className="px-3 py-2 text-left text-blue-700">From Op</th>
                          <th className="px-3 py-2 text-left text-blue-700">To Op</th>
                          <th className="px-3 py-2 text-left text-blue-700">Reason</th>
                        </tr></thead>
                        <tbody className="divide-y divide-blue-100">
                          {previewData.data.reassignments.map((r, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-gray-800 dark:text-white">{r.operatorName}</td>
                              <td className="px-3 py-2">{r.fromOperationId}</td>
                              <td className="px-3 py-2">{r.toOperationId}</td>
                              <td className="px-3 py-2 text-gray-500">{r.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.data.unassigned && previewData.data.unassigned.length > 0 && (
                      <p className="mt-2 text-sm text-orange-600">Unassigned operators: {previewData.data.unassigned.join(', ')}</p>
                    )}
                    <button
                      className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      disabled={apply.isPending}
                      onClick={() => {
                        const ids = absentIds.split(',').map(s => Number(s.trim())).filter(Boolean);
                        apply.mutate({ lineId, absentOperatorIds: ids });
                      }}
                    >
                      {apply.isPending ? 'Applying...' : 'Apply Rebalance'}
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500">No reassignments needed.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
