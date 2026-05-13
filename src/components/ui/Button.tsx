/**
 * Button Component
 * Fully typed, configurable button with variant, size, and icon support.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Icon before text */
  startIcon?: ReactNode;
  /** Icon after text */
  endIcon?: ReactNode;
  /** Show loading spinner */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 focus:ring-brand-500/20 disabled:bg-brand-300',
  secondary:
    'bg-gray-100 text-gray-700 shadow-theme-xs hover:bg-gray-200 focus:ring-gray-500/20 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
  outline:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]',
  ghost:
    'text-gray-700 hover:bg-gray-100 focus:ring-gray-500/20 dark:text-gray-400 dark:hover:bg-gray-800',
  danger:
    'bg-error-500 text-white shadow-theme-xs hover:bg-error-600 focus:ring-error-500/20 disabled:bg-error-300',
  success:
    'bg-success-500 text-white shadow-theme-xs hover:bg-success-600 focus:ring-success-500/20 disabled:bg-success-300',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      startIcon,
      endIcon,
      loading = false,
      fullWidth = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-hidden focus:ring-3',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'cursor-not-allowed opacity-50',
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          startIcon && <span className="flex items-center">{startIcon}</span>
        )}
        {children}
        {endIcon && <span className="flex items-center">{endIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
