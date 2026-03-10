/**
 * TextArea Component
 */

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/core/utils';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ error, hint, disabled, className, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 min-h-[120px]',
            error
              ? 'border-error-500 focus:border-error-300 focus:ring-error-500/20'
              : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800',
            disabled && 'cursor-not-allowed opacity-40 bg-gray-100 dark:bg-gray-800',
            className
          )}
          {...props}
        />
        {hint && (
          <p className={cn('mt-1.5 text-xs', error ? 'text-error-500' : 'text-gray-500')}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
