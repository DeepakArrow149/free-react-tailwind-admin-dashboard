/**
 * Pagination Component
 * Displays pagination controls with page numbers, navigation, page-size selector,
 * and "Showing X–Y of Z" info text.
 */

import { cn } from '@/core/utils';
import { Button } from '@/components/ui';
import { PAGINATION } from '@/core/constants';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total item count (enables "Showing X–Y of Z") */
  totalItems?: number;
  /** Items per page (enables page-size selector) */
  pageSize?: number;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page-size options (defaults to PAGINATION.PAGE_SIZE_OPTIONS) */
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  const getVisiblePages = (): (number | '...')[] => {
    if (totalPages <= 1) return totalPages === 1 ? [1] : [];
    const pages: (number | '...')[] = [];
    const delta = 2;
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  // Calculate "Showing X–Y of Z" range
  const showingStart = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : undefined;
  const showingEnd = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {/* Left section: info text + page size */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {totalItems !== undefined && showingStart !== undefined && showingEnd !== undefined && (
          <span>
            Showing <span className="font-medium text-gray-800 dark:text-gray-200">{showingStart}–{showingEnd}</span> of{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">{totalItems}</span>
          </span>
        )}
        {pageSize !== undefined && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size-select" className="whitespace-nowrap">Rows:</label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1); // Reset to page 1 on size change
              }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right section: page nav */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {getVisiblePages().map((page, i) =>
              page === '...' ? (
                <span key={`dots-${i}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                    page === currentPage
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
