import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const ReportsPage = lazy(() => import('./pages/ReportsPage'));

export const reportsRoutes: RouteObject[] = [
  {
    index: true,
    element: <ReportsPage />,
  },
];
