/**
 * ProcessLossDetailGrid — dynamic loss subgrid that appears when a process row's
 * lossType is ITEM / COLOR / ITEM_COLOR. Rows auto-seed from the group's selected
 * portions and colors when lossType changes.
 */

import EditableCell, { type CellOption } from './EditableCell';
import type { ProcessLossDetail, LossType } from '../../../../api/merchandising';

interface Props {
  lossType: LossType;
  rows: ProcessLossDetail[];
  portionOptions: CellOption[];
  colorOptions: CellOption[];
  readOnly?: boolean;
  onChange: (rows: ProcessLossDetail[]) => void;
}

export default function ProcessLossDetailGrid({
  lossType, rows, portionOptions, colorOptions, readOnly, onChange,
}: Props) {
  if (lossType === 'PROCESS') return null;

  const update = (idx: number, patch: Partial<ProcessLossDetail>) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch } as ProcessLossDetail;
    onChange(next);
  };

  const addRow = () => onChange([
    ...rows,
    {
      detailType: lossType as 'ITEM' | 'COLOR' | 'ITEM_COLOR',
      referencePortionId: null,
      referenceColorId: null,
      lossPercent: 0,
    },
  ]);

  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  const showPortion = lossType === 'ITEM' || lossType === 'ITEM_COLOR';
  const showColor   = lossType === 'COLOR' || lossType === 'ITEM_COLOR';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Loss Detail — {lossType.replace('_', ' + ')}
        </h4>
        {!readOnly && (
          <button type="button" onClick={addRow}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
            + Detail
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/2">
            <tr>
              {showPortion && <th className="px-3 py-2 text-left font-medium text-gray-500">Portion / Item</th>}
              {showColor   && <th className="px-3 py-2 text-left font-medium text-gray-500">Color</th>}
              <th className="px-3 py-2 text-right font-medium text-gray-500">Loss %</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Remarks</th>
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400">
                No detail rows. {!readOnly && 'Click "+ Detail" to add one.'}
              </td></tr>
            )}
            {rows.map((r, idx) => {
              const rowKey = `pld-${idx}`;
              return (
                <tr key={rowKey} className="border-t border-gray-100 dark:border-gray-800">
                  {showPortion && (
                    <EditableCell rowKey={rowKey} colKey="referencePortionId" type="select"
                      options={portionOptions} value={r.referencePortionId ?? ''} readOnly={readOnly}
                      onChange={(v) => update(idx, { referencePortionId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  )}
                  {showColor && (
                    <EditableCell rowKey={rowKey} colKey="referenceColorId" type="select"
                      options={colorOptions} value={r.referenceColorId ?? ''} readOnly={readOnly}
                      onChange={(v) => update(idx, { referenceColorId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  )}
                  <EditableCell rowKey={rowKey} colKey="lossPercent" type="number" align="right"
                    value={r.lossPercent} readOnly={readOnly} numberStep={0.01} numberMin={0} numberMax={100}
                    onChange={(v) => update(idx, { lossPercent: Number(v ?? 0) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="remarks" type="text" value={r.remarks ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { remarks: v == null ? null : String(v) })} onCommit={() => {}} />
                  {!readOnly && (
                    <td className="border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                      <button type="button" onClick={() => removeRow(idx)} className="text-xs text-red-500 hover:text-red-600" aria-label="Remove detail row">×</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
