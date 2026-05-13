/**
 * Users List Page — Tenant-Aware
 * Displays users scoped to the current tenant with branch/role filters.
 */

import { useState, useEffect, useMemo } from 'react';
import { PageMeta, PageHeader } from '@/components/common';
import { Button, Badge, Avatar, Modal } from '@/components/ui';
import { DataTable, SearchBar, Pagination } from '@/components/table';
import { Input, Label } from '@/components/form';
import type { Column } from '@/components/table/DataTable';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';
import type { TenantUser, Role, Branch, CreateUserPayload } from '@/types/tenant';

const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'warning',
  suspended: 'error',
};

export default function UsersListPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState<CreateUserPayload>({
    username: '',
    email: '',
    name: '',
    password: '',
    roleId: 0,
    branchId: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.get<{ data: TenantUser[] }>(apiRoutes.users.list),
        api.get<{ data: Role[] }>(apiRoutes.users.roles),
        api.get<{ data: Branch[] }>(apiRoutes.branch.list),
      ]);
      setUsers(usersRes.data ?? []);
      setRoles(rolesRes.data ?? []);
      setBranches(branchesRes.data ?? []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [search, users]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleStatusChange = async (userId: string | number, newStatus: string) => {
    try {
      await api.patch(apiRoutes.users.updateStatus(userId), { status: newStatus });
      fetchAll();
    } catch {
      // handle
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await api.post(apiRoutes.users.create, form);
      setShowCreateModal(false);
      setForm({ username: '', email: '', name: '', password: '', roleId: 0, branchId: 0 });
      fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user.';
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const columns: Column<TenantUser>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      accessor: (user) => (
        <div className="flex items-center gap-3">
          <Avatar alt={user.name} size="sm" />
          <div>
            <p className="font-medium text-gray-800 dark:text-white/90">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roleDisplay',
      header: 'Role',
      sortable: true,
      accessor: (user) => (
        <span className="text-sm capitalize">{user.roleDisplay || user.role || '—'}</span>
      ),
    },
    {
      key: 'branchName',
      header: 'Branch',
      sortable: true,
      accessor: (user) => (
        <span className="text-sm">{user.branchName || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (user) => (
        <Badge color={statusColors[user.status] ?? 'warning'} size="sm">
          {user.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      accessor: (user) => (
        <div className="flex items-center gap-2">
          {user.status === 'active' ? (
            <button
              onClick={() => handleStatusChange(user.id, 'inactive')}
              className="text-gray-500 hover:text-warning-500 dark:text-gray-400"
              title="Deactivate"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange(user.id, 'active')}
              className="text-gray-500 hover:text-success-500 dark:text-gray-400"
              title="Activate"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="Users" />
      <PageHeader
        title="Users"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Users' }]}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            + Add User
          </Button>
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search users..."
          />
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
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
        ) : (
          <DataTable columns={columns} data={paginated} rowKey={(u) => String(u.id)} />
        )}

        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(filtered.length / pageSize)}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New User"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {createError}
            </div>
          )}
          <div>
            <Label required>Username</Label>
            <Input
              placeholder="johndoe"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label required>Full Name</Label>
            <Input
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label required>Email</Label>
            <Input
              type="email"
              placeholder="john@company.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label required>Password</Label>
            <Input
              type="password"
              placeholder="Secure password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Role</Label>
              <select
                value={form.roleId}
                onChange={(e) => setForm((p) => ({ ...p, roleId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
                required
              >
                <option value={0} disabled>Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name || r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label required>Branch</Label>
              <select
                value={form.branchId}
                onChange={(e) => setForm((p) => ({ ...p, branchId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
                required
              >
                <option value={0} disabled>Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createLoading}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
