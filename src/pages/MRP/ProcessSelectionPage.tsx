import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router";
import { processSelectionApi } from "../../api/mrp";
import api from "../../api/client";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "sonner";

interface ProcessOption { id: number; processCode: string; processName: string; processType: string }
interface Selection { id?: number; processId: number; sequence: number; status: string; processName?: string }

export default function ProcessSelectionPage() {
  const { orderId } = useParams();
  const oid = Number(orderId);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [selResp, procResp] = await Promise.all([
        processSelectionApi.listForOrder(oid),
        api.get("/mrp/processes", { params: { limit: 200 } })
      ]);
      setSelections((selResp.data.data || []).map((s: any) => ({ id: s.id, processId: s.processId, sequence: s.sequence, status: s.status, processName: s.process?.processName })));
      setProcesses(procResp.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [oid]);

  useEffect(() => { fetch(); }, [fetch]);

  const addRow = () => setSelections(prev => [...prev, { processId: 0, sequence: (prev.length + 1) * 10, status: "SELECTED" }]);
  const updateRow = (idx: number, field: string, val: any) => setSelections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  const removeRow = (idx: number) => setSelections(prev => prev.filter((_, i) => i !== idx));

  const handleBulkSave = async () => {
    const items = selections.filter(s => s.processId > 0).map(s => ({ processId: s.processId, sequence: s.sequence, status: s.status }));
    if (items.length === 0) { toast.error("Add at least 1 process"); return; }
    setSaving(true);
    try { await processSelectionApi.bulkSet(oid, items); toast.success("Process selections saved"); fetch(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageMeta title={`Process Selection - Order ${oid} | ERP TRACK`} description="Assign processes to order" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Process Selection — Order #{oid}</h2>
          <div className="flex gap-2">
            <button onClick={addRow} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700">+ Add Process</button>
            <button onClick={handleBulkSave} disabled={saving} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : "Save All"}</button>
          </div>
        </div>
        {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-1">#</div><div className="col-span-5">Process</div><div className="col-span-2">Sequence</div><div className="col-span-2">Status</div><div className="col-span-2"></div>
            </div>
            {selections.length === 0 ? <p className="py-8 text-center text-gray-400">No processes assigned</p>
            : selections.map((s, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                <div className="col-span-1 text-sm text-gray-500">{idx + 1}</div>
                <select value={s.processId} onChange={e => updateRow(idx, "processId", Number(e.target.value))} className="col-span-5 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700">
                  <option value={0}>Select process...</option>{processes.map(p => <option key={p.id} value={p.id}>{p.processCode} - {p.processName} ({p.processType})</option>)}
                </select>
                <input type="number" value={s.sequence} onChange={e => updateRow(idx, "sequence", Number(e.target.value))} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                <select value={s.status} onChange={e => updateRow(idx, "status", e.target.value)} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700">
                  {["SELECTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"].map(st => <option key={st}>{st}</option>)}
                </select>
                <button onClick={() => removeRow(idx)} className="col-span-2 text-red-500 text-xs">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
