import { useEffect, useState, useCallback } from "react";
import { endlineApi } from "../../api/quality";
import PageMeta from "../../components/common/PageMeta";
import { PaginatedTable } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const resultColors: Record<string, string> = {
  PASS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAIL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

interface DhuSummaryRow {
  date?: string;
  inspected?: number;
  defects?: number;
  dhu?: number;
}

interface TopDefect {
  defectName?: string;
  defectCode?: string;
  count?: number;
  percentage?: number;
}

interface R {
  id: number;
  inspectionDate?: string;
  createdAt?: string;
  order?: { orderNo: string };
  orderId?: number;
  lineNo?: string;
  inspectedQty?: number;
  defectQty?: number;
  result?: string;
}

export default function EndlineQcPage() {
  const [entries, setEntries] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);

  // DHU
  const [dhuOrderId, setDhuOrderId] = useState("");
  const [dhuFrom, setDhuFrom] = useState("");
  const [dhuTo, setDhuTo] = useState("");
  const [dhuData, setDhuData] = useState<DhuSummaryRow[]>([]);

  // Top Defects
  const [topDefects, setTopDefects] = useState<TopDefect[]>([]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await endlineApi.list({ limit: 50 });
      setEntries(resp.data ?? resp ?? []);
    } catch { setEntries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const fetchDhu = async () => {
    if (!dhuOrderId || !dhuFrom || !dhuTo) return;
    try {
      const resp = await endlineApi.dhuSummary(Number(dhuOrderId), dhuFrom, dhuTo);
      setDhuData(resp.data ?? resp ?? []);
    } catch { setDhuData([]); }
  };

  const fetchTopDefects = async () => {
    if (!dhuOrderId) return;
    try {
      const resp = await endlineApi.topDefects(Number(dhuOrderId), dhuFrom || undefined, dhuTo || undefined);
      setTopDefects(resp.data ?? resp ?? []);
    } catch { setTopDefects([]); }
  };

  const handleAnalyze = () => { fetchDhu(); fetchTopDefects(); };

  return (
    <>
      <PageMeta title="Endline QC" description="Endline quality control inspection and DHU tracking" />
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Endline QC</h1>

        {/* QC Entries */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Recent Inspections</h2>
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading…</p>
          ) : (
            <PaginatedTable data={entries} pageSize={20}>
              {(pageData) => (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["Date", "Order", "Line", "Inspected", "Defects", "DHU %", "Result"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pageData.map((e: R) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(e.inspectionDate ?? e.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.order?.orderNo ?? e.orderId}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{e.lineNo ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{e.inspectedQty ?? 0}</td>
                      <td className="px-4 py-3 text-right text-red-600">{e.defectQty ?? 0}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {e.inspectedQty ? ((e.defectQty / e.inspectedQty) * 100).toFixed(1) : "0.0"}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resultColors[e.result] ?? resultColors.PENDING}`}>{e.result ?? "PENDING"}</span>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No entries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
              )}
            </PaginatedTable>
          )}
        </div>

        {/* DHU Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">DHU Analysis</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <input placeholder="Order ID" value={dhuOrderId} onChange={e => setDhuOrderId(e.target.value)}
              aria-label="Order ID" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-36" />
            <input type="date" value={dhuFrom} onChange={e => setDhuFrom(e.target.value)}
              aria-label="From date" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <input type="date" value={dhuTo} onChange={e => setDhuTo(e.target.value)}
              aria-label="To date" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <button onClick={handleAnalyze} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Analyze</button>
          </div>

          {dhuData.length > 0 && (
            <PaginatedTable data={dhuData} pageSize={20}>
              {(pageData) => (
            <div className="overflow-x-auto mt-3">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Inspected</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Defects</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">DHU %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pageData.map((d: DhuSummaryRow, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{d.date ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{d.inspected ?? 0}</td>
                      <td className="px-4 py-2 text-right text-red-600">{d.defects ?? 0}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{d.dhu?.toFixed(1) ?? "0.0"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </PaginatedTable>
          )}
        </div>

        {/* Top 5 Defects */}
        {topDefects.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Top 5 Defects</h2>
            <div className="space-y-2">
              {topDefects.slice(0, 5).map((d: TopDefect, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-40 truncate">{d.defectName ?? d.defectCode}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div className="bg-red-500 h-4 rounded-full" style={{ width: `${Math.min(d.percentage ?? 0, 100)}%` }} />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right">{d.count} ({d.percentage?.toFixed(1) ?? 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
