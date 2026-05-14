/**
 * ProcessSequenceGrid — editable sequence grid with react-dnd drag-and-drop reorder.
 *
 * Drag handle row + selectable row (click to reveal loss detail subgrid).
 * On drop, the parent's `onReorder(orderedIds)` runs; parent persists via API.
 */

import { useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import EditableCell, { type CellOption } from './EditableCell';
import type { ProcessSequence, LossType } from '../../../../api/merchandising';

const DRAG_TYPE = 'PROC_SEQ_ROW';

interface DragItem {
  id: number;
  index: number;
}

interface RowProps {
  row: ProcessSequence;
  index: number;
  isSelected: boolean;
  readOnly?: boolean;
  processOptions: CellOption[];
  onSelect: (id: number) => void;
  onPatch: (id: number, patch: Partial<ProcessSequence>) => void;
  onDelete: (id: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDropEnd: () => void;
}

function SequenceRow({
  row, index, isSelected, readOnly, processOptions,
  onSelect, onPatch, onDelete, onMove, onDropEnd,
}: RowProps) {
  const ref = useRef<HTMLTableRowElement | null>(null);

  const [{ isDragging }, drag, preview] = useDrag<DragItem, void, { isDragging: boolean }>(() => ({
    type: DRAG_TYPE,
    item: { id: row.id, index },
    canDrag: !readOnly,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDropEnd(),
  }), [row.id, index, readOnly, onDropEnd]);

  const [, drop] = useDrop<DragItem>(() => ({
    accept: DRAG_TYPE,
    hover: (item) => {
      if (item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
  }), [index, onMove]);

  preview(drop(ref));

  const rowKey = `seq-${row.id}`;
  return (
    <tr
      ref={ref}
      key={rowKey}
      onClick={() => onSelect(row.id)}
      className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer ${
        isSelected ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/2'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <td ref={drag as never} className="w-10 cursor-grab border-r border-b border-gray-100 px-2 py-1.5 text-center text-gray-400 dark:border-gray-800" title="Drag to reorder">
        ⠿
      </td>
      <td className="border-r border-b border-gray-100 px-2 py-1.5 text-center text-xs font-medium text-gray-500 dark:border-gray-800">{row.sequenceNo}</td>
      <EditableCell rowKey={rowKey} colKey="processId" type="select" options={processOptions}
        value={row.processId} readOnly={readOnly}
        onChange={(v) => onPatch(row.id, { processId: Number(v ?? 0) })} onCommit={() => {}} />
      <EditableCell rowKey={rowKey} colKey="lossType" type="select"
        options={[
          { value: 'PROCESS',    label: 'Process Wise' },
          { value: 'ITEM',       label: 'Item Wise' },
          { value: 'COLOR',      label: 'Color Wise' },
          { value: 'ITEM_COLOR', label: 'Item + Color' },
        ]}
        value={row.lossType} readOnly={readOnly}
        onChange={(v) => onPatch(row.id, { lossType: String(v ?? 'PROCESS') as LossType })} onCommit={() => {}} />
      <EditableCell rowKey={rowKey} colKey="lossPercent" type="number" align="right"
        value={row.lossPercent} readOnly={readOnly || row.lossType !== 'PROCESS'}
        numberStep={0.01} numberMin={0} numberMax={100}
        onChange={(v) => onPatch(row.id, { lossPercent: Number(v ?? 0) })} onCommit={() => {}} />
      <td className="border-r border-b border-gray-100 px-2 py-1.5 text-right text-gray-700 dark:border-gray-800 dark:text-white/80">
        {Number(row.inputQty ?? 0).toFixed(3)}
      </td>
      <td className="border-r border-b border-gray-100 px-2 py-1.5 text-right font-semibold text-brand-600 dark:border-gray-800">
        {Number(row.outputQty ?? 0).toFixed(3)}
      </td>
      <td className="border-r border-b border-gray-100 px-2 py-1.5 text-right text-gray-700 dark:border-gray-800 dark:text-white/80">
        {Number(row.inputGramQty ?? 0).toFixed(3)}
      </td>
      <td className="border-r border-b border-gray-100 px-2 py-1.5 text-right text-gray-700 dark:border-gray-800 dark:text-white/80">
        {Number(row.outputGramQty ?? 0).toFixed(3)}
      </td>
      {!readOnly && (
        <td className="border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
            className="text-xs text-red-500 hover:text-red-600" aria-label="Delete row">×</button>
        </td>
      )}
    </tr>
  );
}

interface Props {
  rows: ProcessSequence[];
  selectedId: number | null;
  readOnly?: boolean;
  processOptions: CellOption[];
  onSelect: (id: number) => void;
  onAdd: () => void;
  onPatch: (id: number, patch: Partial<ProcessSequence>) => void;
  onDelete: (id: number) => void;
  onReorder: (orderedIds: number[]) => void;
  /** Local-only reorder during drag — committed on drop end. */
  onLocalReorder: (fromIndex: number, toIndex: number) => void;
}

export default function ProcessSequenceGrid({
  rows, selectedId, readOnly, processOptions,
  onSelect, onAdd, onPatch, onDelete, onReorder, onLocalReorder,
}: Props) {
  const handleDropEnd = () => {
    onReorder(rows.map((r) => r.id));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Process Sequence</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag rows by the ⠿ handle to reorder. Each row's output feeds the next row's input.
            </p>
          </div>
          {!readOnly && (
            <button type="button" onClick={onAdd}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
              + Process Row
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/2">
              <tr>
                <th className="w-10 px-2 py-2"></th>
                <th className="w-12 px-2 py-2 text-center font-medium text-gray-500">#</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Process</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Loss Type</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Loss %</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Input Qty</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Output Qty</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Input Gram</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Output Gram</th>
                {!readOnly && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={readOnly ? 9 : 10} className="px-3 py-8 text-center text-xs text-gray-400">
                  No process steps yet. {!readOnly && 'Click "+ Process Row" to add the first step.'}
                </td></tr>
              )}
              {rows.map((r, idx) => (
                <SequenceRow
                  key={r.id}
                  row={r}
                  index={idx}
                  isSelected={r.id === selectedId}
                  readOnly={readOnly}
                  processOptions={processOptions}
                  onSelect={onSelect}
                  onPatch={onPatch}
                  onDelete={onDelete}
                  onMove={onLocalReorder}
                  onDropEnd={handleDropEnd}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DndProvider>
  );
}
