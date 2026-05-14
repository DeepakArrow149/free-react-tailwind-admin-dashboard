import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api, apiRoutes } from "../../core/api";
import PageMeta from "../../components/common/PageMeta";

/* ── Types ── */
interface UserRow {
  id: number;
  fullName: string;
  email: string;
  role: string;
  roleName?: string;
  roleId?: number;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}
interface RoleOption { id: number; name: string }
interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  /* Form state */
  const [form, setForm] = useState({ fullName: "", email: "", password: "", roleId: 0, isActive: true });
  const [saving, setSaving] = useState(false);

  /* Confirm dialog */
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "reset"; user: UserRow } | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.get(`${apiRoutes.admin.users}?${params}`);
      const d = res.data ?? res;
      setUsers(d?.users || []);
      if (d?.pagination) setPagination(d.pagination);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchRoles = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.get(apiRoutes.admin.roles);
      const d = res.data ?? res;
      const list = d?.roles || d || [];
      setRoles(Array.isArray(list) ? list.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })) : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreateForm = () => {
    setEditingUser(null);
    setForm({ fullName: "", email: "", password: "", roleId: roles[0]?.id || 0, isActive: true });
    setShowForm(true);
  };

  const openEditForm = (u: UserRow) => {
    setEditingUser(u);
    setForm({ fullName: u.fullName, email: u.email, password: "", roleId: u.roleId || 0, isActive: u.isActive });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.email.trim()) return toast.error("Name and email are required");
    if (!editingUser && !form.password) return toast.error("Password is required for new users");
    setSaving(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = { fullName: form.fullName, email: form.email, roleId: form.roleId, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.put(apiRoutes.admin.userDetail(editingUser.id), payload);
        toast.success("User updated");
      } else {
        await api.post(apiRoutes.admin.users, { fullName: form.fullName, email: form.email, password: form.password, roleId: form.roleId });
        toast.success("User created");
      }
      setShowForm(false);
      fetchUsers(pagination.page);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    try {
      await api.delete(apiRoutes.admin.userDetail(u.id));
      toast.success(`User "${u.fullName}" deactivated`);
      fetchUsers(pagination.page);
    } catch {
      toast.error("Delete failed");
    } finally {
      setConfirmAction(null);
    }
  };

  const handleResetPassword = async (u: UserRow) => {
    try {
      await api.post(apiRoutes.admin.userResetPassword(u.id));
      toast.success(`Password reset for "${u.fullName}" — temporary password sent`);
    } catch {
      toast.error("Password reset failed");
    } finally {
      setConfirmAction(null);
    }
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleString();
  };

  return (
    <>
      <PageMeta title="User Management | ERP TRACK" description="Manage users" />
      <div className="p-6 max-w-300 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create, edit, and manage system users</p>
          </div>
          <button onClick={openCreateForm} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            + New User
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 flex gap-3">
          <input type="text" placeholder="Search by name or email..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers(1)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <button onClick={() => fetchUsers(1)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">Search</button>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mr-3" /> Loading...
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-gray-400"><div className="text-4xl mb-2">👤</div><p>No users found</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Role</th>
                  <th className="py-3 px-4 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Last Login</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Created</th>
                  <th className="py-3 px-4 text-center font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{u.fullName}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                        {u.roleName || u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive
                        ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(u.lastLogin)}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditForm(u)} title="Edit"
                          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10">✏️</button>
                        <button onClick={() => setConfirmAction({ type: "reset", user: u })} title="Reset Password"
                          className="rounded p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-500/10">🔑</button>
                        <button onClick={() => setConfirmAction({ type: "delete", user: u })} title="Deactivate"
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => fetchUsers(pagination.page - 1)} disabled={pagination.page <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">← Prev</button>
              <button onClick={() => fetchUsers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">Next →</button>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                {editingUser ? "Edit User" : "Create New User"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                  <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password {editingUser ? "(leave blank to keep)" : "*"}
                  </label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? "••••••••" : ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                  <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    <option value={0}>-- Select Role --</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {editingUser && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300" />
                    Active
                  </label>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {saving ? "Saving..." : editingUser ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
              <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
                {confirmAction.type === "delete" ? "Deactivate User?" : "Reset Password?"}
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {confirmAction.type === "delete"
                  ? `This will deactivate "${confirmAction.user.fullName}". They won't be able to log in.`
                  : `Reset password for "${confirmAction.user.fullName}"? A temporary password will be generated.`}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">Cancel</button>
                <button
                  onClick={() => confirmAction.type === "delete" ? handleDelete(confirmAction.user) : handleResetPassword(confirmAction.user)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                    confirmAction.type === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600"
                  }`}>
                  {confirmAction.type === "delete" ? "Deactivate" : "Reset"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
