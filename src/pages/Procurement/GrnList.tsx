import { useEffect, useState, useCallback } from "react";
import { grnApi, type GoodsReceiptNote } from "../../api/procurement";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GrnList() {
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchGrns = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await grnApi.list({ status: statusFilter || undefined });
      setGrns(resp.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchGrns(); }, [fetchGrns]);

  const handleConfirm = async (id: number) => {
    if (!confirm("Confirm this GRN? This will update stock and PO quantities.")) return;
    try { await grnApi.confirm(id); fetchGrns(); } catch (err) { console.error(err); }
  };

  return (
    <>
      <PageMeta title="Goods Receipt Notes | STITCH ERP" description="GRN management" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goods Receipt Notes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Receive materials against purchase orders</p>
          </div>
          <Link to="/procurement/grn/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New GRN
          </Link>
        </div>

        <div className="flex gap-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm dark:text-white">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">GRN No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">PO</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Supplier</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Warehouse</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : grns.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No GRNs found</td></tr>
              ) : grns.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3 font-medium text-brand-600 dark:text-brand-400">{g.grnNo}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{g.po?.poNo || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{g.supplier?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(g.grnDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{g.warehouse?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${g.status === "CONFIRMED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {g.status === "DRAFT" && (
                      <button onClick={() => handleConfirm(g.id)} className="text-xs text-green-600 hover:underline font-medium">Confirm</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
