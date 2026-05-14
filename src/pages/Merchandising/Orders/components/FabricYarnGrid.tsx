/**
 * FabricYarnGrid — yarn composition per fabric consumption row.
 * Composition % must sum to 100 (footer highlights red when not).
 */

import { useMemo } from 'react';
import EditableCell, { type CellOption } from './EditableCell';
import type { FabricYarnDetail } from '../../../../api/merchandising';

interface Props {
  rows: FabricYarnDetail[];
  counts: CellOption[];
  readOnly?: boolean;
  onChange: (rows: FabricYarnDetail[]) => void;
}

export default function FabricYarnGrid({ rows, counts, readOnly, onChange }: Props) {
  const compositionSum = useMemo(
    () => rows.reduce((s, r) => s + Number(r.compositionPercent ?? 0), 0),
    [rows]
  );
  const totalQty = useMemo(
    () => rows.reduce((s, r) => s + Number(r.qty ?? 0), 0),
    [rows]
  );

  const update = (idx: number, patch: Partial<FabricYarnDetail>) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch } as FabricYarnDetail;
    onChange(next);
  };

  const addRow = () => onChange([
    ...rows,
    { compositionPercent: 0, qty: 0, isYarnDyed: false, isTwisted: false },
  ]);

  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  const compositionOk = rows.length === 0 || Math.abs(compositionSum - 100) < 0.01;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Yarn Composition</h4>
        {!readOnly && (
          <button type="button" onClick={addRow}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
            + Yarn
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/2">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Count</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Yarn Color</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Shade No</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Comp %</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">Y/D</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">Twist</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Remarks</th>
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={readOnly ? 8 : 9} className="px-3 py-6 text-center text-xs text-gray-400">
                No yarn rows. {!readOnly && 'Click "+ Yarn" to add a composition row.'}
              </td></tr>
            )}
            {rows.map((r, idx) => {
              const rowKey = `yarn-${idx}`;
              return (
                <tr key={rowKey} className="border-t border-gray-100 dark:border-gray-800">
                  <EditableCell rowKey={rowKey} colKey="countId" type="select" options={counts} value={r.countId ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { countId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="yarnColor" type="text" value={r.yarnColor ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { yarnColor: v == null ? null : String(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="shadeNo" type="text" value={r.shadeNo ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { shadeNo: v == null ? null : String(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="compositionPercent" type="number" align="right" value={r.compositionPercent} readOnly={readOnly}
                    numberStep={0.01} numberMin={0} numberMax={100}
                    onChange={(v) => update(idx, { compositionPercent: Number(v ?? 0) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="qty" type="number" align="right" value={r.qty} readOnly={readOnly} numberStep={0.001}
                    onChange={(v) => update(idx, { qty: Number(v ?? 0) })} onCommit={() => {}} />
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                    <input type="checkbox" aria-label="Yarn dyed" title="Yarn dyed" checked={r.isYarnDyed} disabled={readOnly}
                      onChange={(e) => update(idx, { isYarnDyed: e.target.checked })} />
                  </td>
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                    <input type="checkbox" aria-label="Twisted" title="Twisted" checked={r.isTwisted} disabled={readOnly}
                      onChange={(e) => update(idx, { isTwisted: e.target.checked })} />
                  </td>
                  <EditableCell rowKey={rowKey} colKey="remarks" type="text" value={r.remarks ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { remarks: v == null ? null : String(v) })} onCommit={() => {}} />
                  {!readOnly && (
                    <td className="border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                      <button type="button" onClick={() => removeRow(idx)} className="text-xs text-red-500 hover:text-red-600" aria-label="Remove yarn row">×</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 font-medium dark:bg-white/2">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-500">Totals</td>
                <td className={`px-3 py-2 text-right text-xs ${compositionOk ? 'text-brand-600' : 'text-red-600'}`}>
                  {compositionSum.toFixed(2)}%
                  {!compositionOk && <span className="ml-1">(must be 100%)</span>}
                </td>
                <td className="px-3 py-2 text-right text-xs text-gray-700">{totalQty.toFixed(3)}</td>
                <td colSpan={readOnly ? 3 : 4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
