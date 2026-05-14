import { useEffect, useState, useCallback } from "react";
import { fgTransferApi, type FgTransfer } from "../../api/production";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const qcColors: Record<string, string> = {
  PASS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAIL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  CONDITIONAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function FgTransferPage() {
  const [transfers, setTransfers] = useState<FgTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    orderId: "", transferDate: new Date().toISOString().slice(0, 10),
    totalQty: "", qcSummary: "PASS", transferredBy: "", remarks: "",
    sizes: [{ size: "", qty: "" }] as { size: string; qty: string }[],
  });
  const [saving, setSaving] = useState(false);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fgTransferApi.list({ page, limit: 20 });
      setTransfers(resp.data ?? []);
      setTotal(resp.meta?.total ?? 0);
    } catch { setTransfers([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const addSize = () => setForm((f) => ({ ...f, sizes: [...f.sizes, { size: "", qty: "" }] }));
  const removeSize = (idx: number) => setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }));
  const updateSize = (idx: number, key: string, val: string) =>
    setForm((f) => ({ ...f, sizes: f.sizes.map((s, i) => (i === idx ? { ...s, [key]: val } : s)) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const qtyBySize: Record<string, number> = {};
      form.sizes.forEach((s) => { if (s.size) qtyBySize[s.size] = Number(s.qty) || 0; });
      await fgTransferApi.create({
        orderId: Number(form.orderId),
        transferDate: form.transferDate,
        totalQty: Number(form.totalQty) || 0,
        qtyBySize: Object.keys(qtyBySize).length > 0 ? qtyBySize : undefined,
        qcSummary: form.qcSummary || undefined,
        transferredBy: form.transferredBy || undefined,
        remarks: form.remarks || undefined,
      });
      setShowForm(false);
      setForm({ orderId: "", transferDate: new Date().toISOString().slice(0, 10), totalQty: "", qcSummary: "PASS", transferredBy: "", remarks: "", sizes: [{ size: "", qty: "" }] });
      fetchTransfers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating FG transfer");
    }
    setSaving(false);
  };

  const handleConfirm = async (id: number) => {
    if (!confirm("Confirm this FG transfer?")) return;
    try { await fgTransferApi.confirm(id); fetchTransfers(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Error"); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <PageMeta title="FG Transfer | ERP TRACK" description="Finished goods transfer" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Finished Goods Transfer</h2>
          <button onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            {showForm ? "Cancel" : "+ New Transfer"}
          </button>
        </div>

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
                <input type="date" required value={form.transferDate} onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Total Qty *</label>
                <input type="number" required value={form.totalQty} onChange={(e) => setForm({ ...form, totalQty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">QC Summary</label>
                <select value={form.qcSummary} onChange={(e) => setForm({ ...form, qcSummary: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option value="PASS">Pass</option>
                  <option value="FAIL">Fail</option>
                  <option value="CONDITIONAL">Conditional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Transferred By</label>
                <input type="text" value={form.transferredBy} onChange={(e) => setForm({ ...form, transferredBy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Qty by Size (optional)</h4>
            <div className="space-y-2">
              {form.sizes.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <div><label className="block text-xs mb-1 text-gray-500">Size</label>
                    <input type="text" value={s.size} onChange={(e) => updateSize(i, "size", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                  <div><label className="block text-xs mb-1 text-gray-500">Qty</label>
                    <input type="number" value={s.qty} onChange={(e) => updateSize(i, "qty", e.target.value)}
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
              {saving ? "Saving…" : "Create FG Transfer"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading…</div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No FG transfers found</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Transfer No", "Order", "Date", "Total Qty", "QC", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2 font-mono text-xs">{t.transferNo}</td>
                    <td className="px-4 py-2">{t.order?.orderNo ?? t.orderId}</td>
                    <td className="px-4 py-2 text-xs">{fmtDate(t.transferDate)}</td>
                    <td className="px-4 py-2 font-semibold">{t.totalQty.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">
                      {t.qcSummary && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${qcColors[t.qcSummary] ?? ""}`}>{t.qcSummary}</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] ?? ""}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-2">
                      {t.status === "DRAFT" && (
                        <button onClick={() => handleConfirm(t.id)} className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 font-medium">Confirm</button>
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
