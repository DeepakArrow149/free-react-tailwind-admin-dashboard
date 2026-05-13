/**
 * DataTable Component
 * Generic, type-safe data table with sorting, selection, and custom rendering.
 */

import { useState, useMemo, type ReactNode } from 'react';
import { cn } from '@/core/utils';

export interface Column<T> {
  /** Unique key for the column */
  key: string;
  /** Display header */
  header: string;
  /** Accessor function to get cell value */
  accessor?: (row: T) => ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Column width class */
  width?: string;
  /** Cell alignment */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Data rows */
  data: T[];
  /** Unique key accessor for each row */
  rowKey: (row: T) => string | number;
  /** Loading state */
  loading?: boolean;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row keys */
  selectedKeys?: Set<string | number>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional class for the table container */
  className?: string;
}

type SortDirection = 'asc' | 'desc';

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  onRowClick,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.accessor) return data;
    return [...data].sort((a, b) => {
      const aVal = col.accessor!(a);
      const bVal = col.accessor!(b);
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const allKeys = new Set(data.map(rowKey));
    const allSelected = selectedKeys && allKeys.size === selectedKeys.size;
    onSelectionChange(allSelected ? new Set() : allKeys);
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  };

  const alignClass = (align?: string) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800', className)}>
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            {selectable && (
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  checked={selectedKeys?.size === data.length && data.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 dark:border-gray-700"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
                  alignClass(col.align),
                  col.width,
                  col.sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300'
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <svg className={cn('h-3 w-3', sortDir === 'desc' && 'rotate-180')} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row) => {
              const key = rowKey(row);
              const isSelected = selectedKeys?.has(key);
              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-gray-100 transition-colors dark:border-gray-800',
                    onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]',
                    isSelected && 'bg-brand-50/50 dark:bg-brand-500/5'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 dark:border-gray-700"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-700 dark:text-gray-300',
                        alignClass(col.align),
                        col.width
                      )}
                    >
                      {col.accessor ? col.accessor(row) : (row as Record<string, ReactNode>)[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
