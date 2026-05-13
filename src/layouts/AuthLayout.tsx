/**
 * AuthLayout
 * Split-screen layout for authentication pages.
 * Left side: form content (via Outlet). Right side: branding.
 */

import { Outlet, Link } from 'react-router';
import { ThemeToggle } from '@/theme';

interface AuthLayoutProps {
  /** Brand image for the right panel */
  brandImage?: string;
  /** Brand tagline */
  tagline?: string;
}

export function AuthLayout({
  brandImage = '/images/logo/auth-logo.svg',
  tagline = 'Enterprise Admin Dashboard Template',
}: AuthLayoutProps) {
  return (
    <div className="relative z-1 min-h-screen bg-white p-6 dark:bg-gray-900 sm:p-0">
      <div className="relative flex h-screen w-full flex-col justify-center lg:flex-row">
        {/* Content side */}
        <div className="flex w-full flex-col lg:w-1/2">
          <Outlet />
        </div>

        {/* Brand side */}
        <div className="hidden w-full items-center bg-brand-950 dark:bg-white/5 lg:grid lg:w-1/2">
          <div className="relative z-1 flex items-center justify-center">
            {/* Grid decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-6 gap-4 p-12">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-white/20" />
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center max-w-xs">
              <Link to="/" className="mb-4 block">
                <img width={231} height={48} src={brandImage} alt="Logo" />
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60">
                {tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
