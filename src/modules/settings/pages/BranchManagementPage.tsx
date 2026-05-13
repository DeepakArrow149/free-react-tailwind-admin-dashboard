/**
 * Branch Management Page — Company Admin
 * Create, edit, and manage branches within the company.
 */

import { useState, useEffect, useCallback } from 'react';
import { PageMeta, PageHeader } from '@/components/common';
import { Button, Badge, Modal, useToast } from '@/components/ui';
import { DataTable, SearchBar, Pagination } from '@/components/table';
import { Input, Label, Switch } from '@/components/form';
import type { Column } from '@/components/table/DataTable';
import { api, apiRoutes } from '@/core/api';
import { usePagination } from '@/core/hooks';

/* ─── Types ──────────────────────────────────────────────── */

interface BranchRow {
  id: number;
  branchCode: string;
  branchName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

interface CreateBranchForm {
  branchCode: string;
  branchName: string;
  location: string;
  phone: string;
  email: string;
}

interface EditBranchForm {
  branchName: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export default function BranchManagementPage() {
  const { addToast } = useToast();

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBranchForm>({
    branchCode: '', branchName: '', location: '', phone: '', email: '',
  });

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editBranchId, setEditBranchId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditBranchForm>({
    branchName: '', phone: '', email: '', isActive: true,
  });

  /* ─── Fetch ────────────────────────────────────────────── */

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get<{ data: BranchRow[] }>(apiRoutes.companyAdmin.branches.list);
      setBranches(res.data ?? []);
    } catch {
      addToast('Failed to load branches', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  /* ─── Filter ───────────────────────────────────────────── */

  const filtered = search
    ? branches.filter(
        (b) =>
          b.branchName.toLowerCase().includes(search.toLowerCase()) ||
          b.branchCode.toLowerCase().includes(search.toLowerCase()),
      )
    : branches;

  /* ——— Pagination ——————————————————————————————————— */

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paginatedBranches = pagination.paginateData(filtered);

  // Reset to page 1 when search changes
  useEffect(() => { pagination.goToPage(1); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Create ──────────────────────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.branchCode.trim() || !createForm.branchName.trim()) return;
    setCreateLoading(true);
    try {
      await api.post(apiRoutes.companyAdmin.branches.create, {
        branchCode: createForm.branchCode.trim(),
        branchName: createForm.branchName.trim(),
        location: createForm.location || undefined,
        phone: createForm.phone || undefined,
        email: createForm.email || undefined,
      });
      addToast('Branch created', 'success');
      setShowCreate(false);
      setCreateForm({ branchCode: '', branchName: '', location: '', phone: '', email: '' });
      fetchBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create branch';
      addToast(msg, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  /* ─── Edit ──────────────────────────────────────────────── */

  const openEdit = (branch: BranchRow) => {
    setEditBranchId(branch.id);
    setEditForm({
      branchName: branch.branchName,
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: branch.isActive,
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranchId) return;
    setEditLoading(true);
    try {
      await api.put(apiRoutes.companyAdmin.branches.update(editBranchId), editForm);
      addToast('Branch updated', 'success');
      setShowEdit(false);
      fetchBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update branch';
      addToast(msg, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  /* ─── Delete ───────────────────────────────────────────── */

  const handleDelete = async (branch: BranchRow) => {
    if (branch.userCount > 0) {
      return addToast(`Cannot delete — ${branch.userCount} user(s) assigned to this branch`, 'error');
    }
    if (!confirm(`Delete branch "${branch.branchName}"?`)) return;
    try {
      await api.delete(apiRoutes.companyAdmin.branches.delete(branch.id));
      addToast('Branch deleted', 'success');
      fetchBranches();
    } catch {
      addToast('Failed to delete branch', 'error');
    }
  };

  /* ─── Table Columns ──────────────────────────────────────── */

  const columns: Column<BranchRow>[] = [
    {
      key: 'branchCode',
      header: 'Code',
      sortable: true,
      accessor: (b) => (
        <span className="font-mono text-sm font-semibold text-gray-800 dark:text-white/90">
          {b.branchCode}
        </span>
      ),
    },
    {
      key: 'branchName',
      header: 'Branch Name',
      sortable: true,
      accessor: (b) => <span className="text-sm font-medium">{b.branchName}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: (b) => <span className="text-sm text-gray-500">{b.phone || '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      accessor: (b) => <span className="text-sm text-gray-500">{b.email || '—'}</span>,
    },
    {
      key: 'users',
      header: 'Users',
      sortable: true,
      accessor: (b) => (
        <Badge color={b.userCount > 0 ? 'primary' : 'gray'} size="sm">
          {b.userCount}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (b) => (
        <Badge color={b.isActive ? 'success' : 'error'} size="sm">
          {b.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      accessor: (b) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(b)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/10"
            title="Edit"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(b)}
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
      <PageMeta title="Branch Management" />
      <PageHeader
        title="Branch Management"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Settings', path: '/settings' },
          { label: 'Branches' },
        ]}
        actions={
          <Button onClick={() => setShowCreate(true)}>+ Add Branch</Button>
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <SearchBar value={search} onChange={setSearch} placeholder="Search branches..." />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} branch{filtered.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No branches found</p>
            <p className="mt-2 text-sm">Create your first branch to assign users.</p>
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={paginatedBranches} rowKey={(b) => String(b.id)} />
            <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                totalItems={filtered.length}
                pageSize={pagination.pageSize}
                onPageSizeChange={pagination.changePageSize}
              />
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          Create Branch Modal
          ═══════════════════════════════════════════════════════ */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Branch">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Branch Code</Label>
              <Input
                placeholder="e.g. BR001"
                value={createForm.branchCode}
                onChange={(e) => setCreateForm((p) => ({ ...p, branchCode: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label required>Branch Name</Label>
              <Input
                placeholder="e.g. Main Office"
                value={createForm.branchName}
                onChange={(e) => setCreateForm((p) => ({ ...p, branchName: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <Label>Location / Address</Label>
            <Input
              placeholder="e.g. 123 Main St, City"
              value={createForm.location}
              onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="e.g. +91 98765 43210"
                value={createForm.phone}
                onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="text"
                placeholder="e.g. branch@company.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createLoading}>Create Branch</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          Edit Branch Modal
          ═══════════════════════════════════════════════════════ */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Branch">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <Label required>Branch Name</Label>
            <Input
              value={editForm.branchName}
              onChange={(e) => setEditForm((p) => ({ ...p, branchName: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="text"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              />
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
    </>
  );
}
