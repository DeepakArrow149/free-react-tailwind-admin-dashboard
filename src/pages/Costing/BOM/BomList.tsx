import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { bomApi, type BomSummary } from "../../../api/costing";
import PageMeta from "../../../components/common/PageMeta";
import { Pagination } from "../../../components/table";
import TableSkeleton from '@/components/common/TableSkeleton';
import { formatCurrency, formatDateShort as formatDate } from '@/core/utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LOCKED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUSES = ["", "DRAFT", "APPROVED", "LOCKED"];

export default function BomList() {
  const [boms, setBoms] = useState<BomSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBoms = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await bomApi.list({
        page: meta.page,
        limit: meta.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        ...params,
      });
      setBoms(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) {
      console.error("Failed to fetch BOMs:", err);
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.limit, search, statusFilter]);

  useEffect(() => { fetchBoms(); }, [fetchBoms]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this BOM?")) return;
    try {
      await bomApi.delete(id);
      fetchBoms();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleClone = async (id: number) => {
    try {
      await bomApi.clone(id);
      fetchBoms();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Clone failed");
    }
  };

  return (
    <>
      <PageMeta title="Bill of Materials | ERP TRACK" description="BOM Management" />
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Bill of Materials</h2>
          <Link
            to="/costing/bom/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New BOM
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search BOM No, Style..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setMeta((m) => ({ ...m, page: 1 })); }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 focus:border-brand-300 focus:outline-none sm:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setMeta((m) => ({ ...m, page: 1 })); }}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 focus:border-brand-300 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s || "All Statuses"}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? <TableSkeleton rows={5} cols={7} /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["BOM No", "Style", "Buyer", "Ver", "Items", "Total Cost", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boms.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No BOMs found</td></tr>
              ) : (
                boms.map((bom) => (
                  <tr key={bom.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3">
                      <Link to={`/costing/bom/${bom.id}`} className="font-medium text-brand-500 hover:underline">
                        {bom.bomNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-white/80">{bom.style.styleNo}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{bom.style.buyer.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">v{bom.version}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{bom._count.items}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/80">{formatCurrency(Number(bom.totalCost))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[bom.status] || ""}`}>
                        {bom.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(bom.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/costing/bom/${bom.id}`} className="text-brand-500 hover:text-brand-600" title="Edit">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Link>
                        <button onClick={() => handleClone(bom.id)} className="text-gray-500 hover:text-brand-500" title="Clone">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        {bom.status === "DRAFT" && (
                          <button onClick={() => handleDelete(bom.id)} className="text-red-500 hover:text-red-600" title="Delete">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={(p) => fetchBoms({ page: p })}
          totalItems={meta.total}
          pageSize={meta.limit}
        />
      </div>
    </>
  );
}
