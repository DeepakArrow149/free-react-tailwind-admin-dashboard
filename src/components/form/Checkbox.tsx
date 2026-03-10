/**
 * Checkbox Component
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className={cn('inline-flex items-center gap-2 cursor-pointer', className)}>
        <input
          ref={ref}
          type="checkbox"
          className="h-4.5 w-4.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
          {...props}
        />
        {label && (
          <span className="text-sm text-gray-700 dark:text-gray-400">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
