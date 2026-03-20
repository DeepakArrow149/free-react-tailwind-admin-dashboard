import { useEffect, useState, useCallback } from "react";
import { productionTargetApi, type ProductionTarget, type TargetInput } from "../../api/planning";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProductionTargets() {
  const [targets, setTargets] = useState<ProductionTarget[]>([]);
  const [buyerOrderId, setBuyerOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editActual, setEditActual] = useState(0);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkFrom, setBulkFrom] = useState("");
  const [bulkTo, setBulkTo] = useState("");
  const [bulkQty, setBulkQty] = useState(0);
  const [bulkLine, setBulkLine] = useState("");

  const fetchTargets = useCallback(async () => {
    if (!buyerOrderId) return;
    setLoading(true);
    try {
      const resp = await productionTargetApi.list({ orderId: Number(buyerOrderId) });
      setTargets(resp.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [buyerOrderId]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  const handleUpdateActual = async (id: number) => {
    try {
      await productionTargetApi.update(id, { actualQty: editActual });
      setEditId(null);
      fetchTargets();
    } catch (err) { console.error(err); }
  };

  const handleBulkCreate = async () => {
    if (!buyerOrderId || !bulkFrom || !bulkTo || !bulkQty) return;
    const startDate = new Date(bulkFrom);
    const endDate = new Date(bulkTo);
    const items: TargetInput[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // skip Sundays
      items.push({
        orderId: Number(buyerOrderId),
        targetDate: d.toISOString().slice(0, 10),
        targetQty: bulkQty,
        lineNo: bulkLine || "",
      });
    }
    if (items.length === 0) return;
    try {
      await productionTargetApi.bulkCreate(items);
      setShowBulk(false);
      fetchTargets();
    } catch (err) { console.error(err); }
  };

  const totalTarget = targets.reduce((s, t) => s + t.targetQty, 0);
  const totalActual = targets.reduce((s, t) => s + (t.actualQty || 0), 0);
  const avgEfficiency = targets.length > 0 ? targets.reduce((s, t) => s + (t.efficiencyPct || 0), 0) / targets.length : 0;

  return (
    <>
      <PageMeta title="Production Targets | STITCH ERP" description="Daily production target tracking" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Production Targets</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set targets and track actual production</p>
          </div>
          <button onClick={() => setShowBulk(true)} disabled={!buyerOrderId} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Bulk Create Targets
          </button>
        </div>

        {/* Order Selector */}
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer Order ID</label>
            <input
              type="number"
              value={buyerOrderId}
              onChange={(e) => setBuyerOrderId(e.target.value)}
              placeholder="Enter order ID"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-brand-500 w-48"
            />
          </div>
          <button onClick={fetchTargets} disabled={!buyerOrderId} className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 disabled:opacity-50 transition">Load</button>
        </div>

        {/* Summary Cards */}
        {targets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-500">Total Target</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTarget.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-500">Total Actual</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalActual.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-500">Avg Efficiency</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgEfficiency.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Targets Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Line</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Target</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Actual</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Efficiency</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : targets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{buyerOrderId ? "No targets. Create them using Bulk Create." : "Enter an order ID."}</td></tr>
              ) : targets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtDate(t.targetDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{t.lineNo || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{t.targetQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {editId === t.id ? (
                      <input
                        type="number"
                        autoFocus
                        value={editActual}
                        onChange={(e) => setEditActual(parseInt(e.target.value) || 0)}
                        onBlur={() => handleUpdateActual(t.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleUpdateActual(t.id); if (e.key === "Escape") setEditId(null); }}
                        className="w-24 rounded border border-brand-400 bg-white dark:bg-gray-900 px-2 py-1 text-right text-sm dark:text-white"
                      />
                    ) : (
                      <span className={`${t.actualQty !== null ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>{t.actualQty ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.efficiencyPct !== null ? (
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        (t.efficiencyPct || 0) >= 90 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        (t.efficiencyPct || 0) >= 70 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}>{(t.efficiencyPct || 0).toFixed(1)}%</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editId !== t.id && (
                      <button onClick={() => { setEditId(t.id); setEditActual(t.actualQty ?? 0); }} className="text-xs text-brand-600 hover:underline">
                        Enter Actual
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk Create Modal */}
        {showBulk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk Create Targets</h3>
              <p className="text-sm text-gray-500">Creates daily targets (excluding Sundays) for the date range.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From *</label>
                  <input type="date" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To *</label>
                  <input type="date" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Daily Target Qty *</label>
                <input type="number" value={bulkQty} onChange={(e) => setBulkQty(parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Line No</label>
                <input value={bulkLine} onChange={(e) => setBulkLine(e.target.value)} placeholder="e.g. L1" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowBulk(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={handleBulkCreate} disabled={!bulkFrom || !bulkTo || !bulkQty} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
