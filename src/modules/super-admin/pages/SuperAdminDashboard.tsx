/**
 * Super Admin Dashboard
 * Overview of all companies, subscriptions, and platform stats.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { PageMeta, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';
import type { Company } from '@/types/tenant';

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalSubscriptions: number;
}

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
    totalSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<{ data: Company[] }>(apiRoutes.company.list);
      const list = res.data ?? [];
      setCompanies(list);
      setStats({
        totalCompanies: list.length,
        activeCompanies: list.filter((c) => c.status === 'active').length,
        suspendedCompanies: list.filter((c) => c.status === 'suspended').length,
        totalSubscriptions: list.length,
      });
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Companies', value: stats.totalCompanies, color: 'text-brand-500' },
    { label: 'Active', value: stats.activeCompanies, color: 'text-success-500' },
    { label: 'Suspended', value: stats.suspendedCompanies, color: 'text-warning-500' },
    { label: 'Subscriptions', value: stats.totalSubscriptions, color: 'text-blue-500' },
  ];

  const statusColor: Record<string, 'success' | 'warning' | 'error'> = {
    active: 'success',
    suspended: 'warning',
    inactive: 'error',
    deleted: 'error',
  };

  return (
    <>
      <PageMeta title="Super Admin Dashboard" />
      <PageHeader
        title="Platform Overview"
        breadcrumbs={[{ label: 'Super Admin' }, { label: 'Dashboard' }]}
        actions={
          <Link
            to="/super-admin/companies/create"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            + New Company
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Companies */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Companies
          </h3>
          <Link
            to="/super-admin/companies"
            className="text-sm text-brand-500 hover:text-brand-600"
          >
            View All
          </Link>
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Database</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {companies.slice(0, 10).map((company) => (
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
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{company.databaseName}</td>
                    <td className="px-6 py-4">
                      <Badge color={statusColor[company.status] ?? 'warning'} size="sm">
                        {company.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No companies yet. Create your first company to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
