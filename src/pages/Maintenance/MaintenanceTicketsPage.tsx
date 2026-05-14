import { useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import { PaginatedTable } from "@/components/table";
import {
  useTickets,
  useCreateTicket,
  useUpdateTicket,
  useChangeTicketStatus,
  useAssignTicket,
  useDeleteTicket,
} from "@/hooks/useMaintenance";
import { useMachines } from "@/hooks/useMachine";
import type { MaintenanceTicket, CreateTicketPayload } from "@/api/maintenance";

// ── Constants ──
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const CATEGORIES = ["BREAKDOWN", "PREVENTIVE", "CORRECTIVE", "INSPECTION"] as const;
const STATUSES = ["OPEN", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CLOSED"] as const;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ON_HOLD: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CLOSED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const TABS = ["List", "Create", "Detail"] as const;
type Tab = (typeof TABS)[number];

const emptyForm: CreateTicketPayload = {
  machineId: 0,
  priority: "MEDIUM",
  category: "BREAKDOWN",
  title: "",
  description: "",
};

export default function MaintenanceTicketsPage() {
  const [tab, setTab] = useState<Tab>("List");
  const [filter, setFilter] = useState<{ status?: string; priority?: string }>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateTicketPayload>({ ...emptyForm });
  const [statusAction, setStatusAction] = useState<string>("");

  // Data
  const { data: ticketsRaw, isLoading } = useTickets({ ...filter, page: 1, limit: 50 });
  const tickets: MaintenanceTicket[] = Array.isArray(ticketsRaw)
    ? ticketsRaw
    : (ticketsRaw as { data?: MaintenanceTicket[] })?.data ?? [];
  const { data: machinesRaw } = useMachines();
  const machines = Array.isArray(machinesRaw) ? machinesRaw : [];

  // Mutations
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();
  const changeStatus = useChangeTicketStatus();
  const assignTicket = useAssignTicket();
  const deleteTicket = useDeleteTicket();

  const selectedTicket = tickets.find(t => t.id === selectedId);

  // Handlers
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId || !form.title) return;
    createTicket.mutate(form, {
      onSuccess: () => {
        setForm({ ...emptyForm });
        setTab("List");
      },
    });
  };

  const handleStatusChange = () => {
    if (!selectedId || !statusAction) return;
    changeStatus.mutate({ id: selectedId, status: statusAction });
    setStatusAction("");
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this ticket?")) deleteTicket.mutate(id);
  };

  return (
    <>
      <PageMeta title="Maintenance Tickets" description="Work order management" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">Work Orders</h3>

        {/* Tabs */}
        <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 -mb-px text-sm font-medium ${
                tab === t
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── LIST TAB ── */}
        {tab === "List" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <select
                className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={filter.status || ""}
                onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
              >
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <select
                className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={filter.priority || ""}
                onChange={e => setFilter(f => ({ ...f, priority: e.target.value || undefined }))}
              >
                <option value="">All Priority</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading tickets…</p>
            ) : (
              <PaginatedTable pageSize={15}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="pb-2 pr-3">Ticket #</th>
                      <th className="pb-2 pr-3">Title</th>
                      <th className="pb-2 pr-3">Machine</th>
                      <th className="pb-2 pr-3">Category</th>
                      <th className="pb-2 pr-3">Priority</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Assigned</th>
                      <th className="pb-2 pr-3">Created</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-3 font-mono text-xs">{t.ticketNo}</td>
                        <td className="py-2 pr-3 max-w-[180px] truncate">{t.title}</td>
                        <td className="py-2 pr-3 text-xs">{t.machine?.machineCode ?? '—'}</td>
                        <td className="py-2 pr-3 text-xs">{t.category}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                        </td>
                        <td className="py-2 pr-3 text-xs">{t.assignee?.fullName ?? '—'}</td>
                        <td className="py-2 pr-3 text-xs">{fmtDate(t.createdAt)}</td>
                        <td className="py-2 flex gap-1">
                          <button onClick={() => { setSelectedId(t.id); setTab("Detail"); }} className="text-blue-600 hover:underline text-xs">View</button>
                          <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:underline text-xs">Del</button>
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr><td colSpan={9} className="py-6 text-center text-gray-400">No tickets found</td></tr>
                    )}
                  </tbody>
                </table>
              </PaginatedTable>
            )}
          </div>
        )}

        {/* ── CREATE TAB ── */}
        {tab === "Create" && (
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Machine *</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={form.machineId}
                onChange={e => setForm(f => ({ ...f, machineId: Number(e.target.value) }))}
                required
              >
                <option value={0}>Select machine…</option>
                {machines.map((m: { id: number; machineCode: string; machineName: string }) => (
                  <option key={m.id} value={m.id}>{m.machineCode} — {m.machineName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as CreateTicketPayload['priority'] }))}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as CreateTicketPayload['category'] }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Est. Minutes</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={form.estimatedMinutes ?? ""}
                onChange={e => setForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) || undefined }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description *</label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={createTicket.isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {createTicket.isPending ? "Creating…" : "Create Ticket"}
              </button>
            </div>
          </form>
        )}

        {/* ── DETAIL TAB ── */}
        {tab === "Detail" && selectedTicket && (
          <div className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-500">Ticket #</p>
                <p className="font-mono text-sm font-medium">{selectedTicket.ticketNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedTicket.status]}`}>
                  {selectedTicket.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[selectedTicket.priority]}`}>
                  {selectedTicket.priority}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm">{selectedTicket.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Machine</p>
                <p className="text-sm">{selectedTicket.machine?.machineCode} — {selectedTicket.machine?.machineName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reporter</p>
                <p className="text-sm">{selectedTicket.reporter?.fullName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned To</p>
                <p className="text-sm">{selectedTicket.assignee?.fullName ?? 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm">{fmtDate(selectedTicket.createdAt)}</p>
              </div>
            </div>

            <div className="border-t pt-3 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Title</p>
              <p className="text-sm font-medium">{selectedTicket.title}</p>
              <p className="text-xs text-gray-500 mt-2 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTicket.description}</p>
            </div>

            {/* Status Change */}
            <div className="border-t pt-3 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Change Status</p>
              <div className="flex gap-2 items-center">
                <select
                  className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                  value={statusAction}
                  onChange={e => setStatusAction(e.target.value)}
                >
                  <option value="">Select…</option>
                  {STATUSES.filter(s => s !== selectedTicket.status).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
                <button
                  onClick={handleStatusChange}
                  disabled={!statusAction || changeStatus.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </div>

            <button onClick={() => { setSelectedId(null); setTab("List"); }} className="text-sm text-blue-600 hover:underline mt-2">
              ← Back to list
            </button>
          </div>
        )}

        {tab === "Detail" && !selectedTicket && (
          <p className="text-sm text-gray-400">Select a ticket from the list to view details.</p>
        )}
      </div>
    </>
  );
}
