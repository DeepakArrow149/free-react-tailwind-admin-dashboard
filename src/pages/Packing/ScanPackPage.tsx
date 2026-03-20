import { useEffect, useState, useCallback } from "react";
import { scanPackApi } from "../../api/packing";
import { toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

export default function ScanPackPage() {
  const [barcode, setBarcode] = useState("");
  const [scannedItems, setScannedItems] = useState<R[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [summary, setSummary] = useState<R | null>(null);

  const fetchList = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const resp = await scanPackApi.list({ orderId, limit: 100 });
      setScannedItems(resp.data ?? resp ?? []);
    } catch { setScannedItems([]); }
    setLoading(false);
  }, [orderId]);

  const fetchSummary = useCallback(async () => {
    if (!orderId) return;
    try {
      const resp = await scanPackApi.summary(Number(orderId));
      setSummary(resp.data ?? resp ?? null);
    } catch { setSummary(null); }
  }, [orderId]);

  useEffect(() => { fetchList(); fetchSummary(); }, [fetchList, fetchSummary]);

  const handleScan = async () => {
    if (!barcode.trim()) return;
    try {
      await scanPackApi.scan({ barcode: barcode.trim(), orderId: orderId ? Number(orderId) : undefined });
      setBarcode("");
      fetchList();
      fetchSummary();
    } catch (e) { toastError(e, "Scan failed"); }
  };

  return (
    <>
      <PageMeta title="Scan & Pack" description="Barcode scanning for packing operations" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan & Pack</h1>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Order ID</label>
            <input value={orderId} onChange={e => setOrderId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-36" placeholder="Order ID" />
          </div>
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scan Barcode</label>
            <input value={barcode} onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Scan barcode…" autoFocus />
          </div>
          <button onClick={handleScan} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Scan</button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Order Qty", value: summary.totalQty ?? 0, color: "text-blue-600" },
              { label: "Packed", value: summary.packedQty ?? 0, color: "text-green-600" },
              { label: "Remaining", value: (summary.totalQty ?? 0) - (summary.packedQty ?? 0), color: "text-yellow-600" },
              { label: "Cartons", value: summary.cartonCount ?? 0, color: "text-purple-600" },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {summary && summary.totalQty > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Packing Progress</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {((summary.packedQty / summary.totalQty) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${Math.min((summary.packedQty / summary.totalQty) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Scanned Items */}
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Barcode", "SKU", "Color", "Size", "Carton", "Scanned At"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {scannedItems.map((item: R, i: number) => (
                  <tr key={item.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">{item.barcode}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.skuCode ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.color ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.size ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.cartonNo ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.createdAt ? fmtDate(item.createdAt) : "—"}</td>
                  </tr>
                ))}
                {scannedItems.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No scanned items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
