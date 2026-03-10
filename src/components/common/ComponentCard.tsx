/**
 * ComponentCard Component
 * Wraps demo/page content sections with a titled card.
 */

import type { ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface ComponentCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ComponentCard({ title, description, children, className }: ComponentCardProps) {
  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]', className)}>
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
