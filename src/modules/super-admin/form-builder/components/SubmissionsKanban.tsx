/**
 * SubmissionsKanban — board view of form submissions, grouped by status
 * (or any form field). Cards are draggable between columns; drop fires a
 * PUT to /forms/:formId/submissions/:subId/review to change the status.
 *
 * Inspired by Appsmith's Kanban widget but specialised for form review
 * workflows. Uses the same react-dnd backend the line-layout editor uses
 * to avoid pulling a second drag library.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';
import { api } from '@/core/api';

// ─── API types ────────────────────────────────────────────────────

interface KanbanRow {
  id: string;
  reviewStatus: string;
  submittedBy: number | null;
  createdAt: string;
  data: Record<string, unknown>;
}
interface KanbanColumn {
  key: string;
  label: string;
  count: number;
  rows: KanbanRow[];
}
interface KanbanResponse {
  groupBy: string;
  columns: KanbanColumn[];
}

// ─── Props ───────────────────────────────────────────────────────

export interface SubmissionsKanbanProps {
  formId: string | number;
  /**
   * Default grouping field. When 'review_status' (default), drag-drop changes
   * the review status. For other fields, drag-drop is disabled (display only).
   */
  groupBy?: string;
  /** Explicit column order; falls back to data-order when omitted. */
  columns?: string[];
  /** Field name in `row.data` to render as the card title. */
  titleField?: string;
}

const DEFAULT_REVIEW_COLUMNS = ['pending', 'approved', 'rejected'];

const DND_CARD = 'submission_card';

interface DragItem {
  id: string;
  fromColumnKey: string;
}

// ─── Component ───────────────────────────────────────────────────

export default function SubmissionsKanban({
  formId,
  groupBy = 'review_status',
  columns,
  titleField,
}: SubmissionsKanbanProps) {
  const [data, setData] = useState<KanbanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStatusBoard = groupBy === 'review_status';
  const cols = columns ?? (isStatusBoard ? DEFAULT_REVIEW_COLUMNS : undefined);

  // ── Load ─────────
  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ groupBy });
      if (cols && cols.length) qs.set('columns', cols.join(','));
      const res = await api.get<{ success: boolean; data: KanbanResponse }>(
        `/forms/${formId}/kanban?${qs.toString()}`,
      );
      setData(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load Kanban';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, groupBy]);

  // ── Card drop handler ─────────
  const moveCard = async (subId: string, fromColumnKey: string, toColumnKey: string) => {
    if (fromColumnKey === toColumnKey) return;
    if (!isStatusBoard) {
      toast.message('Drag-drop is only enabled when grouping by review status');
      return;
    }
    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const cols = prev.columns.map((c) => ({ ...c, rows: [...c.rows] }));
      const from = cols.find((c) => c.key === fromColumnKey);
      const to = cols.find((c) => c.key === toColumnKey);
      if (!from || !to) return prev;
      const idx = from.rows.findIndex((r) => r.id === subId);
      if (idx < 0) return prev;
      const [row] = from.rows.splice(idx, 1);
      row.reviewStatus = toColumnKey;
      to.rows.unshift(row);
      from.count = from.rows.length;
      to.count = to.rows.length;
      return { ...prev, columns: cols };
    });

    try {
      await api.put(`/forms/${formId}/submissions/${subId}/review`, { status: toColumnKey });
      toast.success(`Moved to ${toColumnKey}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update status';
      toast.error(msg);
      // Reload to restore truth
      reload();
    }
  };

  // ── Render ───────
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!data || data.columns.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        No submissions yet. Submissions will appear as cards here.
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {data.columns.map((col) => (
          <Column
            key={col.key}
            column={col}
            onDropCard={(item) => moveCard(item.id, item.fromColumnKey, col.key)}
            titleField={titleField}
            interactive={isStatusBoard}
          />
        ))}
      </div>
    </DndProvider>
  );
}

// ─── Column ──────────────────────────────────────────────────────

const Column: React.FC<{
  column: KanbanColumn;
  onDropCard: (item: DragItem) => void;
  titleField?: string;
  interactive: boolean;
}> = ({ column, onDropCard, titleField, interactive }) => {
  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>(() => ({
    accept: DND_CARD,
    canDrop: () => interactive,
    drop: (item) => onDropCard(item),
    collect: (m) => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  }), [interactive, onDropCard, column.key]);

  return (
    <div
      ref={dropRef as unknown as React.LegacyRef<HTMLDivElement>}
      className={
        'flex w-64 flex-shrink-0 flex-col rounded-lg border bg-gray-50 dark:bg-gray-900 ' +
        (isOver && canDrop
          ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900'
          : 'border-gray-200 dark:border-gray-800')
      }
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
          {column.label}
        </span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {column.count}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {column.rows.length === 0 && (
          <div className="rounded border border-dashed border-gray-300 p-3 text-center text-[10px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
            Drop here
          </div>
        )}
        {column.rows.map((row) => (
          <Card key={row.id} row={row} columnKey={column.key} titleField={titleField} interactive={interactive} />
        ))}
      </div>
    </div>
  );
};

// ─── Card ────────────────────────────────────────────────────────

const Card: React.FC<{
  row: KanbanRow;
  columnKey: string;
  titleField?: string;
  interactive: boolean;
}> = ({ row, columnKey, titleField, interactive }) => {
  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: DND_CARD,
    item: { id: row.id, fromColumnKey: columnKey },
    canDrag: () => interactive,
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [row.id, columnKey, interactive]);

  // Pick a friendly title for the card
  const title = useMemo(() => {
    if (titleField && row.data[titleField] !== undefined) return String(row.data[titleField]);
    // Fall back to the first non-empty string field
    const firstString = Object.entries(row.data).find(
      ([, v]) => typeof v === 'string' && (v as string).trim().length > 0,
    );
    if (firstString) return String(firstString[1]);
    return `Submission #${row.id}`;
  }, [row.data, titleField, row.id]);

  // Subtitle: the second non-empty value, capped
  const subtitle = useMemo(() => {
    const entries = Object.entries(row.data).filter(
      ([, v]) => v !== null && v !== undefined && v !== '',
    );
    if (entries.length < 2) return null;
    const [k, v] = entries[1];
    const sv = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `${k}: ${sv.length > 60 ? sv.slice(0, 60) + '…' : sv}`;
  }, [row.data]);

  return (
    <div
      ref={dragRef as unknown as React.LegacyRef<HTMLDivElement>}
      className={
        'rounded-md border bg-white p-2 shadow-sm transition dark:bg-gray-800 ' +
        (isDragging ? 'opacity-50' : 'opacity-100') +
        ' ' +
        (interactive ? 'cursor-grab border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-700' : 'cursor-default border-gray-200 dark:border-gray-700')
      }
    >
      <p className="line-clamp-2 text-xs font-medium text-gray-800 dark:text-gray-100">
        {title}
      </p>
      {subtitle && (
        <p className="mt-1 line-clamp-1 text-[10px] text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>#{row.id}</span>
        <span>{new Date(row.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
};
