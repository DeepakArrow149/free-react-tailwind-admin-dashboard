import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const UsersListPage = lazy(() => import('./pages/UsersListPage'));

export const usersRoutes: RouteObject[] = [
  {
    index: true,
    element: <UsersListPage />,
  },
];
