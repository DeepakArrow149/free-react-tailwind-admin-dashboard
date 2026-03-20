import { useEffect, useState, useCallback } from "react";
import { gstApi } from "../../api/finance";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  GENERATED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  FILED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  RECONCILED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

export default function GstReturnsPage() {
  const [tab, setTab] = useState<"gstr1" | "gstr3b" | "recon2b">("gstr1");
  const [returns, setReturns] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await gstApi.list({ returnType: tab.toUpperCase() });
      setReturns(resp.data ?? resp ?? []);
    } catch { setReturns([]); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const handleGenerate = async () => {
    if (!period) return;
    setGenerating(true);
    try {
      if (tab === "gstr1") await gstApi.generateGstr1(period);
      else if (tab === "gstr3b") await gstApi.generateGstr3b(period);
      else await gstApi.reconcile2B(period);
      setPeriod("");
      fetchReturns();
      toastSuccess("Return generated");
    } catch (e) { toastError(e, "Failed to generate return"); }
    setGenerating(false);
  };

  const handleFile = async (id: number) => {
    const arn = prompt("Enter ARN number:");
    if (!arn) return;
    try { await gstApi.file(id, arn); fetchReturns(); toastSuccess("Return filed"); } catch (e) { toastError(e, "Failed to file return"); }
  };

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg ${tab === t ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`;

  return (
    <>
      <PageMeta title="GST Returns" description="Generate and file GST returns" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GST Returns</h1>

        <div className="flex gap-2 border-b dark:border-gray-700">
          <button className={tabCls("gstr1")} onClick={() => setTab("gstr1")}>GSTR-1</button>
          <button className={tabCls("gstr3b")} onClick={() => setTab("gstr3b")}>GSTR-3B</button>
          <button className={tabCls("recon2b")} onClick={() => setTab("recon2b")}>2B Reconciliation</button>
        </div>

        {/* Generate / Reconcile */}
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Period (YYYY-MM)</label>
            <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="2026-03"
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40" />
          </div>
          <button onClick={handleGenerate} disabled={generating || !period}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {generating ? "Processing…" : tab === "recon2b" ? "Reconcile" : "Generate"}
          </button>
        </div>

        {/* Table */}
        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Period", "Return Type", "Taxable Amount", "CGST", "SGST", "IGST", "Total Tax", "Status", "ARN", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {returns.map((r: R) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.period}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.returnType}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(r.taxableAmount ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{Number(r.cgst ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{Number(r.sgst ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{Number(r.igst ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{Number(r.totalTax ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] ?? statusColors.DRAFT}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{r.arn ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.status === "GENERATED" && (
                        <button onClick={() => handleFile(r.id)} className="text-xs text-green-600 hover:underline">File</button>
                      )}
                    </td>
                  </tr>
                ))}
                {returns.length === 0 && <tr><td colSpan={10} className="px-4 py-6 text-center text-gray-400">No returns found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
