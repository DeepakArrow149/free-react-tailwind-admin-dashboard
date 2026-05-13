/**
 * Header Component
 * Responsive header with sidebar toggle, search, theme toggle, and user menu.
 */

import { Link } from 'react-router';
import { useSidebar } from '../context/SidebarContext';
import { ThemeToggle } from '@/theme';
import { Dropdown, DropdownItem, Avatar } from '@/components/ui';
import { SearchBar } from '@/components/table';
import { SIDEBAR } from '@/core/constants';
import { useState } from 'react';

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

  const handleToggle = () => {
    if (window.innerWidth >= SIDEBAR.DESKTOP_BREAKPOINT) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-99999 flex w-full border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:border-b">
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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
            </svg>
          </button>

          {/* Desktop search */}
          <div className="hidden lg:block">
            <SearchBar
              onChange={() => {}}
              placeholder="Search or type command..."
              className="xl:w-[430px]"
            />
          </div>
        </div>

        {/* Right-side controls */}
        <div
          className={`${mobileMenuOpen ? 'flex' : 'hidden'} w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md lg:flex lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2">
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
    </header>
  );
}
