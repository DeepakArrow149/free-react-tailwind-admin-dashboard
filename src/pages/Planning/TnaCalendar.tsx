import { useEffect, useState, useCallback } from "react";
import { tnaCalendarApi, type TnaMilestone } from "../../api/planning";
import PageMeta from "../../components/common/PageMeta";

interface TnaAlert {
  milestoneName: string;
  buyerOrderId: number;
  plannedDate: string;
  daysDelayed: number;
  status: string;
}

type AlertLevel = "ON_TRACK" | "MINOR_DELAY" | "MODERATE_DELAY" | "CRITICAL_DELAY" | "OVERDUE";

const statusColors: Record<AlertLevel, string> = {
  ON_TRACK:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  MINOR_DELAY:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  MODERATE_DELAY: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL_DELAY: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  OVERDUE:        "bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-300",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TnaCalendar() {
  const [milestones, setMilestones] = useState<TnaMilestone[]>([]);
  const [alerts, setAlerts] = useState<TnaAlert[]>([]);
  const [buyerOrderId, setBuyerOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState<"calendar" | "alerts">("calendar");

  const fetchCalendar = useCallback(async () => {
    if (!buyerOrderId) return;
    setLoading(true);
    try {
      const resp = await tnaCalendarApi.list({ orderId: Number(buyerOrderId) });
      setMilestones(resp.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [buyerOrderId]);

  const fetchAlerts = useCallback(async () => {
    try {
      const resp = await tnaCalendarApi.alerts();
      setAlerts(resp.data || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const handleComplete = async (id: number) => {
    try {
      await tnaCalendarApi.complete(id, { actualDate: new Date().toISOString().split('T')[0] });
      fetchCalendar();
      fetchAlerts();
    } catch (err) { console.error(err); }
  };

  const handleReschedule = async () => {
    if (!rescheduleId || !newDate) return;
    try {
      await tnaCalendarApi.reschedule(rescheduleId, { newPlannedDate: newDate, remarks: reason });
      setRescheduleId(null);
      setNewDate("");
      setReason("");
      fetchCalendar();
      fetchAlerts();
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <PageMeta title="T&A Calendar | STITCH ERP" description="Time & Action calendar" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">T&A Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track milestones and manage delays across orders</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("calendar")} className={`px-4 py-2 text-sm rounded-md font-medium transition ${tab === "calendar" ? "bg-white dark:bg-gray-700 text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Order Calendar</button>
          <button onClick={() => setTab("alerts")} className={`px-4 py-2 text-sm rounded-md font-medium transition ${tab === "alerts" ? "bg-white dark:bg-gray-700 text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Alerts
            {alerts.length > 0 && <span className="ml-1.5 rounded-full bg-red-500 text-white text-xs px-1.5 py-0.5">{alerts.length}</span>}
          </button>
        </div>

        {tab === "calendar" && (
          <div className="space-y-4">
            {/* Order selector */}
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer Order ID</label>
                <input
                  type="number"
                  value={buyerOrderId}
                  onChange={(e) => setBuyerOrderId(e.target.value)}
                  placeholder="Enter order ID"
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-brand-500 w-48"
                />
              </div>
              <button onClick={fetchCalendar} disabled={!buyerOrderId} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">
                Load T&A
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-400">Loading milestones...</div>
            ) : milestones.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-400">
                {buyerOrderId ? "No T&A milestones found for this order. Generate T&A from a template first." : "Enter a Buyer Order ID to view milestones."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Milestone</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Planned</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actual</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Responsible</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {milestones.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3 text-gray-500">{m.sequence}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {m.milestoneName}
                          {m.isCritical && <span className="ml-1 text-xs text-red-500">●</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(m.plannedDate)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.actualDate ? fmtDate(m.actualDate) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[m.status as AlertLevel] || "bg-gray-100 text-gray-600"}`}>
                            {m.status?.replace(/_/g, " ") || (m.actualDate ? "COMPLETED" : "PENDING")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{m.responsibleRole || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {!m.actualDate && (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleComplete(m.id)} className="text-xs text-green-600 hover:underline font-medium">Complete</button>
                              <button onClick={() => { setRescheduleId(m.id); setNewDate(""); setReason(""); }} className="text-xs text-brand-600 hover:underline font-medium">Reschedule</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reschedule Modal */}
            {rescheduleId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reschedule Milestone</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Date *</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setRescheduleId(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                    <button onClick={handleReschedule} disabled={!newDate} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Reschedule</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "alerts" && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-400">No alerts at this time</div>
            ) : alerts.map((a: TnaAlert, i: number) => (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-lg border ${statusColors[a.status as AlertLevel] || "bg-gray-50 border-gray-200"}`}>
                <div className="flex-1">
                  <p className="font-medium">{a.milestoneName} — Order #{a.buyerOrderId}</p>
                  <p className="text-xs mt-0.5">Planned: {fmtDate(a.plannedDate)} · Delay: {a.daysDelayed}d</p>
                </div>
                <span className="text-xs font-semibold">{a.status?.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
