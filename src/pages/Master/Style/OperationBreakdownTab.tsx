import { useCallback, useEffect, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";
import { masterApi, type StyleOperation, type StyleOperationInput } from "../../../api/master";
import { operationApi, type OperationMaster } from "../../../api/production";
import { bulletinApi, type BulletinSummary } from "../../../api/production";
import { machineTypeApi, type MachineType } from "../../../api/lineBalancing";
import DraggableOperationRow from "./DraggableOperationRow";
import GenerateBulletinDialog from "./GenerateBulletinDialog";

interface Props {
  styleId: number;
  styleNo: string;
  onTotalUpdate: (totalSam: number, totalOps: number) => void;
}

export interface LocalOperation {
  _key: string; // unique client key for react keys
  operationId: number;
  sequence: number;
  machineTypeId: number | null;
  sam: number;
  targetPerHour: number;
  noOfMachines: number;
  noOfOperators: number;
  department: string;
  remarks: string;
}

let keyCounter = 0;
function nextKey() {
  return `op_${++keyCounter}_${Date.now()}`;
}

function toLocal(op: StyleOperation): LocalOperation {
  return {
    _key: nextKey(),
    operationId: op.operationId,
    sequence: op.sequence,
    machineTypeId: op.machineTypeId,
    sam: Number(op.sam),
    targetPerHour: op.targetPerHour,
    noOfMachines: op.noOfMachines,
    noOfOperators: op.noOfOperators,
    department: op.department || "",
    remarks: op.remarks || "",
  };
}

function emptyOp(sequence: number): LocalOperation {
  return {
    _key: nextKey(),
    operationId: 0,
    sequence,
    machineTypeId: null,
    sam: 0,
    targetPerHour: 0,
    noOfMachines: 1,
    noOfOperators: 1,
    department: "",
    remarks: "",
  };
}

const DEPARTMENTS = ["SEWING", "CUTTING", "FINISHING", "PACKING", "PRESSING", "CHECKING"] as const;

const inputClass =
  "h-9 w-full rounded border border-gray-300 bg-transparent px-2 py-1 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-1 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const selectSmClass =
  "h-9 w-full rounded border border-gray-300 bg-transparent px-2 py-1 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-1 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function OperationBreakdownTab({ styleId, styleNo, onTotalUpdate }: Props) {
  const [operations, setOperations] = useState<LocalOperation[]>([]);
  const [savedOps, setSavedOps] = useState<LocalOperation[]>([]);
  const [operationsList, setOperationsList] = useState<OperationMaster[]>([]);
  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bulletin bridge state
  const [bulletins, setBulletins] = useState<BulletinSummary[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Load data + existing bulletins
  const fetchBulletins = useCallback(() => {
    bulletinApi.getByStyle(styleId)
      .then((res) => setBulletins(res.data ?? []))
      .catch(() => setBulletins([]));
  }, [styleId]);

  // Load data (independent calls so one failure doesn't block others)
  useEffect(() => {
    setLoading(true);
    const styleOpsPromise = masterApi.getStyleOperations(styleId)
      .then((opsRes) => {
        const ops = (opsRes.data?.data || []).map(toLocal);
        setOperations(ops);
        setSavedOps(ops.map((o) => ({ ...o })));
      })
      .catch((err) => {
        console.error("Failed to load style operations", err);
        toast.error("Failed to load operations");
      });

    operationApi.list({ limit: 100 })
      .then((opsList) => {
        setOperationsList(Array.isArray(opsList.data) ? opsList.data : opsList.data?.data || []);
      })
      .catch((err) => console.error("Failed to load operations list", err));

    machineTypeApi.list({ isActive: true })
      .then((mtList) => {
        setMachineTypes(Array.isArray(mtList.data) ? mtList.data : mtList.data?.data || []);
      })
      .catch((err) => console.error("Failed to load machine types", err));

    styleOpsPromise.finally(() => setLoading(false));
  }, [styleId]);

  useEffect(() => { fetchBulletins(); }, [fetchBulletins]);

  // Summaries
  const totalSam = useMemo(() => operations.reduce((s, o) => s + (o.sam || 0), 0), [operations]);
  const totalOps = operations.length;
  const avgTargetPerHour = useMemo(() => (totalSam > 0 ? Math.round(60 / totalSam) : 0), [totalSam]);

  const isDirty = useMemo(() => {
    if (operations.length !== savedOps.length) return true;
    return operations.some((op, i) => {
      const saved = savedOps[i];
      return (
        op.operationId !== saved.operationId ||
        op.machineTypeId !== saved.machineTypeId ||
        Math.abs(op.sam - saved.sam) > 0.0001 ||
        op.noOfMachines !== saved.noOfMachines ||
        op.noOfOperators !== saved.noOfOperators ||
        op.department !== saved.department ||
        op.remarks !== saved.remarks
      );
    });
  }, [operations, savedOps]);

  // Resequence after any order change
  const resequence = useCallback((ops: LocalOperation[]): LocalOperation[] => {
    return ops.map((op, i) => ({ ...op, sequence: i + 1 }));
  }, []);

  // Handlers
  const handleAddRow = useCallback(() => {
    setOperations((prev) => [...prev, emptyOp(prev.length + 1)]);
  }, []);

  const handleDeleteRow = useCallback((index: number) => {
    setOperations((prev) => resequence(prev.filter((_, i) => i !== index)));
  }, [resequence]);

  const handleUpdateRow = useCallback(
    (index: number, field: keyof LocalOperation, value: unknown) => {
      setOperations((prev) => {
        const updated = [...prev];
        const row = { ...updated[index], [field]: value } as LocalOperation;

        // Auto-calculate target/hr when SAM changes
        if (field === "sam") {
          const sam = Number(value) || 0;
          row.targetPerHour = sam > 0 ? Math.round(60 / sam) : 0;
        }

        // Auto-fill department from operation master when operation changes
        if (field === "operationId") {
          const opId = Number(value);
          const opDef = operationsList.find((o) => o.id === opId);
          if (opDef?.department && !row.department) {
            row.department = opDef.department;
          }
        }

        updated[index] = row;
        return updated;
      });
    },
    [operationsList]
  );

  const moveRow = useCallback(
    (fromIndex: number, toIndex: number) => {
      setOperations((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        return resequence(updated);
      });
    },
    [resequence]
  );

  const handleCancel = useCallback(() => {
    setOperations(savedOps.map((o) => ({ ...o })));
  }, [savedOps]);

  const handleSave = useCallback(async () => {
    // Validation
    const errors: string[] = [];
    operations.forEach((op, i) => {
      if (!op.operationId) errors.push(`Row ${i + 1}: Operation is required`);
      if (!op.sam || op.sam <= 0) errors.push(`Row ${i + 1}: SAM must be > 0`);
    });
    if (errors.length) {
      toast.error(errors.join("\n"));
      return;
    }

    setSaving(true);
    try {
      const payload: StyleOperationInput[] = operations.map((op) => ({
        operationId: op.operationId,
        sequence: op.sequence,
        machineTypeId: op.machineTypeId || null,
        sam: op.sam,
        noOfMachines: op.noOfMachines,
        noOfOperators: op.noOfOperators,
        department: op.department || null,
        remarks: op.remarks || null,
      }));

      const res = await masterApi.saveStyleOperations(styleId, payload);
      const saved = (res.data?.data || []).map(toLocal);
      setOperations(saved);
      setSavedOps(saved.map((o) => ({ ...o })));

      // Notify parent of new totals
      const newTotalSam = saved.reduce((s, o) => s + o.sam, 0);
      onTotalUpdate(newTotalSam, saved.length);

      toast.success(`${saved.length} operation(s) saved successfully`);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Failed to save operations");
    } finally {
      setSaving(false);
    }
  }, [operations, styleId, onTotalUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
        Loading operations...
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Operation
          </button>
          {isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Operations"}
          </button>
          {/* Generate Bulletin button — only when ops are saved and not dirty */}
          {savedOps.length > 0 && !isDirty && (
            <button
              type="button"
              onClick={() => setShowGenerateDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Bulletin
            </button>
          )}
        </div>
      </div>

      {/* Operation Table */}
      {operations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No operations defined yet. Click "Add Operation" to start building the operation breakdown.
          </p>
        </div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="w-10 px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400" />
                  <th className="w-12 px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Operation *</th>
                  <th className="w-28 px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Department</th>
                  <th className="w-36 px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Machine Type</th>
                  <th className="w-20 px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">SAM *</th>
                  <th className="w-20 px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Target/Hr</th>
                  <th className="w-16 px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">M/C</th>
                  <th className="w-16 px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Opr</th>
                  <th className="px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Remarks</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {operations.map((op, index) => (
                  <DraggableOperationRow
                    key={op._key}
                    index={index}
                    operation={op}
                    operationsList={operationsList}
                    machineTypes={machineTypes}
                    departments={DEPARTMENTS}
                    onUpdate={handleUpdateRow}
                    onDelete={handleDeleteRow}
                    moveRow={moveRow}
                    inputClass={inputClass}
                    selectClass={selectSmClass}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </DndProvider>
      )}

      {/* Summary Bar */}
      {operations.length > 0 && (
        <div className="mt-4 flex items-center gap-6 rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/50">
          <div className="text-gray-600 dark:text-gray-400">
            Total Operations: <strong className="text-gray-900 dark:text-white">{totalOps}</strong>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Total SAM: <strong className="text-gray-900 dark:text-white">{totalSam.toFixed(3)}</strong>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Effective Target/Hr (1 operator): <strong className="text-gray-900 dark:text-white">{avgTargetPerHour}</strong>
          </div>
        </div>
      )}

      {/* Linked Bulletins Indicator */}
      {bulletins.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Linked Operation Bulletins ({bulletins.length})
          </h4>
          <div className="space-y-1.5">
            {bulletins.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-gray-900 dark:text-white">{b.bulletinNo}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    b.status === "APPROVED"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : b.status === "ACTIVE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {b.status}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  SAM: {Number(b.totalSam).toFixed(2)} | Target: {b.targetPcsPerHour}/hr
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Bulletin Dialog */}
      <GenerateBulletinDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        styleId={styleId}
        styleNo={styleNo}
        totalSam={totalSam}
        totalOps={totalOps}
        onGenerated={() => fetchBulletins()}
      />
    </div>
  );
}
