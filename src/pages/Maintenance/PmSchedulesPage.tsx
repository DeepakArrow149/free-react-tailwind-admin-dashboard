import { useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import { PaginatedTable } from "@/components/table";
import {
  usePmSchedules,
  useCreatePmSchedule,
  useUpdatePmSchedule,
  useExecutePm,
  usePmLogs,
  useOverdueCount,
  useChecklists,
} from "@/hooks/useMaintenance";
import { useMachines } from "@/hooks/useMachine";
import type { PmSchedule, CreatePmSchedulePayload, PmLog } from "@/api/maintenance";

const FREQ_TYPES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "RUNTIME_HOURS"] as const;
const EXEC_STATUSES = ["COMPLETED", "SKIPPED", "PARTIAL"] as const;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const TABS = ["Schedules", "Create", "Logs"] as const;
type Tab = (typeof TABS)[number];

const emptyForm: CreatePmSchedulePayload = {
  machineId: 0,
  taskName: "",
  frequencyType: "MONTHLY",
  frequencyValue: 1,
  nextDueDate: new Date().toISOString().slice(0, 10),
};

export default function PmSchedulesPage() {
  const [tab, setTab] = useState<Tab>("Schedules");
  const [showOverdue, setShowOverdue] = useState(false);
  const [form, setForm] = useState<CreatePmSchedulePayload>({ ...emptyForm });
  const [execId, setExecId] = useState<number | null>(null);
  const [execForm, setExecForm] = useState({ status: "COMPLETED" as string, notes: "", durationMinutes: 0 });

  // Data
  const { data: schedulesRaw, isLoading } = usePmSchedules(showOverdue ? { overdue: true } : undefined);
  const schedules: PmSchedule[] = Array.isArray(schedulesRaw)
    ? schedulesRaw
    : (schedulesRaw as { data?: PmSchedule[] })?.data ?? [];
  const { data: logsRaw } = usePmLogs();
  const logs: PmLog[] = Array.isArray(logsRaw)
    ? logsRaw
    : (logsRaw as { data?: PmLog[] })?.data ?? [];
  const { data: overdueRaw } = useOverdueCount();
  const overdueCount = typeof overdueRaw === 'number' ? overdueRaw : 0;
  const { data: machinesRaw } = useMachines();
  const machines = Array.isArray(machinesRaw) ? machinesRaw : [];
  const { data: checklistsRaw } = useChecklists();
  const checklists = Array.isArray(checklistsRaw) ? checklistsRaw : [];

  // Mutations
  const createPm = useCreatePmSchedule();
  const updatePm = useUpdatePmSchedule();
  const executePm = useExecutePm();

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId || !form.taskName) return;
    createPm.mutate(form, {
      onSuccess: () => {
        setForm({ ...emptyForm });
        setTab("Schedules");
      },
    });
  };

  const handleExecute = () => {
    if (!execId) return;
    executePm.mutate({ id: execId, data: { status: execForm.status, notes: execForm.notes || undefined, durationMinutes: execForm.durationMinutes || undefined } }, {
      onSuccess: () => { setExecId(null); setExecForm({ status: "COMPLETED", notes: "", durationMinutes: 0 }); },
    });
  };

  return (
    <>
      <PageMeta title="PM Schedules" description="Preventive maintenance schedule management" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Preventive Maintenance</h3>
          {overdueCount > 0 && (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium dark:bg-red-900/30 dark:text-red-400">
              {overdueCount} Overdue
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 -mb-px text-sm font-medium ${tab === t ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── SCHEDULES TAB ── */}
        {tab === "Schedules" && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={showOverdue} onChange={e => setShowOverdue(e.target.checked)} className="rounded" />
              Show overdue only
            </label>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <PaginatedTable pageSize={12}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="pb-2 pr-3">Task</th>
                      <th className="pb-2 pr-3">Machine</th>
                      <th className="pb-2 pr-3">Frequency</th>
                      <th className="pb-2 pr-3">Next Due</th>
                      <th className="pb-2 pr-3">Last Done</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(s => (
                      <tr key={s.id} className={`border-b border-gray-100 dark:border-gray-800 ${isOverdue(s.nextDueDate) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                        <td className="py-2 pr-3 font-medium">{s.taskName}</td>
                        <td className="py-2 pr-3 text-xs">{s.machine?.machineCode ?? '—'}</td>
                        <td className="py-2 pr-3 text-xs">{s.frequencyType} / {s.frequencyValue}</td>
                        <td className="py-2 pr-3 text-xs">
                          <span className={isOverdue(s.nextDueDate) ? 'text-red-600 font-bold dark:text-red-400' : ''}>
                            {fmtDate(s.nextDueDate)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs">{fmtDate(s.lastPerformedAt)}</td>
                        <td className="py-2">
                          <button onClick={() => setExecId(s.id)} className="text-green-600 hover:underline text-xs mr-2">Execute</button>
                        </td>
                      </tr>
                    ))}
                    {schedules.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-gray-400">No schedules</td></tr>
                    )}
                  </tbody>
                </table>
              </PaginatedTable>
            )}

            {/* Execute Modal */}
            {execId && (
              <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
                  <h4 className="text-base font-semibold mb-4 dark:text-white">Log PM Execution</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                      <select className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={execForm.status} onChange={e => setExecForm(f => ({ ...f, status: e.target.value }))}>
                        {EXEC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Duration (min)</label>
                      <input type="number" className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={execForm.durationMinutes} onChange={e => setExecForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                      <textarea className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" rows={2} value={execForm.notes} onChange={e => setExecForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={handleExecute} disabled={executePm.isPending} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50">
                        {executePm.isPending ? "Logging…" : "Log Execution"}
                      </button>
                      <button onClick={() => setExecId(null)} className="px-4 py-2 border rounded text-sm dark:border-gray-600 dark:text-gray-300">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE TAB ── */}
        {tab === "Create" && (
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Machine *</label>
              <select className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.machineId} onChange={e => setForm(f => ({ ...f, machineId: Number(e.target.value) }))} required>
                <option value={0}>Select machine…</option>
                {machines.map((m: { id: number; machineCode: string; machineName: string }) => (
                  <option key={m.id} value={m.id}>{m.machineCode} — {m.machineName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Task Name *</label>
              <input className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.taskName} onChange={e => setForm(f => ({ ...f, taskName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Frequency Type</label>
              <select className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.frequencyType} onChange={e => setForm(f => ({ ...f, frequencyType: e.target.value as CreatePmSchedulePayload['frequencyType'] }))}>
                {FREQ_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Frequency Value</label>
              <input type="number" min={1} className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.frequencyValue} onChange={e => setForm(f => ({ ...f, frequencyValue: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Next Due Date</label>
              <input type="date" className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Checklist (optional)</label>
              <select className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.checklistId || ""} onChange={e => setForm(f => ({ ...f, checklistId: Number(e.target.value) || undefined }))}>
                <option value="">None</option>
                {checklists.map((c: { id: number; name: string }) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" rows={2} value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={createPm.isPending} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {createPm.isPending ? "Creating…" : "Create Schedule"}
              </button>
            </div>
          </form>
        )}

        {/* ── LOGS TAB ── */}
        {tab === "Logs" && (
          <PaginatedTable pageSize={15}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Performed By</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Duration</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-3 text-xs">{fmtDate(l.performedAt)}</td>
                    <td className="py-2 pr-3 text-xs">{l.performer?.fullName ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${l.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">{l.durationMinutes ? `${l.durationMinutes} min` : '—'}</td>
                    <td className="py-2 text-xs max-w-[200px] truncate">{l.notes ?? '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">No logs yet</td></tr>
                )}
              </tbody>
            </table>
          </PaginatedTable>
        )}
      </div>
    </>
  );
}
