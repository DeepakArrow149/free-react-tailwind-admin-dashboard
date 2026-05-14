/**
 * PaginatedTable — wraps a raw <table> (or any list) with client-side pagination.
 * Drop-in for pages that load ALL records and render with .map().
 *
 * Usage:
 *   <PaginatedTable data={items} pageSize={20}>
 *     {(pageData) => <table>…{pageData.map(…)}…</table>}
 *   </PaginatedTable>
 */

import { usePagination } from '@/core/hooks';
import { Pagination } from './Pagination';

interface PaginatedTableProps<T> {
  data: T[];
  children: (pageData: T[]) => React.ReactNode;
  pageSize?: number;
  className?: string;
}

export function PaginatedTable<T>({
  data,
  children,
  pageSize = 20,
  className,
}: PaginatedTableProps<T>) {
  const pagination = usePagination({ totalItems: data.length, initialPageSize: pageSize });
  const pageData = pagination.paginateData(data);

  return (
    <div className={className}>
      {children(pageData)}
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.goToPage}
            totalItems={data.length}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.changePageSize}
          />
        </div>
      )}
    </div>
  );
}
