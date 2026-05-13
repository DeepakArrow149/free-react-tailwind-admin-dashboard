/**
 * PopupModal Store — Global state & imperative API for the popup modal.
 *
 * Usage from ANY component or utility:
 *
 *   import { openPopup, closePopup } from '@/components/ui';
 *
 *   // Simple alert
 *   openPopup({ title: 'Done!', message: 'Record saved successfully.', variant: 'success' });
 *
 *   // Confirmation with action
 *   openPopup({
 *     title: 'Delete record?',
 *     message: 'This action cannot be undone.',
 *     variant: 'danger',
 *     confirmText: 'Delete',
 *     onConfirm: () => deleteRecord(id),
 *   });
 *
 *   // Custom JSX body
 *   openPopup({
 *     title: 'User Details',
 *     body: <UserCard user={user} />,
 *     size: 'lg',
 *   });
 *
 *   // Form inside popup — keep open until manual close
 *   openPopup({
 *     title: 'Edit Profile',
 *     body: <EditProfileForm onDone={() => closePopup()} />,
 *     showFooter: false,
 *   });
 */

import { type ReactNode } from 'react';
import { create } from 'zustand';
import type { ModalProps } from './Modal';

// ─── Types ──────────────────────────────────────────────────

export type PopupVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

export interface PopupOptions {
  /** Popup title */
  title: string;
  /** Simple text message (ignored if `body` is provided) */
  message?: string;
  /** Custom JSX body — overrides `message` */
  body?: ReactNode;
  /** Modal size */
  size?: ModalProps['size'];
  /** Visual variant — affects confirm button color & icon */
  variant?: PopupVariant;
  /** Show the footer with action buttons (default: true) */
  showFooter?: boolean;
  /** Confirm button label */
  confirmText?: string;
  /** Cancel button label */
  cancelText?: string;
  /** Called when confirm is clicked — popup auto-closes after unless it returns `false` */
  onConfirm?: () => void | boolean | Promise<void | boolean>;
  /** Called when cancel / close is clicked */
  onCancel?: () => void;
  /** Show the close (×) button */
  showCloseButton?: boolean;
  /** Close when clicking the backdrop */
  closeOnBackdrop?: boolean;
}

export interface PopupState {
  isOpen: boolean;
  options: PopupOptions | null;
  loading: boolean;
  open: (opts: PopupOptions) => void;
  close: () => void;
  setLoading: (v: boolean) => void;
}

// ─── Store ──────────────────────────────────────────────────

export const usePopupStore = create<PopupState>((set) => ({
  isOpen: false,
  options: null,
  loading: false,

  open: (opts) => set({ isOpen: true, options: opts, loading: false }),
  close: () => set({ isOpen: false, options: null, loading: false }),
  setLoading: (v) => set({ loading: v }),
}));

// ─── Imperative API ─────────────────────────────────────────

/** Open the global popup modal from anywhere */
export const openPopup = (opts: PopupOptions): void => {
  usePopupStore.getState().open(opts);
};

/** Close the global popup modal */
export const closePopup = (): void => {
  usePopupStore.getState().close();
};
