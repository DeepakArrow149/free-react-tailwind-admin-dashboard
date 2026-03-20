import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { masterApi, type StyleMaster, type ListParams } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";

export default function StyleList() {
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStyles = useCallback(async (params?: ListParams) => {
    setLoading(true);
    try {
      const { data: resp } = await masterApi.listStyles({ page: meta.page, limit: 20, search, ...params });
      setStyles(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) {
      console.error("Failed to fetch styles:", err);
    } finally {
      setLoading(false);
    }
  }, [meta.page, search]);

  useEffect(() => { fetchStyles(); }, [fetchStyles]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this style?")) return;
    try { await masterApi.deleteStyle(id); fetchStyles(); } catch (e) { console.error("Delete failed:", e); }
  };

  return (
    <>
      <PageMeta title="Styles | ERP TRACK" description="Manage styles" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Styles</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} style(s)</p>
          </div>
          <div className="flex gap-3">
            <input type="text" placeholder="Search styles..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchStyles({ page: 1 })}
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90" />
            <Link to="/master/styles/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
              + Add Style
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Style No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Buyer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Season</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : styles.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No styles found</td></tr>
              ) : (
                styles.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{s.styleNo}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.styleName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.buyer?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.season?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/master/styles/${s.id}`} className="text-brand-500 hover:text-brand-600 text-xs font-medium">Edit</Link>
                        <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
