/**
 * BlankLayout
 * Minimal layout with no sidebar or header — for standalone pages.
 */

import { Outlet } from 'react-router';

export function BlankLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Outlet />
    </div>
  );
}
