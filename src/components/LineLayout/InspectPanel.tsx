/**
 * InspectPanel — slide-in panel showing details of the selected station.
 * Displays machine icon, operation, SAM, and allows quick edits.
 */
import React from 'react';
import type { LayoutPosition } from '@/api/lineBalancing';
import DynamicMachineIcon from './DynamicMachineIcon';
import { getMachineColor } from '@/icons/MachineIcons';
import { useLayoutEditorStore } from '@/store/layoutEditorStore';

interface Props {
  position: LayoutPosition | null;
  onEdit: (pos: LayoutPosition) => void;
  onRemove: (posId: number) => void;
}

const InspectPanel: React.FC<Props> = ({ position, onEdit, onRemove }) => {
  const inspectOpen = useLayoutEditorStore((s) => s.inspectOpen);
  const closeInspect = useLayoutEditorStore((s) => s.closeInspect);

  if (!inspectOpen || !position) return null;

  const machineCode = position.machineType?.code ?? position.bulletinItem?.machineType;
  const mColor = getMachineColor(machineCode);
  const operationName = position.bulletinItem?.operation?.name;
  const operationCode = position.bulletinItem?.operation?.code;
  const sam = position.bulletinItem?.sam != null ? Number(position.bulletinItem.sam) : null;

  return (
    <div className="w-72 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Station Details</h3>
        <button
          onClick={closeInspect}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close inspect panel"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Icon + Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl border-2 border-gray-100 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-800/50">
            <DynamicMachineIcon
              code={machineCode}
              icon={(position.machineType as any)?.icon}
              size={64}
              color={mColor}
            />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {position.label || `Position #${position.positionNo}`}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {position.positionType} • Row {position.gridRow + 1}, Col {position.gridCol + 1}
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="space-y-2">
          <PropertyRow label="Position No" value={`#${position.positionNo}`} />
          <PropertyRow label="Machine Type" value={position.machineType?.name ?? machineCode ?? '—'} />
          {operationName && (
            <PropertyRow label="Operation" value={`${operationCode ? operationCode + ' — ' : ''}${operationName}`} />
          )}
          {sam != null && (
            <PropertyRow label="SAM" value={`${sam.toFixed(3)} min`} highlight />
          )}
          <PropertyRow label="Grid Position" value={`Row ${position.gridRow}, Col ${position.gridCol}`} />
          <PropertyRow label="Sort Order" value={String(position.sortOrder)} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onEdit(position)}
            className="flex-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onRemove(position.id)}
            className="flex-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

const PropertyRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    <span className={`text-xs font-medium ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
      {value}
    </span>
  </div>
);

export default React.memo(InspectPanel);
