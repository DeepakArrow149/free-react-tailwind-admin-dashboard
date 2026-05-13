/**
 * User Management Page — Company Admin
 * Allows company admins to create, edit, and manage users within their company,
 * including role assignment, branch assignment, and password reset.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageMeta, PageHeader } from '@/components/common';
import { Button, Badge, Avatar, Modal, useToast } from '@/components/ui';
import { DataTable, SearchBar, Pagination } from '@/components/table';
import { Input, Label, Switch } from '@/components/form';
import type { Column } from '@/components/table/DataTable';
import { api, apiRoutes } from '@/core/api';

/* ─── Types ─────────────────────────────────────────────── */

interface CompanyUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleId: number | null;
  roleName: string;
  branchId: number | null;
  branchName: string;
  branchCode: string;
  companyCode: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface CompanyRole {
  id: number;
  name: string;
  description: string | null;
}

interface CompanyBranch {
  id: number;
  branchCode: string;
  branchName: string;
  isActive: boolean;
}

interface CreateUserForm {
  username: string;
  email: string;
  fullName: string;
  password: string;
  roleId: number;
  branchId: number;
}

interface EditUserForm {
  fullName: string;
  email: string;
  roleId: number;
  branchId: number;
  isActive: boolean;
}

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
  true: 'success',
  false: 'error',
};

export default function UserManagementPage() {
  const { addToast } = useToast();

  /* ─── State ─────────────────────────────────────────────── */
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    username: '', email: '', fullName: '', password: '', roleId: 0, branchId: 0,
  });

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    fullName: '', email: '', roleId: 0, branchId: 0, isActive: true,
  });

  // Reset password modal
  const [showReset, setShowReset] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetForm, setResetForm] = useState<ResetPasswordForm>({
    newPassword: '', confirmPassword: '',
  });

  /* ─── Data Fetching ─────────────────────────────────────── */

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get<{ data: CompanyUser[]; meta?: { total: number } }>(
        `${apiRoutes.companyAdmin.users.list}?page=${page}&limit=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      );
      setUsers(res.data ?? []);
      setTotalUsers(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      addToast('Failed to load users', 'error');
    }
  }, [page, pageSize, search, addToast]);

  const fetchMeta = useCallback(async () => {
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        api.get<{ data: { roles: CompanyRole[] } }>(apiRoutes.companyAdmin.roles.list),
        api.get<{ data: CompanyBranch[] }>(apiRoutes.companyAdmin.branches.list),
      ]);
      setRoles(rolesRes.data?.roles ?? []);
      setBranches(branchesRes.data ?? []);
    } catch {
      // Silent — roles/branches optional
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchMeta()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchMeta]);

  /* ─── Helpers ─────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q),
    );
  }, [search, users]);

  const totalPages = Math.ceil(totalUsers / pageSize);

  /* ─── Create User ──────────────────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.roleId) return addToast('Please select a role', 'error');
    setCreateLoading(true);
    try {
      await api.post(apiRoutes.companyAdmin.users.create, {
        username: createForm.username,
        email: createForm.email,
        fullName: createForm.fullName,
        password: createForm.password,
        roleId: createForm.roleId,
        branchId: createForm.branchId || undefined,
      });
      addToast('User created successfully', 'success');
      setShowCreate(false);
      setCreateForm({ username: '', email: '', fullName: '', password: '', roleId: 0, branchId: 0 });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      addToast(msg, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  /* ─── Edit User ────────────────────────────────────────── */

  const openEdit = (user: CompanyUser) => {
    setEditUserId(user.id);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId ?? 0,
      branchId: user.branchId ?? 0,
      isActive: user.isActive,
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    setEditLoading(true);
    try {
      await api.put(apiRoutes.companyAdmin.users.update(editUserId), editForm);
      addToast('User updated', 'success');
      setShowEdit(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      addToast(msg, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  /* ─── Reset Password ───────────────────────────────────── */

  const openReset = (userId: number) => {
    setResetUserId(userId);
    setResetForm({ newPassword: '', confirmPassword: '' });
    setShowReset(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId) return;
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      return addToast('Passwords do not match', 'error');
    }
    if (resetForm.newPassword.length < 6) {
      return addToast('Password must be at least 6 characters', 'error');
    }
    setResetLoading(true);
    try {
      await api.post(apiRoutes.companyAdmin.users.resetPassword(resetUserId), {
        newPassword: resetForm.newPassword,
      });
      addToast('Password reset successfully', 'success');
      setShowReset(false);
    } catch {
      addToast('Failed to reset password', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  /* ─── Delete User ──────────────────────────────────────── */

  const handleDelete = async (user: CompanyUser) => {
    if (!confirm(`Delete user "${user.fullName}"? This cannot be undone.`)) return;
    try {
      await api.delete(apiRoutes.companyAdmin.users.delete(user.id));
      addToast('User deleted', 'success');
      fetchUsers();
    } catch {
      addToast('Failed to delete user', 'error');
    }
  };

  /* ─── Table Columns ──────────────────────────────────────── */

  const columns: Column<CompanyUser>[] = [
    {
      key: 'user',
      header: 'User',
      sortable: true,
      accessor: (u) => (
        <div className="flex items-center gap-3">
          <Avatar alt={u.fullName || u.username} size="sm" />
          <div>
            <p className="font-medium text-gray-800 dark:text-white/90">{u.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      accessor: (u) => <span className="text-sm text-gray-600 dark:text-gray-300">{u.username}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      accessor: (u) => (
        <Badge color={u.roleName === 'Admin' ? 'primary' : 'gray'} size="sm">
          {u.roleName}
        </Badge>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      sortable: true,
      accessor: (u) => <span className="text-sm">{u.branchName || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (u) => (
        <Badge color={statusColors[String(u.isActive)] ?? 'warning'} size="sm">
          {u.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      accessor: (u) => (
        <span className="text-sm text-gray-500">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      accessor: (u) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(u)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/10"
            title="Edit"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => openReset(u.id)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-amber-500 dark:text-gray-400 dark:hover:bg-white/10"
            title="Reset Password"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(u)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-400 dark:hover:bg-red-500/10"
            title="Delete"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <>
      <PageMeta title="User Management" />
      <PageHeader
        title="User Management"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Settings', path: '/settings' },
          { label: 'Users' },
        ]}
        actions={
          <Button onClick={() => setShowCreate(true)}>+ Add User</Button>
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No users found</p>
            <p className="mt-2 text-sm">Create your first user to get started.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} rowKey={(u) => String(u.id)} />
        )}

        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Create User Modal
          ══════════════════════════════════════════════════════════ */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Username</Label>
              <Input
                placeholder="johndoe"
                value={createForm.username}
                onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label required>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={createForm.fullName}
                onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Email</Label>
              <Input
                type="text"
                placeholder="john@company.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label required>Password</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Role</Label>
              <select
                value={createForm.roleId}
                onChange={(e) => setCreateForm((p) => ({ ...p, roleId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                required
              >
                <option value={0} disabled>Select a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Branch</Label>
              <select
                value={createForm.branchId}
                onChange={(e) => setCreateForm((p) => ({ ...p, branchId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value={0}>No branch</option>
                {branches.filter(b => b.isActive).map((b) => (
                  <option key={b.id} value={b.id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createLoading}>Create User</Button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          Edit User Modal
          ══════════════════════════════════════════════════════════ */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit User">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label required>Email</Label>
              <Input
                type="text"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role</Label>
              <select
                value={editForm.roleId}
                onChange={(e) => setEditForm((p) => ({ ...p, roleId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value={0} disabled>Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Branch</Label>
              <select
                value={editForm.branchId}
                onChange={(e) => setEditForm((p) => ({ ...p, branchId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value={0}>No branch</option>
                {branches.filter(b => b.isActive).map((b) => (
                  <option key={b.id} value={b.id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={editForm.isActive}
              onChange={() => setEditForm((p) => ({ ...p, isActive: !p.isActive }))}
            />
            <Label>Active</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={editLoading}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          Reset Password Modal
          ══════════════════════════════════════════════════════════ */}
      <Modal isOpen={showReset} onClose={() => setShowReset(false)} title="Reset User Password">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <Label required>New Password</Label>
            <Input
              type="password"
              placeholder="Min 6 characters"
              value={resetForm.newPassword}
              onChange={(e) => setResetForm((p) => ({ ...p, newPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label required>Confirm Password</Label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={resetForm.confirmPassword}
              onChange={(e) => setResetForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
            <Button type="submit" loading={resetLoading}>Reset Password</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
