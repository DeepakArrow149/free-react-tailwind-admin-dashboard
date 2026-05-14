import { useState } from 'react';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useSplitJob, useJobDetail, useBoardData } from '@/hooks/usePlanningBoard';

export default function SplitDialog() {
  const { splitDialogId, closeSplitDialog, activeScenarioId, fromDate, toDate } = usePlanningBoardStore();
  const { data: job } = useJobDetail(splitDialogId);
  const { data: boardData } = useBoardData(activeScenarioId, fromDate, toDate);
  const splitJob = useSplitJob();

  const [splitCount, setSplitCount] = useState(2);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [customQtys, setCustomQtys] = useState<string[]>([]);

  if (!splitDialogId || !job) return null;

  const lines = boardData?.lines ?? [];
  const evenQty = Math.floor(job.allocatedQty / splitCount);
  const remainder = job.allocatedQty % splitCount;

  const handleSplit = () => {
    const quantities = customQtys.length === splitCount && customQtys.every(q => Number(q) > 0)
      ? customQtys.map(Number)
      : undefined;
    const lineIds = selectedLines.length === splitCount ? selectedLines : undefined;

    splitJob.mutate({
      id: splitDialogId,
      data: { splitCount, lineIds, quantities },
    }, {
      onSuccess: () => closeSplitDialog(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeSplitDialog}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[480px] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Split Job</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {job.order?.orderNo ?? `Job #${job.id}`} · {job.allocatedQty.toLocaleString()} pcs
        </p>

        <div className="space-y-4">
          {/* Split count */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Number of Splits
            </label>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setSplitCount(n);
                    setSelectedLines([]);
                    setCustomQtys([]);
                  }}
                  className={`w-10 h-8 text-xs rounded border transition-colors ${
                    splitCount === n
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Split distribution */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
              Split Distribution
            </label>
            <div className="space-y-2">
              {Array.from({ length: splitCount }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-14">Split {i + 1}:</span>
                  <input
                    type="number"
                    min="1"
                    aria-label={`Split ${i + 1} quantity`}
                    value={customQtys[i] ?? (evenQty + (i < remainder ? 1 : 0))}
                    onChange={(e) => {
                      const newQtys = [...customQtys];
                      while (newQtys.length < splitCount) newQtys.push('');
                      newQtys[i] = e.target.value;
                      setCustomQtys(newQtys);
                    }}
                    placeholder={String(evenQty + (i < remainder ? 1 : 0))}
                    className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400">pcs →</span>
                  <select
                    aria-label={`Split ${i + 1} target line`}
                    value={selectedLines[i] ?? ''}
                    onChange={(e) => {
                      const newLines = [...selectedLines];
                      while (newLines.length < splitCount) newLines.push(0);
                      newLines[i] = Number(e.target.value);
                      setSelectedLines(newLines);
                    }}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Same line</option>
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lineName} ({l.department})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Visual preview */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 mb-1">Preview</div>
            <div className="flex gap-1 h-6">
              {Array.from({ length: splitCount }, (_, i) => {
                const qty = customQtys[i] ? Number(customQtys[i]) : (evenQty + (i < remainder ? 1 : 0));
                const pct = Math.round((qty / job.allocatedQty) * 100);
                const colors = ['bg-blue-400', 'bg-green-400', 'bg-amber-400', 'bg-purple-400', 'bg-pink-400'];
                return (
                  <div
                    key={i}
                    className={`${colors[i % colors.length]} rounded text-[9px] text-white flex items-center justify-center font-medium`}
                    style={{ width: `${pct}%` }}
                  >
                    {qty}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={closeSplitDialog}
            className="text-xs px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSplit}
            disabled={splitJob.isPending}
            className="text-xs px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {splitJob.isPending ? 'Splitting...' : `Split into ${splitCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}
