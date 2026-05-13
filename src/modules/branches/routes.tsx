/**
 * Branches Module Routes
 */

import type { RouteObject } from 'react-router';
import { Navigate } from 'react-router';

// Redirect old /branches route to the company-admin branch management page
export const branchesRoutes: RouteObject[] = [
  {
    index: true,
    element: <Navigate to="/settings/branches" replace />,
  },
];
