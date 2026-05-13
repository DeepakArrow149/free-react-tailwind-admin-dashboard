/**
 * Role Builder Page — Company Admin
 * Create/edit roles with a visual permission matrix (modules × actions).
 * Permissions are stored as JSON: { "Master": ["View","Create"], "Finance": ["View"] }
 */

import { useState, useEffect, useCallback } from 'react';
import { PageMeta, PageHeader, ComponentCard } from '@/components/common';
import { Button, Badge, Modal, useToast } from '@/components/ui';
import { Input, Label, Checkbox, TextArea } from '@/components/form';
import { api, apiRoutes } from '@/core/api';

/* ─── Types ─────────────────────────────────────────────── */

interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: Record<string, string[]>;
  createdAt: string;
  _count: { users: number };
}

interface CreateRoleForm {
  name: string;
  description: string;
}

/* ─── Permission Matrix ─────────────────────────────────── */

function PermissionMatrix({
  modules,
  actions,
  permissions,
  onChange,
  readOnly = false,
}: {
  modules: string[];
  actions: string[];
  permissions: Record<string, string[]>;
  onChange: (perms: Record<string, string[]>) => void;
  readOnly?: boolean;
}) {
  const isChecked = (mod: string, act: string) =>
    permissions[mod]?.includes(act) ?? false;

  const toggle = (mod: string, act: string) => {
    if (readOnly) return;
    const current = permissions[mod] || [];
    const next = current.includes(act)
      ? current.filter((a) => a !== act)
      : [...current, act];
    onChange({ ...permissions, [mod]: next });
  };

  const toggleAllModule = (mod: string) => {
    if (readOnly) return;
    const current = permissions[mod] || [];
    if (current.length === actions.length) {
      // Deselect all
      onChange({ ...permissions, [mod]: [] });
    } else {
      // Select all
      onChange({ ...permissions, [mod]: [...actions] });
    }
  };

  const toggleAllAction = (act: string) => {
    if (readOnly) return;
    const allHave = modules.every((mod) => permissions[mod]?.includes(act));
    const next = { ...permissions };
    for (const mod of modules) {
      const current = next[mod] || [];
      if (allHave) {
        next[mod] = current.filter((a) => a !== act);
      } else if (!current.includes(act)) {
        next[mod] = [...current, act];
      }
    }
    onChange(next);
  };

  const selectAll = () => {
    if (readOnly) return;
    const full: Record<string, string[]> = {};
    for (const mod of modules) full[mod] = [...actions];
    onChange(full);
  };

  const deselectAll = () => {
    if (readOnly) return;
    onChange({});
  };

  const totalChecked = modules.reduce(
    (sum, mod) => sum + (permissions[mod]?.length ?? 0),
    0,
  );
  const totalPossible = modules.length * actions.length;

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalChecked} / {totalPossible} permissions selected
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>Select All</Button>
            <Button type="button" variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/5">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                Module
              </th>
              {actions.map((act) => (
                <th key={act} className="px-3 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => toggleAllAction(act)}
                    className="text-xs font-semibold text-gray-600 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                    disabled={readOnly}
                  >
                    {act}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                All
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {modules.map((mod) => {
              const modPerms = permissions[mod] || [];
              const allSelected = modPerms.length === actions.length;
              return (
                <tr key={mod} className="hover:bg-gray-50/50 dark:hover:bg-white/2">
                  <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white/80">
                    {mod}
                  </td>
                  {actions.map((act) => (
                    <td key={act} className="px-3 py-2.5 text-center">
                      <Checkbox
                        checked={isChecked(mod, act)}
                        onChange={() => toggle(mod, act)}
                        disabled={readOnly}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center">
                    <Checkbox
                      checked={allSelected}
                      onChange={() => toggleAllModule(mod)}
                      disabled={readOnly}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROLE BUILDER PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function RoleBuilderPage() {
  const { addToast } = useToast();

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Create role modal
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRoleForm>({ name: '', description: '' });

  // Permission editor modal
  const [showPermEditor, setShowPermEditor] = useState(false);
  const [permRole, setPermRole] = useState<RoleRow | null>(null);
  const [permDraft, setPermDraft] = useState<Record<string, string[]>>({});
  const [permSaving, setPermSaving] = useState(false);

  // Edit role info modal
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [editInfoRole, setEditInfoRole] = useState<RoleRow | null>(null);
  const [editInfoForm, setEditInfoForm] = useState<CreateRoleForm>({ name: '', description: '' });
  const [editInfoLoading, setEditInfoLoading] = useState(false);

  /* ─── Fetch ───────────────────────────────────────────── */

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get<{
        data: { roles: RoleRow[]; modules: string[]; actions: string[] };
      }>(apiRoutes.companyAdmin.roles.list);
      setRoles(res.data?.roles ?? []);
      setModules(res.data?.modules ?? []);
      setActions(res.data?.actions ?? []);
    } catch {
      addToast('Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  /* ─── Create Role ──────────────────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreateLoading(true);
    try {
      await api.post(apiRoutes.companyAdmin.roles.create, {
        name: createForm.name.trim(),
        description: createForm.description || undefined,
      });
      addToast('Role created', 'success');
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      fetchRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create role';
      addToast(msg, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  /* ─── Edit Role Info ───────────────────────────────────── */

  const openEditInfo = (role: RoleRow) => {
    setEditInfoRole(role);
    setEditInfoForm({ name: role.name, description: role.description || '' });
    setShowEditInfo(true);
  };

  const handleEditInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInfoRole) return;
    setEditInfoLoading(true);
    try {
      await api.put(apiRoutes.companyAdmin.roles.update(editInfoRole.id), {
        name: editInfoForm.name.trim(),
        description: editInfoForm.description || undefined,
      });
      addToast('Role updated', 'success');
      setShowEditInfo(false);
      fetchRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      addToast(msg, 'error');
    } finally {
      setEditInfoLoading(false);
    }
  };

  /* ─── Permission Editor ────────────────────────────────── */

  const openPermEditor = (role: RoleRow) => {
    setPermRole(role);
    // Deep-clone permissions
    const cloned: Record<string, string[]> = {};
    if (role.permissions && typeof role.permissions === 'object') {
      for (const [mod, perms] of Object.entries(role.permissions)) {
        cloned[mod] = Array.isArray(perms) ? [...perms] : [];
      }
    }
    setPermDraft(cloned);
    setShowPermEditor(true);
  };

  const handleSavePermissions = async () => {
    if (!permRole) return;
    setPermSaving(true);
    try {
      await api.put(apiRoutes.companyAdmin.roles.permissions(permRole.id), {
        permissions: permDraft,
      });
      addToast('Permissions saved', 'success');
      setShowPermEditor(false);
      fetchRoles();
    } catch {
      addToast('Failed to save permissions', 'error');
    } finally {
      setPermSaving(false);
    }
  };

  /* ─── Delete Role ──────────────────────────────────────── */

  const handleDelete = async (role: RoleRow) => {
    if (role.isSystemRole) {
      return addToast('System roles cannot be deleted', 'error');
    }
    if (role._count.users > 0) {
      return addToast(`Cannot delete role with ${role._count.users} user(s) assigned`, 'error');
    }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await api.delete(apiRoutes.companyAdmin.roles.delete(role.id));
      addToast('Role deleted', 'success');
      fetchRoles();
    } catch {
      addToast('Failed to delete role', 'error');
    }
  };

  /* ─── Helper: count permissions ─────────────────────────── */

  const countPerms = (perms: Record<string, string[]>) =>
    Object.values(perms).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <>
      <PageMeta title="Role Builder" />
      <PageHeader
        title="Role Builder"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Settings', path: '/settings' },
          { label: 'Roles' },
        ]}
        actions={
          <Button onClick={() => setShowCreate(true)}>+ New Role</Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : roles.length === 0 ? (
        <ComponentCard title="No Roles Found">
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No roles configured yet</p>
            <p className="mt-2 text-sm">Create your first role to start managing user permissions.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>+ Create First Role</Button>
          </div>
        </ComponentCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {role.name}
                  </h3>
                  {role.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {role.description}
                    </p>
                  )}
                </div>
                {role.isSystemRole && (
                  <Badge color="warning" size="sm">System</Badge>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{role._count.users} user{role._count.users !== 1 ? 's' : ''}</span>
                <span>{countPerms(role.permissions || {})} permission{countPerms(role.permissions || {}) !== 1 ? 's' : ''}</span>
              </div>

              {/* Quick permission preview */}
              {role.permissions && Object.keys(role.permissions).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(role.permissions)
                    .filter(([, acts]) => Array.isArray(acts) && acts.length > 0)
                    .slice(0, 5)
                    .map(([mod, acts]) => (
                      <Badge key={mod} color="primary" size="sm">
                        {mod}: {(acts as string[]).length}
                      </Badge>
                    ))}
                  {Object.keys(role.permissions).length > 5 && (
                    <Badge color="gray" size="sm">
                      +{Object.keys(role.permissions).length - 5} more
                    </Badge>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPermEditor(role)}
                >
                  Permissions
                </Button>
                {!role.isSystemRole && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditInfo(role)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(role)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          Create Role Modal
          ═══════════════════════════════════════════════════════ */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Role">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label required>Role Name</Label>
            <Input
              placeholder="e.g. Production Manager"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Description</Label>
            <TextArea
              placeholder="Optional description of this role's responsibilities"
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createLoading}>Create Role</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          Edit Role Info Modal
          ═══════════════════════════════════════════════════════ */}
      <Modal isOpen={showEditInfo} onClose={() => setShowEditInfo(false)} title="Edit Role">
        <form onSubmit={handleEditInfo} className="space-y-4">
          <div>
            <Label required>Role Name</Label>
            <Input
              value={editInfoForm.name}
              onChange={(e) => setEditInfoForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Description</Label>
            <TextArea
              value={editInfoForm.description}
              onChange={(e) => setEditInfoForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEditInfo(false)}>Cancel</Button>
            <Button type="submit" loading={editInfoLoading}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          Permission Editor Modal (Full-screen-like)
          ═══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showPermEditor}
        onClose={() => setShowPermEditor(false)}
        title={`Permissions — ${permRole?.name ?? ''}`}
        className="sm:max-w-4xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select which modules and actions this role can access. Changes are saved when you click "Save Permissions".
          </p>

          <PermissionMatrix
            modules={modules}
            actions={actions}
            permissions={permDraft}
            onChange={setPermDraft}
            readOnly={permRole?.isSystemRole}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <Button variant="outline" onClick={() => setShowPermEditor(false)}>Cancel</Button>
          {!permRole?.isSystemRole && (
            <Button loading={permSaving} onClick={handleSavePermissions}>
              Save Permissions
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
