/**
 * Radio Component
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/core/utils';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className={cn('inline-flex items-center gap-2 cursor-pointer', className)}>
        <input
          ref={ref}
          type="radio"
          className="h-4.5 w-4.5 border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
          {...props}
        />
        {label && (
          <span className="text-sm text-gray-700 dark:text-gray-400">{label}</span>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
