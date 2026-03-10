/**
 * Badge Component
 * Display status indicators, labels, and counts.
 */

import type { ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface BadgeProps {
  children: ReactNode;
  /** Visual variant */
  variant?: 'light' | 'solid';
  /** Size */
  size?: 'sm' | 'md';
  /** Color scheme */
  color?: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'gray';
  /** Additional class names */
  className?: string;
}

const colorMap: Record<
  NonNullable<BadgeProps['color']>,
  { light: string; solid: string }
> = {
  primary: {
    light: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    solid: 'bg-brand-500 text-white',
  },
  success: {
    light: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400',
    solid: 'bg-success-500 text-white',
  },
  error: {
    light: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400',
    solid: 'bg-error-500 text-white',
  },
  warning: {
    light: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
    solid: 'bg-warning-500 text-white',
  },
  info: {
    light: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400',
    solid: 'bg-blue-light-500 text-white',
  },
  gray: {
    light: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    solid: 'bg-gray-500 text-white',
  },
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'light',
  size = 'sm',
  color = 'primary',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colorMap[color][variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
