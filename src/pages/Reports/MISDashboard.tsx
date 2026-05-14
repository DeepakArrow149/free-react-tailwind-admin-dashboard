import { useEffect, useState, useCallback } from "react";
import { getOrderStats } from "../../api/merchandising";
import { productionUpdateApi } from "../../api/production";
import { machineApi } from "../../api/machine";
import PageMeta from "../../components/common/PageMeta";

/* ── helpers ── */
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtCur(n: number) { return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-400", CONFIRMED: "bg-blue-500", IN_PRODUCTION: "bg-yellow-500",
  SHIPPED: "bg-green-500", CANCELLED: "bg-red-500", COMPLETED: "bg-emerald-600",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function MISDashboard() {
  const [orderStats, setOrderStats] = useState<Any>(null);
  const [prodDash, setProdDash] = useState<Any[]>([]);
  const [machineStats, setMachineStats] = useState<Any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      getOrderStats(),
      productionUpdateApi.dashboard(),
      machineApi.stats(),
    ]);
    if (results[0].status === "fulfilled") setOrderStats(results[0].value?.data ?? results[0].value);
    if (results[1].status === "fulfilled") {
      const d: Any = results[1].value;
      setProdDash(Array.isArray(d) ? d : d?.data ?? []);
    }
    if (results[2].status === "fulfilled") {
      const d = results[2].value;
      setMachineStats(d?.data ?? d);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── derived KPIs ── */
  const statusCounts = orderStats?.statusCounts ?? [];
  const totalOrders = statusCounts.reduce((s: number, r: Any) => s + Number(r._count?.id ?? 0), 0);
  const totalQty = statusCounts.reduce((s: number, r: Any) => s + Number(r._sum?.totalQty ?? 0), 0);
  const totalValue = statusCounts.reduce((s: number, r: Any) => s + Number(r._sum?.totalValue ?? 0), 0);
  const activeOrders = statusCounts.filter((r: Any) => ["CONFIRMED", "IN_PRODUCTION"].includes(r.status)).reduce((s: number, r: Any) => s + Number(r._count?.id ?? 0), 0);

  const prodTotal = prodDash.reduce((s: number, r: Any) => s + Number(r.orderQty ?? 0), 0);
  const prodOutput = prodDash.reduce((s: number, r: Any) => s + Number(r.totalOutput ?? 0), 0);
  const prodReject = prodDash.reduce((s: number, r: Any) => s + Number(r.totalReject ?? 0), 0);
  const avgCompletion = prodDash.length ? Math.round(prodDash.reduce((s: number, r: Any) => s + Number(r.completionPct ?? 0), 0) / prodDash.length) : 0;

  const machByStatus = machineStats?.machinesByStatus ?? [];
  const totalMachines = machByStatus.reduce((s: number, r: Any) => s + (r._count ?? r.count ?? 0), 0);
  const activeMachines = machByStatus.find((r: Any) => r.status === "ACTIVE")?._count ?? machByStatus.find((r: Any) => r.status === "ACTIVE")?.count ?? 0;

  return (
    <>
      <PageMeta title="MIS Dashboard" description="Management information system" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MIS Dashboard</h1>
          <button onClick={fetchAll} disabled={loading} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ── TOP KPIs ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Orders",    value: fmt(totalOrders),   color: "text-blue-600 dark:text-blue-400",   sub: `${activeOrders} active` },
                { label: "Total Qty",       value: fmt(totalQty),      color: "text-indigo-600 dark:text-indigo-400", sub: "pcs ordered" },
                { label: "Order Value",     value: fmtCur(totalValue), color: "text-purple-600 dark:text-purple-400", sub: "total booked" },
                { label: "Prod Output",     value: fmt(prodOutput),    color: "text-green-600 dark:text-green-400",  sub: `${pct(prodOutput, prodTotal)}% of target` },
                { label: "Rejections",      value: fmt(prodReject),    color: prodReject > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500", sub: `${pct(prodReject, prodOutput)}% rate` },
                { label: "Machines",        value: fmt(totalMachines), color: "text-teal-600 dark:text-teal-400",    sub: `${activeMachines} active` },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
                  <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* ── ORDER PIPELINE ── */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Order Pipeline by Status</h2>
              {statusCounts.length === 0 ? (
                <p className="text-sm text-gray-400">No order data</p>
              ) : (
                <div className="space-y-3">
                  {statusCounts.map((row: Any) => {
                    const count = Number(row._count?.id ?? 0);
                    const qty = Number(row._sum?.totalQty ?? 0);
                    const val = Number(row._sum?.totalValue ?? 0);
                    const widthPct = Math.max(pct(count, totalOrders), 3);
                    return (
                      <div key={row.status} className="flex items-center gap-3">
                        <span className="w-28 text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">{row.status}</span>
                        <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                          <div className={`h-full rounded-full ${statusColors[row.status] ?? "bg-gray-400"}`} style={{ width: `${widthPct}%` }} />
                          <span className="absolute inset-0 flex items-center px-3 text-[10px] font-medium text-gray-800 dark:text-gray-200">
                            {count} orders · {fmt(qty)} pcs · {fmtCur(val)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── PRODUCTION & MACHINE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* production WIP */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Production WIP (Top 10)</h2>
                {prodDash.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No production data</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          {["Order", "Target", "Output", "Reject", "Completion"].map((h) => (
                            <th key={h} className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {prodDash.slice(0, 10).map((r: Any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-2 py-2 font-medium text-gray-800 dark:text-white">{r.orderNo ?? `#${r.orderId}`}</td>
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{fmt(Number(r.orderQty ?? 0))}</td>
                            <td className="px-2 py-2 text-green-600 dark:text-green-400">{fmt(Number(r.totalOutput ?? 0))}</td>
                            <td className="px-2 py-2 text-red-600 dark:text-red-400">{fmt(Number(r.totalReject ?? 0))}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${Number(r.completionPct ?? 0) >= 90 ? "bg-green-500" : Number(r.completionPct ?? 0) >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                                    style={{ width: `${Math.min(Number(r.completionPct ?? 0), 100)}%` }} />
                                </div>
                                <span className="text-gray-600 dark:text-gray-400 w-8 text-right">{Number(r.completionPct ?? 0)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {prodDash.length > 0 && (
                  <p className="mt-2 text-[10px] text-gray-400 text-right">Avg completion: {avgCompletion}% across {prodDash.length} orders</p>
                )}
              </div>

              {/* machine health */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Machine Health</h2>
                {totalMachines === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No machine data</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Active", value: activeMachines, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
                        { label: "Total", value: totalMachines, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
                        { label: "Repairs This Month", value: machineStats?.repairsThisMonth ?? 0, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
                        { label: "Downtime (hrs)", value: machineStats?.downtimeHours ?? 0, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
                      ].map((c) => (
                        <div key={c.label} className={`rounded-lg p-3 ${c.bg}`}>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{c.label}</p>
                          <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Status Breakdown</p>
                      <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {machByStatus.map((r: Any, i: number) => {
                          const count = r._count ?? r.count ?? 0;
                          const colors = ["bg-green-500", "bg-amber-500", "bg-red-500", "bg-gray-400", "bg-blue-500"];
                          return (
                            <div key={i} className={`${colors[i % colors.length]}`} style={{ width: `${pct(count, totalMachines)}%` }}
                              title={`${r.status}: ${count}`} />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {machByStatus.map((r: Any, i: number) => {
                          const colors = ["text-green-600", "text-amber-600", "text-red-600", "text-gray-500", "text-blue-600"];
                          return (
                            <span key={i} className={`text-[10px] ${colors[i % colors.length]}`}>● {r.status}: {r._count ?? r.count ?? 0}</span>
                          );
                        })}
                      </div>
                    </div>
                    {(machineStats?.machinesDueForService ?? 0) > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
                        <p className="text-xs text-amber-700 dark:text-amber-400">⚠ {machineStats.machinesDueForService} machines due for service</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
