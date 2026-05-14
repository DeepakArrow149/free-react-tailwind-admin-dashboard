/**
 * DraggableStation — a station card that can be dragged to reposition on the layout grid.
 * Uses react-dnd `useDrag` to provide drag feedback.
 *
 * Redesigned for vertical line layout with dynamic DB icons, selection state,
 * and refined visual hierarchy. Card size: ~130×110px.
 */
import React from 'react';
import { useDrag } from 'react-dnd';
import type { LayoutPosition } from '@/api/lineBalancing';
import DynamicMachineIcon from './DynamicMachineIcon';
import { getMachineColor } from '@/icons/MachineIcons';
import { useLayoutEditorStore } from '@/store/layoutEditorStore';

export const DND_ITEM_TYPE = 'STATION';

export interface DragPayload {
  positionId: number;
  fromRow: number;
  fromCol: number;
}

const TYPE_LABELS: Record<string, string> = {
  WORKSTATION: 'WS',
  INPUT: 'IN',
  OUTPUT: 'OUT',
  QC: 'QC',
  PRESSING: 'PR',
  HELPER: 'HLP',
};

/** Left-border accent color per position type */
const TYPE_ACCENT: Record<string, string> = {
  WORKSTATION: '#3b82f6',
  INPUT: '#22c55e',
  OUTPUT: '#a855f7',
  QC: '#f59e0b',
  PRESSING: '#ef4444',
  HELPER: '#6b7280',
};

const POS_BG: Record<string, string> = {
  WORKSTATION: 'bg-white dark:bg-gray-900',
  INPUT: 'bg-green-50/60 dark:bg-green-950/30',
  OUTPUT: 'bg-purple-50/60 dark:bg-purple-950/30',
  QC: 'bg-amber-50/60 dark:bg-amber-950/30',
  PRESSING: 'bg-red-50/60 dark:bg-red-950/30',
  HELPER: 'bg-gray-50/60 dark:bg-gray-800/50',
};

interface Props {
  position: LayoutPosition;
  onEdit: (pos: LayoutPosition) => void;
  onRemove: (posId: number) => void;
  compact?: boolean;
}

const DraggableStation: React.FC<Props> = ({ position, onEdit, onRemove, compact }) => {
  const selectedId = useLayoutEditorStore((s) => s.selectedPositionId);
  const hoveredId = useLayoutEditorStore((s) => s.hoveredPositionId);
  const selectPosition = useLayoutEditorStore((s) => s.selectPosition);
  const hoverPosition = useLayoutEditorStore((s) => s.hoverPosition);

  const isSelected = selectedId === position.id;
  const isHovered = hoveredId === position.id;

  const [{ isDragging }, drag] = useDrag<DragPayload, void, { isDragging: boolean }>({
    type: DND_ITEM_TYPE,
    item: { positionId: position.id, fromRow: position.gridRow, fromCol: position.gridCol },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const machineCode = position.machineType?.code ?? position.bulletinItem?.machineType;
  const mColor = getMachineColor(machineCode);
  const bg = POS_BG[position.positionType] || POS_BG.WORKSTATION;
  const accentColor = TYPE_ACCENT[position.positionType] || TYPE_ACCENT.WORKSTATION;

  const typeLabel = TYPE_LABELS[position.positionType] ?? position.positionType;
  const operationName = position.bulletinItem?.operation?.name;
  const sam = position.bulletinItem?.sam != null ? Number(position.bulletinItem.sam) : null;
  const machineLabel = position.machineType?.code ?? position.bulletinItem?.machineType ?? null;

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={`group relative cursor-grab select-none overflow-hidden rounded-xl border shadow-sm transition-all ${bg} ${
        isDragging ? 'opacity-40 ring-2 ring-brand-400 scale-95' : ''
      } ${isSelected ? 'ring-2 ring-blue-500 shadow-blue-200 dark:shadow-blue-900/30' : ''} ${
        isHovered && !isSelected ? 'ring-1 ring-blue-300' : ''
      } ${!isDragging && !isSelected ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}`}
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderColor: isSelected ? '#3b82f6' : accentColor + '60',
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
        width: compact ? 100 : 130,
        minHeight: compact ? 80 : 110,
      }}
      title={`${position.positionType} #${position.positionNo}\n${position.label ?? ''}\n${operationName ?? ''}`}
      onClick={() => selectPosition(position.id)}
      onMouseEnter={() => hoverPosition(position.id)}
      onMouseLeave={() => hoverPosition(null)}
    >
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(position.id); }}
        className="absolute -right-1 -top-1 z-10 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow group-hover:flex"
        aria-label={`Remove position ${position.positionNo}`}
      >
        ✕
      </button>

      <div className="flex flex-col items-center p-1.5" onClick={() => onEdit(position)}>
        {/* Station header: type badge + number */}
        <div className="mb-1 flex w-full items-center justify-between px-0.5">
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {typeLabel} #{position.positionNo}
          </span>
          {machineLabel && (
            <span className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-[8px] font-medium text-gray-500 dark:text-gray-400">
              {machineLabel}
            </span>
          )}
        </div>

        {/* Machine illustration (Dynamic DB icon) */}
        <div className="my-1 flex items-center justify-center">
          <DynamicMachineIcon
            code={machineCode}
            icon={position.machineType?.icon}
            size={compact ? 36 : 48}
            color={mColor}
            animated
          />
        </div>

        {/* Label */}
        {position.label && (
          <div className="w-full truncate text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300">
            {position.label}
          </div>
        )}

        {/* Operation name */}
        {operationName && !compact && (
          <div className="w-full truncate text-center text-[8px] text-gray-500 dark:text-gray-400">
            {operationName}
          </div>
        )}

        {/* SAM badge */}
        {sam != null && (
          <div
            className="mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
            style={{ backgroundColor: mColor + 'cc' }}
          >
            {sam.toFixed(2)} SAM
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(DraggableStation);
