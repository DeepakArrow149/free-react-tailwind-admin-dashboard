/**
 * Select Component
 * Styled select dropdown with controlled and uncontrolled support.
 */

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/core/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  hint?: string;
}

const sizeStyles: Record<NonNullable<SelectProps['size']>, string> = {
  sm: 'h-9 text-xs px-3 py-1.5 pr-9',
  md: 'h-11 text-sm px-4 py-2.5 pr-11',
  lg: 'h-12 text-base px-4 py-3 pr-11',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, size = 'md', error, hint, disabled, className, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full appearance-none rounded-lg border shadow-theme-xs bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90',
            sizeStyles[size],
            error
              ? 'border-error-500 focus:border-error-300 focus:ring-error-500/20'
              : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800',
            disabled && 'cursor-not-allowed opacity-40 bg-gray-100 dark:bg-gray-800',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {hint && (
          <p className={cn('mt-1.5 text-xs', error ? 'text-error-500' : 'text-gray-500')}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
