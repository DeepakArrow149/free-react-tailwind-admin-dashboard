import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import {
  listBuyerOrders,
  deleteBuyerOrder,
  type BuyerOrderSummary,
  type OrderListParams,
} from "../../../api/merchandising";
import PageMeta from "../../../components/common/PageMeta";
import { Pagination } from "../../../components/table";
import TableSkeleton from '@/components/common/TableSkeleton';
import ExportButton from '@/components/common/ExportButton';
import { excelExportApi } from '../../../api/export';
import { formatDateShort as formatDate, formatCurrency } from '@/core/utils';
import NewOrderQuickStartModal from './components/NewOrderQuickStartModal';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PRODUCTION: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  READY_TO_SHIP: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SHIPPED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  INVOICED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  CLOSED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUSES = ["", "DRAFT", "CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP", "SHIPPED", "INVOICED", "CLOSED", "CANCELLED"];

export default function OrderList() {
  const [orders, setOrders] = useState<BuyerOrderSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const fetchOrders = useCallback(async (params?: Partial<OrderListParams>) => {
    setLoading(true);
    try {
      const resp = await listBuyerOrders({ page: meta.page, limit: 20, search, status: statusFilter || undefined, ...params });
      setOrders(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [meta.page, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this order? Only DRAFT orders can be deleted.")) return;
    try {
      await deleteBuyerOrder(id);
      fetchOrders();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed. Only DRAFT orders can be deleted.");
    }
  };

  return (
    <>
      <PageMeta title="Buyer Orders | ERP TRACK" description="Manage buyer purchase orders" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Buyer Orders</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} order(s) found</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              aria-label="Status filter"
              title="Status filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                fetchOrders({ page: 1, status: e.target.value || undefined });
              }}
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s || "All Statuses"}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchOrders({ page: 1 })}
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
            />
            <ExportButton onExport={excelExportApi.orders} />
            <button
              type="button"
              onClick={() => setNewOrderOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              + New Order
            </button>
          </div>
        </div>
        <NewOrderQuickStartModal open={newOrderOpen} onClose={() => setNewOrderOpen(false)} />

        {/* Table */}
        {loading ? <TableSkeleton rows={5} cols={8} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Order No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">SO No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Buyer PO</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Buyer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Style</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Order Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Ex-Factory</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Value</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3">
                      <Link to={`/merchandising/orders/${o.id}`} className="font-medium text-brand-500 hover:text-brand-600">
                        {o.orderNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {o.soNo ? (
                        <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{o.soNo}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {o.buyerPoNo || <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      <span className="text-xs text-gray-400">{o.buyer.code}</span>{" "}
                      {o.buyer.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{o.style.styleNo}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(o.orderDate)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(o.exFactoryDate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                      {o.totalQty.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                      {formatCurrency(Number(o.totalValue), o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || STATUS_COLORS.DRAFT}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/merchandising/orders/${o.id}`}
                          className="text-brand-500 hover:text-brand-600 text-xs font-medium"
                        >
                          {o.status === "DRAFT" ? "Edit" : "View"}
                        </Link>
                        {o.status === "DRAFT" && (
                          <button
                            onClick={() => handleDelete(o.id)}
                            className="text-red-500 hover:text-red-600 text-xs font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={(p) => fetchOrders({ page: p })}
            totalItems={meta.total}
            pageSize={meta.limit}
          />
        </div>
      </div>
    </>
  );
}
