/**
 * MergeDialog — confirmation dialog shown when user clicks "Merge" on selected jobs.
 * Lets user optionally choose a target line and start date before merging.
 */

import { useState } from 'react';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useMergeJobs, useBoardData } from '@/hooks/usePlanningBoard';

export default function MergeDialog() {
  const {
    selectedJobIds,
    clearSelection,
    mergeDialogOpen,
    closeMergeDialog,
    activeScenarioId,
    fromDate,
    toDate,
  } = usePlanningBoardStore();

  const { data: boardData } = useBoardData(activeScenarioId, fromDate, toDate);
  const mergeJobs = useMergeJobs();

  const [targetLineId, setTargetLineId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');

  if (!mergeDialogOpen || selectedJobIds.length < 2) return null;

  const lines = boardData?.lines ?? [];

  // Collect info about selected jobs from board data
  const selectedJobs = lines.flatMap((l) =>
    (l.jobs ?? []).filter((j: { id: number }) => selectedJobIds.includes(j.id)),
  );

  const totalQty = selectedJobs.reduce(
    (sum: number, j: { allocatedQty?: number }) => sum + (j.allocatedQty ?? 0),
    0,
  );

  const handleMerge = () => {
    mergeJobs.mutate(
      {
        jobIds: selectedJobIds,
        ...(targetLineId ? { targetLineId } : {}),
        ...(startDate ? { startDate } : {}),
      },
      {
        onSuccess: () => {
          clearSelection();
          closeMergeDialog();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeMergeDialog}>
      <div
        className="w-[440px] rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white">Merge Jobs</h3>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Merge {selectedJobIds.length} selected jobs into one ({totalQty.toLocaleString()} pcs total)
        </p>

        {/* Selected job summary */}
        <div className="mb-4 max-h-36 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700/50">
          {selectedJobs.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
                  <th className="py-0.5 text-left">Job</th>
                  <th className="py-0.5 text-left">Order</th>
                  <th className="py-0.5 text-right">Qty</th>
                  <th className="py-0.5 text-left">Line</th>
                </tr>
              </thead>
              <tbody>
                {selectedJobs.map((j) => (
                  <tr key={j.id} className="border-t border-gray-200 dark:border-gray-600">
                    <td className="py-0.5">#{j.id}</td>
                    <td className="py-0.5">{j.order?.orderNo ?? j.orderNo ?? '—'}</td>
                    <td className="py-0.5 text-right">{(j.allocatedQty ?? 0).toLocaleString()}</td>
                    <td className="py-0.5">{j.line?.lineName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400">Selected job details not available in current view</p>
          )}
        </div>

        {/* Target Line (optional) */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Target Line <span className="text-gray-400">(optional — defaults to first job&apos;s line)</span>
          </label>
          <select
            value={targetLineId ?? ''}
            onChange={(e) => setTargetLineId(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Same line</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>{l.lineName}</option>
            ))}
          </select>
        </div>

        {/* Start Date (optional) */}
        <div className="mb-5">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Start Date <span className="text-gray-400">(optional — defaults to earliest job start)</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={closeMergeDialog}
            className="rounded-lg px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={mergeJobs.isPending}
            className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {mergeJobs.isPending ? 'Merging...' : `Merge ${selectedJobIds.length} Jobs`}
          </button>
        </div>
      </div>
    </div>
  );
}
