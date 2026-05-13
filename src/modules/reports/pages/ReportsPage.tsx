/**
 * Reports Page — placeholder for future analytics/reporting module
 */

import { PageMeta, PageHeader } from '@/components/common';

export default function ReportsPage() {
  return (
    <>
      <PageMeta title="Reports" />
      <PageHeader
        title="Reports"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Reports' }]}
      />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">Reports Module</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          The reporting module is under development. Custom reports, scheduled exports, and analytics dashboards will be available here.
        </p>
      </div>
    </>
  );
}
