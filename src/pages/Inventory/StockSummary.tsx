import { useEffect, useState, useCallback } from "react";
import { stockApi, warehouseApi, type StockSummaryRow, type StockLedgerEntry, type Warehouse } from "../../api/inventory";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Tabs: Summary | Ledger
export default function StockSummary() {
  const [tab, setTab] = useState<"summary" | "ledger">("summary");

  // ── Summary state ──
  const [summary, setSummary] = useState<StockSummaryRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [whFilter, setWhFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loadingS, setLoadingS] = useState(true);

  // ── Ledger state ──
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerWh, setLedgerWh] = useState("");
  const [loadingL, setLoadingL] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoadingS(true);
    try {
      const data = await stockApi.summary({
        warehouseId: whFilter || undefined,
        search: search || undefined,
      });
      setSummary(data ?? []);
    } catch { setSummary([]); }
    setLoadingS(false);
  }, [whFilter, search]);

  const fetchLedger = useCallback(async () => {
    setLoadingL(true);
    try {
      const resp = await stockApi.ledger({
        page: ledgerPage,
        limit: 50,
        warehouseId: ledgerWh || undefined,
      });
      setLedger(resp.data ?? []);
      setLedgerTotal(resp.meta?.total ?? 0);
    } catch { setLedger([]); }
    setLoadingL(false);
  }, [ledgerPage, ledgerWh]);

  useEffect(() => { warehouseApi.list().then(setWarehouses).catch(() => {}); }, []);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { if (tab === "ledger") fetchLedger(); }, [tab, fetchLedger]);

  const totalPages = Math.ceil(ledgerTotal / 50);

  return (
    <>
      <PageMeta title="Stock | ERP TRACK" description="Stock summary" />
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Stock Management</h2>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(["summary", "ledger"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 -mb-px text-sm font-medium capitalize border-b-2 transition ${
                tab === t
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {t === "summary" ? "Balance Summary" : "Transaction Ledger"}
            </button>
          ))}
        </div>

        {/* ━━ Summary Tab ━━ */}
        {tab === "summary" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search material…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white w-64"
              />
              <select
                value={whFilter}
                onChange={(e) => setWhFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {loadingS ? (
              <div className="text-center py-10 text-gray-500">Loading…</div>
            ) : summary.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No stock data found</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {["Material Code", "Material", "Unit", "Warehouse", "Total In", "Total Out", "Balance"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {summary.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2 font-mono text-xs">{r.materialCode}</td>
                        <td className="px-4 py-2">{r.materialName}</td>
                        <td className="px-4 py-2">{r.unit}</td>
                        <td className="px-4 py-2">{r.warehouseName}</td>
                        <td className="px-4 py-2 text-green-600 dark:text-green-400 font-medium">{Number(r.totalIn).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400 font-medium">{Number(r.totalOut).toLocaleString("en-IN")}</td>
                        <td className={`px-4 py-2 font-bold ${Number(r.balance) >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-300"}`}>
                          {Number(r.balance).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ━━ Ledger Tab ━━ */}
        {tab === "ledger" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={ledgerWh}
                onChange={(e) => { setLedgerWh(e.target.value); setLedgerPage(1); }}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">Total: {ledgerTotal} entries</span>
            </div>

            {loadingL ? (
              <div className="text-center py-10 text-gray-500">Loading…</div>
            ) : ledger.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No ledger entries</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {["Date", "Material", "Warehouse", "Type", "Qty In", "Qty Out", "Balance", "Remarks"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {ledger.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2 text-xs">{fmtDate(e.createdAt)}</td>
                        <td className="px-4 py-2">{e.material?.name ?? e.materialId}</td>
                        <td className="px-4 py-2">{e.warehouse?.name ?? e.warehouseId}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {e.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-green-600 dark:text-green-400">{e.qtyIn > 0 ? Number(e.qtyIn).toLocaleString("en-IN") : "-"}</td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400">{e.qtyOut > 0 ? Number(e.qtyOut).toLocaleString("en-IN") : "-"}</td>
                        <td className="px-4 py-2 font-semibold">{Number(e.balanceQty).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{e.remarks ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button disabled={ledgerPage <= 1} onClick={() => setLedgerPage((p) => p - 1)}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {ledgerPage} of {totalPages}
                </span>
                <button disabled={ledgerPage >= totalPages} onClick={() => setLedgerPage((p) => p + 1)}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
