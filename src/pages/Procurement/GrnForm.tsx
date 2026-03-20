import { useState } from "react";
import { useNavigate } from "react-router";
import { grnApi } from "../../api/procurement";
import PageMeta from "../../components/common/PageMeta";

interface GrnLine {
  poDetailId: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason: string;
}

export default function GrnForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    poId: 0,
    grnDate: new Date().toISOString().slice(0, 10),
    warehouseId: undefined as number | undefined,
    vehicleNo: "",
    challanNo: "",
    challanDate: "",
    remarks: "",
  });
  const [lines, setLines] = useState<GrnLine[]>([{
    poDetailId: 0, receivedQty: 0, acceptedQty: 0, rejectedQty: 0, rejectionReason: "",
  }]);
  const [saving, setSaving] = useState(false);

  const addLine = () => setLines((p) => [...p, { poDetailId: 0, receivedQty: 0, acceptedQty: 0, rejectedQty: 0, rejectionReason: "" }]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof GrnLine, value: string | number | boolean) =>
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.poId) return alert("Enter a PO ID");
    setSaving(true);
    try {
      await grnApi.create({ ...form, details: lines });
      navigate("/procurement/grn");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(message || "Failed to create GRN");
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageMeta title="New GRN | STITCH ERP" description="Create goods receipt note" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Goods Receipt Note</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO ID *</label>
              <input type="number" required value={form.poId || ""} onChange={(e) => setForm({ ...form, poId: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GRN Date *</label>
              <input type="date" required value={form.grnDate} onChange={(e) => setForm({ ...form, grnDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse ID</label>
              <input type="number" value={form.warehouseId || ""} onChange={(e) => setForm({ ...form, warehouseId: parseInt(e.target.value) || undefined })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle No</label>
              <input value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Challan No</label>
              <input value={form.challanNo} onChange={(e) => setForm({ ...form, challanNo: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Challan Date</label>
              <input type="date" value={form.challanDate} onChange={(e) => setForm({ ...form, challanDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
          </div>

          {/* GRN Lines */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Lines</h2>
              <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Line</button>
            </div>
            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-5 gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">PO Detail ID *</label>
                    <input type="number" required value={l.poDetailId || ""} onChange={(e) => updateLine(i, "poDetailId", parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Received Qty *</label>
                    <input type="number" required value={l.receivedQty || ""} onChange={(e) => updateLine(i, "receivedQty", parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Accepted Qty</label>
                    <input type="number" value={l.acceptedQty || ""} onChange={(e) => updateLine(i, "acceptedQty", parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rejected Qty</label>
                    <input type="number" value={l.rejectedQty || ""} onChange={(e) => updateLine(i, "rejectedQty", parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white" />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Reason</label>
                      <input value={l.rejectionReason} onChange={(e) => updateLine(i, "rejectionReason", e.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white" />
                    </div>
                    {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs mb-1">✕</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">
              {saving ? "Saving..." : "Create GRN"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
