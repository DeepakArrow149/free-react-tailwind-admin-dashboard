/**
 * ProtectedRoute Component
 * Guards routes that require authentication.
 * Validates the session with the backend on first mount.
 * Redirects to login if unauthenticated or session invalid.
 */

import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '@/store';
import { Loader } from '@/components/ui';
import { appConfig } from '@/core/config';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required roles (if empty, any authenticated user can access) */
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isValidated, user, validateSession } = useAuthStore();
  const location = useLocation();
  const validationTriggered = useRef(false);

  useEffect(() => {
    // Run backend validation once per session if authenticated but not yet validated
    if (isAuthenticated && !isValidated && !validationTriggered.current) {
      validationTriggered.current = true;
      validateSession();
    }
  }, [isAuthenticated, isValidated, validateSession]);

  if (isLoading) {
    return <Loader fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to={appConfig.auth.loginPath} state={{ from: location }} replace />;
  }

  // Show loader while backend validation is in progress
  if (!isValidated && validationTriggered.current) {
    return <Loader fullPage />;
  }

  if (requiredRoles && requiredRoles.length > 0 && user) {
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
