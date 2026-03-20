import { useEffect, useState, useCallback } from "react";
import { machineApi, repairApi } from "../../api/machine";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  INACTIVE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  UNDER_REPAIR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  DISPOSED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

export default function MachinePage() {
  const [tab, setTab] = useState<"machines" | "repairs" | "dashboard">("machines");

  // ── Machines ──
  const [machines, setMachines] = useState<R[]>([]);
  const [loadingM, setLoadingM] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mForm, setMForm] = useState({ machineCode: "", machineName: "", type: "", location: "", manufacturer: "" });
  const [savingM, setSavingM] = useState(false);

  // ── Repairs ──
  const [repairs, setRepairs] = useState<R[]>([]);
  const [loadingR, setLoadingR] = useState(false);
  const [rForm, setRForm] = useState({ machineId: "", issueDescription: "", reportedDate: new Date().toISOString().slice(0, 10) });
  const [savingR, setSavingR] = useState(false);

  // ── Dashboard ──
  const [stats, setStats] = useState<R | null>(null);
  const [loadingS, setLoadingS] = useState(false);

  const fetchMachines = useCallback(async () => {
    setLoadingM(true);
    try { const resp = await machineApi.list(); setMachines(resp.data ?? resp ?? []); } catch { setMachines([]); }
    setLoadingM(false);
  }, []);

  const fetchRepairs = useCallback(async () => {
    setLoadingR(true);
    try { const resp = await repairApi.list(); setRepairs(resp.data ?? resp ?? []); } catch { setRepairs([]); }
    setLoadingR(false);
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingS(true);
    try { const resp = await machineApi.stats(); setStats(resp.data ?? resp ?? null); } catch { setStats(null); }
    setLoadingS(false);
  }, []);

  useEffect(() => { fetchMachines(); }, [fetchMachines]);
  useEffect(() => { if (tab === "repairs") fetchRepairs(); }, [tab, fetchRepairs]);
  useEffect(() => { if (tab === "dashboard") fetchStats(); }, [tab, fetchStats]);

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingM(true);
    try { await machineApi.create(mForm); setMForm({ machineCode: "", machineName: "", type: "", location: "", manufacturer: "" }); setShowForm(false); fetchMachines(); toastSuccess("Machine added"); } catch (e) { toastError(e, "Failed to add machine"); }
    setSavingM(false);
  };

  const handleDeleteMachine = async (id: number) => {
    if (!confirm("Delete this machine?")) return;
    try { await machineApi.delete(id); fetchMachines(); toastSuccess("Machine deleted"); } catch (e) { toastError(e, "Failed to delete machine"); }
  };

  const handleAddRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingR(true);
    try { await repairApi.create({ machineId: Number(rForm.machineId), issueDescription: rForm.issueDescription, reportedDate: rForm.reportedDate }); setRForm({ machineId: "", issueDescription: "", reportedDate: new Date().toISOString().slice(0, 10) }); fetchRepairs(); toastSuccess("Repair logged"); } catch (e) { toastError(e, "Failed to log repair"); }
    setSavingR(false);
  };

  const handleCompleteRepair = async (id: number) => {
    const notes = prompt("Completion notes:");
    try { await repairApi.complete(id, { completionNotes: notes, completedDate: new Date().toISOString().slice(0, 10) }); fetchRepairs(); toastSuccess("Repair completed"); } catch (e) { toastError(e, "Failed to complete repair"); }
  };

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg ${tab === t ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`;

  return (
    <>
      <PageMeta title="Machine Management" description="Manage machines, repairs, and view dashboard stats" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Machine Management</h1>

        <div className="flex gap-2 border-b dark:border-gray-700">
          <button className={tabCls("machines")} onClick={() => setTab("machines")}>Machines</button>
          <button className={tabCls("repairs")} onClick={() => setTab("repairs")}>Repairs</button>
          <button className={tabCls("dashboard")} onClick={() => setTab("dashboard")}>Dashboard</button>
        </div>

        {/* ── Machines ── */}
        {tab === "machines" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Machines</h2>
              <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {showForm ? "Cancel" : "+ Add Machine"}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleAddMachine} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(["machineCode", "machineName", "type", "location", "manufacturer"] as const).map(f => (
                    <input key={f} placeholder={f.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                      value={mForm[f]} onChange={e => setMForm(prev => ({ ...prev, [f]: e.target.value }))}
                      className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required={f === "machineCode" || f === "machineName"} />
                  ))}
                </div>
                <button type="submit" disabled={savingM} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  {savingM ? "Saving…" : "Save"}
                </button>
              </form>
            )}

            {loadingM ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {["Code", "Name", "Type", "Location", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {machines.map((m: R) => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.machineCode}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{m.machineName}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.type ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.location ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[m.status] ?? statusColors.ACTIVE}`}>{m.status ?? "ACTIVE"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteMachine(m.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {machines.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No machines</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Repairs ── */}
        {tab === "repairs" && (
          <div className="space-y-4">
            <form onSubmit={handleAddRepair} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Log Repair</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input placeholder="Machine ID" value={rForm.machineId} onChange={e => setRForm(f => ({ ...f, machineId: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input placeholder="Issue Description" value={rForm.issueDescription} onChange={e => setRForm(f => ({ ...f, issueDescription: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="date" value={rForm.reportedDate} onChange={e => setRForm(f => ({ ...f, reportedDate: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <button type="submit" disabled={savingR} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {savingR ? "Saving…" : "Log Repair"}
              </button>
            </form>

            {loadingR ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {["Machine", "Issue", "Reported", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {repairs.map((r: R) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.machine?.machineName ?? r.machineId}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.issueDescription}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.reportedDate ? fmtDate(r.reportedDate) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "COMPLETED" ? statusColors.ACTIVE : statusColors.UNDER_REPAIR}`}>{r.status ?? "OPEN"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.status !== "COMPLETED" && (
                            <button onClick={() => handleCompleteRepair(r.id)} className="text-xs text-green-600 hover:underline">Complete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {repairs.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No repairs logged</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Dashboard ── */}
        {tab === "dashboard" && (
          <div>
            {loadingS ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Machines", value: stats.total ?? 0, color: "text-blue-600" },
                  { label: "Active", value: stats.active ?? 0, color: "text-green-600" },
                  { label: "Under Repair", value: stats.underRepair ?? 0, color: "text-yellow-600" },
                  { label: "Inactive / Disposed", value: (stats.inactive ?? 0) + (stats.disposed ?? 0), color: "text-red-600" },
                ].map(c => (
                  <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                    <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400">No stats available</p>}
          </div>
        )}
      </div>
    </>
  );
}
