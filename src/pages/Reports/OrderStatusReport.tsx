import { useEffect, useState, useCallback, useMemo } from "react";
import { listBuyerOrders, BuyerOrderSummary, OrderListParams } from "../../api/merchandising";
import PageMeta from "../../components/common/PageMeta";

/* ── helpers ── */
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtCur(n: number) { return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

const STATUS_ORDER = ["DRAFT", "CONFIRMED", "IN_PRODUCTION", "SHIPPED", "COMPLETED", "CANCELLED"] as const;
const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:          { label: "Draft",         bg: "bg-gray-100 dark:bg-gray-700",        text: "text-gray-700 dark:text-gray-300" },
  CONFIRMED:      { label: "Confirmed",     bg: "bg-blue-100 dark:bg-blue-900/20",     text: "text-blue-700 dark:text-blue-400" },
  IN_PRODUCTION:  { label: "In Production", bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" },
  SHIPPED:        { label: "Shipped",       bg: "bg-green-100 dark:bg-green-900/20",   text: "text-green-700 dark:text-green-400" },
  COMPLETED:      { label: "Completed",     bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400" },
  CANCELLED:      { label: "Cancelled",     bg: "bg-red-100 dark:bg-red-900/20",       text: "text-red-700 dark:text-red-400" },
};

const stageIdx = (s: string) => { const i = STATUS_ORDER.indexOf(s as typeof STATUS_ORDER[number]); return i >= 0 ? i : 0; };

export default function OrderStatusReport() {
  const [orders, setOrders] = useState<BuyerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("orderDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const limit = 25;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: OrderListParams = { page, limit, sortBy, sortDir };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const resp = await listBuyerOrders(params);
      setOrders(resp.data ?? []);
      setTotal(resp.meta?.total ?? 0);
    } catch { setOrders([]); }
    setLoading(false);
  }, [page, statusFilter, search, sortBy, sortDir]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const totalPages = Math.ceil(total / limit) || 1;

  /* ── summary by status ── */
  const statusSummary = useMemo(() => {
    const map: Record<string, { count: number; qty: number; value: number }> = {};
    orders.forEach((o) => {
      if (!map[o.status]) map[o.status] = { count: 0, qty: 0, value: 0 };
      map[o.status].count++;
      map[o.status].qty += o.totalQty;
      map[o.status].value += o.totalValue;
    });
    return map;
  }, [orders]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-[10px] text-gray-400">{sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
  );

  /* ── days until ex-factory ── */
  const daysUntil = (iso: string) => {
    const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    if (d < 0) return { text: `${Math.abs(d)}d overdue`, color: "text-red-600 dark:text-red-400" };
    if (d <= 7) return { text: `${d}d left`, color: "text-amber-600 dark:text-amber-400" };
    return { text: `${d}d`, color: "text-gray-500 dark:text-gray-400" };
  };

  return (
    <>
      <PageMeta title="Order Status Report" description="Detailed order status tracking" />
      <div className="p-6 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Status Report</h1>

        {/* filters */}
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Search order / buyer / style…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white w-64" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
            <option value="">All Statuses</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{statusMeta[s]?.label ?? s}</option>)}
          </select>
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 self-center">{total} orders</span>
        </div>

        {/* status chips summary */}
        {Object.keys(statusSummary).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusSummary).map(([st, v]) => {
              const m = statusMeta[st] ?? statusMeta.DRAFT;
              return (
                <button key={st} onClick={() => setStatusFilter(statusFilter === st ? "" : st)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${m.bg} ${m.text} ${statusFilter === st ? "ring-2 ring-brand-500" : "ring-gray-200 dark:ring-gray-600"}`}>
                  {m.label}: {v.count} · {fmt(v.qty)} pcs · {fmtCur(v.value)}
                </button>
              );
            })}
          </div>
        )}

        {/* table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    { key: "orderNo",       label: "Order No" },
                    { key: "buyer",         label: "Buyer" },
                    { key: "style",         label: "Style" },
                    { key: "orderDate",     label: "Order Date" },
                    { key: "exFactoryDate", label: "Ex-Factory" },
                    { key: "totalQty",      label: "Qty" },
                    { key: "totalValue",    label: "Value" },
                    { key: "",              label: "Progress" },
                    { key: "status",        label: "Status" },
                  ].map((h) => (
                    <th key={h.label} onClick={h.key ? () => handleSort(h.key) : undefined}
                      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase ${h.key ? "cursor-pointer select-none hover:text-gray-700" : ""}`}>
                      {h.label}{h.key && <SortIcon col={h.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((o) => {
                  const current = stageIdx(o.status);
                  const meta = statusMeta[o.status] ?? statusMeta.DRAFT;
                  const ef = daysUntil(o.exFactoryDate);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{o.orderNo}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{o.buyer?.name ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{o.style?.styleNo ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(o.orderDate)}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className={ef.color}>{fmtDate(o.exFactoryDate)}</span>
                        {o.status !== "SHIPPED" && o.status !== "COMPLETED" && o.status !== "CANCELLED" && (
                          <span className={`block text-[10px] ${ef.color}`}>{ef.text}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-right">{fmt(o.totalQty)}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-right">{fmtCur(o.totalValue)}</td>
                      <td className="px-3 py-3 w-32">
                        {o.status === "CANCELLED" ? (
                          <span className="text-xs text-red-500">Cancelled</span>
                        ) : (
                          <div className="flex gap-0.5">
                            {STATUS_ORDER.slice(0, 5).map((st, i) => (
                              <div key={st} className={`h-2 flex-1 rounded-full ${i <= current ? "bg-green-400" : "bg-gray-200 dark:bg-gray-600"}`}
                                title={statusMeta[st]?.label} />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Prev</button>
            <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
