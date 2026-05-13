/**
 * Rate-limit progress bar — shared across AI assistant drawers.
 *
 * Renders nothing until the caller has fetched the user's quota. Colored
 * thresholds: blue under 80% used, amber 80-94%, red 95%+. Remaining
 * count goes bold-red near zero. Reset time shown as a chip on the right.
 */

import React from 'react';

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: string;
}

export interface RateLimitBarProps {
  rateLimit: RateLimitStatus | null;
}

export const RateLimitBar: React.FC<RateLimitBarProps> = ({ rateLimit }) => {
  if (!rateLimit) return null;

  const used = rateLimit.limit - rateLimit.remaining;
  const pct = rateLimit.limit > 0
    ? Math.min(100, Math.round((used / rateLimit.limit) * 100))
    : 0;
  const barColor =
    pct >= 95 ? 'bg-red-500' :
    pct >= 80 ? 'bg-amber-500' :
    'bg-blue-500';
  const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="px-4 pt-1.5 pb-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
        <span>
          <span className={pct >= 95 ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
            {rateLimit.remaining}
          </span>
          /{rateLimit.limit} requests remaining today
        </span>
        <span title={`Daily quota resets at ${resetTime}`}>Resets {resetTime}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
