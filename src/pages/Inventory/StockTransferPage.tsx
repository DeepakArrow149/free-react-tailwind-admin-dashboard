import { useEffect, useState, useCallback } from "react";
import { stockTransferApi } from "../../api/inventory";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  IN_TRANSIT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

interface R {
  id: number;
  transferNo: string;
  fromWarehouse?: { name: string };
  fromWarehouseId: number;
  toWarehouse?: { name: string };
  toWarehouseId: number;
  transferDate?: string;
  status: string;
  _count?: { details: number };
  details?: unknown[];
}

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await stockTransferApi.list({ page, limit: 20 });
      setTransfers(resp.data ?? []);
      setTotalPages(resp.meta?.totalPages ?? 1);
    } catch { setTransfers([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleConfirm = async (id: number) => {
    try { await stockTransferApi.confirm(id); fetchTransfers(); toastSuccess("Transfer confirmed — stock moved"); }
    catch (err) { toastError(err, "Confirm failed"); }
  };

  const _columns = [
    { header: "Transfer No", accessor: "transferNo" },
    { header: "From WH", accessor: (r: R) => r.fromWarehouse?.name ?? r.fromWarehouseId },
    { header: "To WH", accessor: (r: R) => r.toWarehouse?.name ?? r.toWarehouseId },
    { header: "Transfer Date", accessor: (r: R) => r.transferDate ? fmtDate(r.transferDate) : "-" },
    { header: "Items", accessor: (r: R) => r._count?.details ?? r.details?.length ?? 0 },
    { header: "Status", accessor: (r: R) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? ""}`}>{r.status}</span>
    )},
    { header: "Actions", accessor: (r: R) => (
      <div className="flex gap-2">
        {(r.status === "DRAFT" || r.status === "IN_TRANSIT") && (
          <button onClick={() => handleConfirm(r.id)} className="text-green-600 hover:underline text-sm">Confirm</button>
        )}
      </div>
    )},
  ];
  void _columns;

  return (
    <>
      <PageMeta title="Stock Transfers" description="Inter-warehouse stock transfer management" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Transfers</h1>
        </div>

        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                    <th className="pb-2 pr-3">Transfer No</th><th className="pb-2 pr-3">From WH</th>
                    <th className="pb-2 pr-3">To WH</th><th className="pb-2 pr-3">Transfer Date</th>
                    <th className="pb-2 pr-3">Items</th><th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">No transfers found</td></tr>
                  ) : transfers.map((r: R) => (
                    <tr key={r.id} className="border-b dark:border-gray-800">
                      <td className="py-2 pr-3">{r.transferNo}</td>
                      <td className="py-2 pr-3">{r.fromWarehouse?.name ?? r.fromWarehouseId}</td>
                      <td className="py-2 pr-3">{r.toWarehouse?.name ?? r.toWarehouseId}</td>
                      <td className="py-2 pr-3">{r.transferDate ? fmtDate(r.transferDate) : "-"}</td>
                      <td className="py-2 pr-3">{r._count?.details ?? r.details?.length ?? 0}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? ""}`}>{r.status}</span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          {(r.status === "DRAFT" || r.status === "IN_TRANSIT") && (
                            <button onClick={() => handleConfirm(r.id)} className="text-green-600 hover:underline text-sm">Confirm</button>
                          )}
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
