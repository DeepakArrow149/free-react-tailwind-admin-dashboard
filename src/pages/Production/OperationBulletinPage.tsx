import { useEffect, useState, useCallback } from "react";
import { operationApi, bulletinApi } from "../../api/production";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

interface OperationRecord {
  id: number;
  code: string;
  name: string;
  department?: string;
  status?: string;
}

interface BulletinRecord {
  id: number;
  bulletinNo: string;
  style?: { styleNo: string };
  styleId: number;
  totalSam?: number;
  targetPerHour?: number;
  status: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  INACTIVE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function OperationBulletinPage() {
  const [tab, setTab] = useState<"operations" | "bulletins">("operations");

  // ── Operations ──
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [showOpForm, setShowOpForm] = useState(false);
  const [opForm, setOpForm] = useState({ code: "", name: "", department: "" });
  const [savingOp, setSavingOp] = useState(false);

  // ── Bulletins ──
  const [bulletins, setBulletins] = useState<BulletinRecord[]>([]);
  const [loadingBul, setLoadingBul] = useState(false);
  const [styleFilter, setStyleFilter] = useState("");

  const fetchOperations = useCallback(async () => {
    setLoadingOps(true);
    try {
      const resp = await operationApi.list();
      setOperations(resp.data ?? resp ?? []);
    } catch { setOperations([]); }
    setLoadingOps(false);
  }, []);

  const fetchBulletins = useCallback(async () => {
    setLoadingBul(true);
    try {
      const resp = await bulletinApi.list({ styleId: styleFilter || undefined });
      setBulletins(resp.data ?? resp ?? []);
    } catch { setBulletins([]); }
    setLoadingBul(false);
  }, [styleFilter]);

  useEffect(() => { fetchOperations(); }, [fetchOperations]);
  useEffect(() => { if (tab === "bulletins") fetchBulletins(); }, [tab, fetchBulletins]);

  const handleAddOp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOp(true);
    try {
      await operationApi.create(opForm);
      setOpForm({ code: "", name: "", department: "" });
      setShowOpForm(false);
      fetchOperations();
      toastSuccess("Operation created");
    } catch (e) { toastError(e, "Failed to create operation"); }
    setSavingOp(false);
  };

  const handleApprove = async (id: number) => {
    try { await bulletinApi.approve(id); fetchBulletins(); toastSuccess("Bulletin approved"); } catch (e) { toastError(e, "Failed to approve"); }
  };

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg ${tab === t ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`;

  return (
    <>
      <PageMeta title="Operation Bulletins" description="Manage operations master and operation bulletins" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operation Bulletins</h1>

        {/* Tabs */}
        <div className="flex gap-2 border-b dark:border-gray-700">
          <button className={tabCls("operations")} onClick={() => setTab("operations")}>Operations Master</button>
          <button className={tabCls("bulletins")} onClick={() => setTab("bulletins")}>Operation Bulletins</button>
        </div>

        {/* ── Operations Tab ── */}
        {tab === "operations" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Operations</h2>
              <button onClick={() => setShowOpForm(!showOpForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {showOpForm ? "Cancel" : "+ Add Operation"}
              </button>
            </div>

            {showOpForm && (
              <form onSubmit={handleAddOp} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <input placeholder="Code" value={opForm.code} onChange={e => setOpForm(f => ({ ...f, code: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                  <input placeholder="Name" value={opForm.name} onChange={e => setOpForm(f => ({ ...f, name: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                  <input placeholder="Department" value={opForm.department} onChange={e => setOpForm(f => ({ ...f, department: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <button type="submit" disabled={savingOp} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  {savingOp ? "Saving…" : "Save"}
                </button>
              </form>
            )}

            {loadingOps ? (
              <p className="text-gray-500 dark:text-gray-400">Loading…</p>
            ) : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {operations.map((op) => (
                      <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{op.code}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{op.name}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{op.department ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[op.status ?? "ACTIVE"] ?? statusColors.ACTIVE}`}>{op.status ?? "ACTIVE"}</span>
                        </td>
                      </tr>
                    ))}
                    {operations.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No operations found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Bulletins Tab ── */}
        {tab === "bulletins" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input placeholder="Filter by Style ID" value={styleFilter} onChange={e => setStyleFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48" />
            </div>

            {loadingBul ? (
              <p className="text-gray-500 dark:text-gray-400">Loading…</p>
            ) : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bulletin No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Style</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total SAM</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target/Hr</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {bulletins.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.bulletinNo}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{b.style?.styleNo ?? b.styleId}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{b.totalSam?.toFixed(2) ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{b.targetPerHour ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] ?? statusColors.DRAFT}`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {b.status === "DRAFT" && (
                            <button onClick={() => handleApprove(b.id)} className="text-xs text-blue-600 hover:underline">Approve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bulletins.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No bulletins found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
