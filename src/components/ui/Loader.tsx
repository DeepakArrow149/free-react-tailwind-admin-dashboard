/**
 * Loader / Spinner Component
 */

import { cn } from '@/core/utils';

export interface LoaderProps {
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
  /** Full page overlay */
  fullPage?: boolean;
}

const sizeStyles: Record<NonNullable<LoaderProps['size']>, string> = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function Loader({ size = 'md', className, fullPage = false }: LoaderProps) {
  const spinner = (
    <svg
      className={cn('animate-spin text-brand-500', sizeStyles[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-99999 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      {spinner}
    </div>
  );
}
