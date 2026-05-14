import { useState } from "react";
import { barcodeApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "sonner";

export default function BarcodeGeneration() {
  const [orderId, setOrderId] = useState<number>(0);
  const [prefix, setPrefix] = useState("GBC");
  const [quantity, setQuantity] = useState(100);
  const [generating, setGenerating] = useState(false);

  const [barcodes, setBarcodes] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [scanCode, setScanCode] = useState("");
  const [tab, setTab] = useState<"generate" | "summary" | "scan">("generate");

  const handleGenerate = async () => {
    if (!orderId) { toast.error("Enter Order ID"); return; }
    setGenerating(true);
    try {
      const { data: resp } = await barcodeApi.generate({ orderId, prefix, quantity });
      setBarcodes(resp.data || []);
      toast.success(`Generated ${resp.data?.length || quantity} barcodes`);
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed"); } finally { setGenerating(false); }
  };

  const loadSummary = async () => {
    if (!orderId) return;
    try { const { data: resp } = await barcodeApi.summary(orderId); setSummary(resp.data); } catch { toast.error("Failed to load summary"); }
  };

  const handleLookup = async () => {
    if (!lookupCode) return;
    try { const { data: resp } = await barcodeApi.lookup(lookupCode); setLookupResult(resp.data); } catch { setLookupResult(null); toast.error("Barcode not found"); }
  };

  const handleScan = async () => {
    if (!scanCode) return;
    try { await barcodeApi.scan({ barcodeNo: scanCode, status: "SCANNED" }); toast.success("Scanned!"); setScanCode(""); } catch (err: any) { toast.error(err?.response?.data?.message || "Scan failed"); }
  };

  const tabs = [{ key: "generate" as const, label: "Generate" }, { key: "summary" as const, label: "Summary" }, { key: "scan" as const, label: "Scan / Lookup" }];

  return (
    <>
      <PageMeta title="Barcode Management | ERP TRACK" description="Generate & manage garment barcodes" />
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Garment Barcodes</h2>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t.key ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
          ))}
        </div>

        {tab === "generate" && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="grid grid-cols-3 gap-4">
              <div><label className="mb-1 block text-sm font-medium">Order ID *</label><input type="number" value={orderId || ""} onChange={e => setOrderId(Number(e.target.value))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
              <div><label className="mb-1 block text-sm font-medium">Prefix</label><input value={prefix} onChange={e => setPrefix(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
              <div><label className="mb-1 block text-sm font-medium">Quantity</label><input type="number" min={1} max={10000} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
            </div>
            <button onClick={handleGenerate} disabled={generating} className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{generating ? "Generating..." : "Generate Barcodes"}</button>
            {barcodes.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  {["#", "Barcode No", "Status"].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>)}
                </tr></thead><tbody>
                  {barcodes.slice(0, 50).map((b, i) => (
                    <tr key={b.id} className="border-b border-gray-50 dark:border-gray-800"><td className="px-3 py-1">{i + 1}</td><td className="px-3 py-1 font-mono">{b.barcodeNo}</td><td className="px-3 py-1">{b.status}</td></tr>
                  ))}
                </tbody></table>
                {barcodes.length > 50 && <p className="px-3 py-2 text-xs text-gray-400">Showing first 50 of {barcodes.length}</p>}
              </div>
            )}
          </div>
        )}

        {tab === "summary" && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="flex gap-3 items-end">
              <div><label className="mb-1 block text-sm font-medium">Order ID</label><input type="number" value={orderId || ""} onChange={e => setOrderId(Number(e.target.value))} className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
              <button onClick={loadSummary} className="h-10 rounded-lg bg-brand-500 px-4 text-sm text-white">Load Summary</button>
            </div>
            {summary && (
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(summary).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-700">
                    <p className="text-xs text-gray-500 uppercase">{k}</p>
                    <p className="text-2xl font-semibold text-gray-800 dark:text-white">{String(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "scan" && (
          <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <div>
              <h3 className="font-medium mb-3">Scan Barcode</h3>
              <div className="flex gap-3">
                <input placeholder="Scan or enter barcode..." value={scanCode} onChange={e => setScanCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleScan()} className="h-10 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 font-mono" />
                <button onClick={handleScan} className="h-10 rounded-lg bg-green-500 px-4 text-sm text-white">Scan</button>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Lookup Barcode</h3>
              <div className="flex gap-3">
                <input placeholder="Enter barcode number..." value={lookupCode} onChange={e => setLookupCode(e.target.value)} className="h-10 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 font-mono" />
                <button onClick={handleLookup} className="h-10 rounded-lg bg-brand-500 px-4 text-sm text-white">Lookup</button>
              </div>
              {lookupResult && (
                <div className="mt-3 rounded border border-gray-200 p-4 dark:border-gray-700 text-sm">
                  <p><strong>Barcode:</strong> {lookupResult.barcodeNo}</p>
                  <p><strong>Status:</strong> {lookupResult.status}</p>
                  <p><strong>Order:</strong> {lookupResult.order?.orderNo || lookupResult.orderId}</p>
                  <p><strong>Created:</strong> {new Date(lookupResult.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
