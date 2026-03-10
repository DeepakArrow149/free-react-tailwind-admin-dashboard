/**
 * 404 Not Found Page
 */

import { Link } from 'react-router';
import { PageMeta } from '@/components/common';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-gray-900">
      <PageMeta title="Page Not Found" />

      <div className="text-center">
        <h1 className="mb-2 text-[100px] font-bold leading-none text-gray-800 dark:text-white/90 sm:text-[150px]">
          404
        </h1>
        <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          Page Not Found
        </h2>
        <p className="mx-auto mb-8 max-w-md text-gray-500 dark:text-gray-400">
          The page you are looking for might have been removed, had its name changed, or is
          temporarily unavailable.
        </p>
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
