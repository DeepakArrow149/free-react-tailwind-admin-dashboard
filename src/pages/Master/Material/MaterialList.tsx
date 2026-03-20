import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { masterApi, type Material, type ListParams } from "../../../api/master";
import { excelExportApi } from "../../../api/export";
import { toastError } from "../../../utils/toast";
import PageMeta from "../../../components/common/PageMeta";
import TableSkeleton from "../../../components/common/TableSkeleton";

export default function MaterialList() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async (params?: ListParams) => {
    setLoading(true);
    try {
      const { data: resp } = await masterApi.listMaterials({ page: meta.page, limit: 20, search, ...params });
      setMaterials(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setLoading(false);
    }
  }, [meta.page, search]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this material?")) return;
    try { await masterApi.deleteMaterial(id); fetchMaterials(); } catch (e) { console.error("Delete failed:", e); }
  };

  return (
    <>
      <PageMeta title="Materials | ERP TRACK" description="Manage materials" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Materials</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} material(s)</p>
          </div>
          <div className="flex gap-3">
            <input type="text" placeholder="Search materials..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMaterials({ page: 1 })}
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90" />
            <button onClick={async () => { try { await excelExportApi.materials(); } catch (e) { toastError(e, "Export failed"); } }}
              className="h-10 inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              ↓ Excel
            </button>
            <Link to="/master/materials/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
              + Add Material
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">UOM</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Supplier</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400"><TableSkeleton rows={6} cols={7} /></td></tr>
              ) : materials.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No materials found</td></tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{m.materialCode}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.materialName}</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{m.materialType}</span></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.unitOfMeasure}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.preferredSupplier?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/master/materials/${m.id}`} className="text-brand-500 hover:text-brand-600 text-xs font-medium">Edit</Link>
                        <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={meta.page <= 1} onClick={() => fetchMaterials({ page: meta.page - 1 })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Previous</button>
              <button disabled={meta.page >= meta.totalPages} onClick={() => fetchMaterials({ page: meta.page + 1 })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
