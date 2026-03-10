/**
 * Switch / Toggle Component
 */

import { cn } from '@/core/utils';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className,
}: SwitchProps) {
  const handleToggle = () => {
    if (!disabled) onChange?.(!checked);
  };

  const trackSize = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knobSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const knobTranslate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <label
      className={cn(
        'inline-flex items-center gap-3 select-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200',
          trackSize,
          checked
            ? 'bg-brand-500'
            : 'bg-gray-200 dark:bg-white/10'
        )}
      >
        <span
          className={cn(
            'inline-block transform rounded-full bg-white shadow-theme-sm transition-transform duration-200',
            knobSize,
            'mt-0.5 ml-0.5',
            checked ? knobTranslate : 'translate-x-0'
          )}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
          {label}
        </span>
      )}
    </label>
  );
}
