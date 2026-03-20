import { useEffect, useState, useCallback } from "react";
import { rfqApi, RfqHeader } from "../../api/procurement";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

/* ── helpers ── */
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:     { label: "Draft",     bg: "bg-gray-100 dark:bg-gray-700",        text: "text-gray-700 dark:text-gray-300" },
  SENT:      { label: "Sent",      bg: "bg-blue-100 dark:bg-blue-900/20",     text: "text-blue-700 dark:text-blue-400" },
  RECEIVED:  { label: "Received",  bg: "bg-purple-100 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400" },
  EVALUATED: { label: "Evaluated", bg: "bg-green-100 dark:bg-green-900/20",   text: "text-green-700 dark:text-green-400" },
  CLOSED:    { label: "Closed",    bg: "bg-gray-200 dark:bg-gray-600",        text: "text-gray-600 dark:text-gray-400" },
  CANCELLED: { label: "Cancelled", bg: "bg-red-100 dark:bg-red-900/20",       text: "text-red-700 dark:text-red-400" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function RfqPage() {
  const [rfqs, setRfqs] = useState<RfqHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<Any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const [form, setForm] = useState({ orderId: "", materialType: "FABRIC", description: "", requiredDate: "" });

  const fetchRfqs = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await rfqApi.list(filterStatus ? { status: filterStatus } : undefined);
      const data = resp?.data?.data ?? resp?.data ?? resp ?? [];
      setRfqs(Array.isArray(data) ? data : []);
    } catch { setRfqs([]); }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchRfqs(); }, [fetchRfqs]);

  const handleCreate = async () => {
    try {
      await rfqApi.create({
        orderId: form.orderId ? Number(form.orderId) : undefined,
        materialType: form.materialType,
        description: form.description || undefined,
        requiredDate: form.requiredDate || undefined,
        details: [],
      });
      setShowCreate(false);
      setForm({ orderId: "", materialType: "FABRIC", description: "", requiredDate: "" });
      fetchRfqs();
      toastSuccess("RFQ created");
    } catch (e) { toastError(e, "Failed to create RFQ"); }
  };

  const handleSend = async (id: number) => {
    const supplierIds = prompt("Enter supplier IDs (comma-separated):");
    if (!supplierIds) return;
    try {
      await rfqApi.send(id, supplierIds.split(",").map((s) => Number(s.trim())));
      fetchRfqs();
      toastSuccess("RFQ sent to suppliers");
    } catch (e) { toastError(e, "Failed to send RFQ"); }
  };

  const handleCompare = async (rfqId: number) => {
    if (expandedId === rfqId && comparison) {
      setExpandedId(null);
      setComparison(null);
      return;
    }
    try {
      const resp = await rfqApi.comparison(rfqId);
      setComparison(resp?.data?.data ?? resp?.data ?? resp);
      setExpandedId(rfqId);
    } catch (e) { toastError(e, "Failed to load comparison"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this RFQ?")) return;
    try { await rfqApi.delete(id); fetchRfqs(); toastSuccess("RFQ deleted"); } catch (e) { toastError(e, "Failed to delete RFQ"); }
  };

  /* ── summary ── */
  const total = rfqs.length;
  const sentCount = rfqs.filter((r) => r.status === "SENT").length;
  const receivedCount = rfqs.filter((r) => r.status === "RECEIVED").length;

  return (
    <>
      <PageMeta title="RFQ Management" description="Request for quotation management" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request for Quotation</h1>
          <button onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New RFQ</button>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total RFQs", value: total, color: "text-blue-600 dark:text-blue-400" },
            { label: "Sent", value: sentCount, color: "text-purple-600 dark:text-purple-400" },
            { label: "Quotes Received", value: receivedCount, color: "text-green-600 dark:text-green-400" },
            { label: "Pending Action", value: sentCount + rfqs.filter((r) => r.status === "DRAFT").length, color: "text-amber-600 dark:text-amber-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* filter */}
        <div className="flex gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
            <option value="">All Statuses</option>
            {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">New RFQ</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Order ID (optional)</label>
                  <input type="number" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Material Type</label>
                  <select value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    {["FABRIC", "TRIM", "ACCESSORY", "PACKING", "OTHER"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Required Date</label>
                  <input type="date" value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleCreate}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Create</button>
              </div>
            </div>
          </div>
        )}

        {/* table */}
        {loading ? (
          <p className="text-gray-400 py-8 text-center">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["RFQ No", "Order", "Material Type", "Description", "Required Date", "Suppliers", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rfqs.map((r) => {
                  const meta = statusMeta[r.status] ?? statusMeta.DRAFT;
                  return (
                    <>
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{r.rfqNo ?? `#${r.id}`}</td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{r.order?.orderNo ?? (r.orderId ? `#${r.orderId}` : "—")}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">{r.materialType ?? "—"}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{r.description ?? "—"}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(r.requiredDate)}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">{r.rfqSuppliers?.length ?? 0}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                        </td>
                        <td className="px-3 py-3 space-x-2">
                          {r.status === "DRAFT" && (
                            <>
                              <button onClick={() => handleSend(r.id)} className="text-xs text-blue-600 hover:underline">Send</button>
                              <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                            </>
                          )}
                          {(r.status === "RECEIVED" || r.status === "EVALUATED") && (
                            <button onClick={() => handleCompare(r.id)} className="text-xs text-purple-600 hover:underline">
                              {expandedId === r.id ? "Hide" : "Compare"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* quote comparison */}
                      {expandedId === r.id && comparison && (
                        <tr key={`${r.id}-cmp`}>
                          <td colSpan={8} className="px-6 py-3 bg-gray-50 dark:bg-gray-900">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Quotation Comparison</p>
                            {Array.isArray(comparison) && comparison.length > 0 ? (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-1 px-2 text-left text-gray-500">Supplier</th>
                                    <th className="py-1 px-2 text-right text-gray-500">Unit Price</th>
                                    <th className="py-1 px-2 text-right text-gray-500">Total</th>
                                    <th className="py-1 px-2 text-left text-gray-500">Delivery</th>
                                    <th className="py-1 px-2 text-left text-gray-500">Remarks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {comparison.map((q: Any, i: number) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                                      <td className="py-1 px-2">{q.supplier?.name ?? q.supplierName ?? `#${q.supplierId}`}</td>
                                      <td className="py-1 px-2 text-right">{q.unitPrice ?? "—"}</td>
                                      <td className="py-1 px-2 text-right font-medium">{q.totalAmount ?? "—"}</td>
                                      <td className="py-1 px-2">{q.deliveryDays ? `${q.deliveryDays} days` : fmtDate(q.deliveryDate)}</td>
                                      <td className="py-1 px-2 text-gray-500">{q.remarks ?? "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-gray-400">No quotations to compare</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {rfqs.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No RFQs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
