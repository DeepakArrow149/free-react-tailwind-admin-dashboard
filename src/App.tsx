/**
 * App Root Component
 *
 * Uses createBrowserRouter for data-router features (loaders, actions, etc.).
 * All routing is defined in src/app/router.tsx.
 */

import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from '@/app/router';
import { useAuthStore } from '@/store';
import { PopupModalRoot } from '@/components/ui';

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <RouterProvider router={router} />
      <PopupModalRoot />
    </>
  );
}
