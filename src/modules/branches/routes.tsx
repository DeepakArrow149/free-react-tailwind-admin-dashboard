/**
 * Branches Module Routes
 */

import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const BranchListPage = lazy(() => import('./pages/BranchListPage'));

export const branchesRoutes: RouteObject[] = [
  {
    index: true,
    element: <BranchListPage />,
  },
];
