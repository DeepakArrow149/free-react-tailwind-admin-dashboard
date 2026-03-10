/**
 * Application-wide constants
 */

/** Local storage keys */
export const STORAGE_KEYS = {
  THEME: 'theme',
  SIDEBAR_STATE: 'sidebar_expanded',
  LANGUAGE: 'language',
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;

/** Route path constants */
export const ROUTES = {
  HOME: '/',
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNUP: '/auth/signup',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  CALENDAR: '/calendar',
  SETTINGS: '/settings',
  USERS: '/users',
  REPORTS: '/reports',
  NOT_FOUND: '/404',
} as const;

/** Breakpoints matching Tailwind config */
export const BREAKPOINTS = {
  '2xsm': 375,
  xsm: 425,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 2000,
} as const;

/** Sidebar dimensions */
export const SIDEBAR = {
  EXPANDED_WIDTH: 290,
  COLLAPSED_WIDTH: 90,
  MOBILE_BREAKPOINT: 768,
  DESKTOP_BREAKPOINT: 1024,
} as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

/** Toast/notification durations (ms) */
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const;
