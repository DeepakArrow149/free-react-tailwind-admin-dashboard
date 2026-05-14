import { useEffect, useState, useCallback } from "react";
import { bankReconApi } from "../../api/finance";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { PaginatedTable } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  RECONCILED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  MISMATCH: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface BankReconItem {
  id: number;
  date?: string;
  description?: string;
  bankAmount?: number;
  bookAmount?: number;
  isReconciled?: boolean;
}

interface BankStatementEntry {
  date?: string;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

interface R {
  id: number;
  accountId?: number;
  accountName?: string;
  period?: string;
  bankBalance?: number;
  bookBalance?: number;
  status: string;
  items?: BankReconItem[];
}

export default function BankReconciliationPage() {
  const [reconciliations, setReconciliations] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [items, setItems] = useState<BankReconItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  // Statement
  const [stmtAccount, setStmtAccount] = useState("");
  const [stmtFrom, setStmtFrom] = useState("");
  const [stmtTo, setStmtTo] = useState("");
  const [stmtData, setStmtData] = useState<BankStatementEntry[]>([]);

  const fetchRecons = useCallback(async () => {
    setLoading(true);
    try { const resp = await bankReconApi.list(); setReconciliations(resp.data ?? []); } catch { setReconciliations([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecons(); }, [fetchRecons]);

  const handleSelectRecon = (r: R) => {
    setSelectedId(r.id);
    setItems(r.items ?? []);
    setSelectedItemIds([]);
  };

  const toggleItem = (id: number) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleReconcile = async () => {
    if (!selectedId || selectedItemIds.length === 0) return;
    try {
      await bankReconApi.reconcile(selectedId, selectedItemIds);
      fetchRecons();
      setSelectedId(null);
      setItems([]);
      setSelectedItemIds([]);
      toastSuccess("Reconciled successfully");
    } catch (e) { toastError(e, "Reconciliation failed"); }
  };

  const handleFetchStatement = async () => {
    if (!stmtAccount) return;
    try {
      const resp = await bankReconApi.statement({ accountId: stmtAccount, from: stmtFrom || undefined, to: stmtTo || undefined });
      setStmtData(resp.data ?? resp ?? []);
    } catch { setStmtData([]); }
  };

  return (
    <>
      <PageMeta title="Bank Reconciliation" description="Reconcile bank statements with books of accounts" />
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Reconciliation</h1>

        {/* Reconciliations List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Reconciliation Batches</h2>
          {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
            <PaginatedTable data={reconciliations} pageSize={20}>
              {(pageData) => (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["ID", "Account", "Period", "Bank Balance", "Book Balance", "Difference", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pageData.map((r: R) => (
                    <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedId === r.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.id}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.accountName ?? r.accountId}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.period ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(r.bankBalance ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{Number(r.bookBalance ?? 0).toLocaleString("en-IN")}</td>
                      <td className={`px-4 py-3 text-right font-medium ${(r.bankBalance ?? 0) - (r.bookBalance ?? 0) === 0 ? "text-green-600" : "text-red-600"}`}>
                        {Number((r.bankBalance ?? 0) - (r.bookBalance ?? 0)).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] ?? statusColors.PENDING}`}>{r.status ?? "PENDING"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleSelectRecon(r)} className="text-xs text-blue-600 hover:underline">View Items</button>
                      </td>
                    </tr>
                  ))}
                  {reconciliations.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No reconciliations</td></tr>}
                </tbody>
              </table>
            </div>
              )}
            </PaginatedTable>
          )}
        </div>

        {/* Items Detail */}
        {selectedId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Reconciliation Items (Batch #{selectedId})</h3>
              <button onClick={handleReconcile} disabled={selectedItemIds.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                Reconcile Selected ({selectedItemIds.length})
              </button>
            </div>
            <PaginatedTable data={items} pageSize={20}>
              {(pageData) => (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 w-8"><input type="checkbox" aria-label="Select all items" onChange={e => setSelectedItemIds(e.target.checked ? items.map((i: BankReconItem) => i.id) : [])} /></th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Bank Amt</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Book Amt</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pageData.map((item: BankReconItem) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2"><input type="checkbox" aria-label="Select reconciliation item" checked={selectedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} /></td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{item.date ? fmtDate(item.date) : "—"}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{item.description ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{Number(item.bankAmount ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{Number(item.bookAmount ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.isReconciled ? statusColors.RECONCILED : statusColors.PENDING}`}>
                          {item.isReconciled ? "Reconciled" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400">No items</td></tr>}
                </tbody>
              </table>
            </div>
              )}
            </PaginatedTable>
          </div>
        )}

        {/* Bank Statement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Bank Statement</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <input aria-label="Account ID" placeholder="Account ID" value={stmtAccount} onChange={e => setStmtAccount(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-36" />
            <input type="date" aria-label="Statement from date" value={stmtFrom} onChange={e => setStmtFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <input type="date" aria-label="Statement to date" value={stmtTo} onChange={e => setStmtTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <button onClick={handleFetchStatement} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Fetch</button>
          </div>
          {stmtData.length > 0 && (
            <PaginatedTable data={stmtData} pageSize={20}>
              {(pageData) => (
            <div className="overflow-x-auto mt-3">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["Date", "Description", "Debit", "Credit", "Balance"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pageData.map((s: BankStatementEntry, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{s.date ? fmtDate(s.date) : "—"}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{s.description}</td>
                      <td className="px-4 py-2 text-right text-red-600">{s.debit ? Number(s.debit).toLocaleString("en-IN") : "—"}</td>
                      <td className="px-4 py-2 text-right text-green-600">{s.credit ? Number(s.credit).toLocaleString("en-IN") : "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{Number(s.balance ?? 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </PaginatedTable>
          )}
        </div>
      </div>
    </>
  );
}
