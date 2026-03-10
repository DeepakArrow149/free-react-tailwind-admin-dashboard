/**
 * Environment Configuration
 * Centralizes access to all environment variables with type safety.
 */

export const env = {
  /** Current environment mode */
  MODE: import.meta.env.MODE as 'development' | 'production' | 'test',

  /** Whether running in development mode */
  DEV: import.meta.env.DEV,

  /** Whether running in production mode */
  PROD: import.meta.env.PROD,

  /** API base URL for backend communication */
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string) || '/api',

  /** Application title */
  APP_TITLE: (import.meta.env.VITE_APP_TITLE as string) || 'Enterprise Admin',

  /** Application version */
  APP_VERSION: (import.meta.env.VITE_APP_VERSION as string) || '1.0.0',

  /** Enable/disable mock API */
  ENABLE_MOCKS: import.meta.env.VITE_ENABLE_MOCKS === 'true',

  /** Authentication token storage key */
  AUTH_TOKEN_KEY: (import.meta.env.VITE_AUTH_TOKEN_KEY as string) || 'auth_token',

  /** Refresh token storage key */
  REFRESH_TOKEN_KEY: (import.meta.env.VITE_REFRESH_TOKEN_KEY as string) || 'refresh_token',

  /** Default pagination page size */
  DEFAULT_PAGE_SIZE: Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 20,

  /** Sentry DSN for error tracking (optional) */
  SENTRY_DSN: (import.meta.env.VITE_SENTRY_DSN as string) || '',
} as const;
