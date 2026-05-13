/**
 * Settings Hub — Navigation cards to all settings sub-pages.
 */

import { Link } from 'react-router';
import { PageMeta, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui';

interface SettingsCard {
  title: string;
  description: string;
  path: string;
  icon: string;
  badge?: string;
}

const cards: SettingsCard[] = [
  {
    title: 'User Management',
    description: 'Create, edit, and manage company users. Assign roles and branches.',
    path: '/settings/users',
    icon: '👤',
  },
  {
    title: 'Role Builder',
    description: 'Define roles and configure module-level permissions with a visual matrix.',
    path: '/settings/roles',
    icon: '🛡️',
  },
  {
    title: 'Branch Management',
    description: 'Add and manage company branches, locations, and contact details.',
    path: '/settings/branches',
    icon: '🏢',
  },
  {
    title: 'Approval Workflows',
    description: 'Configure multi-level approval chains for purchase orders, invoices, and more.',
    path: '/settings/approvals',
    icon: '✅',
  },
  {
    title: 'Notifications',
    description: 'Manage email, push, and in-app notification preferences.',
    path: '/settings/notifications',
    icon: '🔔',
  },
  {
    title: 'Audit Logs',
    description: 'View a complete activity trail of user actions and system events.',
    path: '/settings/audit-logs',
    icon: '📋',
  },
  {
    title: 'Excel Import',
    description: 'Bulk import master data, orders, and inventory from Excel spreadsheets.',
    path: '/settings/excel-import',
    icon: '📊',
  },
  {
    title: 'Email Templates',
    description: 'Create and manage templates for automated email notifications.',
    path: '/settings/email-templates',
    icon: '📧',
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageMeta title="Settings" />
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-500"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {card.title}
              </h3>
              {card.badge && (
                <Badge color="info">{card.badge}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {card.description}
            </p>
            <span className="mt-3 inline-flex items-center text-sm font-medium text-brand-500 group-hover:text-brand-600 dark:text-brand-400">
              {card.badge ? 'Coming soon' : 'Manage'} →
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
