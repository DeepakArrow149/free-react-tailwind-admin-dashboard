import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const RoleBuilderPage = lazy(() => import('./pages/RoleBuilderPage'));
const BranchManagementPage = lazy(() => import('./pages/BranchManagementPage'));

export const settingsRoutes: RouteObject[] = [
  {
    index: true,
    element: <SettingsPage />,
  },
  {
    path: 'users',
    element: <UserManagementPage />,
  },
  {
    path: 'roles',
    element: <RoleBuilderPage />,
  },
  {
    path: 'branches',
    element: <BranchManagementPage />,
  },
];
