/**
 * Toast Notification System
 * Lightweight toast with auto-dismiss support.
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { cn, generateId } from '@/core/utils';
import { TOAST_DURATION } from '@/core/constants';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration: number = TOAST_DURATION.MEDIUM) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Toast Container ────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-999999 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const toastVariantStyles: Record<ToastVariant, string> = {
  success: 'border-success-500 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
  error: 'border-error-500 bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400',
  warning: 'border-warning-500 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  info: 'border-blue-light-500 bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || TOAST_DURATION.MEDIUM);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 shadow-theme-md min-w-72 max-w-96 animate-in slide-in-from-right',
        toastVariantStyles[toast.variant]
      )}
    >
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded p-0.5 hover:opacity-70"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
