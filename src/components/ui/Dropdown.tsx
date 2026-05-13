/**
 * Dropdown Component
 * Accessible dropdown menu with configurable items.
 */

import { useRef, useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface DropdownProps {
  /** Trigger element */
  trigger: ReactNode;
  /** Dropdown content */
  children: ReactNode;
  /** Alignment relative to trigger */
  align?: 'left' | 'right';
  /** Additional class names for dropdown panel */
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-9999 mt-2 min-w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger = false,
  className,
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        danger
          ? 'text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5',
        className
      )}
    >
      {icon && <span className="flex h-5 w-5 items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
}
