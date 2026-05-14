import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { allowanceApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";
import TableSkeleton from "@/components/common/TableSkeleton";
import { useMaterialTypes } from '@/hooks/useMasterLookups';

const _AL_MAT_DEFAULTS = ["", "SHELL_FABRIC", "LINING", "INTERLINING", "TRIM", "ACCESSORY", "PACKING", "THREAD", "LABEL", "OTHER"];

export default function AllowanceList() {
  const { data: _matCodes = _AL_MAT_DEFAULTS.slice(1) } = useMaterialTypes();
  const MATERIAL_TYPES = ['', ..._matCodes];
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await allowanceApi.list({ page: meta.page, limit: meta.limit, materialType: typeFilter || undefined, ...params });
      setItems(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [meta.page, meta.limit, typeFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <>
      <PageMeta title="Allowances | ERP TRACK" description="Allowance Master" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Allowance Master</h2>
          <Link to="/mrp/allowances/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New Allowance</Link>
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
          className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none">
          {MATERIAL_TYPES.map(s => <option key={s} value={s}>{s || "All Material Types"}</option>)}
        </select>
        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["Name", "Material Type", "Process", "Allowance %", "Type", "Default", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No allowances</td></tr>
                : items.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-brand-500"><Link to={`/mrp/allowances/${a.id}`}>{a.allowanceName}</Link></td>
                    <td className="px-4 py-3">{a.materialType}</td>
                    <td className="px-4 py-3">{a.process?.processName || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{Number(a.allowancePct).toFixed(1)}%</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">{a.allowanceType}</span></td>
                    <td className="px-4 py-3">{a.isDefault ? "✓" : ""}</td>
                    <td className="px-4 py-3"><Link to={`/mrp/allowances/${a.id}`} className="text-brand-500 text-xs hover:underline">Edit</Link></td>
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
