import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export const settingsRoutes: RouteObject[] = [
  {
    index: true,
    element: <SettingsPage />,
  },
];
