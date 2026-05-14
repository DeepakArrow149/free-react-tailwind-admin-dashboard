import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { mrpRunApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";
import TableSkeleton from "@/components/common/TableSkeleton";
import { formatDateShort as formatDate } from '@/core/utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INDENT_RAISED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function MrpRunList() {
  const [runs, setRuns] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await mrpRunApi.list({ page: meta.page, limit: meta.limit, search: search || undefined, status: statusFilter || undefined, ...params });
      setRuns(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [meta.page, meta.limit, search, statusFilter]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this MRP run?")) return;
    try { await mrpRunApi.delete(id); fetchRuns(); } catch { alert("Delete failed"); }
  };

  return (
    <>
      <PageMeta title="MRP Runs | ERP TRACK" description="Material Requirements Planning" />
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">MRP Runs</h2>
          <Link to="/mrp/calculate" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New MRP Calculation
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input type="text" placeholder="Search MRP No..." value={search} onChange={(e) => { setSearch(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 focus:border-brand-300 focus:outline-none sm:w-72" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 focus:border-brand-300 focus:outline-none">
            {["", "DRAFT", "CONFIRMED", "INDENT_RAISED"].map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
        </div>

        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["MRP No", "Order", "Items", "Total Shortage", "Status", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No MRP runs found</td></tr>
                ) : runs.map(run => (
                  <tr key={run.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3"><Link to={`/mrp/runs/${run.id}`} className="font-medium text-brand-500 hover:underline">{run.mrpNo || `MRP-${run.id}`}</Link></td>
                    <td className="px-4 py-3 text-gray-800 dark:text-white/80">{run.order?.orderNo || '-'}</td>
                    <td className="px-4 py-3 text-center">{run._count?.items || run.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{run.totalShortage || 0}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status] || ""}`}>{run.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(run.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/mrp/runs/${run.id}`} className="text-brand-500 hover:text-brand-600" title="View">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        {run.status === "DRAFT" && <button onClick={() => handleDelete(run.id)} className="text-red-500 hover:text-red-600" title="Delete">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchRuns({ page: p })} totalItems={meta.total} pageSize={meta.limit} />
      </div>
    </>
  );
}
