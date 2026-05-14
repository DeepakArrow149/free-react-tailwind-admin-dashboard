import { useEffect, useState, useCallback } from "react";
import { bundleApi } from "../../api/production";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

interface BundleRecord {
  id: number;
  bundleNo: string;
  barcode?: string;
  order?: { orderNo: string };
  orderId: number;
  color?: string;
  size?: string;
  qty: number;
  status: string;
  error?: string;
}

const statusColors: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  ISSUED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function BundlePage() {
  const [bundles, setBundles] = useState<BundleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Barcode scanner
  const [barcode, setBarcode] = useState("");
  const [scanResult, setScanResult] = useState<BundleRecord | null>(null);

  // Generate & Issue
  const [cuttingId, setCuttingId] = useState("");

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await bundleApi.list({ page, limit: 20 });
      setBundles(resp.data ?? resp ?? []);
      setTotal(resp.meta?.total ?? 0);
    } catch { setBundles([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchBundles(); }, [fetchBundles]);

  const handleScan = async () => {
    if (!barcode.trim()) return;
    try {
      const result = await bundleApi.scanBarcode(barcode.trim());
      setScanResult(result.data ?? result);
    } catch { setScanResult(null); }
  };

  const handleGenerate = async () => {
    if (!cuttingId) return;
    try {
      await bundleApi.generateFromCutting(Number(cuttingId));
      setCuttingId("");
      fetchBundles();
      toastSuccess("Bundles generated");
    } catch (e) { toastError(e, "Failed to generate bundles"); }
  };

  const handleIssue = async (id: number) => {
    const line = prompt("Enter line number:");
    if (!line) return;
    try { await bundleApi.issueToLine(id, line); fetchBundles(); toastSuccess("Issued to line"); } catch (e) { toastError(e, "Failed to issue"); }
  };

  const handleComplete = async (id: number) => {
    try { await bundleApi.complete(id); fetchBundles(); toastSuccess("Bundle completed"); } catch (e) { toastError(e, "Failed to complete"); }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <>
      <PageMeta title="Bundle Tracking" description="Track production bundles with barcode scanning" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bundle Tracking</h1>

        {/* Scanner */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scan Barcode</label>
            <input value={barcode} onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              placeholder="Scan or enter barcode…"
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" autoFocus />
          </div>
          <button onClick={handleScan} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Scan</button>
        </div>

        {scanResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-sm">
            {scanResult.error ? (
              <p className="text-red-500">{scanResult.error}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <p><span className="text-gray-500">Bundle:</span> {scanResult.bundleNo}</p>
                <p><span className="text-gray-500">Order:</span> {scanResult.order?.orderNo ?? scanResult.orderId}</p>
                <p><span className="text-gray-500">Color:</span> {scanResult.color ?? "—"}</p>
                <p><span className="text-gray-500">Size:</span> {scanResult.size ?? "—"}</p>
                <p><span className="text-gray-500">Qty:</span> {scanResult.qty}</p>
                <p><span className="text-gray-500">Status:</span> {scanResult.status}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cutting Entry ID</label>
              <input value={cuttingId} onChange={e => setCuttingId(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-36" />
            </div>
            <button onClick={handleGenerate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Generate Bundles</button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Bundle No", "Barcode", "Order", "Color", "Size", "Qty", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bundles.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.bundleNo}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{b.barcode ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{b.order?.orderNo ?? b.orderId}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.color ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.size ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{b.qty}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] ?? statusColors.CREATED}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {b.status === "CREATED" && (
                        <button onClick={() => handleIssue(b.id)} className="text-xs text-blue-600 hover:underline">Issue</button>
                      )}
                      {b.status === "ISSUED" && (
                        <button onClick={() => handleComplete(b.id)} className="text-xs text-green-600 hover:underline">Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {bundles.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No bundles found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 pt-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            totalItems={total}
            pageSize={20}
          />
        </div>
      </div>
    </>
  );
}
