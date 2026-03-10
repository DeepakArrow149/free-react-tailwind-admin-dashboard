/**
 * Error Boundary Fallback Page
 */

import { useRouteError, isRouteErrorResponse, Link } from 'react-router';
import { Button } from '@/components/ui';

export default function ErrorPage() {
  const error = useRouteError();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-gray-900">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
          <svg className="h-10 w-10 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">{title}</h1>
        <p className="mx-auto mb-8 max-w-md text-gray-500 dark:text-gray-400">{message}</p>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
          <Link to="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
