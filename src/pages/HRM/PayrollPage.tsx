import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { salaryApi, leaveApi, SalarySlip, LeaveApplication } from "../../api/hrm";

const leaveBg: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function PayrollPage() {
  const [tab, setTab] = useState<"salary" | "leaves">("salary");
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSlips(); }, [month, year]);
  useEffect(() => { if (tab === "leaves") loadLeaves(); }, [tab]);

  async function loadSlips() {
    const r = await salaryApi.list({ month, year });
    setSlips(r.data?.data || []);
  }

  async function loadLeaves() {
    const r = await leaveApi.list();
    setLeaves(r.data?.data || []);
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      await salaryApi.process(month, year);
      loadSlips();
    } finally { setProcessing(false); }
  }

  async function markPaid() {
    await salaryApi.markPaid(month, year);
    loadSlips();
  }

  async function handleLeaveAction(id: number, action: "approve" | "reject") {
    if (action === "approve") await leaveApi.approve(id);
    else await leaveApi.reject(id);
    loadLeaves();
  }

  const totalNet = slips.reduce((s, sl) => s + Number(sl.netSalary || 0), 0);
  const totalGross = slips.reduce((s, sl) => s + Number(sl.grossSalary || 0), 0);
  const totalDeductions = slips.reduce((s, sl) => s + Number(sl.totalDeductions || 0), 0);

  const tabs = [
    { key: "salary" as const, label: "Salary Slips" },
    { key: "leaves" as const, label: "Leave Applications" },
  ];

  return (
    <>
      <PageMeta title="HRM — Payroll" description="Payroll & leave management" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Payroll</h2>

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

        {/* ---------- SALARY SLIPS ---------- */}
        {tab === "salary" && (
          <div>
            <div className="flex gap-4 items-center mb-4 flex-wrap">
              <label className="text-sm dark:text-gray-400">Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
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
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={handleProcess}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {processing ? "Processing…" : "⚙ Process Salary"}
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Gross", val: totalGross, color: "text-blue-600" },
                { label: "Total Deductions", val: totalDeductions, color: "text-red-600" },
                { label: "Total Net Pay", val: totalNet, color: "text-green-600" },
              ].map((c) => (
                <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow text-center">
                  <div className={`text-xl font-bold ${c.color}`}>₹{c.val.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{c.label}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    {["Slip No", "Employee", "Days", "Basic", "HRA", "PF", "ESI", "PT", "Loan", "OT", "Gross", "Deductions", "Net", "Status", ""].map((h) => (
                      <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {slips.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-2 py-2 font-mono text-xs">{s.slipNo}</td>
                      <td className="px-2 py-2">{s.employee?.empCode} — {s.employee?.firstName}</td>
                      <td className="px-2 py-2 text-center">{s.presentDays}/{s.workingDays}</td>
                      <td className="px-2 py-2 text-right">₹{Number(s.basic).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">₹{Number(s.hra).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-red-600">₹{Number(s.pfEmployee).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-red-600">₹{Number(s.esiEmployee).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-red-600">₹{Number(s.professionalTax).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-red-600">₹{Number(s.loanDeduction).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-green-600">₹{Number(s.overtimeAmount).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right font-medium">₹{Number(s.grossSalary).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-red-600">₹{Number(s.totalDeductions).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right font-bold">₹{Number(s.netSalary).toLocaleString()}</td>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          s.status === "PAID" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                        }`}>{s.status}</span>
                      </td>
                      <td className="px-2 py-2">
                        {s.status !== "PAID" && (
                          <button onClick={() => markPaid()} className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {slips.length === 0 && (
                    <tr><td colSpan={15} className="text-center py-8 text-gray-400">No salary slips — click "Process Salary" to generate</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- LEAVE APPLICATIONS ---------- */}
        {tab === "leaves" && (
          <div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["Employee", "Leave Type", "From", "To", "Days", "Reason", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2">{l.employee?.empCode} — {l.employee?.firstName}</td>
                    <td className="px-3 py-2">{l.leaveType?.name}</td>
                    <td className="px-3 py-2">{l.fromDate?.split("T")[0]}</td>
                    <td className="px-3 py-2">{l.toDate?.split("T")[0]}</td>
                    <td className="px-3 py-2 text-center">{l.totalDays}</td>
                    <td className="px-3 py-2 text-gray-500">{l.reason}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${leaveBg[l.status] || ""}`}>{l.status}</span>
                    </td>
                    <td className="px-3 py-2 flex gap-1">
                      {l.status === "PENDING" && (
                        <>
                          <button onClick={() => handleLeaveAction(l.id, "approve")} className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            Approve
                          </button>
                          <button onClick={() => handleLeaveAction(l.id, "reject")} className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No leave applications</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
