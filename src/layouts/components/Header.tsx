/**
 * Header Component
 * Responsive header with sidebar toggle, search, theme toggle, notifications, and user menu.
 */

import { Link, useNavigate } from 'react-router';
import { useSidebar } from '../context/SidebarContext';
import { ThemeToggle } from '@/theme';
import { Dropdown, DropdownItem, Avatar } from '@/components/ui';
import { SIDEBAR } from '@/core/constants';
import { useState, useEffect, useCallback } from 'react';
import client from '@/api/client';
import GlobalSearchModal from '@/components/search/GlobalSearchModal';

interface HeaderProps {
  /** User display name */
  userName?: string;
  /** User avatar URL */
  userAvatar?: string;
  /** User role/email */
  userRole?: string;
  /** Custom right-side actions */
  actions?: React.ReactNode;
  /** Sign out handler */
  onSignOut?: () => void;
}

export function Header({
  userName = 'User',
  userAvatar,
  userRole = 'user@example.com',
  actions,
  onSignOut,
}: HeaderProps) {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // Fetch notification unread count
  const fetchUnread = useCallback(async () => {
    try {
      const res = await client.get('/admin/notifications', { params: { limit: 1 } });
      setUnreadCount(res.data.data?.unread ?? 0);
    } catch {
      // silently ignore — user may not have notification access
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000); // poll every 60s
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleToggle = () => {
    if (window.innerWidth >= SIDEBAR.DESKTOP_BREAKPOINT) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-50 flex w-full border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex w-full flex-col items-center justify-between lg:flex-row lg:px-6">
        {/* Top bar */}
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          {/* Sidebar toggle */}
          <button
            onClick={handleToggle}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 lg:h-11 lg:w-11 lg:border lg:border-gray-200 lg:dark:border-gray-800"
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 16 12">
                <path fillRule="evenodd" clipRule="evenodd" d="M0.583 1C0.583 0.586 0.919 0.25 1.333 0.25H14.667C15.081 0.25 15.417 0.586 15.417 1C15.417 1.414 15.081 1.75 14.667 1.75H1.333C0.919 1.75 0.583 1.414 0.583 1ZM0.583 11C0.583 10.586 0.919 10.25 1.333 10.25H14.667C15.081 10.25 15.417 10.586 15.417 11C15.417 11.414 15.081 11.75 14.667 11.75H1.333C0.919 11.75 0.583 11.414 0.583 11ZM1.333 5.25C0.919 5.25 0.583 5.586 0.583 6C0.583 6.414 0.919 6.75 1.333 6.75H8C8.414 6.75 8.75 6.414 8.75 6C8.75 5.586 8.414 5.25 8 5.25H1.333Z" />
              </svg>
            )}
          </button>

          {/* Mobile logo */}
          <Link to="/" className="lg:hidden">
            <img className="dark:hidden" src="/images/logo/logo.svg" alt="Logo" />
            <img className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="Logo" />
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen ? 'true' : 'false'}
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
            </svg>
          </button>

          {/* Desktop search — opens Cmd+K modal */}
          <div className="hidden lg:block">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-400 hover:border-gray-300 hover:bg-gray-100 transition-colors dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-gray-700 dark:hover:bg-gray-700 xl:w-107.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search...</span>
              <kbd className="ml-auto rounded border border-gray-300 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-600">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Right-side controls */}
        <div
          className={`${mobileMenuOpen ? 'flex' : 'hidden'} w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md lg:flex lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => navigate('/settings/notifications')}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              title="Notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {/* Mobile search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden transition-colors"
              title="Search"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <ThemeToggle />
            {actions}
          </div>

          {/* User dropdown */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-3 text-left">
                <Avatar
                  src={userAvatar}
                  alt={userName}
                  size="sm"
                  status="online"
                />
                <span className="hidden lg:block">
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                    {userName}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {userRole}
                  </span>
                </span>
              </button>
            }
          >
            <DropdownItem
              onClick={() => {}}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              My Profile
            </DropdownItem>
            <DropdownItem
              onClick={() => {}}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Settings
            </DropdownItem>
            <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
            <DropdownItem
              onClick={onSignOut}
              danger
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              }
            >
              Sign Out
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
