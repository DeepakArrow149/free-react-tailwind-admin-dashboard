import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { attendanceApi, employeeApi, AttendanceRecord, AttendanceSummary, Employee } from "../../api/hrm";

const statusBg: Record<string, string> = {
  PRESENT: "bg-green-500", ABSENT: "bg-red-500", HALF_DAY: "bg-yellow-500",
  WEEK_OFF: "bg-gray-400", HOLIDAY: "bg-blue-400", LEAVE: "bg-purple-500",
};

export default function AttendancePage() {
  const [tab, setTab] = useState<"daily" | "bulk" | "summary">("daily");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [bulkRows, setBulkRows] = useState<{ employeeId: number; status: string; otHours?: number }[]>([]);

  useEffect(() => { loadEmployees(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "daily") loadRecords(); }, [tab, date]);
  useEffect(() => {
    if (tab === "summary") loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, summaryMonth, summaryYear]);

  async function loadEmployees() {
    const r = await employeeApi.list();
    const list = r.data?.data?.data || r.data?.data || [];
    setEmployees(list);
    setBulkRows(list.map((e: Employee) => ({ employeeId: e.id, status: "PRESENT", otHours: 0 })));
  }

  async function loadRecords() {
    const r = await attendanceApi.list({ date });
    setRecords(r.data?.data || []);
  }

  async function loadSummary() {
    try {
      const r = await attendanceApi.summary({ employeeId: 0, month: summaryMonth, year: summaryYear });
      setSummary(r.data?.data || null);
    } catch { setSummary(null); }
  }

  async function handleBulkMark(e: React.FormEvent) {
    e.preventDefault();
    await attendanceApi.bulkMark({
      date,
      records: bulkRows.map((r) => ({
        employeeId: r.employeeId,
        status: r.status as string,
        otHours: r.otHours || 0,
      })),
    });
    setTab("daily");
  }

  const tabs = [
    { key: "daily" as const, label: "Daily View" },
    { key: "bulk" as const, label: "Bulk Mark" },
    { key: "summary" as const, label: "Monthly Summary" },
  ];

  return (
    <>
      <PageMeta title="HRM — Attendance" description="Attendance tracking" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Attendance</h2>

        <div className="flex gap-2 border-b dark:border-gray-700 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ---------- DAILY VIEW ---------- */}
        {tab === "daily" && (
          <div>
            <div className="flex gap-4 items-center mb-4">
              <label className="text-sm dark:text-gray-400">Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["Employee", "Status", "OT Hrs"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2">{r.employee?.empCode} — {r.employee?.firstName} {r.employee?.lastName}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${statusBg[r.status] || "bg-gray-300"}`} />
                      {r.status}
                    </td>
                    <td className="px-3 py-2">{r.overtimeHours || "—"}</td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-8 text-gray-400">No attendance records for this date</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ---------- BULK MARK ---------- */}
        {tab === "bulk" && (
          <form onSubmit={handleBulkMark} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
            <div className="flex gap-4 items-center">
              <label className="text-sm dark:text-gray-400">Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["Employee", "Status", "OT Hours"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {employees.map((emp, i) => (
                  <tr key={emp.id}>
                    <td className="px-3 py-2">{emp.empCode} — {emp.firstName} {emp.lastName}</td>
                    <td className="px-3 py-2">
                      <select
                        value={bulkRows[i]?.status || "PRESENT"}
                        onChange={(e) => {
                          const copy = [...bulkRows];
                          copy[i] = { ...copy[i], status: e.target.value };
                          setBulkRows(copy);
                        }}
                        className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        {["PRESENT", "ABSENT", "HALF_DAY", "WEEK_OFF", "HOLIDAY", "LEAVE"].map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={bulkRows[i]?.otHours || 0}
                        onChange={(e) => {
                          const copy = [...bulkRows];
                          copy[i] = { ...copy[i], otHours: Number(e.target.value) };
                          setBulkRows(copy);
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
              Save Bulk Attendance
            </button>
          </form>
        )}

        {/* ---------- MONTHLY SUMMARY ---------- */}
        {tab === "summary" && (
          <div>
            <div className="flex gap-4 items-center mb-4">
              <label className="text-sm dark:text-gray-400">Month:</label>
              <select
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
              <label className="text-sm dark:text-gray-400">Year:</label>
              <input
                type="number"
                value={summaryYear}
                onChange={(e) => setSummaryYear(Number(e.target.value))}
                className="w-24 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {summary ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
                {[
                  { label: "Present", val: summary.present, color: "text-green-600" },
                  { label: "Absent", val: summary.absent, color: "text-red-600" },
                  { label: "Half Day", val: summary.halfDay, color: "text-yellow-600" },
                  { label: "Week Off", val: summary.weeklyOff, color: "text-gray-500" },
                  { label: "Holiday", val: summary.holiday, color: "text-blue-500" },
                  { label: "Leave", val: summary.leave, color: "text-purple-500" },
                ].map((c) => (
                  <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow text-center">
                    <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
                    <div className="text-xs text-gray-500">{c.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">Select an employee to view monthly summary</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
