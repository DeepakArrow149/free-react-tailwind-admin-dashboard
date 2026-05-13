/**
 * App Store
 * Global application state.
 */

import { create } from 'zustand';

interface AppState {
  /** Global loading overlay */
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  /** Page title (for dynamic updates) */
  pageTitle: string;
  setPageTitle: (title: string) => void;

  /** Notification count */
  notificationCount: number;
  setNotificationCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  pageTitle: '',
  setPageTitle: (title) => set({ pageTitle: title }),

  notificationCount: 0,
  setNotificationCount: (count) => set({ notificationCount: count }),
}));
