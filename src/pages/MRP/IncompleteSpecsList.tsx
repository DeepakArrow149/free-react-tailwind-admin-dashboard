import { useEffect, useState, useCallback } from "react";
import { specificationApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";
import TableSkeleton from "@/components/common/TableSkeleton";

export default function IncompleteSpecsList() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await specificationApi.incomplete({ page: meta.page, limit: meta.limit, ...params });
      setItems(resp.data || []);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [meta.page, meta.limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <>
      <PageMeta title="Incomplete Specifications | ERP TRACK" description="Orders with incomplete specs" />
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Incomplete Specifications</h2>
        <p className="text-sm text-gray-500">Orders that have missing or incomplete garment specifications</p>
        {loading ? <TableSkeleton rows={5} cols={5} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["Order No", "Buyer", "Total Specs", "Missing Types", "Action"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">All orders have complete specifications!</td></tr>
                : items.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">{row.orderNo || `Order #${row.orderId}`}</td>
                    <td className="px-4 py-3">{row.buyerName || '-'}</td>
                    <td className="px-4 py-3 text-center">{row.specCount || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">{(row.missingTypes || []).map((t: string) => <span key={t} className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{t}</span>)}</div>
                    </td>
                    <td className="px-4 py-3"><a href={`/mrp/specifications/${row.orderId}`} className="text-brand-500 text-xs hover:underline">Complete Specs</a></td>
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
