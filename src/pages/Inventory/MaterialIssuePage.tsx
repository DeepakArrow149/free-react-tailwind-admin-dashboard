import { useEffect, useState, useCallback } from "react";
import { issueApi, warehouseApi, type MaterialIssueHeader, type Warehouse } from "../../api/inventory";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function MaterialIssuePage() {
  const [issues, setIssues] = useState<MaterialIssueHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState({
    orderId: "",
    warehouseId: "",
    issueDate: new Date().toISOString().slice(0, 10),
    remarks: "",
    details: [{ materialId: "", qty: "" }] as { materialId: string; qty: string }[],
  });
  const [saving, setSaving] = useState(false);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await issueApi.list({ page, limit: 20 });
      setIssues(resp.data ?? []);
      setTotal(resp.meta?.total ?? 0);
    } catch { setIssues([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);
  useEffect(() => { warehouseApi.list().then(setWarehouses).catch(() => {}); }, []);

  const addLine = () => setForm((f) => ({ ...f, details: [...f.details, { materialId: "", qty: "" }] }));
  const removeLine = (idx: number) => setForm((f) => ({ ...f, details: f.details.filter((_, i) => i !== idx) }));
  const updateLine = (idx: number, key: string, val: string) =>
    setForm((f) => ({ ...f, details: f.details.map((d, i) => (i === idx ? { ...d, [key]: val } : d)) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await issueApi.create({
        orderId: Number(form.orderId),
        warehouseId: Number(form.warehouseId),
        issueDate: form.issueDate,
        remarks: form.remarks || undefined,
        details: form.details.map((d) => ({
          materialId: Number(d.materialId),
          qty: Number(d.qty),
        })),
      });
      setShowForm(false);
      setForm({ orderId: "", warehouseId: "", issueDate: new Date().toISOString().slice(0, 10), remarks: "", details: [{ materialId: "", qty: "" }] });
      fetchIssues();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(message || "Error creating issue");
    }
    setSaving(false);
  };

  const handleConfirm = async (id: number) => {
    if (!confirm("Confirm this issue? Stock will be deducted.")) return;
    try {
      await issueApi.confirm(id);
      fetchIssues();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(message || "Error confirming");
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <PageMeta title="Material Issue | ERP TRACK" description="Material issue management" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Material Issue</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "+ New Issue"}
          </button>
        </div>

        {/* ━━ Create Form ━━ */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Order ID</label>
                <input type="number" required value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Warehouse</label>
                <select required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option value="">Select</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Issue Date</label>
                <input type="date" required value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Remarks</label>
                <input type="text" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Line Items</h4>
            <div className="space-y-2">
              {form.details.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">Material ID</label>
                    <input type="number" required value={d.materialId} onChange={(e) => updateLine(i, "materialId", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">Qty</label>
                    <input type="number" step="0.01" required value={d.qty} onChange={(e) => updateLine(i, "qty", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                  </div>
                  <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 text-lg pb-2">✕</button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Add Line</button>
            </div>

            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create Issue"}
            </button>
          </form>
        )}

        {/* ━━ List ━━ */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading…</div>
        ) : issues.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No material issues found</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Issue No", "Order", "Warehouse", "Date", "Items", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {issues.map((iss) => (
                  <tr key={iss.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2 font-mono text-xs">{iss.issueNo}</td>
                    <td className="px-4 py-2">{iss.order?.orderNo ?? iss.orderId}</td>
                    <td className="px-4 py-2">{iss.warehouse?.name ?? iss.warehouseId}</td>
                    <td className="px-4 py-2 text-xs">{fmtDate(iss.issueDate)}</td>
                    <td className="px-4 py-2">{iss.details?.length ?? 0}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[iss.status] ?? ""}`}>
                        {iss.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {iss.status === "DRAFT" && (
                        <button onClick={() => handleConfirm(iss.id)}
                          className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 font-medium">
                          Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Prev</button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
