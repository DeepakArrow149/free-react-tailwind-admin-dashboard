import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api, apiRoutes } from "../../core/api";
import PageMeta from "../../components/common/PageMeta";

/* ── Constants ── */
const MODULES = [
  "Master", "Merchandising", "Costing", "Planning", "Procurement",
  "Inventory", "Production", "Quality", "Packing", "Export",
  "Finance", "HRM", "Reports", "Settings",
];

const ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

/* ── Types ── */
interface RoleInfo {
  id: number;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  userCount: number;
  permissions: unknown;
}

interface RolePermission {
  module: string;
  permissions: string[];
}

/* ── Helpers ── */
function parsePermissionsJson(raw: unknown): RolePermission[] {
  // Handle { all: true } → everything checked
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).all === true) {
    return MODULES.map((m) => ({ module: m, permissions: [...ACTIONS] }));
  }
  // Handle { readOnly: true } → View only
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).readOnly === true) {
    return MODULES.map((m) => ({ module: m, permissions: ["View"] }));
  }
  // Handle matrix shape { "Master": ["View","Create"], ... }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const map = raw as Record<string, string[]>;
    return MODULES.map((m) => ({ module: m, permissions: Array.isArray(map[m]) ? map[m] : [] }));
  }
  // Handle array shape [{ module, permissions }]
  if (Array.isArray(raw)) {
    const arrMap = new Map(raw.map((r: RolePermission) => [r.module, r.permissions]));
    return MODULES.map((m) => ({ module: m, permissions: arrMap.get(m) || [] }));
  }
  // Fallback: no permissions
  return MODULES.map((m) => ({ module: m, permissions: [] }));
}

export default function RoleBuilderPage() {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* New role form */
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.get(apiRoutes.admin.roles);
      const d = res.data ?? res;
      const list = d?.roles || d || [];
      setRoles(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  /* When role is selected, load its saved permissions */
  const handleSelectRole = useCallback(async (roleId: number) => {
    setSelectedRoleId(roleId);
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.get(apiRoutes.admin.roleDetail(roleId));
      const detail = res.data ?? res;
      const permsRaw = detail?.permissions || role.permissions;
      setPermissions(parsePermissionsJson(permsRaw));
    } catch {
      // Fall back to local data
      setPermissions(parsePermissionsJson(role.permissions));
    }
  }, [roles]);

  const togglePermission = (module: string, action: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== module) return p;
        const has = p.permissions.includes(action);
        return { ...p, permissions: has ? p.permissions.filter((a) => a !== action) : [...p.permissions, action] };
      })
    );
  };

  const toggleAll = (module: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== module) return p;
        const allChecked = ACTIONS.every((a) => p.permissions.includes(a));
        return { ...p, permissions: allChecked ? [] : [...ACTIONS] };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.put(apiRoutes.admin.rolePermissions(selectedRole.name), { permissions });
      toast.success(`Permissions saved for "${selectedRole.name}"`);
      fetchRoles(); // refresh counts
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to save permissions";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return toast.error("Role name is required");
    try {
      await api.post(apiRoutes.admin.roles, { name: newRole.name.trim(), description: newRole.description.trim() || null });
      toast.success(`Role "${newRole.name}" created`);
      setNewRole({ name: "", description: "" });
      setShowCreateForm(false);
      fetchRoles();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create role";
      toast.error(msg);
    }
  };

  const handleDeleteRole = async (role: RoleInfo) => {
    if (role.isSystemRole) return toast.error("System roles cannot be deleted");
    if (role.userCount > 0) return toast.error("Cannot delete a role that has assigned users");
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(apiRoutes.admin.roleDetail(role.id));
      toast.success(`Role "${role.name}" deleted`);
      if (selectedRoleId === role.id) { setSelectedRoleId(null); setPermissions([]); }
      fetchRoles();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to delete role";
      toast.error(msg);
    }
  };

  return (
    <>
      <PageMeta title="Role Builder | ERP TRACK" description="Manage roles and permissions" />
      <div className="p-6 max-w-300 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Role & Permission Builder</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure module-level access for each role</p>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            + New Role
          </button>
        </div>

        {/* Create Role Form */}
        {showCreateForm && (
          <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
            <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">Create New Role</h3>
            <div className="flex flex-wrap gap-3">
              <input type="text" placeholder="Role Name" value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
              <input type="text" placeholder="Description (optional)" value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className="flex-2 min-w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
              <button onClick={handleCreateRole} className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600">Create</button>
              <button onClick={() => setShowCreateForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        )}

        {/* Role Cards */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading roles...</div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roles.map((role) => (
              <div key={role.id}
                onClick={() => handleSelectRole(role.id)}
                className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                  selectedRoleId === role.id
                    ? "border-brand-500 bg-brand-50 shadow-md dark:border-brand-400 dark:bg-brand-900/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white">{role.name}</h3>
                    {role.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{role.description}</p>}
                  </div>
                  {!role.isSystemRole && role.userCount === 0 && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-gray-400 hover:text-red-500 transition-opacity" title="Delete role">
                      🗑️
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{role.userCount} user{role.userCount !== 1 ? "s" : ""}</span>
                  {role.isSystemRole && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">System</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Permission Matrix */}
        {selectedRole && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Permissions for <span className="text-brand-500">{selectedRole.name}</span>
              </h2>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Permissions"}
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-300 w-48">Module</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-300 w-16">All</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="text-center p-3 text-gray-600 dark:text-gray-300 w-20">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {permissions.map((p) => {
                    const allChecked = ACTIONS.every((a) => p.permissions.includes(a));
                    return (
                      <tr key={p.module} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{p.module}</td>
                        <td className="p-3 text-center">
                          <input type="checkbox" checked={allChecked} onChange={() => toggleAll(p.module)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        {ACTIONS.map((a) => (
                          <td key={a} className="p-3 text-center">
                            <input type="checkbox" checked={p.permissions.includes(a)}
                              onChange={() => togglePermission(p.module, a)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!selectedRole && !loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔐</div>
            <p>Select a role above to configure its permissions</p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Permission Actions:</h3>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span><strong>View</strong> — Read access to module data</span>
            <span><strong>Create</strong> — Create new records</span>
            <span><strong>Edit</strong> — Modify existing records</span>
            <span><strong>Delete</strong> — Delete/deactivate records</span>
            <span><strong>Approve</strong> — Approve workflow items</span>
            <span><strong>Export</strong> — Export data to Excel/PDF</span>
          </div>
        </div>
      </div>
    </>
  );
}
