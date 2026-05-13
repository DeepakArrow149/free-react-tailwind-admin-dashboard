import type { RouteObject } from 'react-router';
import { Navigate } from 'react-router';

// Redirect old /users route to the company-admin user management page
export const usersRoutes: RouteObject[] = [
  {
    index: true,
    element: <Navigate to="/settings/users" replace />,
  },
];
