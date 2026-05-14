import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { splBomApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";
import TableSkeleton from "@/components/common/TableSkeleton";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LOCKED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function SplBomList() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await splBomApi.list({ page: meta.page, limit: meta.limit, search: search || undefined, status: statusFilter || undefined, ...params });
      setItems(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [meta.page, meta.limit, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <>
      <PageMeta title="SPL Process BOMs | ERP TRACK" description="Special Process BOMs" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Special Process BOMs</h2>
          <Link to="/mrp/spl-bom/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New SPL BOM</Link>
        </div>
        <div className="flex gap-3">
          <input type="text" placeholder="Search BOM No..." value={search} onChange={e => { setSearch(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none sm:w-72" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700">
            {["", "DRAFT", "APPROVED", "LOCKED"].map(s => <option key={s} value={s}>{s || "All"}</option>)}
          </select>
        </div>
        {loading ? <TableSkeleton rows={5} cols={6} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["BOM No", "Order", "Process", "Items", "Status", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No SPL BOMs</td></tr>
                : items.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-brand-500"><Link to={`/mrp/spl-bom/${b.id}`}>{b.bomNo}</Link></td>
                    <td className="px-4 py-3">{b.order?.orderNo || '-'}</td>
                    <td className="px-4 py-3">{b.process?.processName || '-'}</td>
                    <td className="px-4 py-3 text-center">{b._count?.items || 0}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] || ""}`}>{b.status}</span></td>
                    <td className="px-4 py-3"><Link to={`/mrp/spl-bom/${b.id}`} className="text-brand-500 text-xs">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={meta.page} totalPages={meta.totalPages} onPageChange={p => fetch({ page: p })} totalItems={meta.total} pageSize={meta.limit} />
      </div>
    </>
  );
}
