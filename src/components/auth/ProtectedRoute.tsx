/**
 * ProtectedRoute — Outlet-based guard for react-router <Route> wrappers.
 *
 * Validates the session with the backend on first mount.
 * Redirects to signin if unauthenticated or session invalid.
 * Supports optional requiredRoles prop for route-level access control.
 */
import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  /** If provided, only users with one of these roles may access child routes */
  requiredRoles?: string[];
}

export default function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isValidated, user, validateSession } = useAuthStore();
  const location = useLocation();
  const validationTriggered = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isValidated && !validationTriggered.current) {
      validationTriggered.current = true;
      validateSession();
    }
  }, [isAuthenticated, isValidated, validateSession]);

  // Show loading while auth state initializes
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Show loading while backend validation is in progress
  if (!isValidated && validationTriggered.current) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Role-based access control — check roleName, roles array, and isSuperAdmin
  if (requiredRoles && requiredRoles.length > 0 && user) {
    const u = user as unknown as Record<string, unknown>;
    const userRole = u.roleName as string | undefined;
    const userRoles = (u.roles as string[] | undefined) ?? [];
    const isSuperAdmin = Boolean(u.isSuperAdmin);
    const hasRole = requiredRoles.some(
      (role) => {
        // Allow isSuperAdmin users access to super_admin routes
        if (role.toLowerCase() === 'super_admin' && isSuperAdmin) return true;
        return (
          role.toLowerCase() === userRole?.toLowerCase() ||
          userRoles.some((r) => r.toLowerCase() === role.toLowerCase())
        );
      },
    );
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}
