import { useEffect, useState, useCallback } from "react";
import { processMaterialApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";
import TableSkeleton from "@/components/common/TableSkeleton";

export default function ProcessMaterialList() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ processId: 0, materialId: 0, consumptionPerUnit: 0, unit: "PCS", remarks: "" });

  const fetch = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await processMaterialApi.list({ page: meta.page, limit: meta.limit, ...params });
      setItems(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [meta.page, meta.limit]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async () => {
    try { await processMaterialApi.create(form); setShowForm(false); fetch(); } catch { alert("Create failed"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete?")) return;
    try { await processMaterialApi.delete(id); fetch(); } catch { alert("Delete failed"); }
  };

  return (
    <>
      <PageMeta title="Process Materials | ERP TRACK" description="Process Material Mapping" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Process–Material Mapping</h2>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            {showForm ? "Cancel" : "+ Add Mapping"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <div className="grid grid-cols-4 gap-3">
              <input type="number" placeholder="Process ID" value={form.processId || ""} onChange={e => setForm(f => ({ ...f, processId: Number(e.target.value) }))} className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" />
              <input type="number" placeholder="Material ID" value={form.materialId || ""} onChange={e => setForm(f => ({ ...f, materialId: Number(e.target.value) }))} className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" />
              <input type="number" step="0.001" placeholder="Consumption/Unit" value={form.consumptionPerUnit || ""} onChange={e => setForm(f => ({ ...f, consumptionPerUnit: Number(e.target.value) }))} className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" />
              <button onClick={handleCreate} className="h-10 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600">Save</button>
            </div>
          </div>
        )}

        {loading ? <TableSkeleton rows={5} cols={6} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["Process", "Material", "Consumption/Unit", "Unit", "Active", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No mappings found</td></tr>
                : items.map(pm => (
                  <tr key={pm.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3 text-gray-800 dark:text-white/80">{pm.process?.processName || pm.processId}</td>
                    <td className="px-4 py-3">{pm.material?.materialName || pm.materialId}</td>
                    <td className="px-4 py-3 text-right">{Number(pm.consumptionPerUnit).toFixed(4)}</td>
                    <td className="px-4 py-3">{pm.unit}</td>
                    <td className="px-4 py-3">{pm.isActive ? "●" : "○"}</td>
                    <td className="px-4 py-3"><button onClick={() => handleDelete(pm.id)} className="text-red-500 hover:text-red-600 text-xs">Delete</button></td>
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
