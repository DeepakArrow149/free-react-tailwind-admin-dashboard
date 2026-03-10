/**
 * Dashboard Home Page
 * Example module page demonstrating the template's page structure.
 */

import { PageHeader } from '@/components/common';
import { PageMeta } from '@/components/common';

export default function DashboardHome() {
  return (
    <>
      <PageMeta title="Dashboard" description="Dashboard overview" />
      <PageHeader
        title="Dashboard"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Dashboard' },
        ]}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Users" value="3,782" change="+11.01%" positive />
        <MetricCard title="Total Orders" value="5,359" change="+9.15%" positive />
        <MetricCard title="Revenue" value="$45,200" change="-1.48%" positive={false} />
        <MetricCard title="Conversion" value="2.45%" change="+0.24%" positive />
      </div>

      {/* Content area */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Monthly Overview
            </h3>
            <div className="flex h-64 items-center justify-center text-gray-400">
              <p>Chart component placeholder — integrate your preferred chart library here.</p>
            </div>
          </div>
        </div>
        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {['Order #1234 completed', 'New user registered', 'Report generated', 'System update applied'].map(
                (activity, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                    {activity}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Metric Card Sub-component ──────────────────────────

function MetricCard({
  title,
  value,
  change,
  positive,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <div className="mt-2 flex items-end justify-between">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h4>
        <span
          className={`text-sm font-medium ${
            positive ? 'text-success-500' : 'text-error-500'
          }`}
        >
          {change}
        </span>
      </div>
    </div>
  );
}
