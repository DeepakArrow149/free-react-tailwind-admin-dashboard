import { useState } from "react";
import {
  useMachines,
  useMachineStats,
  useCreateMachine,
  useUpdateMachine,
  useDeleteMachine,
  useRepairs,
  useCreateRepair,
  useCompleteRepair,
} from "@/hooks/useMachine";
import type {
  Machine,
  MachineRepair,
  MachineStats,
  CreateMachinePayload,
} from "@/api/machine";
import PageMeta from "@/components/common/PageMeta";
import { PaginatedTable } from "@/components/table";

// ── Constants ──
const MACHINE_TYPES = [
  "SNLS", "DNLS", "OL", "FL", "BH", "BT", "KANSAI", "SNAP",
  "FUSING", "CUTTING", "PRESSING", "BOILER", "COMPRESSOR", "OTHER",
] as const;

const REPAIR_TYPES = ["BREAKDOWN", "PREVENTIVE", "OVERHAUL"] as const;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  IDLE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  UNDER_REPAIR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  DISPOSED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const REPAIR_STATUS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const emptyMachineForm: CreateMachinePayload = {
  machineCode: "", machineName: "", machineType: "SNLS",
  brand: "", modelNo: "", serialNo: "", location: "", purchaseDate: "",
};

export default function MachinePage() {
  const [tab, setTab] = useState<"machines" | "repairs" | "dashboard">("machines");

  // ── Machines ──
  const { data: machinesRaw, isLoading: loadingM } = useMachines();
  const machines: Machine[] = Array.isArray(machinesRaw) ? machinesRaw : [];
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [mForm, setMForm] = useState<CreateMachinePayload>({ ...emptyMachineForm });

  // ── Repairs ──
  const { data: repairsRaw, isLoading: loadingR } = useRepairs();
  const repairs: MachineRepair[] = Array.isArray(repairsRaw) ? repairsRaw : [];
  const createRepair = useCreateRepair();
  const completeRepair = useCompleteRepair();

  const [rForm, setRForm] = useState({ machineId: 0, repairType: "BREAKDOWN" as (typeof REPAIR_TYPES)[number], description: "", repairDate: new Date().toISOString().slice(0, 10) });
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [completeForm, setCompleteForm] = useState({ completedDate: new Date().toISOString().slice(0, 10), repairedBy: "" });

  // ── Dashboard ──
  const { data: stats, isLoading: loadingS } = useMachineStats();

  // ── Handlers ──
  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...mForm, purchaseCost: mForm.purchaseCost ? Number(mForm.purchaseCost) : undefined };
    if (editId) {
      updateMachine.mutate({ id: editId, data: payload }, { onSuccess: () => { setShowForm(false); setEditId(null); setMForm({ ...emptyMachineForm }); } });
    } else {
      createMachine.mutate(payload, { onSuccess: () => { setShowForm(false); setMForm({ ...emptyMachineForm }); } });
    }
  };

  const openEdit = (m: Machine) => {
    setEditId(m.id);
    setMForm({
      machineCode: m.machineCode,
      machineName: m.machineName,
      machineType: m.machineType,
      brand: m.brand ?? "",
      modelNo: m.modelNo ?? "",
      serialNo: m.serialNo ?? "",
      location: m.location ?? "",
      purchaseDate: m.purchaseDate?.slice(0, 10) ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditId(null); setMForm({ ...emptyMachineForm }); };

  const handleAddRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.machineId) return;
    createRepair.mutate({ machineId: rForm.machineId, repairType: rForm.repairType, description: rForm.description, repairDate: rForm.repairDate }, {
      onSuccess: () => setRForm({ machineId: 0, repairType: "BREAKDOWN", description: "", repairDate: new Date().toISOString().slice(0, 10) }),
    });
  };

  const handleCompleteRepair = () => {
    if (!completeId) return;
    completeRepair.mutate({ id: completeId, data: completeForm }, { onSuccess: () => { setCompleteId(null); setCompleteForm({ completedDate: new Date().toISOString().slice(0, 10), repairedBy: "" }); } });
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

        {/* ════════ Machines Tab ════════ */}
        {tab === "machines" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Machines</h2>
              <button onClick={() => { if (showForm) cancelForm(); else setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {showForm ? "Cancel" : "+ Add Machine"}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSaveMachine} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{editId ? "Edit Machine" : "New Machine"}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input placeholder="Machine Code *" value={mForm.machineCode} onChange={e => setMForm(p => ({ ...p, machineCode: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required disabled={!!editId} />
                  <input placeholder="Machine Name *" value={mForm.machineName} onChange={e => setMForm(p => ({ ...p, machineName: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                  <select value={mForm.machineType} onChange={e => setMForm(p => ({ ...p, machineType: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" aria-label="Machine type">
                    {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input placeholder="Brand" value={mForm.brand ?? ""} onChange={e => setMForm(p => ({ ...p, brand: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  <input placeholder="Model No." value={mForm.modelNo ?? ""} onChange={e => setMForm(p => ({ ...p, modelNo: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  <input placeholder="Serial No." value={mForm.serialNo ?? ""} onChange={e => setMForm(p => ({ ...p, serialNo: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  <input placeholder="Location" value={mForm.location ?? ""} onChange={e => setMForm(p => ({ ...p, location: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  <input type="date" value={mForm.purchaseDate ?? ""} onChange={e => setMForm(p => ({ ...p, purchaseDate: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" aria-label="Purchase date" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={createMachine.isPending || updateMachine.isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                    {(createMachine.isPending || updateMachine.isPending) ? "Saving…" : editId ? "Update" : "Save"}
                  </button>
                  {editId && <button type="button" onClick={cancelForm} className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300">Cancel</button>}
                </div>
              </form>
            )}

            {loadingM ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
              <PaginatedTable data={machines} pageSize={20}>
                {(pageData) => (
                  <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {["Code", "Name", "Type", "Brand", "Location", "Status", "Actions"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pageData.map((m: Machine) => (
                          <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.machineCode}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{m.machineName}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.machineType}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.brand ?? "—"}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.location ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.status] ?? STATUS_COLORS.ACTIVE}`}>{m.status}</span>
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                              <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:underline">Edit</button>
                              <button onClick={() => { if (confirm("Delete this machine?")) deleteMachine.mutate(m.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
                            </td>
                          </tr>
                        ))}
                        {machines.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No machines</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </PaginatedTable>
            )}
          </div>
        )}

        {/* ════════ Repairs Tab ════════ */}
        {tab === "repairs" && (
          <div className="space-y-4">
            <form onSubmit={handleAddRepair} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Log Repair</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select value={rForm.machineId || ""} onChange={e => setRForm(f => ({ ...f, machineId: Number(e.target.value) }))}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required aria-label="Select machine">
                  <option value="">Select Machine</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.machineCode} — {m.machineName}</option>)}
                </select>
                <select value={rForm.repairType} onChange={e => setRForm(f => ({ ...f, repairType: e.target.value as (typeof REPAIR_TYPES)[number] }))}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" aria-label="Repair type">
                  {REPAIR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input placeholder="Description" value={rForm.description} onChange={e => setRForm(f => ({ ...f, description: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="date" value={rForm.repairDate} onChange={e => setRForm(f => ({ ...f, repairDate: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" aria-label="Repair date" />
              </div>
              <button type="submit" disabled={createRepair.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {createRepair.isPending ? "Saving…" : "Log Repair"}
              </button>
            </form>

            {/* Complete repair modal */}
            {completeId && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3 border-2 border-green-500">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Complete Repair #{completeId}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="date" value={completeForm.completedDate} onChange={e => setCompleteForm(f => ({ ...f, completedDate: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" aria-label="Completed date" />
                  <input placeholder="Repaired by" value={completeForm.repairedBy} onChange={e => setCompleteForm(f => ({ ...f, repairedBy: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  <div className="flex gap-2">
                    <button onClick={handleCompleteRepair} disabled={completeRepair.isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                      {completeRepair.isPending ? "Saving…" : "Mark Complete"}
                    </button>
                    <button onClick={() => setCompleteId(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {loadingR ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
              <PaginatedTable data={repairs} pageSize={20}>
                {(pageData) => (
                  <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {["Repair No", "Machine", "Type", "Date", "Status", "Cost", "Actions"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pageData.map((r: MachineRepair) => (
                          <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.repairNo}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.machine?.machineName ?? `#${r.machineId}`}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.repairType}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(r.repairDate)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REPAIR_STATUS[r.status] ?? REPAIR_STATUS.OPEN}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">₹{r.totalCost.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              {r.status !== "COMPLETED" && (
                                <button onClick={() => setCompleteId(r.id)} className="text-xs text-green-600 hover:underline">Complete</button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {repairs.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No repairs logged</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </PaginatedTable>
            )}
          </div>
        )}

        {/* ════════ Dashboard Tab ════════ */}
        {tab === "dashboard" && (
          <div>
            {loadingS ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Machines", value: (stats as MachineStats).machinesByStatus?.reduce((s, x) => s + x._count._all, 0) ?? 0, color: "text-blue-600" },
                  { label: "Active", value: (stats as MachineStats).machinesByStatus?.find(x => x.status === "ACTIVE")?._count._all ?? 0, color: "text-green-600" },
                  { label: "Under Repair", value: (stats as MachineStats).machinesByStatus?.find(x => x.status === "UNDER_REPAIR")?._count._all ?? 0, color: "text-yellow-600" },
                  { label: "Due for Service", value: (stats as MachineStats).machinesDueForService ?? 0, color: "text-red-600" },
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
