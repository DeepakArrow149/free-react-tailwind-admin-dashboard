/**
 * Application Configuration
 * Central configuration for the entire application.
 */

import { env } from './env';

export interface AppConfig {
  /** Application metadata */
  app: {
    title: string;
    version: string;
    description: string;
  };

  /** API configuration */
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  /** Authentication configuration */
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    loginPath: string;
    defaultRedirect: string;
    tokenRefreshThreshold: number; // minutes before expiry to refresh
  };

  /** Pagination defaults */
  pagination: {
    defaultPageSize: number;
    pageSizeOptions: number[];
  };

  /** Feature flags */
  features: {
    enableDarkMode: boolean;
    enableNotifications: boolean;
    enableSearch: boolean;
    enableCalendar: boolean;
    enableCharts: boolean;
    enableMocks: boolean;
  };

  /** Date/time format configuration */
  dateFormats: {
    display: string;
    input: string;
    datetime: string;
    time: string;
  };
}

export const appConfig: AppConfig = {
  app: {
    title: env.APP_TITLE,
    version: env.APP_VERSION,
    description: 'Enterprise Admin Dashboard Template',
  },

  api: {
    baseUrl: env.API_BASE_URL,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  auth: {
    tokenKey: env.AUTH_TOKEN_KEY,
    refreshTokenKey: env.REFRESH_TOKEN_KEY,
    loginPath: '/auth/signin',
    defaultRedirect: '/',
    tokenRefreshThreshold: 5,
  },

  pagination: {
    defaultPageSize: env.DEFAULT_PAGE_SIZE,
    pageSizeOptions: [10, 20, 50, 100],
  },

  features: {
    enableDarkMode: true,
    enableNotifications: true,
    enableSearch: true,
    enableCalendar: true,
    enableCharts: true,
    enableMocks: env.ENABLE_MOCKS,
  },

  dateFormats: {
    display: 'MMM dd, yyyy',
    input: 'yyyy-MM-dd',
    datetime: 'MMM dd, yyyy HH:mm',
    time: 'HH:mm',
  },
};
