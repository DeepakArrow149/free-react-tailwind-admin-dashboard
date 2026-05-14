import { useEffect, useState, useCallback } from "react";
import { cuttingApi, type CuttingEntry } from "../../api/production";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function CuttingPage() {
  const [entries, setEntries] = useState<CuttingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orderFilter, setOrderFilter] = useState("");

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    orderId: "", cuttingDate: new Date().toISOString().slice(0, 10),
    tableNo: "", layers: "", fabricType: "", cutBy: "", verifiedBy: "",
    wastageQty: "0", remarks: "",
    sizes: [{ size: "", planned: "", actual: "" }] as { size: string; planned: string; actual: string }[],
  });
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await cuttingApi.list({ page, limit: 20, orderId: orderFilter || undefined });
      setEntries(resp.data ?? []);
      setTotal(resp.meta?.total ?? 0);
    } catch { setEntries([]); }
    setLoading(false);
  }, [page, orderFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addSize = () => setForm((f) => ({ ...f, sizes: [...f.sizes, { size: "", planned: "", actual: "" }] }));
  const removeSize = (idx: number) => setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }));
  const updateSize = (idx: number, key: string, val: string) =>
    setForm((f) => ({ ...f, sizes: f.sizes.map((s, i) => (i === idx ? { ...s, [key]: val } : s)) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const plannedQtyBySize: Record<string, number> = {};
      const actualQtyBySize: Record<string, number> = {};
      form.sizes.forEach((s) => {
        if (s.size) {
          plannedQtyBySize[s.size] = Number(s.planned) || 0;
          actualQtyBySize[s.size] = Number(s.actual) || 0;
        }
      });
      await cuttingApi.create({
        orderId: Number(form.orderId),
        cuttingDate: form.cuttingDate,
        tableNo: form.tableNo || undefined,
        layers: form.layers ? Number(form.layers) : undefined,
        fabricType: form.fabricType || undefined,
        plannedQtyBySize: Object.keys(plannedQtyBySize).length > 0 ? plannedQtyBySize : undefined,
        actualQtyBySize: Object.keys(actualQtyBySize).length > 0 ? actualQtyBySize : undefined,
        wastageQty: Number(form.wastageQty) || 0,
        cutBy: form.cutBy || undefined,
        verifiedBy: form.verifiedBy || undefined,
        remarks: form.remarks || undefined,
      });
      setShowForm(false);
      setForm({ orderId: "", cuttingDate: new Date().toISOString().slice(0, 10), tableNo: "", layers: "", fabricType: "", cutBy: "", verifiedBy: "", wastageQty: "0", remarks: "", sizes: [{ size: "", planned: "", actual: "" }] });
      fetchEntries();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating cutting entry");
    }
    setSaving(false);
  };

  const handleConfirm = async (id: number) => {
    if (!confirm("Confirm this cutting entry? It will be locked.")) return;
    try { await cuttingApi.confirm(id); fetchEntries(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this draft cutting entry?")) return;
    try { await cuttingApi.delete(id); fetchEntries(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Error"); }
  };

  const totalSizeQty = (qtyObj: Record<string, number> | undefined) =>
    qtyObj ? Object.values(qtyObj).reduce((s, v) => s + v, 0) : 0;

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <PageMeta title="Cutting | ERP TRACK" description="Cutting operations" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Cutting Entries</h2>
          <button onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            {showForm ? "Cancel" : "+ New Cutting"}
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-3">
          <input type="number" placeholder="Filter by Order ID…" value={orderFilter}
            onChange={(e) => { setOrderFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white w-48" />
        </div>

        {/* ━━ Create Form ━━ */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Order ID *</label>
                <input type="number" required value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Date *</label>
                <input type="date" required value={form.cuttingDate} onChange={(e) => setForm({ ...form, cuttingDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Table No</label>
                <input type="text" value={form.tableNo} onChange={(e) => setForm({ ...form, tableNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Layers</label>
                <input type="number" value={form.layers} onChange={(e) => setForm({ ...form, layers: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Fabric Type</label>
                <input type="text" value={form.fabricType} onChange={(e) => setForm({ ...form, fabricType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Wastage Qty</label>
                <input type="number" step="0.01" value={form.wastageQty} onChange={(e) => setForm({ ...form, wastageQty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Cut By</label>
                <input type="text" value={form.cutBy} onChange={(e) => setForm({ ...form, cutBy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Verified By</label>
                <input type="text" value={form.verifiedBy} onChange={(e) => setForm({ ...form, verifiedBy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Size-wise Qty</h4>
            <div className="space-y-2">
              {form.sizes.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                  <div><label className="block text-xs mb-1 text-gray-500">Size</label>
                    <input type="text" value={s.size} onChange={(e) => updateSize(i, "size", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. M" /></div>
                  <div><label className="block text-xs mb-1 text-gray-500">Planned</label>
                    <input type="number" value={s.planned} onChange={(e) => updateSize(i, "planned", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                  <div><label className="block text-xs mb-1 text-gray-500">Actual</label>
                    <input type="number" value={s.actual} onChange={(e) => updateSize(i, "actual", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                  <button type="button" onClick={() => removeSize(i)} className="text-red-500 hover:text-red-700 text-lg pb-2">✕</button>
                </div>
              ))}
              <button type="button" onClick={addSize} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add Size</button>
            </div>

            <div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Remarks</label>
              <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>

            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create Cutting Entry"}
            </button>
          </form>
        )}

        {/* ━━ List ━━ */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No cutting entries found</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Cutting No", "Order", "Date", "Table", "Layers", "Planned Qty", "Actual Qty", "Wastage %", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2 font-mono text-xs">{e.cuttingNo}</td>
                    <td className="px-4 py-2">{e.order?.orderNo ?? e.orderId}</td>
                    <td className="px-4 py-2 text-xs">{fmtDate(e.cuttingDate)}</td>
                    <td className="px-4 py-2">{e.tableNo ?? "-"}</td>
                    <td className="px-4 py-2">{e.layers ?? "-"}</td>
                    <td className="px-4 py-2">{totalSizeQty(e.plannedQtyBySize).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">{totalSizeQty(e.actualQtyBySize).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">{Number(e.wastagePct).toFixed(2)}%</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[e.status] ?? ""}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {e.status === "DRAFT" && (
                        <>
                          <button onClick={() => handleConfirm(e.id)} className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 font-medium">Confirm</button>
                          <button onClick={() => handleDelete(e.id)} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 font-medium">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 pt-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            totalItems={total}
            pageSize={20}
          />
        </div>
      </div>
    </>
  );
}
