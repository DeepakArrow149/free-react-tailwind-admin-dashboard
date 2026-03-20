import { useEffect, useState, useCallback } from "react";
import { leaveApi, LeaveApplication, LeaveType, employeeApi, Employee } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:  { label: "Pending",  bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" },
  APPROVED: { label: "Approved", bg: "bg-green-100 dark:bg-green-900/20",   text: "text-green-700 dark:text-green-400" },
  REJECTED: { label: "Rejected", bg: "bg-red-100 dark:bg-red-900/20",       text: "text-red-700 dark:text-red-400" },
};

export default function LeaveApplicationsPage() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ employeeId: "", leaveTypeId: "", fromDate: "", toDate: "", totalDays: "1", reason: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, ltr, er] = await Promise.all([leaveApi.list(), leaveApi.types(), employeeApi.list()]);
      setLeaves(lr.data?.data ?? []);
      setLeaveTypes(ltr.data?.data ?? ltr.data ?? []);
      const empList = er.data?.data?.data || er.data?.data || [];
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch { setLeaves([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApply = async () => {
    try {
      await leaveApi.apply({
        employeeId: Number(form.employeeId),
        leaveTypeId: Number(form.leaveTypeId),
        fromDate: form.fromDate,
        toDate: form.toDate,
        totalDays: Number(form.totalDays),
        reason: form.reason,
      });
      setShowApply(false);
      setForm({ employeeId: "", leaveTypeId: "", fromDate: "", toDate: "", totalDays: "1", reason: "" });
      load();
      toastSuccess("Leave applied");
    } catch (e) { toastError(e, "Failed"); }
  };

  const handleAction = async (id: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") await leaveApi.approve(id);
      else await leaveApi.reject(id);
      load();
      toastSuccess(`Leave ${action}d`);
    } catch (e) { toastError(e, `Failed to ${action}`); }
  };

  return (
    <>
      <PageMeta title="Leave Applications" description="Manage leave applications" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Applications</h1>
          <button onClick={() => setShowApply(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ Apply Leave</button>
        </div>

        {showApply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Apply Leave</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employee</label>
                  <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    <option value="">Select…</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.empCode} — {e.firstName} {e.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Leave Type</label>
                  <select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    <option value="">Select…</option>
                    {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Days</label>
                  <input type="number" min={0.5} step={0.5} value={form.totalDays} onChange={(e) => setForm({ ...form, totalDays: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
                  <input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
                  <input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason</label>
                  <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowApply(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleApply} disabled={!form.employeeId || !form.leaveTypeId || !form.fromDate || !form.toDate}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Submit</button>
              </div>
            </div>
          </div>
        )}

        {loading ? <p className="text-gray-400 py-8 text-center">Loading…</p> : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Employee", "Leave Type", "From", "To", "Days", "Reason", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leaves.map((l) => {
                  const meta = statusMeta[l.status] ?? statusMeta.PENDING;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-3 text-gray-900 dark:text-white">
                        {l.employee ? `${l.employee.empCode} — ${l.employee.firstName}` : `#${l.employeeId}`}
                      </td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{l.leaveType?.name ?? l.leaveTypeId}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{fmtDate(l.fromDate)}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{fmtDate(l.toDate)}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{l.totalDays}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{l.reason}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-3 flex gap-1">
                        {l.status === "PENDING" && (
                          <>
                            <button onClick={() => handleAction(l.id, "approve")}
                              className="rounded bg-green-500 px-2 py-0.5 text-xs text-white hover:bg-green-600">Approve</button>
                            <button onClick={() => handleAction(l.id, "reject")}
                              className="rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600">Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {leaves.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No leave applications</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
