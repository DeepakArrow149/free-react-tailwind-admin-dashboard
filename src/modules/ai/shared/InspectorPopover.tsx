/**
 * Inspector Popover
 *
 * A small pill trigger that toggles a popover anchored above it. Used by
 * "what context is being sent to the AI" inspectors in each domain's
 * drawer — the wrapper logic (click-outside, Escape, chevron rotation,
 * aria-expanded coercion, popover positioning) is identical; only the
 * trigger label and body content vary.
 *
 * Caller passes:
 *  - `label`: the pill content (typically icon + summary text).
 *  - `children`: the popover body — render whatever per-domain inspector UI.
 *  - `title` / `dialogLabel`: a11y annotations.
 */

import React, { useEffect, useRef, useState } from 'react';

export interface InspectorPopoverProps {
  /** Pill content shown on the trigger button. Usually icon + summary text. */
  label: React.ReactNode;
  /** Hover tooltip for the trigger. */
  title?: string;
  /** Accessible name for the popover dialog. */
  dialogLabel?: string;
  /** Popover body. */
  children: React.ReactNode;
}

export const InspectorPopover: React.FC<InspectorPopoverProps> = ({
  label,
  title,
  dialogLabel,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click outside or Escape closes the popover.
  useEffect(() => {
    if (!open) return;
    const handleMouse = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMouse);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouse);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Linter wants a literal-string union for aria-expanded.
  const ariaExpanded: 'true' | 'false' = open ? 'true' : 'false';

  return (
    <div className="relative mx-3 mb-2" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={title}
        aria-expanded={ariaExpanded}
        className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border transition-colors ${
          open
            ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-300'
        }`}
      >
        {label}
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={dialogLabel}
          className="absolute bottom-full left-0 right-0 mb-1.5 max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3 text-[11px] z-20 animate-fade-in-up"
        >
          {children}
        </div>
      )}
    </div>
  );
};
