import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { fabricDesignApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";
import TableSkeleton from "@/components/common/TableSkeleton";

export default function FabricDesignList() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await fabricDesignApi.list({ page: meta.page, limit: meta.limit, search: search || undefined, ...params });
      setItems(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [meta.page, meta.limit, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => { if (!confirm("Delete?")) return; try { await fabricDesignApi.delete(id); fetch(); } catch { alert("Failed"); } };

  return (
    <>
      <PageMeta title="Fabric Design Sheets | ERP TRACK" description="Fabric Design Management" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Fabric Design Sheets</h2>
          <Link to="/mrp/fabric-designs/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New Design</Link>
        </div>
        <input type="text" placeholder="Search by design no..." value={search} onChange={e => { setSearch(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
          className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none sm:w-72" />
        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["Design No", "Order", "Material", "Fabric Type", "Weight", "Width", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No designs</td></tr>
                : items.map(d => (
                  <tr key={d.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-brand-500"><Link to={`/mrp/fabric-designs/${d.id}`}>{d.designNo}</Link></td>
                    <td className="px-4 py-3">{d.order?.orderNo || '-'}</td>
                    <td className="px-4 py-3">{d.material?.materialName || '-'}</td>
                    <td className="px-4 py-3">{d.fabricType || '-'}</td>
                    <td className="px-4 py-3 text-right">{d.fabricWeight ? `${d.fabricWeight} g/m²` : '-'}</td>
                    <td className="px-4 py-3 text-right">{d.fabricWidth ? `${d.fabricWidth} cm` : '-'}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><Link to={`/mrp/fabric-designs/${d.id}`} className="text-brand-500 text-xs">Edit</Link><button onClick={() => handleDelete(d.id)} className="text-red-500 text-xs">Delete</button></div></td>
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
