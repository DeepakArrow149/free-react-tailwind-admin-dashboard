import { useEffect, useState, useCallback } from "react";
import { loanApi } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

/* ── helpers ── */
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtCur(n: number) { return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: "Pending",    bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" },
  APPROVED:   { label: "Approved",   bg: "bg-blue-100 dark:bg-blue-900/20",     text: "text-blue-700 dark:text-blue-400" },
  DISBURSED:  { label: "Disbursed",  bg: "bg-green-100 dark:bg-green-900/20",   text: "text-green-700 dark:text-green-400" },
  CLOSED:     { label: "Closed",     bg: "bg-gray-100 dark:bg-gray-700",        text: "text-gray-700 dark:text-gray-300" },
  REJECTED:   { label: "Rejected",   bg: "bg-red-100 dark:bg-red-900/20",       text: "text-red-700 dark:text-red-400" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function LoansPage() {
  const [loans, setLoans] = useState<Any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ employeeId: "", loanType: "PERSONAL", loanAmount: "", emiAmount: "", tenure: "12", purpose: "" });

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await loanApi.list();
      const data = resp?.data?.data ?? resp?.data ?? resp ?? [];
      setLoans(Array.isArray(data) ? data : []);
    } catch { setLoans([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const handleCreate = async () => {
    try {
      await loanApi.create({
        employeeId: Number(form.employeeId),
        loanType: form.loanType,
        loanAmount: Number(form.loanAmount),
        emiAmount: Number(form.emiAmount),
        tenure: Number(form.tenure),
        purpose: form.purpose || undefined,
      });
      setShowCreate(false);
      setForm({ employeeId: "", loanType: "PERSONAL", loanAmount: "", emiAmount: "", tenure: "12", purpose: "" });
      fetchLoans();
      toastSuccess("Loan created");
    } catch (e) { toastError(e, "Failed to create loan"); }
  };

  /* ── summary stats ── */
  const totalDisbursed = loans.filter((l) => l.status === "DISBURSED").reduce((s: number, l: Any) => s + (l.loanAmount ?? 0), 0);
  const totalOutstanding = loans.filter((l) => l.status === "DISBURSED").reduce((s: number, l: Any) => s + ((l.loanAmount ?? 0) - (l.paidAmount ?? 0)), 0);
  const activeCount = loans.filter((l) => l.status === "DISBURSED").length;

  return (
    <>
      <PageMeta title="Employee Loans" description="Manage employee loans" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Loans</h1>
          <button onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New Loan</button>
        </div>

        {/* summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Loans", value: loans.length, color: "text-blue-600 dark:text-blue-400" },
            { label: "Active", value: activeCount, color: "text-green-600 dark:text-green-400" },
            { label: "Total Disbursed", value: fmtCur(totalDisbursed), color: "text-purple-600 dark:text-purple-400" },
            { label: "Outstanding", value: fmtCur(totalOutstanding), color: "text-amber-600 dark:text-amber-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">New Loan Application</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employee ID</label>
                  <input type="number" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Loan Type</label>
                  <select value={form.loanType} onChange={(e) => setForm({ ...form, loanType: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    {["PERSONAL", "SALARY_ADVANCE", "EMERGENCY", "FESTIVAL"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Loan Amount</label>
                  <input type="number" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">EMI Amount</label>
                  <input type="number" value={form.emiAmount} onChange={(e) => setForm({ ...form, emiAmount: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tenure (months)</label>
                  <input type="number" value={form.tenure} onChange={(e) => setForm({ ...form, tenure: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Purpose</label>
                <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleCreate} disabled={!form.employeeId || !form.loanAmount}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Submit</button>
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
                  {["#", "Employee", "Type", "Amount", "EMI", "Paid", "Outstanding", "Disbursed", "Status"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loans.map((l: Any) => {
                  const meta = statusMeta[l.status] ?? statusMeta.PENDING;
                  const outstanding = (l.loanAmount ?? 0) - (l.paidAmount ?? 0);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{l.loanNo ?? `#${l.id}`}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{l.employee?.name ?? l.employee?.fullName ?? `#${l.employeeId}`}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">{(l.loanType ?? "").replace(/_/g, " ")}</td>
                      <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{fmtCur(l.loanAmount ?? 0)}</td>
                      <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-400">{fmtCur(l.emiAmount ?? 0)}</td>
                      <td className="px-3 py-3 text-right text-green-600 dark:text-green-400">{fmtCur(l.paidAmount ?? 0)}</td>
                      <td className="px-3 py-3 text-right font-medium text-amber-600 dark:text-amber-400">{fmtCur(outstanding)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(l.disbursedDate)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {loans.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No loans found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
