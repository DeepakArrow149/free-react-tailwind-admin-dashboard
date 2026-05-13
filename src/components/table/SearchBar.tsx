/**
 * SearchBar Component
 * Search input with keyboard shortcut support.
 */

import { useRef, useEffect, useState } from 'react';
import { cn, debounce } from '@/core/utils';

export interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  shortcut?: boolean;
  className?: string;
}

export function SearchBar({
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  shortcut = true,
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) setInternalValue(controlledValue);
  }, [controlledValue]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    if (!shortcut) return;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [shortcut]);

  // Debounced onChange
  useEffect(() => {
    const debouncedFn = debounce(() => onChange(internalValue), debounceMs);
    debouncedFn();
  }, [internalValue, debounceMs, onChange]);

  return (
    <div className={cn('relative', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-10 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
      />
      {shortcut && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          <span>⌘</span>
          <span>K</span>
        </span>
      )}
    </div>
  );
}
