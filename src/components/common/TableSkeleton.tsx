/**
 * Animated table skeleton shown while data is loading.
 * Renders a configurable number of shimmer rows inside a card container.
 */
export default function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow animate-pulse">
      {/* Header row */}
      <div className="flex gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-gray-200 dark:bg-gray-600 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 rounded bg-gray-100 dark:bg-gray-700 flex-1"
              style={{ maxWidth: c === 0 ? "40%" : "100%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Simple card-level skeleton (for stat cards, dashboards).
 */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-700" />
          <div className="h-6 w-20 rounded bg-gray-100 dark:bg-gray-700" />
          <div className="h-3 w-24 rounded bg-gray-50 dark:bg-gray-700/50" />
        </div>
      ))}
    </div>
  );
}
