import { useState, useCallback } from "react";
import { extendedReportApi } from "../../api/finance";
import PageMeta from "../../components/common/PageMeta";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

type Tab = "balanceSheet" | "profitLoss" | "cashFlow" | "fundFlow" | "apAging";

export default function FinanceReportsPage() {
  const [tab, setTab] = useState<Tab>("balanceSheet");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<R[]>([]);

  // Params
  const [fyId, setFyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setData([]);
    try {
      let resp: R;
      switch (tab) {
        case "balanceSheet":
          resp = await extendedReportApi.balanceSheet(Number(fyId));
          break;
        case "profitLoss":
          resp = await extendedReportApi.profitLoss(Number(fyId), from || undefined, to || undefined);
          break;
        case "cashFlow":
          resp = await extendedReportApi.cashFlow(from, to);
          break;
        case "fundFlow":
          resp = await extendedReportApi.fundFlow(from, to);
          break;
        case "apAging":
          resp = await extendedReportApi.apAging();
          break;
      }
      setData(resp?.data ?? resp ?? []);
    } catch { setData([]); }
    setLoading(false);
  }, [tab, fyId, from, to]);

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg ${tab === t ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`;

  const needsFy = tab === "balanceSheet" || tab === "profitLoss";
  const needsDates = tab === "profitLoss" || tab === "cashFlow" || tab === "fundFlow";

  return (
    <>
      <PageMeta title="Finance Reports" description="View financial reports: Balance Sheet, P&L, Cash Flow, Fund Flow, AP Aging" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Reports</h1>

        <div className="flex gap-2 border-b dark:border-gray-700 flex-wrap">
          <button className={tabCls("balanceSheet")} onClick={() => setTab("balanceSheet")}>Balance Sheet</button>
          <button className={tabCls("profitLoss")} onClick={() => setTab("profitLoss")}>Profit & Loss</button>
          <button className={tabCls("cashFlow")} onClick={() => setTab("cashFlow")}>Cash Flow</button>
          <button className={tabCls("fundFlow")} onClick={() => setTab("fundFlow")}>Fund Flow</button>
          <button className={tabCls("apAging")} onClick={() => setTab("apAging")}>AP Aging</button>
        </div>

        {/* Params */}
        <div className="flex flex-wrap gap-3 items-end">
          {needsFy && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Financial Year ID</label>
              <input value={fyId} onChange={e => setFyId(e.target.value)} placeholder="1"
                className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-32" />
            </div>
          )}
          {needsDates && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </>
          )}
          <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Generate
          </button>
        </div>

        {/* Report Output */}
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading report…</p>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            {tab === "apAging" ? (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["Supplier", "Invoice", "Total", "Outstanding", "Days Due", "Bucket"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map((r: R, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.supplier?.name ?? r.supplierId}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.invoiceNo}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(r.totalAmount ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{Number(r.outstanding ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{r.daysDue}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.bucket === "0-30" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          r.bucket === "31-60" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}>{r.bucket}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["Account / Line Item", "Amount"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map((r: R, i: number) => (
                    <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${r.isTotal ? "font-bold bg-gray-50 dark:bg-gray-700" : ""}`}>
                      <td className={`px-4 py-3 text-gray-900 dark:text-white ${r.indent ? "pl-8" : ""}`}>
                        {r.accountName ?? r.lineItem ?? r.label ?? `Row ${i + 1}`}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {Number(r.amount ?? r.balance ?? r.value ?? 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Select parameters and click Generate to view the report.</p>
        )}
      </div>
    </>
  );
}
