/**
 * Input Component
 * Text input with validation states, icons, and hints.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/core/utils';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Success state */
  success?: boolean;
  /** Hint/error message */
  hint?: string;
  /** Left icon/addon */
  startAdornment?: React.ReactNode;
  /** Right icon/addon */
  endAdornment?: React.ReactNode;
}

const sizeStyles: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'h-9 text-xs px-3 py-1.5',
  md: 'h-11 text-sm px-4 py-2.5',
  lg: 'h-12 text-base px-4 py-3',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      error = false,
      success = false,
      hint,
      startAdornment,
      endAdornment,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const stateStyles = error
      ? 'border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500'
      : success
        ? 'border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:border-success-500'
        : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800';

    return (
      <div className="w-full">
        <div className="relative">
          {startAdornment && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {startAdornment}
            </span>
          )}

          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg border appearance-none shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30',
              sizeStyles[size],
              stateStyles,
              startAdornment && 'pl-10',
              endAdornment && 'pr-10',
              disabled && 'cursor-not-allowed opacity-40 bg-gray-100 dark:bg-gray-800',
              className
            )}
            {...props}
          />

          {endAdornment && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {endAdornment}
            </span>
          )}
        </div>

        {hint && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              error ? 'text-error-500' : success ? 'text-success-500' : 'text-gray-500'
            )}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
