/**
 * Company List Page — Super Admin
 * Full CRUD management of tenant companies.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { PageMeta, PageHeader } from '@/components/common';
import { Button, Badge, Modal } from '@/components/ui';
import { SearchBar, Pagination } from '@/components/table';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';
import type { Company } from '@/types/tenant';

const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
  active: 'success',
  suspended: 'warning',
  inactive: 'error',
  deleted: 'error',
};

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusModal, setStatusModal] = useState<{ open: boolean; company?: Company; newStatus: string }>({
    open: false,
    newStatus: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await api.get<{ data: Company[] }>(apiRoutes.company.list);
      setCompanies(res.data ?? []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.companyCode.toLowerCase().includes(q),
    );
  }, [search, companies]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleStatusChange = async () => {
    if (!statusModal.company) return;
    try {
      await api.patch(apiRoutes.company.updateStatus(statusModal.company.id), {
        status: statusModal.newStatus,
      });
      setStatusModal({ open: false, newStatus: '' });
      fetchCompanies();
    } catch {
      // handle error
    }
  };

  return (
    <>
      <PageMeta title="Companies" />
      <PageHeader
        title="Companies"
        breadcrumbs={[
          { label: 'Super Admin', path: '/super-admin' },
          { label: 'Companies' },
        ]}
        actions={
          <Link to="/super-admin/companies/create">
            <Button>+ New Company</Button>
          </Link>
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <SearchBar value={search} onChange={setSearch} placeholder="Search companies..." />
          <p className="text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
          </p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Company Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Database</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginated.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <Link
                        to={`/super-admin/companies/${company.id}`}
                        className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90"
                      >
                        {company.companyName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{company.companyCode}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-500">{company.databaseName}</td>
                    <td className="px-6 py-4">
                      <Badge color={statusColors[company.status] ?? 'warning'} size="sm">
                        {company.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/super-admin/companies/${company.id}`}
                          className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
                          title="View Details"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        {company.status === 'active' ? (
                          <button
                            onClick={() => setStatusModal({ open: true, company, newStatus: 'suspended' })}
                            className="text-gray-500 hover:text-warning-500 dark:text-gray-400"
                            title="Suspend"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : company.status === 'suspended' ? (
                          <button
                            onClick={() => setStatusModal({ open: true, company, newStatus: 'active' })}
                            className="text-gray-500 hover:text-success-500 dark:text-gray-400"
                            title="Activate"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {search ? 'No companies match your search.' : 'No companies found.'}
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

      {/* Status Change Modal */}
      <Modal
        isOpen={statusModal.open}
        onClose={() => setStatusModal({ open: false, newStatus: '' })}
        title={`${statusModal.newStatus === 'active' ? 'Activate' : 'Suspend'} Company`}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to {statusModal.newStatus === 'active' ? 'activate' : 'suspend'}{' '}
            <strong>{statusModal.company?.companyName}</strong>?
          </p>
          {statusModal.newStatus === 'suspended' && (
            <p className="text-sm text-warning-500">
              Suspending a company will prevent all its users from logging in.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStatusModal({ open: false, newStatus: '' })}>
              Cancel
            </Button>
            <Button
              variant={statusModal.newStatus === 'active' ? 'primary' : 'danger'}
              onClick={handleStatusChange}
            >
              {statusModal.newStatus === 'active' ? 'Activate' : 'Suspend'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
