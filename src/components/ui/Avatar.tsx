/**
 * Avatar Component
 * Display user profile images with fallback initials.
 */

import { cn, getInitials } from '@/core/utils';

export interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text / name for initials fallback */
  alt: string;
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show online/offline indicator */
  status?: 'online' | 'offline' | 'away' | 'busy';
  /** Additional class names */
  className?: string;
}

const sizeStyles: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusColors: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-success-500',
  offline: 'bg-gray-400',
  away: 'bg-warning-500',
  busy: 'bg-error-500',
};

export function Avatar({ src, alt, size = 'md', status, className }: AvatarProps) {
  return (
    <div className={cn('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            'rounded-full object-cover',
            sizeStyles[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400',
            sizeStyles[size]
          )}
        >
          {getInitials(alt)}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900',
            statusColors[status],
            size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
          )}
        />
      )}
    </div>
  );
}
