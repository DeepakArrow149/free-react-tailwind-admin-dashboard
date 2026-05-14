import { useState } from 'react';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useRecordProgress, useJobDetail } from '@/hooks/usePlanningBoard';

export default function ProgressEntryPopup() {
  const { progressPopupId, closeProgressPopup } = usePlanningBoardStore();
  const { data: job } = useJobDetail(progressPopupId);
  const recordProgress = useRecordProgress();

  const [form, setForm] = useState({
    progressDate: new Date().toISOString().slice(0, 10),
    cuttingQty: '',
    sewingInputQty: '',
    sewingOutputQty: '',
    qcPassQty: '',
    finishingQty: '',
    packedQty: '',
    operatorCount: '',
    workedHours: '',
    remarks: '',
  });

  if (!progressPopupId) return null;

  const handleSubmit = () => {
    recordProgress.mutate({
      jobId: progressPopupId,
      data: {
        progressDate: form.progressDate,
        cuttingQty: form.cuttingQty ? Number(form.cuttingQty) : undefined,
        sewingInputQty: form.sewingInputQty ? Number(form.sewingInputQty) : undefined,
        sewingOutputQty: form.sewingOutputQty ? Number(form.sewingOutputQty) : undefined,
        qcPassQty: form.qcPassQty ? Number(form.qcPassQty) : undefined,
        finishingQty: form.finishingQty ? Number(form.finishingQty) : undefined,
        packedQty: form.packedQty ? Number(form.packedQty) : undefined,
        operatorCount: form.operatorCount ? Number(form.operatorCount) : undefined,
        workedHours: form.workedHours ? Number(form.workedHours) : undefined,
        remarks: form.remarks || undefined,
      },
    }, {
      onSuccess: () => closeProgressPopup(),
    });
  };

  const fields: Array<{ key: keyof typeof form; label: string; type: string }> = [
    { key: 'cuttingQty', label: 'Cutting', type: 'number' },
    { key: 'sewingInputQty', label: 'Sewing Input', type: 'number' },
    { key: 'sewingOutputQty', label: 'Sewing Output', type: 'number' },
    { key: 'qcPassQty', label: 'QC Pass', type: 'number' },
    { key: 'finishingQty', label: 'Finishing', type: 'number' },
    { key: 'packedQty', label: 'Packed', type: 'number' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeProgressPopup}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[480px] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
          Record Daily Progress
        </h3>
        {job && (
          <p className="text-xs text-gray-500 mb-4">
            {job.order?.orderNo ?? `Job #${job.id}`} · {job.order?.buyer?.name ?? ''} · {job.allocatedQty} pcs
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={form.progressDate}
              onChange={(e) => setForm({ ...form, progressDate: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-white"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Operators</label>
              <input
                type="number"
                min="0"
                value={form.operatorCount}
                onChange={(e) => setForm({ ...form, operatorCount: e.target.value })}
                placeholder={job?.plannedOperators?.toString() ?? '0'}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Worked Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.workedHours}
                onChange={(e) => setForm({ ...form, workedHours: e.target.value })}
                placeholder="8"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional notes..."
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={closeProgressPopup}
            className="text-xs px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={recordProgress.isPending}
            className="text-xs px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {recordProgress.isPending ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
