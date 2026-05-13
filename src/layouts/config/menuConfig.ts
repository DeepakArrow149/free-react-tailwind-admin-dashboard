/**
 * Default Menu Configuration
 * Defines the sidebar navigation structure.
 * Modify this file to customize the sidebar for your application.
 */

import type { MenuSection } from './menuTypes';

// Icons are referenced by name — actual icon components will be resolved in the sidebar renderer
// This keeps the config serializable and decoupled from React components

export const defaultMenuConfig: MenuSection[] = [
  // ─── Super Admin Section (only visible to super_admin role) ───
  {
    title: 'Super Admin',
    items: [
      {
        id: 'sa-dashboard',
        label: 'Platform Overview',
        path: '/super-admin',
        roles: ['super_admin'],
      },
      {
        id: 'sa-companies',
        label: 'Companies',
        roles: ['super_admin'],
        children: [
          { id: 'sa-company-list', label: 'All Companies', path: '/super-admin/companies' },
          { id: 'sa-company-create', label: 'Create Company', path: '/super-admin/companies/create' },
        ],
      },
    ],
  },
  // ─── Main Menu ────────────────────────────────────────────────
  {
    title: 'Menu',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: undefined,
        children: [
          { id: 'dashboard-home', label: 'Overview', path: '/' },
        ],
      },
      {
        id: 'users',
        label: 'Users',
        path: '/users',
      },
      {
        id: 'branches',
        label: 'Branches',
        path: '/branches',
      },
      {
        id: 'calendar',
        label: 'Calendar',
        path: '/calendar',
      },
      {
        id: 'profile',
        label: 'User Profile',
        path: '/profile',
      },
      {
        id: 'forms',
        label: 'Forms',
        children: [
          { id: 'form-elements', label: 'Form Elements', path: '/form-elements' },
        ],
      },
      {
        id: 'tables',
        label: 'Tables',
        children: [
          { id: 'basic-tables', label: 'Basic Tables', path: '/basic-tables' },
        ],
      },
      {
        id: 'pages',
        label: 'Pages',
        children: [
          { id: 'blank', label: 'Blank Page', path: '/blank' },
          { id: '404', label: '404 Error', path: '/404' },
        ],
      },
    ],
  },
  {
    title: 'Others',
    items: [
      {
        id: 'charts',
        label: 'Charts',
        children: [
          { id: 'line-chart', label: 'Line Chart', path: '/line-chart' },
          { id: 'bar-chart', label: 'Bar Chart', path: '/bar-chart' },
        ],
      },
      {
        id: 'ui-elements',
        label: 'UI Elements',
        children: [
          { id: 'alerts', label: 'Alerts', path: '/alerts' },
          { id: 'avatars', label: 'Avatars', path: '/avatars' },
          { id: 'badges', label: 'Badges', path: '/badges' },
          { id: 'buttons', label: 'Buttons', path: '/buttons' },
          { id: 'images', label: 'Images', path: '/images' },
          { id: 'videos', label: 'Videos', path: '/videos' },
        ],
      },
      {
        id: 'auth',
        label: 'Authentication',
        children: [
          { id: 'signin', label: 'Sign In', path: '/auth/signin' },
          { id: 'signup', label: 'Sign Up', path: '/auth/signup' },
        ],
      },
    ],
  },
];
