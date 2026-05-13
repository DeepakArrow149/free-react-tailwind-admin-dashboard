/**
 * Application Router
 *
 * Composes all module routes with their respective layouts.
 * Each module exports its own route config, which is plugged in here.
 *
 * To add a new module:
 * 1. Create the module under src/modules/<name>/
 * 2. Export routes from src/modules/<name>/routes.tsx
 * 3. Import and add them to the appropriate layout section below
 */

import { createBrowserRouter, Navigate } from 'react-router';
import { Suspense } from 'react';
import { Loader } from '@/components/ui';
import { ScrollToTop } from '@/components/common';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { GuestRoute } from '@/app/guards/GuestRoute';

// Layouts
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

// Module routes
import { dashboardRoutes } from '@/modules/dashboard';
import { authRoutes } from '@/modules/auth';
import { usersRoutes } from '@/modules/users';
import { settingsRoutes } from '@/modules/settings';
import { reportsRoutes } from '@/modules/reports';
import { superAdminRoutes } from '@/modules/super-admin';
import { branchesRoutes } from '@/modules/branches';

// Error pages
import ErrorPage from '@/app/pages/ErrorPage';
import NotFoundPage from '@/app/pages/NotFoundPage';

/**
 * Wraps children in Suspense with a loading fallback
 */
// eslint-disable-next-line react-refresh/only-export-components
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <ScrollToTop />
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // ─── Protected Routes (Dashboard Layout) ───────────────
  {
    path: '/',
    element: (
      <SuspenseWrapper>
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      </SuspenseWrapper>
    ),
    errorElement: <ErrorPage />,
    children: [
      // Dashboard
      ...dashboardRoutes,

      // Users module
      {
        path: 'users',
        children: usersRoutes,
      },

      // Branches module
      {
        path: 'branches',
        children: branchesRoutes,
      },

      // Settings module
      {
        path: 'settings',
        children: settingsRoutes,
      },

      // Reports module
      {
        path: 'reports',
        children: reportsRoutes,
      },
    ],
  },

  // ─── Super Admin Routes (Dashboard Layout) ────────────
  {
    path: '/super-admin',
    element: (
      <SuspenseWrapper>
        <ProtectedRoute requiredRoles={['super_admin']}>
          <DashboardLayout />
        </ProtectedRoute>
      </SuspenseWrapper>
    ),
    errorElement: <ErrorPage />,
    children: superAdminRoutes,
  },

  // ─── Auth Routes (Auth Layout) ─────────────────────────
  {
    path: '/auth',
    element: (
      <SuspenseWrapper>
        <GuestRoute>
          <AuthLayout />
        </GuestRoute>
      </SuspenseWrapper>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="signin" replace />,
      },
      ...authRoutes,
    ],
  },

  // ─── Catch-all 404 ─────────────────────────────────────
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
