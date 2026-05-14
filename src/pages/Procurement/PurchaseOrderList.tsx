import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { purchaseOrderApi, type PurchaseOrder } from "../../api/procurement";
import { excelExportApi } from "../../api/export";
import { PO_STATUSES } from '@erp/shared-types';
import { toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import TableSkeleton from "../../components/common/TableSkeleton";
import { PaginatedTable } from "../../components/table";
import { downloadPdf } from "../../utils/downloadPdf";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  FULLY_RECEIVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CLOSED: "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await purchaseOrderApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setOrders(resp.data?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this purchase order?")) return;
    try { await purchaseOrderApi.delete(id); fetchOrders(); } catch (err) { console.error(err); }
  };

  const handleApprove = async (id: number) => {
    try { await purchaseOrderApi.approve(id); fetchOrders(); } catch (err) { console.error(err); }
  };

  return (
    <>
      <PageMeta title="Purchase Orders | STITCH ERP" description="Purchase order management" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage purchase orders for raw materials, trims, and accessories</p>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { try { await excelExportApi.purchaseOrders(); } catch (e) { toastError(e, "Export failed"); } }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              ↓ Excel
            </button>
            <Link to="/procurement/po/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New PO
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <input type="text" placeholder="Search PO number..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-brand-500" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm dark:text-white">
            <option value="">All Status</option>
            {PO_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Table */}
        <PaginatedTable data={orders} pageSize={20}>
          {(pageData) => (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">PO No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Supplier</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400"><TableSkeleton rows={6} cols={7} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No purchase orders found</td></tr>
              ) : pageData.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3">
                    <Link to={`/procurement/po/${po.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">{po.poNo}</Link>
                    {po.order && <p className="text-xs text-gray-500 mt-0.5">Order: {po.order.orderNo}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{po.supplier?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{po.poType?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(po.poDate)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                    {po.currency} {Number(po.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[po.status] || "bg-gray-100"}`}>
                      {po.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/procurement/po/${po.id}`} className="text-xs text-brand-600 hover:underline">View</Link>
                      <button onClick={() => downloadPdf('purchase-order', po.id)} className="text-xs text-purple-600 hover:underline">PDF</button>
                      {po.status === "DRAFT" && (
                        <>
                          <button onClick={() => handleApprove(po.id)} className="text-xs text-green-600 hover:underline">Approve</button>
                          <button onClick={() => handleDelete(po.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </PaginatedTable>
      </div>
    </>
  );
}
