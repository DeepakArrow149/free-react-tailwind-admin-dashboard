/**
 * Super Admin Module Routes
 */

import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const CompanyListPage = lazy(() => import('./pages/CompanyListPage'));
const CreateCompanyPage = lazy(() => import('./pages/CreateCompanyPage'));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'));

export const superAdminRoutes: RouteObject[] = [
  {
    index: true,
    element: <SuperAdminDashboard />,
  },
  {
    path: 'companies',
    element: <CompanyListPage />,
  },
  {
    path: 'companies/create',
    element: <CreateCompanyPage />,
  },
  {
    path: 'companies/:id',
    element: <CompanyDetailPage />,
  },
];
