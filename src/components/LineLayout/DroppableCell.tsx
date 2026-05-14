/**
 * DroppableCell — a single grid cell that accepts a DraggableStation drop.
 * Uses react-dnd `useDrop`. Shows visual hover feedback.
 *
 * Now supports:
 *  - Drop on empty cell (move)
 *  - Drop on occupied cell (swap)
 *  - Empty-cell "Add" prompt on click
 *
 * Sized for the new larger station cards (~130×110px).
 */
import React from 'react';
import { useDrop } from 'react-dnd';
import { DND_ITEM_TYPE, type DragPayload } from './DraggableStation';

interface Props {
  row: number;
  col: number;
  isEmpty: boolean;
  onDrop: (payload: DragPayload, toRow: number, toCol: number) => void;
  onAddClick?: (row: number, col: number) => void;
  children?: React.ReactNode;
}

const DroppableCell: React.FC<Props> = ({ row, col, isEmpty, onDrop, onAddClick, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop<DragPayload, void, { isOver: boolean; canDrop: boolean }>({
    accept: DND_ITEM_TYPE,
    // Allow drops on both empty and occupied cells (swap behavior)
    canDrop: (item) => !(item.fromRow === row && item.fromCol === col),
    drop: (item) => onDrop(item, row, col),
    collect: (m) => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  });

  const highlight = isOver && canDrop
    ? isEmpty
      ? 'bg-brand-50 border-brand-400 dark:bg-brand-900/30 dark:border-brand-500 scale-[1.02]'
      : 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-500 scale-[1.01]'
    : isOver && !canDrop
    ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-600'
    : isEmpty
    ? 'border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
    : 'border-transparent';

  const handleEmptyClick = () => {
    if (isEmpty && onAddClick) {
      onAddClick(row, col);
    }
  };

  return (
    <div
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={`flex items-center justify-center rounded-xl border-2 transition-all ${highlight} ${isEmpty ? 'cursor-pointer' : ''}`}
      style={{ minWidth: 136, minHeight: 116 }}
      data-row={row}
      data-col={col}
      onClick={handleEmptyClick}
    >
      {children || (
        isEmpty && (
          <div className="flex flex-col items-center gap-1 text-gray-300 dark:text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-[9px] font-medium">Add</span>
          </div>
        )
      )}
      {/* Swap indicator overlay */}
      {isOver && canDrop && !isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-lg bg-amber-500/80 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            Swap
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DroppableCell);
