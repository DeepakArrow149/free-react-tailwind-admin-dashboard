/**
 * API Routes Registry
 * Central registry of all API endpoint paths.
 * Keeps API URLs in one place for easy maintenance.
 */

export const apiRoutes = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
    validate: '/auth/validate',
    switchBranch: '/auth/switch-branch',
    switchCompany: '/auth/switch-company',
    exitCompany: '/auth/exit-company',
  },

  // ─── Super Admin: Company Management ──────────────────────
  company: {
    list: '/company/list',
    create: '/company/create',
    detail: (id: number | string) => `/company/${id}`,
    update: (id: number | string) => `/company/${id}`,
    updateStatus: (id: number | string) => `/company/${id}/status`,
    delete: (id: number | string) => `/company/${id}`,
    stats: (id: number | string) => `/company/${id}/stats`,
  },

  // ─── Branch Management (tenant-scoped) ────────────────────
  branch: {
    list: '/branch/list',
    create: '/branch/create',
    update: (id: number | string) => `/branch/${id}`,
    delete: (id: number | string) => `/branch/${id}`,
  },

  users: {
    list: '/users',
    detail: (id: string | number) => `/users/${id}`,
    create: '/users/create',
    update: (id: string | number) => `/users/${id}`,
    updateStatus: (id: string | number) => `/users/${id}/status`,
    delete: (id: string | number) => `/users/${id}`,
    profile: '/users/profile',
    roles: '/users/roles/list',
  },

  dashboard: {
    stats: '/dashboard/stats',
    metrics: '/dashboard/metrics',
    recentActivity: '/dashboard/recent-activity',
    charts: '/dashboard/charts',
  },

  settings: {
    general: '/settings/general',
    notifications: '/settings/notifications',
    security: '/settings/security',
    preferences: '/settings/preferences',
  },

  reports: {
    list: '/reports',
    generate: '/reports/generate',
    download: (id: string) => `/reports/${id}/download`,
  },

  common: {
    upload: '/upload',
    notifications: '/notifications',
    search: '/search',
    health: '/health',
  },
} as const;
