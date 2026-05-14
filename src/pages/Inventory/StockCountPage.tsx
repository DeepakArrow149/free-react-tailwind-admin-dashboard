import { useEffect, useState, useCallback } from "react";
import { stockCountApi } from "../../api/inventory";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  POSTED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

interface R {
  id: number;
  countNo: string;
  warehouse?: { name: string };
  warehouseId: number;
  countDate?: string;
  status: string;
  _count?: { details: number };
  details?: unknown[];
}

export default function StockCountPage() {
  const [counts, setCounts] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await stockCountApi.list({ page, limit: 20 });
      setCounts(resp.data ?? []);
      setTotalPages(resp.meta?.totalPages ?? 1);
    } catch { setCounts([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const handleApprove = async (id: number) => {
    try { await stockCountApi.approve(id); fetchCounts(); toastSuccess("Count approved"); }
    catch (err) { toastError(err, "Approval failed"); }
  };

  const handlePost = async (id: number) => {
    try { await stockCountApi.post(id); fetchCounts(); toastSuccess("Count posted — stock adjusted"); }
    catch (err) { toastError(err, "Post failed"); }
  };

  const _columns = [
    { header: "Count No", accessor: "countNo" },
    { header: "Warehouse", accessor: (r: R) => r.warehouse?.name ?? r.warehouseId },
    { header: "Count Date", accessor: (r: R) => r.countDate ? fmtDate(r.countDate) : "-" },
    { header: "Items", accessor: (r: R) => r._count?.details ?? r.details?.length ?? 0 },
    { header: "Status", accessor: (r: R) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? ""}`}>{r.status}</span>
    )},
    { header: "Actions", accessor: (r: R) => (
      <div className="flex gap-2">
        {r.status === "DRAFT" && <button onClick={() => handleApprove(r.id)} className="text-blue-600 hover:underline text-sm">Approve</button>}
        {r.status === "APPROVED" && <button onClick={() => handlePost(r.id)} className="text-green-600 hover:underline text-sm">Post</button>}
      </div>
    )},
  ];
  void _columns;

  return (
    <>
      <PageMeta title="Stock Counts" description="Physical inventory counting and stock reconciliation" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Counts</h1>
        </div>

        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                    <th className="pb-2 pr-3">Count No</th><th className="pb-2 pr-3">Warehouse</th>
                    <th className="pb-2 pr-3">Count Date</th><th className="pb-2 pr-3">Items</th>
                    <th className="pb-2 pr-3">Status</th><th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">No stock counts found</td></tr>
                  ) : counts.map((r: R) => (
                    <tr key={r.id} className="border-b dark:border-gray-800">
                      <td className="py-2 pr-3">{r.countNo}</td>
                      <td className="py-2 pr-3">{r.warehouse?.name ?? r.warehouseId}</td>
                      <td className="py-2 pr-3">{r.countDate ? fmtDate(r.countDate) : "-"}</td>
                      <td className="py-2 pr-3">{r._count?.details ?? r.details?.length ?? 0}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? ""}`}>{r.status}</span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          {r.status === "DRAFT" && <button onClick={() => handleApprove(r.id)} className="text-blue-600 hover:underline text-sm">Approve</button>}
                          {r.status === "APPROVED" && <button onClick={() => handlePost(r.id)} className="text-green-600 hover:underline text-sm">Post</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={20} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
