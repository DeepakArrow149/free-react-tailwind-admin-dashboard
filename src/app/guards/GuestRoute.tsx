/**
 * GuestRoute Component
 * Redirects authenticated users away from auth pages.
 */

import { Navigate } from 'react-router';
import { useAuthStore } from '@/store';
import { Loader } from '@/components/ui';
import { appConfig } from '@/core/config';

interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <Loader fullPage />;
  }

  if (isAuthenticated) {
    return <Navigate to={appConfig.auth.defaultRedirect} replace />;
  }

  return <>{children}</>;
}
