/**
 * Label Component
 * Form field label with required indicator support.
 */

import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}
