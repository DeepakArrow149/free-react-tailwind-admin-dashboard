import { useEffect, useState, useCallback } from "react";
import { labTestApi, LabTestRequest } from "../../api/quality";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

/* ── helpers ── */
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: "Pending",   bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" },
  SENT:      { label: "Sent",      bg: "bg-blue-100 dark:bg-blue-900/20",     text: "text-blue-700 dark:text-blue-400" },
  RECEIVED:  { label: "Received",  bg: "bg-purple-100 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400" },
  PASS:      { label: "Pass",      bg: "bg-green-100 dark:bg-green-900/20",   text: "text-green-700 dark:text-green-400" },
  FAIL:      { label: "Fail",      bg: "bg-red-100 dark:bg-red-900/20",       text: "text-red-700 dark:text-red-400" },
};

const testTypes = ["SHRINKAGE", "COLOR_FASTNESS", "TENSILE_STRENGTH", "GSM", "PILLING", "DIMENSIONAL_STABILITY", "PH", "OTHER"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function LabTestPage() {
  const [tests, setTests] = useState<LabTestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  /* form state */
  const [form, setForm] = useState({ orderId: "", testType: "SHRINKAGE", labName: "", expectedDate: "", remarks: "" });

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await labTestApi.list(filterStatus ? { status: filterStatus } : undefined);
      const data = resp?.data?.data ?? resp?.data ?? resp ?? [];
      setTests(Array.isArray(data) ? data : []);
    } catch { setTests([]); }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleCreate = async () => {
    try {
      await labTestApi.create({
        orderId: Number(form.orderId),
        testType: form.testType,
        labName: form.labName || undefined,
        expectedDate: form.expectedDate || undefined,
        remarks: form.remarks || undefined,
      });
      setShowCreate(false);
      setForm({ orderId: "", testType: "SHRINKAGE", labName: "", expectedDate: "", remarks: "" });
      fetchTests();
      toastSuccess("Test request created");
    } catch (e) { toastError(e, "Failed to create test"); }
  };

  const handleSubmitResult = async (id: number, results: Any[]) => {
    try {
      await labTestApi.submitResult(id, { results });
      fetchTests();
      toastSuccess("Result submitted");
    } catch (e) { toastError(e, "Failed to submit result"); }
  };

  return (
    <>
      <PageMeta title="Lab Tests" description="Lab test management" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Tests</h1>
          <button onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New Test Request</button>
        </div>

        {/* filter */}
        <div className="flex gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
            <option value="">All Statuses</option>
            {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">New Lab Test Request</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Order ID</label>
                  <input type="number" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Test Type</label>
                  <select value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    {testTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Lab Name</label>
                  <input type="text" value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expected Date</label>
                  <input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleCreate} disabled={!form.orderId}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Create</button>
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
                  {["Request No", "Order", "Test Type", "Lab", "Sent", "Expected", "Status", "Results"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tests.map((t) => {
                  const meta = statusMeta[t.status] ?? statusMeta.PENDING;
                  const isExpanded = expandedId === t.id;
                  return (
                    <>
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{t.requestNo ?? `#${t.id}`}</td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{t.order?.orderNo ?? `#${t.orderId}`}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">{(t.testType ?? "").replace(/_/g, " ")}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{t.labName ?? "—"}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(t.sentDate)}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(t.expectedDate)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-400">{t.results?.length ?? 0} parameters {isExpanded ? "▲" : "▼"}</td>
                      </tr>
                      {isExpanded && t.results && t.results.length > 0 && (
                        <tr key={`${t.id}-results`}>
                          <td colSpan={8} className="px-6 py-3 bg-gray-50 dark:bg-gray-900">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  {["Parameter", "Standard", "Actual", "Tolerance", "Result"].map((h) => (
                                    <th key={h} className="py-1 px-2 text-left font-medium text-gray-500">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {t.results.map((r, i) => (
                                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-1 px-2">{r.parameter}</td>
                                    <td className="py-1 px-2">{r.standardValue}</td>
                                    <td className="py-1 px-2">{r.actualValue ?? "—"}</td>
                                    <td className="py-1 px-2">{r.tolerance ?? "—"}</td>
                                    <td className="py-1 px-2">
                                      {r.result ? (
                                        <span className={r.result === "PASS" ? "text-green-600" : "text-red-600"}>{r.result}</span>
                                      ) : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {t.status === "RECEIVED" && (
                              <button onClick={() => handleSubmitResult(t.id, t.results.map((r) => ({ ...r, result: r.result || "PASS" })))}
                                className="mt-2 rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600">Submit Results</button>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {tests.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No lab tests found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
