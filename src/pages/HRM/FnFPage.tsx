import { useEffect, useState, useCallback } from "react";
import { fnfApi, FnFSettlement, employeeApi, Employee } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { PaginatedTable } from "../../components/table";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtCur(n: number) { return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:    { label: "Draft",    bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" },
  APPROVED: { label: "Approved", bg: "bg-blue-100 dark:bg-blue-900/20",     text: "text-blue-700 dark:text-blue-400" },
  PAID:     { label: "Paid",     bg: "bg-green-100 dark:bg-green-900/20",   text: "text-green-700 dark:text-green-400" },
};

export default function FnFPage() {
  const [rows, setRows] = useState<FnFSettlement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [genEmpId, setGenEmpId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, er] = await Promise.all([fnfApi.list(), employeeApi.list()]);
      const fnfs = fr.data?.data ?? fr.data ?? [];
      setRows(Array.isArray(fnfs) ? fnfs : []);
      const empList = er.data?.data?.data || er.data?.data || [];
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    try {
      await fnfApi.generate({ employeeId: Number(genEmpId) });
      setShowGen(false);
      setGenEmpId("");
      load();
      toastSuccess("FnF generated");
    } catch (e) { toastError(e, "Failed"); }
  };

  const handleAction = async (id: number, action: "approve" | "markPaid") => {
    try {
      if (action === "approve") await fnfApi.approve(id);
      else await fnfApi.markPaid(id);
      load();
      toastSuccess(action === "approve" ? "FnF approved" : "Marked as paid");
    } catch (e) { toastError(e, "Failed"); }
  };

  const totalNet = rows.reduce((s, r) => s + (r.netPayable ?? 0), 0);

  return (
    <>
      <PageMeta title="FnF Settlements" description="Full & Final settlements" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Full & Final Settlements</h1>
          <button onClick={() => setShowGen(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ Generate FnF</button>
        </div>

        {/* summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: rows.length, color: "text-blue-600 dark:text-blue-400" },
            { label: "Draft", value: rows.filter((r) => r.status === "DRAFT").length, color: "text-yellow-600 dark:text-yellow-400" },
            { label: "Approved", value: rows.filter((r) => r.status === "APPROVED").length, color: "text-blue-600 dark:text-blue-400" },
            { label: "Net Payable", value: fmtCur(totalNet), color: "text-green-600 dark:text-green-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {showGen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Generate FnF</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employee (Terminated)</label>
                <select value={genEmpId} onChange={(e) => setGenEmpId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                  <option value="">Select…</option>
                  {employees.filter((e) => e.status === "TERMINATED" || e.status === "RESIGNED").map((e) => (
                    <option key={e.id} value={e.id}>{e.empCode} — {e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowGen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleGenerate} disabled={!genEmpId}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Generate</button>
              </div>
            </div>
          </div>
        )}

        {loading ? <p className="text-gray-400 py-8 text-center">Loading…</p> : (
          <PaginatedTable data={rows} pageSize={20}>
            {(pageData) => (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Employee", "Last Working", "Salary", "Leave Enc.", "Gratuity", "Deductions", "Loan Rec.", "Net Payable", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pageData.map((r) => {
                  const meta = statusMeta[r.status] ?? statusMeta.DRAFT;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-3 text-gray-900 dark:text-white">
                        {r.employee ? `${r.employee.empCode} — ${r.employee.firstName}` : `#${r.employeeId}`}
                      </td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{fmtDate(r.lastWorkingDay)}</td>
                      <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{fmtCur(r.pendingSalary)}</td>
                      <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{fmtCur(r.leaveEncashment)}</td>
                      <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{fmtCur(r.gratuity)}</td>
                      <td className="px-3 py-3 text-right text-red-600 dark:text-red-400">{fmtCur(r.deductions)}</td>
                      <td className="px-3 py-3 text-right text-amber-600 dark:text-amber-400">{fmtCur(r.loanRecovery)}</td>
                      <td className="px-3 py-3 text-right font-bold text-green-600 dark:text-green-400">{fmtCur(r.netPayable)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-3 flex gap-1">
                        {r.status === "DRAFT" && (
                          <button onClick={() => handleAction(r.id, "approve")}
                            className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600">Approve</button>
                        )}
                        {r.status === "APPROVED" && (
                          <button onClick={() => handleAction(r.id, "markPaid")}
                            className="rounded bg-green-500 px-2 py-0.5 text-xs text-white hover:bg-green-600">Mark Paid</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No FnF settlements</td></tr>
                )}
              </tbody>
            </table>
          </div>
            )}
          </PaginatedTable>
        )}
      </div>
    </>
  );
}
