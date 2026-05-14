import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { masterApi, type Supplier, type ListParams } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import { Pagination } from "@/components/table";
import TableSkeleton from '@/components/common/TableSkeleton';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async (params?: ListParams) => {
    setLoading(true);
    try {
      const { data: resp } = await masterApi.listSuppliers({ page: meta.page, limit: 20, search, ...params });
      setSuppliers(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, [meta.page, search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this supplier?")) return;
    try { await masterApi.deleteSupplier(id); fetchSuppliers(); } catch (e) { console.error("Delete failed:", e); }
  };

  const typeColors: Record<string, string> = {
    FABRIC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    TRIM: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    ACCESSORY: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    SUBCONTRACTOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    LOGISTICS: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  };

  return (
    <>
      <PageMeta title="Suppliers | ERP TRACK" description="Manage suppliers" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Suppliers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} supplier(s)</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text" placeholder="Search suppliers..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSuppliers({ page: 1 })}
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
            />
            <Link to="/master/suppliers/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
              + Add Supplier
            </Link>
          </div>
        </div>

        {loading ? <TableSkeleton rows={5} cols={7} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Currency</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lead Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No suppliers found</td></tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{s.code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[s.supplierType] || "bg-gray-100 text-gray-600"}`}>
                        {s.supplierType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.currency}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.leadTimeDays} days</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/master/suppliers/${s.id}`} className="text-brand-500 hover:text-brand-600 text-xs font-medium">Edit</Link>
                        <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={(p) => fetchSuppliers({ page: p })}
            totalItems={meta.total}
            pageSize={meta.limit}
          />
        </div>
      </div>
    </>
  );
}
