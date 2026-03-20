import { useEffect, useState, useCallback } from "react";
import { productionOrderApi } from "../../api/production";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface ProdOrder {
  id: number;
  poNo: string;
  order?: { orderNo: string };
  orderId: number;
  lineNo?: string;
  startDate?: string;
  endDate?: string;
  totalQty?: number;
  completedQty?: number;
  type?: string;
  status: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PLANNED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function ProductionOrderPage() {
  const [orders, setOrders] = useState<ProdOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await productionOrderApi.list({
        page, limit: 20,
        status: statusFilter || undefined,
        orderId: orderIdFilter || undefined,
      });
      setOrders(resp.data ?? resp ?? []);
      setTotal(resp.meta?.total ?? 0);
    } catch { setOrders([]); }
    setLoading(false);
  }, [page, statusFilter, orderIdFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStart = async (id: number) => {
    try { await productionOrderApi.start(id); fetchOrders(); toastSuccess("Order started"); } catch (e) { toastError(e, "Failed to start order"); }
  };
  const handleComplete = async (id: number) => {
    try { await productionOrderApi.complete(id); fetchOrders(); toastSuccess("Order completed"); } catch (e) { toastError(e, "Failed to complete order"); }
  };
  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this production order?")) return;
    try { await productionOrderApi.cancel(id); fetchOrders(); toastSuccess("Order cancelled"); } catch (e) { toastError(e, "Failed to cancel order"); }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <>
      <PageMeta title="Production Orders" description="View and manage production orders" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Production Orders</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">All Statuses</option>
            {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Order ID" value={orderIdFilter} onChange={e => { setOrderIdFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-36" />
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["PO No", "Order No", "Line", "Start", "End", "Total Qty", "Completed", "Type", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{po.poNo}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{po.order?.orderNo ?? po.orderId}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.lineNo ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.startDate ? fmtDate(po.startDate) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.endDate ? fmtDate(po.endDate) : "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{po.totalQty?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{po.completedQty?.toLocaleString() ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.type ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[po.status] ?? statusColors.DRAFT}`}>{po.status}</span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {po.status === "PLANNED" && (
                        <button onClick={() => handleStart(po.id)} className="text-xs text-blue-600 hover:underline">Start</button>
                      )}
                      {po.status === "IN_PROGRESS" && (
                        <button onClick={() => handleComplete(po.id)} className="text-xs text-green-600 hover:underline">Complete</button>
                      )}
                      {!["COMPLETED", "CANCELLED"].includes(po.status) && (
                        <button onClick={() => handleCancel(po.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-6 text-center text-gray-400">No production orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Prev</button>
            <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
