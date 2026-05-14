import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api, apiRoutes } from "../../core/api";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

/* ── Types ── */
interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, unknown> | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: number | null;
  user?: { fullName: string; email: string } | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
interface AuditMeta { entityTypes: string[]; actions: string[] }
interface Pagination { page: number; limit: number; total: number; totalPages: number }

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  LOGIN: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<AuditMeta>({ entityTypes: [], actions: [] });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* Filters */
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const fetchMeta = useCallback(async () => {
    try {
      const res = await api.get<{ data?: { entityTypes: string[]; actions: string[] }; entityTypes?: string[]; actions?: string[] }>(apiRoutes.admin.auditLogsMeta);
      const inner = res.data ?? res;
      setMeta({ entityTypes: inner.entityTypes || [], actions: inner.actions || [] });
    } catch { /* ignore */ }
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      if (search) params.set("search", search);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.get(`${apiRoutes.admin.auditLogs}?${params}`);
      const d = res.data ?? res;
      setLogs(d?.auditLogs || d?.logs || []);
      if (d?.pagination) setPagination(d.pagination);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [entityType, action, dateFrom, dateTo, search]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const formatDate = (d: string) => new Date(d).toLocaleString();

  const renderJson = (obj: Record<string, unknown> | null, label: string) => {
    if (!obj || Object.keys(obj).length === 0) return null;
    return (
      <div className="mt-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}:</span>
        <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          {JSON.stringify(obj, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Audit Logs | ERP TRACK" description="System audit trail" />
      <div className="p-6 max-w-300 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Audit Logs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all system changes and user actions</p>
          </div>
          <span className="text-sm text-gray-400">{pagination.total} total entries</span>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Search entity ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="">All Entity Types</option>
              {meta.entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="">All Actions</option>
              {meta.actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => fetchLogs(1)} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm text-white hover:bg-brand-600">Apply</button>
            <button onClick={() => { setEntityType(""); setAction(""); setDateFrom(""); setDateTo(""); setSearch(""); }}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300">Clear</button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mr-3" /> Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p>No audit logs found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Entity</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Entity ID</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">IP</th>
                  <th className="py-3 px-4 text-center font-medium text-gray-500 dark:text-gray-400">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{log.entityType}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{log.entityId}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{log.user?.fullName || log.user?.email || "System"}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{log.ipAddress || "—"}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                          {expandedId === log.id ? "▲" : "▼"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50/50 dark:bg-gray-900/30">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {renderJson(log.oldValues, "Previous Values")}
                            {renderJson(log.newValues, "New Values")}
                            {renderJson(log.changes, "Changes")}
                          </div>
                          {log.userAgent && (
                            <p className="mt-2 text-xs text-gray-400 truncate">User Agent: {log.userAgent}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => fetchLogs(p)}
            totalItems={pagination.total}
            pageSize={pagination.limit}
          />
        </div>
      </div>
    </>
  );
}
