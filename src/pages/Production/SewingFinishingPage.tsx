import { useEffect, useState, useCallback } from "react";
import { productionUpdateApi, type ProductionUpdateEntry, type DashboardRow } from "../../api/production";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const processColors: Record<string, string> = {
  SEWING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  FINISHING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  CHECKING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function SewingFinishingPage() {
  const [tab, setTab] = useState<"dashboard" | "entries" | "new">("dashboard");

  // ── Dashboard ──
  const [dashboard, setDashboard] = useState<DashboardRow[]>([]);
  const [loadingD, setLoadingD] = useState(true);

  // ── Entries ──
  const [entries, setEntries] = useState<ProductionUpdateEntry[]>([]);
  const [loadingE, setLoadingE] = useState(false);
  const [entryPage, setEntryPage] = useState(1);
  const [entryTotal, setEntryTotal] = useState(0);
  const [filterOrderId, setFilterOrderId] = useState("");
  const [filterProcess, setFilterProcess] = useState("");

  // ── Create form ──
  const [form, setForm] = useState({
    orderId: "", lineNo: "", productionDate: new Date().toISOString().slice(0, 10),
    process: "SEWING", qtyInput: "", qtyOutput: "", qtyReject: "0", qtyAlter: "0", remarks: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoadingD(true);
    try { setDashboard(await productionUpdateApi.dashboard()); }
    catch { setDashboard([]); }
    setLoadingD(false);
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoadingE(true);
    try {
      const resp = await productionUpdateApi.list({
        page: entryPage, limit: 50,
        orderId: filterOrderId || undefined,
        process: filterProcess || undefined,
      });
      setEntries(resp.data ?? []);
      setEntryTotal(resp.meta?.total ?? 0);
    } catch { setEntries([]); }
    setLoadingE(false);
  }, [entryPage, filterOrderId, filterProcess]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (tab === "entries") fetchEntries(); }, [tab, fetchEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await productionUpdateApi.create({
        orderId: Number(form.orderId),
        lineNo: form.lineNo,
        productionDate: form.productionDate,
        process: form.process,
        qtyInput: Number(form.qtyInput),
        qtyOutput: Number(form.qtyOutput),
        qtyReject: Number(form.qtyReject) || 0,
        qtyAlter: Number(form.qtyAlter) || 0,
        remarks: form.remarks || undefined,
      });
      alert("Production entry created!");
      setForm({ orderId: "", lineNo: "", productionDate: new Date().toISOString().slice(0, 10), process: "SEWING", qtyInput: "", qtyOutput: "", qtyReject: "0", qtyAlter: "0", remarks: "" });
      fetchDashboard();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating entry");
    }
    setSaving(false);
  };

  const entryTotalPages = Math.ceil(entryTotal / 50);

  return (
    <>
      <PageMeta title="Production | ERP TRACK" description="Sewing & finishing operations" />
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Production Tracking</h2>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(["dashboard", "entries", "new"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 -mb-px text-sm font-medium capitalize border-b-2 transition ${
                tab === t ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}>
              {t === "new" ? "New Entry" : t === "dashboard" ? "WIP Dashboard" : "History"}
            </button>
          ))}
        </div>

        {/* ━━ Dashboard Tab ━━ */}
        {tab === "dashboard" && (
          loadingD ? <div className="text-center py-10 text-gray-500">Loading…</div> :
          dashboard.length === 0 ? <div className="text-center py-10 text-gray-500">No orders in production</div> :
          <div className="grid gap-4">
            {dashboard.map((d) => (
              <div key={d.orderId} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-white">{d.orderNo}</span>
                    <span className="ml-3 text-xs text-gray-500">Order Qty: {Number(d.orderQty).toLocaleString("en-IN")}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{Number(d.completionPct).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(Number(d.completionPct), 100)}%` }} />
                </div>
                <div className="mt-2 flex gap-6 text-xs text-gray-500 dark:text-gray-400">
                  <span>Output: <b className="text-gray-700 dark:text-gray-200">{Number(d.totalOutput).toLocaleString("en-IN")}</b></span>
                  <span>Reject: <b className="text-red-600 dark:text-red-400">{Number(d.totalReject).toLocaleString("en-IN")}</b></span>
                  <span>Last Activity: {d.lastActivity ? fmtDate(d.lastActivity) : "-"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ━━ Entries Tab ━━ */}
        {tab === "entries" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input type="number" placeholder="Order ID" value={filterOrderId}
                onChange={(e) => { setFilterOrderId(e.target.value); setEntryPage(1); }}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white w-40" />
              <select value={filterProcess} onChange={(e) => { setFilterProcess(e.target.value); setEntryPage(1); }}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                <option value="">All Processes</option>
                <option value="SEWING">Sewing</option>
                <option value="FINISHING">Finishing</option>
                <option value="CHECKING">Checking</option>
              </select>
            </div>

            {loadingE ? <div className="text-center py-10 text-gray-500">Loading…</div> :
            entries.length === 0 ? <div className="text-center py-10 text-gray-500">No entries</div> :
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {["Date", "Order", "Line", "Process", "Input", "Output", "Reject", "Alter", "Efficiency", "Remarks"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {entries.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2 text-xs">{fmtDate(e.productionDate)}</td>
                      <td className="px-4 py-2">{e.order?.orderNo ?? e.orderId}</td>
                      <td className="px-4 py-2 font-mono">{e.lineNo}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${processColors[e.process] ?? ""}`}>{e.process}</span>
                      </td>
                      <td className="px-4 py-2">{e.qtyInput}</td>
                      <td className="px-4 py-2 text-green-600 dark:text-green-400 font-medium">{e.qtyOutput}</td>
                      <td className="px-4 py-2 text-red-600 dark:text-red-400">{e.qtyReject}</td>
                      <td className="px-4 py-2">{e.qtyAlter}</td>
                      <td className={`px-4 py-2 font-semibold ${Number(e.efficiencyPct) >= 80 ? "text-green-600 dark:text-green-400" : Number(e.efficiencyPct) >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                        {Number(e.efficiencyPct).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{e.remarks ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}

            <Pagination
              currentPage={entryPage}
              totalPages={entryTotalPages}
              onPageChange={(p) => setEntryPage(p)}
              totalItems={entryTotal}
              pageSize={50}
            />
          </div>
        )}

        {/* ━━ New Entry Tab ━━ */}
        {tab === "new" && (
          <form onSubmit={handleSubmit} className="max-w-2xl p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Order ID *</label>
                <input type="number" required value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Line No *</label>
                <input type="text" required maxLength={10} value={form.lineNo} onChange={(e) => setForm({ ...form, lineNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. A" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Date *</label>
                <input type="date" required value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Process *</label>
                <select required value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option value="SEWING">Sewing</option>
                  <option value="FINISHING">Finishing</option>
                  <option value="CHECKING">Checking</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Qty Input</label>
                <input type="number" required value={form.qtyInput} onChange={(e) => setForm({ ...form, qtyInput: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Qty Output</label>
                <input type="number" required value={form.qtyOutput} onChange={(e) => setForm({ ...form, qtyOutput: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Qty Reject</label>
                <input type="number" value={form.qtyReject} onChange={(e) => setForm({ ...form, qtyReject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Qty Alter</label>
                <input type="number" value={form.qtyAlter} onChange={(e) => setForm({ ...form, qtyAlter: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Remarks</label>
              <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            {form.qtyInput && Number(form.qtyInput) > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Calculated Efficiency: <b className="text-blue-600 dark:text-blue-400">
                  {((Number(form.qtyOutput) / Number(form.qtyInput)) * 100).toFixed(1)}%
                </b>
              </div>
            )}
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
