/**
 * Branch Management Page
 * CRUD for company branches / units.
 */

import { useState, useEffect, useMemo } from 'react';
import { PageMeta, PageHeader } from '@/components/common';
import { Button, Badge, Modal } from '@/components/ui';
import { Input, Label } from '@/components/form';
import { SearchBar, Pagination } from '@/components/table';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';
import type { Branch, CreateBranchPayload } from '@/types/tenant';

export default function BranchListPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState<CreateBranchPayload>({
    branchName: '',
    branchCode: '',
    location: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get<{ data: Branch[] }>(apiRoutes.branch.list);
      setBranches(res.data ?? []);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return branches;
    const q = search.toLowerCase();
    return branches.filter(
      (b) =>
        b.branchName.toLowerCase().includes(q) ||
        b.branchCode.toLowerCase().includes(q),
    );
  }, [search, branches]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post(apiRoutes.branch.create, form);
      setShowCreate(false);
      setForm({ branchName: '', branchCode: '', location: '' });
      fetchBranches();
    } catch {
      // handle
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to deactivate this branch?')) return;
    try {
      await api.delete(apiRoutes.branch.delete(id));
      fetchBranches();
    } catch {
      // handle
    }
  };

  return (
    <>
      <PageMeta title="Branches" />
      <PageHeader
        title="Branches"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Branches' }]}
        actions={<Button onClick={() => setShowCreate(true)}>+ Add Branch</Button>}
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <SearchBar value={search} onChange={setSearch} placeholder="Search branches..." />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Branch Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginated.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white/90">
                      {branch.branchName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{branch.branchCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{branch.location || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{branch.userCount ?? 0}</td>
                    <td className="px-6 py-4">
                      <Badge color={branch.isActive ? 'success' : 'error'} size="sm">
                        {branch.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(branch.id)}
                        className="text-gray-500 hover:text-error-500 dark:text-gray-400"
                        title="Deactivate"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {search ? 'No branches match your search.' : 'No branches found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > pageSize && (
          <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filtered.length / pageSize)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New Branch">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label required>Branch Name</Label>
            <Input
              placeholder="e.g. Main Factory"
              value={form.branchName}
              onChange={(e) => setForm((p) => ({ ...p, branchName: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label required>Branch Code</Label>
            <Input
              placeholder="e.g. MAIN"
              value={form.branchCode}
              onChange={(e) => setForm((p) => ({ ...p, branchCode: e.target.value.toUpperCase() }))}
              required
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              placeholder="Branch location (optional)"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createLoading}>
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
