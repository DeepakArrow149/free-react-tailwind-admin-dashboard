import { useState, useCallback } from 'react';

/**
 * Hook for managing boolean state (modals, dialogs, dropdowns)
 */
export function useToggle(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle } as const;
}
