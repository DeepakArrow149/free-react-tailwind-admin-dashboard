import { useState, useCallback, useMemo } from 'react';
import { PAGINATION } from '@/core/constants';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
}

export function usePagination({
  initialPage = PAGINATION.DEFAULT_PAGE,
  initialPageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  totalItems,
}: UsePaginationOptions) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.ceil(totalItems / pageSize),
    [totalItems, pageSize]
  );

  const goToPage = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages]
  );

  const nextPage = useCallback(
    () => goToPage(page + 1),
    [page, goToPage]
  );

  const prevPage = useCallback(
    () => goToPage(page - 1),
    [page, goToPage]
  );

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    startIndex: (page - 1) * pageSize,
    endIndex: Math.min(page * pageSize, totalItems),
  } as const;
}
