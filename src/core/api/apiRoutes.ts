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
    changePassword: '/auth/change-password',
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

  // ─── Super Admin: Form Builder ────────────────────────────
  forms: {
    list: '/forms/list',
    create: '/forms/create',
    detail: (id: string) => `/forms/${id}`,
    update: (id: string) => `/forms/${id}`,
    delete: (id: string) => `/forms/${id}`,
    clone: (id: string) => `/forms/${id}/clone`,
    publish: (id: string) => `/forms/${id}/publish`,
    submit: (id: string) => `/forms/${id}/submit`,
    submissions: (id: string) => `/forms/${id}/submissions`,
    versions: (id: string) => `/forms/${id}/versions`,
    versionDetail: (id: string, verId: string) => `/forms/${id}/versions/${verId}`,
    versionRestore: (id: string, verId: string) => `/forms/${id}/versions/${verId}/restore`,
    analytics: (id: string) => `/forms/${id}/analytics`,
    exportForm: (id: string) => `/forms/${id}/export`,
    importForm: '/forms/import',
    upload: '/forms/upload',
    menuItems: '/forms/menu-items',
    moduleAssignment: (id: string) => `/forms/${id}/module-assignment`,
    // ─── Draft / Publish Lifecycle ────────────────────────
    draft: (id: string) => `/forms/${id}/draft`,
    publishDiff: (id: string) => `/forms/${id}/publish/diff`,
    unpublish: (id: string) => `/forms/${id}/unpublish`,
    versionPin: (id: string, verId: string) => `/forms/${id}/versions/${verId}/pin`,
    renames: (id: string) => `/forms/${id}/renames`,
    // ─── Response Insights & Templates ────────────────────
    responseInsights: (id: string) => `/forms/${id}/response-insights`,
    templatesList: '/forms/templates/list',
    templatesCreate: '/forms/templates/create',
    templateUse: (id: string) => `/forms/templates/${id}/use`,
    templateDelete: (id: string) => `/forms/templates/${id}`,
  },

  // ─── Super Admin: Global Field Registry ─────────────────
  globalFields: {
    list: '/global-fields',
    categories: '/global-fields/categories',
    detail: (id: string | number) => `/global-fields/${id}`,
    create: '/global-fields',
    update: (id: string | number) => `/global-fields/${id}`,
    delete: (id: string | number) => `/global-fields/${id}`,
    seed: '/global-fields/seed',
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
    summary: '/dashboard/summary',
    stats: '/dashboard/stats',
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

  // ─── Admin Module (Super Admin) ─────────────────────────────
  admin: {
    roles: '/admin/roles',
    roleDetail: (id: number | string) => `/admin/roles/${id}`,
    rolePermissions: (roleName: string) => `/admin/roles/${roleName}/permissions`,
    auditLogs: '/admin/audit-logs',
    auditLogDetail: (id: string) => `/admin/audit-logs/${id}`,
    auditLogsMeta: '/admin/audit-logs-meta',
    numberSeries: '/admin/number-series',
    numberSeriesDetail: (id: number | string) => `/admin/number-series/${id}`,
    users: '/admin/users',
    userDetail: (id: number | string) => `/admin/users/${id}`,
    userResetPassword: (id: number | string) => `/admin/users/${id}/reset-password`,
    emailTemplates: '/admin/email-templates',
    emailTemplateDetail: (id: number | string) => `/admin/email-templates/${id}`,
    emailLogs: '/admin/email-logs',
    approvalRequests: '/admin/approval-requests',
    approvalRequestDecide: (id: number | string) => `/admin/approval-requests/${id}/decide`,
    approvalRules: '/admin/approval-rules',
    approvalStatus: (module: string, recordId: number | string) => `/admin/approval-status/${module}/${recordId}`,
    notifications: '/admin/notifications',
    systemSettings: '/admin/system-settings',
    reportSchedules: '/reports/schedules',
    reportScheduleDetail: (id: number | string) => `/reports/schedules/${id}`,
    reportScheduleRun: (id: number | string) => `/reports/schedules/${id}/run`,
    reportTypes: '/reports/schedules/types',
  },

  // ─── Document PDF Generation ─────────────────────────────────
  documents: {
    types: '/documents/types',
    pdf: (docType: string, id: number | string) => `/documents/${docType}/${id}/pdf`,
  },

  // ─── AI Form Builder ─────────────────────────────────────────
  ai: {
    chat: '/ai/chat',
    chatStream: '/ai/chat/stream',
    conversations: '/ai/conversations',
    conversationDetail: (id: string) => `/ai/conversations/${id}`,
    conversationLink: (id: string) => `/ai/conversations/${id}/link`,
    rateLimit: '/ai/rate-limit',
    erpMasters: '/ai/erp-masters',
    erpMastersFlat: '/ai/erp-masters/flat',
    erpLookup: (model: string) => `/ai/erp-lookup/${model}`,
    adminProviders: '/ai/admin/providers',
    adminProviderDetail: (id: number) => `/ai/admin/providers/${id}`,
    adminDefaultLimits: '/ai/admin/limits/default',
    adminCompanyLimits: '/ai/admin/limits/companies',
    adminCompanyLimit: '/ai/admin/limits/company',
    adminUsage: '/ai/admin/usage',
  },

  // ─── Company Admin Module ──────────────────────────────────
  companyAdmin: {
    users: {
      list: '/company-admin/users',
      detail: (id: number | string) => `/company-admin/users/${id}`,
      create: '/company-admin/users',
      update: (id: number | string) => `/company-admin/users/${id}`,
      delete: (id: number | string) => `/company-admin/users/${id}`,
      resetPassword: (id: number | string) => `/company-admin/users/${id}/reset-password`,
    },
    branches: {
      list: '/company-admin/branches',
      detail: (id: number | string) => `/company-admin/branches/${id}`,
      create: '/company-admin/branches',
      update: (id: number | string) => `/company-admin/branches/${id}`,
      delete: (id: number | string) => `/company-admin/branches/${id}`,
    },
    roles: {
      list: '/company-admin/roles',
      detail: (id: number | string) => `/company-admin/roles/${id}`,
      create: '/company-admin/roles',
      update: (id: number | string) => `/company-admin/roles/${id}`,
      delete: (id: number | string) => `/company-admin/roles/${id}`,
      permissions: (id: number | string) => `/company-admin/roles/${id}/permissions`,
    },
  },
} as const;
