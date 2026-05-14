import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { processApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";
import TableSkeleton from "@/components/common/TableSkeleton";
import { useProcessTypes } from '@/hooks/useMasterLookups';

const _PROC_DEFAULTS = ["", "CUTTING", "SEWING", "WASHING", "PRINTING", "EMBROIDERY", "FINISHING", "PACKING", "OTHER"];

export default function ProcessList() {
  const { data: _procCodes = _PROC_DEFAULTS.slice(1) } = useProcessTypes();
  const PROCESS_TYPES = ['', ..._procCodes];
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await processApi.list({ page: meta.page, limit: meta.limit, search: search || undefined, processType: typeFilter || undefined, ...params });
      setItems(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [meta.page, meta.limit, search, typeFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this process?")) return;
    try { await processApi.delete(id); fetch(); } catch { alert("Delete failed"); }
  };

  return (
    <>
      <PageMeta title="Processes | ERP TRACK" description="Process Master" />
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Process Master</h2>
          <Link to="/mrp/processes/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Process
          </Link>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input type="text" placeholder="Search code / name..." value={search} onChange={e => { setSearch(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none sm:w-72" />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none">
            {PROCESS_TYPES.map(s => <option key={s} value={s}>{s || "All Types"}</option>)}
          </select>
        </div>
        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["Code", "Name", "Type", "Sequence", "Default SAM", "Active", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No processes found</td></tr>
                : items.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-brand-500"><Link to={`/mrp/processes/${p.id}`}>{p.processCode}</Link></td>
                    <td className="px-4 py-3 text-gray-800 dark:text-white/80">{p.processName}</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-800">{p.processType}</span></td>
                    <td className="px-4 py-3 text-center">{p.sequence}</td>
                    <td className="px-4 py-3 text-right">{p.defaultSam ? Number(p.defaultSam).toFixed(2) : '-'}</td>
                    <td className="px-4 py-3">{p.isActive ? <span className="text-green-600">●</span> : <span className="text-gray-400">○</span>}</td>
                    <td className="px-4 py-3"><div className="flex gap-2">
                      <Link to={`/mrp/processes/${p.id}`} className="text-brand-500 hover:text-brand-600">Edit</Link>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600">Delete</button>
                    </div></td>
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
