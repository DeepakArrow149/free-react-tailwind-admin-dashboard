/**
 * Alert Component
 * Contextual feedback messages with variant support.
 */

import { useState, type ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface AlertProps {
  /** Alert content */
  children: ReactNode;
  /** Visual variant */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Optional title */
  title?: string;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Callback on dismiss */
  onDismiss?: () => void;
  /** Additional class names */
  className?: string;
}

const variantStyles: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'border-blue-light-500 bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400 dark:border-blue-light-500/30',
  success: 'border-success-500 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/30',
  warning: 'border-warning-500 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/30',
  error: 'border-error-500 bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/30',
};

export function Alert({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-lg border-l-4 p-4',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title && (
            <h5 className="mb-1 font-semibold text-sm">{title}</h5>
          )}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-auto rounded-md p-1 hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
