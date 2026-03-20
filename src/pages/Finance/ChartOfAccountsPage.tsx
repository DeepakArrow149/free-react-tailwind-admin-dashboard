import { useEffect, useState, useCallback } from "react";
import { accountApi, ChartOfAccount } from "../../api/finance";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

const typeColors: Record<string, string> = {
  ASSET:     "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  LIABILITY: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  EQUITY:    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  INCOME:    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  EXPENSE:   "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

function fmtCur(n: number) { return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 }); }

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [treeData, setTreeData] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"tree" | "flat">("tree");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState("");

  const [form, setForm] = useState({
    accountCode: "", accountName: "", accountType: "ASSET", accountGroup: "",
    parentId: "", isGroup: false, normalBalance: "DEBIT", openingBalance: "0",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      accountApi.list(),
      accountApi.tree(),
    ]);
    if (results[0].status === "fulfilled") {
      const d = results[0].value;
      setAccounts(Array.isArray(d) ? d : d?.data?.data ?? d?.data ?? []);
    }
    if (results[1].status === "fulfilled") {
      const d = results[1].value;
      setTreeData(Array.isArray(d) ? d : d?.data?.data ?? d?.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleGroup = (id: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allGroupIds = accounts.filter((a) => a.isGroup).map((a) => a.id);
    setExpandedGroups(new Set(allGroupIds));
  };

  const handleCreate = async () => {
    try {
      await accountApi.create({
        accountCode: form.accountCode,
        accountName: form.accountName,
        accountType: form.accountType,
        accountGroup: form.accountGroup || undefined,
        parentId: form.parentId ? Number(form.parentId) : undefined,
        isGroup: form.isGroup,
        normalBalance: form.normalBalance,
        openingBalance: Number(form.openingBalance) || 0,
      });
      setShowCreate(false);
      setForm({ accountCode: "", accountName: "", accountType: "ASSET", accountGroup: "", parentId: "", isGroup: false, normalBalance: "DEBIT", openingBalance: "0" });
      fetchData();
      toastSuccess("Account created");
    } catch (e) { toastError(e, "Failed to create account"); }
  };

  /* ── tree renderer ── */
  const TreeNode = ({ node, depth = 0 }: { node: ChartOfAccount; depth?: number }) => {
    const isExpanded = expandedGroups.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const color = typeColors[node.accountType] ?? "bg-gray-100 text-gray-700";

    return (
      <>
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => hasChildren && toggleGroup(node.id)}>
          <td className="px-3 py-2" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <span className="text-xs text-gray-400 cursor-pointer">{isExpanded ? "▼" : "▶"}</span>
              ) : (
                <span className="w-3" />
              )}
              <span className={`font-mono text-xs ${node.isGroup ? "font-bold" : ""} text-gray-800 dark:text-white`}>{node.accountCode}</span>
            </div>
          </td>
          <td className={`px-3 py-2 text-sm ${node.isGroup ? "font-semibold" : ""} text-gray-800 dark:text-white`}>{node.accountName}</td>
          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>{node.accountType}</span></td>
          <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{node.accountGroup ?? "—"}</td>
          <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{node.normalBalance}</td>
          <td className="px-3 py-2 text-xs text-right text-gray-700 dark:text-gray-300">{fmtCur(node.openingBalance ?? 0)}</td>
        </tr>
        {isExpanded && node.children?.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </>
    );
  };

  /* ── filtered flat list ── */
  const filteredAccounts = filterType ? accounts.filter((a) => a.accountType === filterType) : accounts;

  return (
    <>
      <PageMeta title="Chart of Accounts" description="Manage chart of accounts" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
          <button onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New Account</button>
        </div>

        {/* controls */}
        <div className="flex flex-wrap gap-3">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button onClick={() => setView("tree")} className={`px-3 py-1.5 text-xs font-medium ${view === "tree" ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>Tree</button>
            <button onClick={() => setView("flat")} className={`px-3 py-1.5 text-xs font-medium ${view === "flat" ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>Flat</button>
          </div>
          {view === "tree" && (
            <button onClick={expandAll} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">Expand All</button>
          )}
          {view === "flat" && (
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <option value="">All Types</option>
              {["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 self-center">{accounts.length} accounts</span>
        </div>

        {/* type summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"].map((t) => {
            const count = accounts.filter((a) => a.accountType === t).length;
            const color = typeColors[t] ?? "";
            return (
              <div key={t} className={`rounded-lg p-3 ${color.split(" ")[0]}`}>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t}</p>
                <p className={`text-lg font-bold ${color.split(" ").slice(1).join(" ")}`}>{count}</p>
              </div>
            );
          })}
        </div>

        {/* create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">New Account</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Account Code</label>
                  <input type="text" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                    placeholder="e.g. 1001" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Account Name</label>
                  <input type="text" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    {["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Group</label>
                  <input type="text" value={form.accountGroup} onChange={(e) => setForm({ ...form, accountGroup: e.target.value })}
                    placeholder="e.g. Current Assets" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Parent Account ID</label>
                  <input type="number" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Normal Balance</label>
                  <select value={form.normalBalance} onChange={(e) => setForm({ ...form, normalBalance: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Opening Balance</label>
                  <input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div className="flex items-center gap-2 self-end pb-1.5">
                  <input type="checkbox" checked={form.isGroup} onChange={(e) => setForm({ ...form, isGroup: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600" />
                  <label className="text-xs text-gray-600 dark:text-gray-400">Is Group Account</label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleCreate} disabled={!form.accountCode || !form.accountName}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Create</button>
              </div>
            </div>
          </div>
        )}

        {/* table */}
        {loading ? (
          <p className="text-gray-400 py-8 text-center">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Code", "Name", "Type", "Group", "Normal Bal", "Opening Bal"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {view === "tree" ? (
                  treeData.length > 0 ? treeData.map((node) => <TreeNode key={node.id} node={node} />) : (
                    filteredAccounts.map((a) => {
                      const color = typeColors[a.accountType] ?? "";
                      return (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-2 font-mono text-xs text-gray-800 dark:text-white">{a.accountCode}</td>
                          <td className="px-3 py-2 text-sm text-gray-800 dark:text-white">{a.accountName}</td>
                          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>{a.accountType}</span></td>
                          <td className="px-3 py-2 text-xs text-gray-500">{a.accountGroup ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{a.normalBalance}</td>
                          <td className="px-3 py-2 text-xs text-right text-gray-700 dark:text-gray-300">{fmtCur(a.openingBalance ?? 0)}</td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  filteredAccounts.map((a) => {
                    const color = typeColors[a.accountType] ?? "";
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-800 dark:text-white">{a.accountCode}</td>
                        <td className="px-3 py-2 text-sm text-gray-800 dark:text-white">{a.accountName}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>{a.accountType}</span></td>
                        <td className="px-3 py-2 text-xs text-gray-500">{a.accountGroup ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{a.normalBalance}</td>
                        <td className="px-3 py-2 text-xs text-right text-gray-700 dark:text-gray-300">{fmtCur(a.openingBalance ?? 0)}</td>
                      </tr>
                    );
                  })
                )}
                {(view === "tree" ? treeData.length === 0 && accounts.length === 0 : filteredAccounts.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No accounts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
