/**
 * Shared loading spinner used by route Suspense boundaries.
 */

interface PageLoaderProps {
  fullScreen?: boolean;
}

export function PageLoader({ fullScreen }: PageLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'h-screen' : 'h-64'}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}
