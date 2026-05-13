/**
 * DashboardLayout
 * Main application layout with sidebar, header, and content area.
 * Displays tenant context (company name, branch) from the auth store.
 */

import { Outlet, useNavigate } from 'react-router';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Backdrop } from './components/Backdrop';
import { SIDEBAR } from '@/core/constants';
import { useAuthStore } from '@/store';
import { tokenService } from '@/core/services';
import { defaultMenuConfig } from './config/menuConfig';
import { filterMenuByRole } from './config/menuTypes';
import { useMemo } from 'react';

function DashboardContent() {
  const { isExpanded, isHovered } = useSidebar();
  const showFull = isExpanded || isHovered;
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // Filter menu based on user roles
  const filteredMenu = useMemo(() => {
    const userRoles = user?.roles ?? [];
    if (user?.isSuperAdmin) {
      return filterMenuByRole(defaultMenuConfig, [...userRoles, 'super_admin']);
    }
    return filterMenuByRole(defaultMenuConfig, userRoles);
  }, [user]);

  const handleSignOut = () => {
    tokenService.clearTokens();
    clearAuth();
    navigate('/auth/signin');
  };

  // Build display role — show company context for tenant users
  const displayRole = user?.isSuperAdmin
    ? 'Super Admin'
    : [user?.companyName, user?.branchName].filter(Boolean).join(' · ') || user?.role || 'User';

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <Sidebar menuConfig={filteredMenu} />
        <Backdrop />
      </div>
      <div
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{
          marginLeft: showFull ? SIDEBAR.EXPANDED_WIDTH : SIDEBAR.COLLAPSED_WIDTH,
        }}
      >
        <Header
          userName={user?.name ?? 'User'}
          userRole={displayRole}
          onSignOut={handleSignOut}
        />
        {/* Tenant context banner for company users */}
        {user?.companyName && !user.isSuperAdmin && (
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-2 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="mx-auto flex max-w-screen-2xl items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                <strong className="text-gray-700 dark:text-gray-300">{user.companyName}</strong>
              </span>
              {user.branchName && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>{user.branchName}</span>
                </>
              )}
              {user.roleName && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="capitalize">{user.roleName}</span>
                </>
              )}
            </div>
          </div>
        )}
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
}
