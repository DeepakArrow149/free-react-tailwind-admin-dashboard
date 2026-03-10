/**
 * ConfirmationDialog Component
 * Modal dialog for confirming destructive or important actions.
 */

import { type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmationDialogProps {
  /** Whether dialog is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm action handler */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  variant?: 'danger' | 'primary' | 'success';
  /** Loading state */
  loading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmationDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="p-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
