import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import client from "../../api/client";
import { APPROVAL_MODULES, SYSTEM_ROLES } from '@erp/shared-types';
import { PaginatedTable } from "../../components/table";

/* ── Types ── */
interface ApprovalRule {
  id: number;
  module: string;
  condition: string | null;
  approverRole: string;
  approverLevel: number;
  isActive: boolean;
  createdAt: string;
}

interface ApprovalRequest {
  id: number;
  module: string;
  recordId: number;
  ruleId: number;
  requestedBy: number;
  approverUserId: number | null;
  status: string;
  remarks: string | null;
  decidedAt: string | null;
  createdAt: string;
}

const MODULES = [...APPROVAL_MODULES];

const ROLES = [...SYSTEM_ROLES];

export default function ApprovalWorkflowPage() {
  const [tab, setTab] = useState<"rules" | "requests">("rules");
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  /* Create rule modal */
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ module: "PURCHASE_ORDER", approverRole: "Admin", approverLevel: 1, conditionField: "amount", conditionOp: "gt", conditionValue: "" });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try { const r = await client.get("/admin/approval-rules"); setRules(r.data.data || []); }
    catch { toast.error("Failed to fetch rules"); }
    setLoading(false);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try { const r = await client.get("/admin/approval-requests"); setRequests(r.data.data || []); }
    catch { toast.error("Failed to fetch requests"); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "rules") fetchRules(); else fetchRequests();
  }, [tab, fetchRules, fetchRequests]);

  const handleCreateRule = async () => {
    const condition = form.conditionValue
      ? { [form.conditionField]: { [form.conditionOp]: Number(form.conditionValue) } }
      : null;
    try {
      await client.post("/admin/approval-rules", {
        module: form.module,
        approverRole: form.approverRole,
        approverLevel: form.approverLevel,
        condition,
      });
      toast.success("Rule created");
      setShowCreate(false);
      fetchRules();
    } catch (e: unknown) { toast.error((e as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || "Failed"); }
  };

  const handleToggle = async (rule: ApprovalRule) => {
    try {
      await client.put(`/admin/approval-rules/${rule.id}`, { isActive: !rule.isActive });
      toast.success(rule.isActive ? "Rule deactivated" : "Rule activated");
      fetchRules();
    } catch { toast.error("Failed to update"); }
  };

  const handleDecide = async (id: number, decision: "APPROVED" | "REJECTED") => {
    const remarks = decision === "REJECTED" ? prompt("Rejection remarks:") : null;
    try {
      await client.patch(`/admin/approval-requests/${id}/decide`, { decision, remarks });
      toast.success(`Request ${decision.toLowerCase()}`);
      fetchRequests();
    } catch (e: unknown) { toast.error((e as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || "Failed"); }
  };

  const statusBadge = (s: string) => {
    const c: Record<string, string> = { PENDING: "bg-yellow-100 text-yellow-700", APPROVED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[s] || "bg-gray-100"}`}>{s}</span>;
  };

  return (
    <div className="p-6 max-w-300 mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Approval Workflows</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        {(["rules", "requests"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t ? "bg-white dark:bg-gray-600 shadow text-blue-600" : "text-gray-500"}`}>
            {t === "rules" ? "Rules" : "Pending Approvals"}
          </button>
        ))}
      </div>

      {/* RULES TAB */}
      {tab === "rules" && (
        <>
          <button onClick={() => setShowCreate(true)} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Add Rule</button>

          {loading ? (
            <p className="text-center py-8 text-gray-400">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No rules configured</p>
          ) : (
          <PaginatedTable data={rules} pageSize={20}>
            {(pageData) => (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left p-3">Module</th>
                  <th className="text-left p-3">Condition</th>
                  <th className="text-left p-3">Approver Role</th>
                  <th className="text-center p-3">Level</th>
                  <th className="text-center p-3">Active</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pageData.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-3 font-medium">{r.module}</td>
                      <td className="p-3 text-xs font-mono">{r.condition || "—"}</td>
                      <td className="p-3">{r.approverRole}</td>
                      <td className="p-3 text-center">{r.approverLevel}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${r.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleToggle(r)} className={`text-xs ${r.isActive ? "text-red-600" : "text-green-600"} hover:underline`}>
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
            )}
          </PaginatedTable>
          )}
        </>
      )}

      {/* REQUESTS TAB */}
      {tab === "requests" && (
        loading ? (
          <p className="text-center py-8 text-gray-400">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No pending approvals</p>
        ) : (
        <PaginatedTable data={requests} pageSize={20}>
          {(pageData) => (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Module</th>
                <th className="text-left p-3">Record ID</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Remarks</th>
                <th className="text-left p-3">Date</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pageData.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3">{r.id}</td>
                    <td className="p-3 font-medium">{r.module}</td>
                    <td className="p-3">{r.recordId}</td>
                    <td className="p-3 text-center">{statusBadge(r.status)}</td>
                    <td className="p-3 text-xs">{r.remarks || "—"}</td>
                    <td className="p-3 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-center">
                      {r.status === "PENDING" && (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleDecide(r.id, "APPROVED")} className="text-green-600 text-xs hover:underline">Approve</button>
                          <button onClick={() => handleDecide(r.id, "REJECTED")} className="text-red-600 text-xs hover:underline">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
          )}
        </PaginatedTable>
        )
      )}

      {/* CREATE RULE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add Approval Rule</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="rule-module" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Module</label>
                <select id="rule-module" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600">
                  {MODULES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="rule-condition-field" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Condition Field</label>
                  <select id="rule-condition-field" value={form.conditionField} onChange={(e) => setForm({ ...form, conditionField: e.target.value })} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600">
                    <option value="amount">Amount</option>
                    <option value="quantity">Quantity</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rule-condition-op" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Operator</label>
                  <select id="rule-condition-op" value={form.conditionOp} onChange={(e) => setForm({ ...form, conditionOp: e.target.value })} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600">
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="gte">≥</option>
                    <option value="lte">≤</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rule-condition-value" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Value</label>
                  <input id="rule-condition-value" type="number" value={form.conditionValue} onChange={(e) => setForm({ ...form, conditionValue: e.target.value })} placeholder="e.g. 50000" className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rule-approver-role" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Approver Role</label>
                  <select id="rule-approver-role" value={form.approverRole} onChange={(e) => setForm({ ...form, approverRole: e.target.value })} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600">
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="rule-approver-level" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Level</label>
                  <input id="rule-approver-level" type="number" min={1} max={5} value={form.approverLevel} onChange={(e) => setForm({ ...form, approverLevel: Number(e.target.value) })} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreateRule} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
