import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { masterApi, type Buyer, type ListParams } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";

export default function BuyerList() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBuyers = useCallback(async (params?: ListParams) => {
    setLoading(true);
    try {
      const { data: resp } = await masterApi.listBuyers({ page: meta.page, limit: 20, search, ...params });
      setBuyers(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) {
      console.error("Failed to fetch buyers:", err);
    } finally {
      setLoading(false);
    }
  }, [meta.page, search]);

  useEffect(() => { fetchBuyers(); }, [fetchBuyers]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this buyer?")) return;
    try {
      await masterApi.deleteBuyer(id);
      fetchBuyers();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <>
      <PageMeta title="Buyers | ERP TRACK" description="Manage buyers" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Buyers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} buyer(s) found</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search buyers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchBuyers({ page: 1 })}
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
            />
            <Link
              to="/master/buyers/new"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              + Add Buyer
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Country</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Currency</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : buyers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No buyers found</td></tr>
              ) : (
                buyers.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{b.code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.country || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.currency}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.contactPerson || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${b.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {b.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/master/buyers/${b.id}`}
                          className="text-brand-500 hover:text-brand-600 text-xs font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => fetchBuyers({ page: meta.page - 1 })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchBuyers({ page: meta.page + 1 })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
