/**
 * PopupModal — Global reusable popup modal component.
 *
 * Place <PopupModalRoot /> once in your App layout.
 * Use openPopup() / closePopup() from popupModalStore to control it.
 */

import { type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { usePopupStore, type PopupVariant } from './popupModalStore';

// ─── Variant Configs ────────────────────────────────────────

const variantConfig: Record<PopupVariant, { icon: ReactNode; btnVariant: 'primary' | 'danger' | 'success' | 'outline'; iconBg: string }> = {
  default: {
    icon: (
      <svg className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
    btnVariant: 'primary',
    iconBg: 'bg-brand-50 dark:bg-brand-500/10',
  },
  success: {
    icon: (
      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    btnVariant: 'success',
    iconBg: 'bg-green-50 dark:bg-green-500/10',
  },
  danger: {
    icon: (
      <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
    btnVariant: 'danger',
    iconBg: 'bg-red-50 dark:bg-red-500/10',
  },
  warning: {
    icon: (
      <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.54 20h18.92a1 1 0 00.85-1.28l-8.6-14.86a1 1 0 00-1.72 0z" />
      </svg>
    ),
    btnVariant: 'primary',
    iconBg: 'bg-yellow-50 dark:bg-yellow-500/10',
  },
  info: {
    icon: (
      <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
    btnVariant: 'primary',
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
  },
};

// ─── Root Component (mount once in App) ─────────────────────

export function PopupModalRoot() {
  const { isOpen, options, loading, close, setLoading } = usePopupStore();

  if (!isOpen || !options) return null;

  const {
    title,
    message,
    body,
    size = 'sm',
    variant = 'default',
    showFooter = true,
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    showCloseButton = true,
    closeOnBackdrop = true,
  } = options;

  const hasConfirmAction = !!onConfirm;
  const cfg = variantConfig[variant];

  const handleClose = () => {
    onCancel?.();
    close();
  };

  const handleConfirm = async () => {
    if (!onConfirm) {
      close();
      return;
    }
    setLoading(true);
    try {
      const result = await onConfirm();
      // If onConfirm returns false, keep the popup open
      if (result !== false) {
        close();
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size={size}
      showCloseButton={showCloseButton}
      closeOnBackdrop={closeOnBackdrop}
      title={title}
    >
      <div className="p-5 sm:p-6">
        {/* Header with icon */}
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.iconBg}`}>
            {cfg.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {/* Body / Message */}
            {body ? (
              <div className="mt-2">{body}</div>
            ) : message ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="mt-6 flex items-center justify-end gap-3">
            {hasConfirmAction && (
              <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
                {cancelText}
              </Button>
            )}
            <Button
              variant={cfg.btnVariant}
              size="sm"
              onClick={handleConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
