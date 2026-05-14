import { useEffect, useState, useCallback } from "react";
import { overtimeApi } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface R {
  id: number;
  employeeId: number;
  employee?: { firstName: string; lastName: string; empCode: string };
  date?: string;
  hours: number;
  reason?: string;
  status: string;
}

export default function OvertimePage() {
  const [records, setRecords] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: "", date: "", hours: "", reason: "" });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await overtimeApi.list({ page, limit: 20 });
      setRecords(resp.data?.data ?? resp.data ?? []);
      setTotalPages(resp.data?.meta?.totalPages ?? 1);
    } catch { setRecords([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await overtimeApi.create({ employeeId: Number(form.employeeId), date: form.date, hours: Number(form.hours), reason: form.reason });
      setShowForm(false);
      setForm({ employeeId: "", date: "", hours: "", reason: "" });
      fetchRecords();
      toastSuccess("Overtime record created");
    } catch (err) { toastError(err, "Failed to create OT record"); }
    setSaving(false);
  };

  const handleApprove = async (id: number) => {
    try { await overtimeApi.approve(id); fetchRecords(); toastSuccess("Approved"); }
    catch (err) { toastError(err, "Failed to approve"); }
  };

  const handleReject = async (id: number) => {
    try { await overtimeApi.reject(id); fetchRecords(); toastSuccess("Rejected"); }
    catch (err) { toastError(err, "Failed to reject"); }
  };

  const _columns = [
    { header: "Employee", accessor: (r: R) => r.employee ? `${r.employee.firstName} ${r.employee.lastName} (${r.employee.empCode})` : r.employeeId },
    { header: "Date", accessor: (r: R) => r.date ? fmtDate(r.date) : "-" },
    { header: "Hours", accessor: "hours" },
    { header: "Reason", accessor: "reason" },
    { header: "Status", accessor: (r: R) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? ""}`}>{r.status}</span>
    )},
    { header: "Actions", accessor: (r: R) => r.status === "PENDING" ? (
      <div className="flex gap-2">
        <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:underline text-sm">Approve</button>
        <button onClick={() => handleReject(r.id)} className="text-red-600 hover:underline text-sm">Reject</button>
      </div>
    ) : null },
  ];
  void _columns;

  return (
    <>
      <PageMeta title="Overtime Records" description="Track and approve operator overtime hours" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overtime Records</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            {showForm ? "Cancel" : "+ Record OT"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employee ID</label>
              <input value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} required aria-label="Employee ID"
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required aria-label="Overtime date"
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hours</label>
              <input type="number" step="0.5" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} required aria-label="Overtime hours"
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason</label>
              <div className="flex gap-2">
                <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} aria-label="Overtime reason"
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 whitespace-nowrap">
                  {saving ? "Saving…" : "Add"}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                    <th className="pb-2 pr-3">Employee</th><th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Hours</th><th className="pb-2 pr-3">Reason</th>
                    <th className="pb-2 pr-3">Status</th><th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">No overtime records found</td></tr>
                  ) : records.map((r: R) => (
                    <tr key={r.id} className="border-b dark:border-gray-800">
                      <td className="py-2 pr-3">{r.employee ? `${r.employee.firstName} ${r.employee.lastName} (${r.employee.empCode})` : r.employeeId}</td>
                      <td className="py-2 pr-3">{r.date ? fmtDate(r.date) : "-"}</td>
                      <td className="py-2 pr-3">{r.hours}</td>
                      <td className="py-2 pr-3">{r.reason}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? ""}`}>{r.status}</span>
                      </td>
                      <td className="py-2">
                        {r.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:underline text-sm">Approve</button>
                            <button onClick={() => handleReject(r.id)} className="text-red-600 hover:underline text-sm">Reject</button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={20} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
