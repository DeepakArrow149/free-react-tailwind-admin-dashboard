import type { RouteObject } from 'react-router';
import { lazy } from 'react';

const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

export const authRoutes: RouteObject[] = [
  {
    path: 'signin',
    element: <SignInPage />,
  },
  {
    path: 'signup',
    element: <SignUpPage />,
  },
];
