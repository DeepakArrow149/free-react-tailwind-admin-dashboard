/**
 * Create Company Page — Super Admin
 * Creates a new tenant company with automatic DB provisioning.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PageMeta, PageHeader } from '@/components/common';
import { Button } from '@/components/ui';
import { Input, Label } from '@/components/form';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';

export default function CreateCompanyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    companyCode: '',
    companyName: '',
    adminPassword: '',
    plan: 'standard' as 'basic' | 'standard' | 'enterprise',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate
    if (!/^[a-z0-9_]+$/.test(form.companyCode)) {
      setError('Company code must contain only lowercase letters, numbers, and underscores.');
      return;
    }

    if (form.companyCode.length < 2 || form.companyCode.length > 30) {
      setError('Company code must be between 2 and 30 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: { companyCode: string; companyName: string; databaseName: string; defaultAdmin: string };
      }>(apiRoutes.company.create, form);

      setSuccess(
        `Company "${res.data.companyName}" created successfully! ` +
        `Default admin: ${res.data.defaultAdmin}`
      );

      setTimeout(() => navigate('/super-admin/companies'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create company.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Create Company" />
      <PageHeader
        title="Create New Company"
        breadcrumbs={[
          { label: 'Super Admin', path: '/super-admin' },
          { label: 'Companies', path: '/super-admin/companies' },
          { label: 'Create' },
        ]}
      />

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label required>Company Code</Label>
                <Input
                  placeholder="e.g. abc, mfg_corp"
                  value={form.companyCode}
                  onChange={(e) => handleChange('companyCode', e.target.value.toLowerCase())}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  Used for login (user@{form.companyCode || 'code'}) and database name
                </p>
              </div>
              <div>
                <Label required>Company Name</Label>
                <Input
                  placeholder="ABC Manufacturing Ltd"
                  value={form.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Default Admin User
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label>Admin Email</Label>
                  <Input
                    value={`admin@${form.companyCode || 'code'}`}
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Auto-generated from company code
                  </p>
                </div>
                <div>
                  <Label required>Admin Password</Label>
                  <Input
                    type="password"
                    placeholder="Strong password for the company admin"
                    value={form.adminPassword}
                    onChange={(e) => handleChange('adminPassword', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subscription Plan
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(['basic', 'standard', 'enterprise'] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => handleChange('plan', plan)}
                    className={`rounded-lg border-2 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                      form.plan === plan
                        ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {plan}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Company
              </Button>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <h4 className="mb-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            What happens when you create a company?
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-600 dark:text-blue-400">
            <li>A new database is created for the company ({form.companyCode || 'code'}_company_db)</li>
            <li>Default tables are provisioned (users, roles, branches, etc.)</li>
            <li>5 default roles are created (Company Admin, Manager, Planner, Supervisor, Operator)</li>
            <li>A default HQ branch is created</li>
            <li>The admin user (admin@{form.companyCode || 'code'}) is seeded</li>
          </ul>
        </div>
      </div>
    </>
  );
}
