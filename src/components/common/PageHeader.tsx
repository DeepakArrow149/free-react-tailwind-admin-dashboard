/**
 * PageHeader Component
 * Standard page header with title, breadcrumb, and optional actions.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Breadcrumb trail */
  breadcrumbs?: BreadcrumbItem[];
  /** Right-side action buttons */
  actions?: ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mt-1.5">
            <ol className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((item, index) => (
                <li key={index} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {item.path ? (
                    <Link
                      to={item.path}
                      className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-brand-500 dark:text-brand-400">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
