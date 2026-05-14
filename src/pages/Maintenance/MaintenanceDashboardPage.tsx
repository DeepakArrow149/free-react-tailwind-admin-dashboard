import PageMeta from "@/components/common/PageMeta";
import { useTicketDashboard, useOverdueCount, useLowStock } from "@/hooks/useMaintenance";
import type { MaintenanceTicket, TicketDashboard, SparePart } from "@/api/maintenance";

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

export default function MaintenanceDashboardPage() {
  const { data: dashboard, isLoading: loadingDash } = useTicketDashboard();
  const { data: overdueRaw } = useOverdueCount();
  const { data: lowStockRaw } = useLowStock();

  const dash = dashboard as TicketDashboard | undefined;
  const overdueCount = (typeof overdueRaw === 'number' ? overdueRaw : 0);
  const lowStockParts: SparePart[] = Array.isArray(lowStockRaw) ? lowStockRaw : [];

  // Compute stats from dashboard data
  const openCount = dash?.byStatus?.find(s => s.status === 'OPEN')?._count?._all ?? 0;
  const inProgressCount = dash?.byStatus?.find(s => s.status === 'IN_PROGRESS')?._count?._all ?? 0;
  const completedCount = dash?.byStatus?.find(s => s.status === 'COMPLETED')?._count?._all ?? 0;
  const totalActive = openCount + inProgressCount;

  const statCards = [
    { label: 'Open Tickets', value: openCount, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'In Progress', value: inProgressCount, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Completed (All Time)', value: completedCount, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Overdue PMs', value: overdueCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Active Work Orders', value: totalActive, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Low-Stock Parts', value: lowStockParts.length, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  return (
    <>
      <PageMeta title="Maintenance Dashboard" description="CMMS overview — work orders, PM, spare parts" />
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Maintenance Dashboard</h3>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map(c => (
            <div key={c.label} className={`rounded-xl p-4 ${c.bg}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{loadingDash ? '…' : c.value}</p>
            </div>
          ))}
        </div>

        {/* Priority Breakdown Bar */}
        {dash?.byPriority && dash.byPriority.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
            <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Tickets by Priority</h4>
            <div className="flex gap-3 flex-wrap">
              {dash.byPriority.map(p => (
                <span key={p.priority} className={`px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[p.priority] || ''}`}>
                  {p.priority}: {p._count._all}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Tickets Table */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Recent Work Orders</h4>
          {loadingDash ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="pb-2 pr-4">Ticket #</th>
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Machine</th>
                    <th className="pb-2 pr-4">Priority</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(dash?.recentTickets ?? []).map((t: MaintenanceTicket) => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 font-mono text-xs">{t.ticketNo}</td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{t.title}</td>
                      <td className="py-2 pr-4">{t.machine?.machineCode ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[t.priority] || ''}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] || ''}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-gray-500">{fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
                  {(!dash?.recentTickets || dash.recentTickets.length === 0) && (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-400">No tickets yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low-Stock Spare Parts */}
        {lowStockParts.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-800 dark:bg-red-900/10">
            <h4 className="text-sm font-semibold mb-3 text-red-700 dark:text-red-400">⚠ Low-Stock Spare Parts</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-200 dark:border-red-800 text-left text-xs font-medium text-red-600 uppercase">
                    <th className="pb-2 pr-4">Part Code</th>
                    <th className="pb-2 pr-4">Part Name</th>
                    <th className="pb-2 pr-4">Stock</th>
                    <th className="pb-2">Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockParts.slice(0, 10).map(p => (
                    <tr key={p.id} className="border-b border-red-100 dark:border-red-900">
                      <td className="py-2 pr-4 font-mono text-xs">{p.partCode}</td>
                      <td className="py-2 pr-4">{p.partName}</td>
                      <td className="py-2 pr-4 font-bold text-red-700 dark:text-red-400">{p.currentStock}</td>
                      <td className="py-2">{p.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
