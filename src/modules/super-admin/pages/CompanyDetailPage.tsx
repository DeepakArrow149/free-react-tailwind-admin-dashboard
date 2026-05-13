/**
 * Company Detail Page — Super Admin
 * Displays company info, subscription, and tenant stats.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { PageMeta, PageHeader } from '@/components/common';
import { Button, Badge } from '@/components/ui';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';
import type { CompanyDetail } from '@/types/tenant';

const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
  active: 'success',
  suspended: 'warning',
  inactive: 'error',
  deleted: 'error',
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [stats, setStats] = useState<{ userCount: number; branchCount: number; orderCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchCompany(id);
  }, [id]);

  const fetchCompany = async (companyId: string) => {
    try {
      setError(null);
      // Stats are embedded in the detail response (data.stats.userCount / data.stats.branchCount)
      const companyRes = await api.get<{ data: CompanyDetail }>(
        apiRoutes.company.detail(companyId),
      );
      const data = companyRes.data;
      setCompany(data);
      setStats({
        userCount: data.stats?.userCount ?? 0,
        branchCount: data.stats?.branchCount ?? 0,
        orderCount: 0,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load company details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      setError(null);
      await api.patch(apiRoutes.company.updateStatus(id), { status: newStatus });
      fetchCompany(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update company status';
      setError(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="py-24 text-center text-gray-500">
        {error ? (
          <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        ) : (
          <>Company not found.{' '}<Link to="/super-admin/companies" className="text-brand-500">Go back</Link></>
        )}
      </div>
    );
  }

  const infoRows = [
    { label: 'Company Code', value: company.companyCode },
    { label: 'Database', value: company.databaseName },
    { label: 'Created', value: new Date(company.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <PageMeta title={`${company.companyName} — Company`} />
      <PageHeader
        title={company.companyName}
        breadcrumbs={[
          { label: 'Super Admin', path: '/super-admin' },
          { label: 'Companies', path: '/super-admin/companies' },
          { label: company.companyName },
        ]}
        actions={
          <div className="flex gap-2">
            {company.status === 'active' && (
              <Button variant="outline" onClick={() => handleStatusChange('suspended')}>
                Suspend
              </Button>
            )}
            {company.status === 'suspended' && (
              <Button onClick={() => handleStatusChange('active')}>
                Activate
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company Info */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Company Information
              </h3>
              <Badge color={statusColors[company.status] ?? 'warning'}>
                {company.status}
              </Badge>
            </div>

            <div className="space-y-3">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="w-40 text-sm font-medium text-gray-500">{row.label}</span>
                  <span className="text-sm text-gray-800 dark:text-white/90">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          {stats && (
            <>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="mt-1 text-2xl font-bold text-brand-500">{stats.userCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                <p className="text-sm text-gray-500">Branches</p>
                <p className="mt-1 text-2xl font-bold text-success-500">{stats.branchCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                <p className="text-sm text-gray-500">Orders</p>
                <p className="mt-1 text-2xl font-bold text-blue-500">{stats.orderCount}</p>
              </div>
            </>
          )}

          {/* Subscription */}
          {company.subscription && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subscription
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-medium capitalize text-gray-800 dark:text-white/90">
                    {company.subscription.plan}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Users</span>
                  <span className="text-gray-800 dark:text-white/90">
                    {company.subscription.maxUsers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Branches</span>
                  <span className="text-gray-800 dark:text-white/90">
                    {company.subscription.maxBranches}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
