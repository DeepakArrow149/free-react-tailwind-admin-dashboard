/**
 * Reports Page - Example analytics / reporting module
 */

import { PageMeta, PageHeader, ComponentCard } from '@/components/common';
import { Button, Badge } from '@/components/ui';

const SAMPLE_REPORTS = [
  { id: '1', name: 'Monthly Revenue', type: 'Financial', status: 'ready', generatedAt: '2024-01-15' },
  { id: '2', name: 'User Growth', type: 'Analytics', status: 'ready', generatedAt: '2024-01-14' },
  { id: '3', name: 'Production Output', type: 'Operations', status: 'processing', generatedAt: '2024-01-14' },
  { id: '4', name: 'Quality Inspection', type: 'QA', status: 'ready', generatedAt: '2024-01-13' },
  { id: '5', name: 'Inventory Summary', type: 'Operations', status: 'error', generatedAt: '2024-01-12' },
];

export default function ReportsPage() {
  return (
    <>
      <PageMeta title="Reports" />
      <PageHeader
        title="Reports"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Reports' }]}
        actions={
          <Button>
            + Generate Report
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Reports</p>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">128</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Generated This Month</p>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">24</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">6</p>
          </div>
        </div>

        {/* Report List */}
        <ComponentCard title="Recent Reports">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {SAMPLE_REPORTS.map((report) => (
              <div key={report.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
                    <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white/90">{report.name}</p>
                    <p className="text-xs text-gray-500">{report.type} &middot; {report.generatedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    color={report.status === 'ready' ? 'success' : report.status === 'processing' ? 'warning' : 'error'}
                    size="sm"
                  >
                    {report.status}
                  </Badge>
                  <Button variant="outline" size="sm" disabled={report.status !== 'ready'}>
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
