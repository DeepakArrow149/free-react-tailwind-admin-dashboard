import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "../../../components/ui/Modal";
import { bulletinApi, type BulletinDetail, type GenerateBulletinInput } from "../../../api/production";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  styleId: number;
  styleNo: string;
  totalSam: number;
  totalOps: number;
  onGenerated: (bulletin: BulletinDetail) => void;
}

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-1 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function GenerateBulletinDialog({
  isOpen,
  onClose,
  styleId,
  styleNo,
  totalSam,
  totalOps,
  onGenerated,
}: Props) {
  const [manpower, setManpower] = useState(0);
  const [machines, setMachines] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [generating, setGenerating] = useState(false);

  const estimatedTarget =
    manpower > 0 && totalSam > 0
      ? Math.round((60 / totalSam) * manpower)
      : totalSam > 0
        ? Math.round(60 / totalSam)
        : 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const payload: GenerateBulletinInput = {
        styleId,
        manpower: manpower || 0,
        machines: machines || 0,
        remarks: remarks || undefined,
      };
      const res = await bulletinApi.generateFromStyle(payload);
      const bulletin = res.data;
      toast.success(`Bulletin ${bulletin.bulletinNo} generated with ${totalOps} operations`);
      onGenerated(bulletin);
      onClose();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Failed to generate bulletin");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Operation Bulletin" size="md">
      <div className="space-y-5">
        {/* Summary */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            This will create a new <strong>Operation Bulletin</strong> (DRAFT) from the{" "}
            <strong>{totalOps}</strong> operations defined in style{" "}
            <strong>{styleNo}</strong>.
          </p>
          <div className="mt-2 flex gap-6 text-sm text-blue-700 dark:text-blue-400">
            <span>
              Total SAM: <strong>{totalSam.toFixed(3)}</strong>
            </span>
            <span>
              Est. Target/Hr: <strong>{estimatedTarget}</strong>
            </span>
          </div>
        </div>

        {/* Manpower */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Manpower (operators)
          </label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={manpower || ""}
            onChange={(e) => setManpower(parseInt(e.target.value) || 0)}
            placeholder="0 = auto-calculate from operations"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Number of operators for this line. Used to calculate target pcs/hr.
          </p>
        </div>

        {/* Machines */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Machines
          </label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={machines || ""}
            onChange={(e) => setMachines(parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Remarks (optional)
          </label>
          <textarea
            className={`${inputClass} h-20 resize-none`}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Auto-set if empty"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {generating ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Generating…
              </>
            ) : (
              "Generate Bulletin"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
