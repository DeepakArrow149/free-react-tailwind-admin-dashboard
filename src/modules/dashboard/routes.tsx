/**
 * Dashboard Module Routes
 * Defines routes for the dashboard module.
 */

import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const DashboardHome = lazy(() => import('./pages/DashboardHome'));

export const dashboardRoutes: RouteObject[] = [
  {
    index: true,
    element: <DashboardHome />,
  },
];
