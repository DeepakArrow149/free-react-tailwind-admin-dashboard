import { useEffect, useState, useCallback } from "react";
import { fixedAssetApi } from "../../api/finance";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DISPOSED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  FULLY_DEPRECIATED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    assetCode: "", assetName: "", category: "", purchaseDate: "",
    purchaseCost: "", usefulLifeMonths: "60", salvageValue: "0", location: "",
  });
  const [saving, setSaving] = useState(false);
  const [depPeriod, setDepPeriod] = useState("");
  const [runningDep, setRunningDep] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try { const resp = await fixedAssetApi.list(); setAssets(resp.data ?? resp ?? []); } catch { setAssets([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fixedAssetApi.create({
        ...form,
        purchaseCost: Number(form.purchaseCost),
        usefulLifeMonths: Number(form.usefulLifeMonths),
        salvageValue: Number(form.salvageValue),
      });
      setForm({ assetCode: "", assetName: "", category: "", purchaseDate: "", purchaseCost: "", usefulLifeMonths: "60", salvageValue: "0", location: "" });
      setShowForm(false);
      fetchAssets();
      toastSuccess("Asset created");
    } catch (e) { toastError(e, "Failed to create asset"); }
    setSaving(false);
  };

  const handleDispose = async (id: number) => {
    const saleAmount = prompt("Sale/disposal amount:");
    if (saleAmount === null) return;
    try {
      await fixedAssetApi.dispose(id, { disposalDate: new Date().toISOString().slice(0, 10), saleAmount: Number(saleAmount) });
      fetchAssets();
      toastSuccess("Asset disposed");
    } catch (e) { toastError(e, "Failed to dispose asset"); }
  };

  const handleRunDepreciation = async () => {
    if (!depPeriod) return;
    setRunningDep(true);
    try { await fixedAssetApi.runDepreciation(depPeriod); fetchAssets(); toastSuccess("Depreciation run complete"); } catch (e) { toastError(e, "Failed to run depreciation"); }
    setRunningDep(false);
  };

  return (
    <>
      <PageMeta title="Fixed Assets" description="Manage fixed assets and run depreciation" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fixed Assets</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            {showForm ? "Cancel" : "+ Add Asset"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="Asset Code" value={form.assetCode} onChange={e => setForm(f => ({ ...f, assetCode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input placeholder="Asset Name" value={form.assetName} onChange={e => setForm(f => ({ ...f, assetName: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="date" placeholder="Purchase Date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input type="number" placeholder="Purchase Cost" value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input type="number" placeholder="Useful Life (months)" value={form.usefulLifeMonths} onChange={e => setForm(f => ({ ...f, usefulLifeMonths: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="number" placeholder="Salvage Value" value={form.salvageValue} onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save Asset"}
            </button>
          </form>
        )}

        {/* Depreciation Run */}
        <div className="flex items-end gap-3 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Depreciation Period (YYYY-MM)</label>
            <input value={depPeriod} onChange={e => setDepPeriod(e.target.value)} placeholder="2026-03"
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40" />
          </div>
          <button onClick={handleRunDepreciation} disabled={runningDep || !depPeriod}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
            {runningDep ? "Running…" : "Run Depreciation"}
          </button>
        </div>

        {/* Table */}
        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Code", "Name", "Category", "Purchase Date", "Cost", "WDV", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {assets.map((a: R) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.assetCode}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.assetName}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.category ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.purchaseDate ? fmtDate(a.purchaseDate) : "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(a.purchaseCost ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(a.writtenDownValue ?? a.purchaseCost ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] ?? statusColors.ACTIVE}`}>{a.status ?? "ACTIVE"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.status === "ACTIVE" && (
                        <button onClick={() => handleDispose(a.id)} className="text-xs text-red-600 hover:underline">Dispose</button>
                      )}
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No fixed assets</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
