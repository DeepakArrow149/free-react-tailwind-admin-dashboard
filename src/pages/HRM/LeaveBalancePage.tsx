import { useEffect, useState, useCallback } from "react";
import { leaveBalanceApi, LeaveBalance, employeeApi, Employee } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

export default function LeaveBalancePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  const loadEmployees = useCallback(async () => {
    try {
      const r = await employeeApi.list();
      const list = r.data?.data?.data || r.data?.data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch { setEmployees([]); }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const loadBalances = useCallback(async () => {
    if (!selectedEmpId) return;
    setLoading(true);
    try {
      const r = await leaveBalanceApi.get({ employeeId: Number(selectedEmpId), year });
      const d = r.data?.data ?? r.data ?? [];
      setBalances(Array.isArray(d) ? d : []);
    } catch { setBalances([]); }
    setLoading(false);
  }, [selectedEmpId, year]);

  useEffect(() => { loadBalances(); }, [loadBalances]);

  const handleAllocate = async () => {
    if (!selectedEmpId) return;
    try {
      await leaveBalanceApi.allocate({ employeeId: Number(selectedEmpId), year });
      loadBalances();
      toastSuccess("Leaves allocated");
    } catch (e) { toastError(e, "Allocation failed"); }
  };

  const handleBulkAllocate = async () => {
    try {
      await leaveBalanceApi.bulkAllocate({ year });
      toastSuccess(`Bulk allocation done for ${year}`);
      if (selectedEmpId) loadBalances();
    } catch (e) { toastError(e, "Bulk allocation failed"); }
  };

  return (
    <>
      <PageMeta title="Leave Balances" description="View & allocate leave balances" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Balances</h1>
          <button onClick={handleBulkAllocate}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
            Bulk Allocate {year}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employee</label>
            <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white min-w-[220px]">
              <option value="">Select employee…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.empCode} — {e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2099}
              className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>
          {selectedEmpId && (
            <button onClick={handleAllocate}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Allocate for {year}
            </button>
          )}
        </div>

        {!selectedEmpId ? (
          <p className="text-gray-400 py-8 text-center">Select an employee to view leave balances</p>
        ) : loading ? (
          <p className="text-gray-400 py-8 text-center">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Leave Type", "Carry Fwd", "Allocated", "Used", "Balance"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {balances.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.leaveType?.name ?? b.leaveTypeId}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.carryForward}</td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium">{b.allocated}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{b.used}</td>
                    <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">{b.balance}</td>
                  </tr>
                ))}
                {balances.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No balances found — click Allocate to initialize</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
