/**
 * FabricCadGrid — per-size CAD weight entry for a single fabric consumption row.
 * Columns: Size, Order Qty, Production Qty, Plan Qty, Gram, Total Weight (auto), F-Dia, K-Dia, Notes.
 */

import { useMemo } from 'react';
import EditableCell from './EditableCell';
import type { FabricCadDetail } from '../../../../api/merchandising';

interface Props {
  rows: FabricCadDetail[];
  readOnly?: boolean;
  onChange: (rows: FabricCadDetail[]) => void;
  onAutoGenerate?: () => void;
}

function round3(n: number) { return Math.round(n * 1000) / 1000; }

export default function FabricCadGrid({ rows, readOnly, onChange, onAutoGenerate }: Props) {
  const totals = useMemo(() => ({
    orderQty:    rows.reduce((s, r) => s + (r.orderQty    ?? 0), 0),
    planQty:     rows.reduce((s, r) => s + (r.planQty     ?? 0), 0),
    totalWeight: rows.reduce((s, r) => s + (Number(r.totalWeight) ?? 0), 0),
  }), [rows]);

  const update = (idx: number, patch: Partial<FabricCadDetail>) => {
    const next = rows.slice();
    const merged = { ...next[idx], ...patch } as FabricCadDetail;
    merged.totalWeight = round3((merged.planQty ?? 0) * Number(merged.gram ?? 0));
    next[idx] = merged;
    onChange(next);
  };

  const addRow = () => {
    onChange([
      ...rows,
      { sizeCode: '', orderQty: 0, productionQty: 0, planQty: 0, gram: 0, totalWeight: 0 },
    ]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">CAD Details (per Size)</h4>
        <div className="flex items-center gap-2">
          {!readOnly && onAutoGenerate && (
            <button type="button" onClick={onAutoGenerate}
              className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-300">
              Auto-generate from PO Matrix
            </button>
          )}
          {!readOnly && (
            <button type="button" onClick={addRow}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
              + Row
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/2">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Size</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Order Qty</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Prod Qty</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Plan Qty</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Gram</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Total Weight</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">F-Dia</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">K-Dia</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Notes</th>
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 9 : 10} className="px-3 py-6 text-center text-xs text-gray-400">
                  No CAD rows. {!readOnly && 'Click "+ Row" or auto-generate from PO Matrix.'}
                </td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const rowKey = `cad-${idx}`;
              return (
                <tr key={rowKey} className="border-t border-gray-100 dark:border-gray-800">
                  <EditableCell rowKey={rowKey} colKey="sizeCode" type="text" value={r.sizeCode} readOnly={readOnly}
                    onChange={(v) => update(idx, { sizeCode: String(v ?? '') })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="orderQty" type="number" align="right" value={r.orderQty} readOnly={readOnly}
                    onChange={(v) => update(idx, { orderQty: Number(v ?? 0) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="productionQty" type="number" align="right" value={r.productionQty} readOnly={readOnly}
                    onChange={(v) => update(idx, { productionQty: Number(v ?? 0) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="planQty" type="number" align="right" value={r.planQty} readOnly={readOnly}
                    onChange={(v) => update(idx, { planQty: Number(v ?? 0) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="gram" type="number" align="right" value={r.gram} readOnly={readOnly} numberStep={0.001}
                    onChange={(v) => update(idx, { gram: Number(v ?? 0) })} onCommit={() => {}} />
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-right text-gray-700 dark:border-gray-800 dark:text-white/80">
                    {Number(r.totalWeight ?? 0).toFixed(3)}
                  </td>
                  <EditableCell rowKey={rowKey} colKey="finishedDia" type="number" align="right" value={r.finishedDia ?? ''} readOnly={readOnly} numberStep={0.01}
                    onChange={(v) => update(idx, { finishedDia: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="knittingDia" type="number" align="right" value={r.knittingDia ?? ''} readOnly={readOnly} numberStep={0.01}
                    onChange={(v) => update(idx, { knittingDia: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="collarNotes" type="text" value={r.collarNotes ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { collarNotes: v == null ? null : String(v) })} onCommit={() => {}} />
                  {!readOnly && (
                    <td className="border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                      <button type="button" onClick={() => removeRow(idx)} className="text-xs text-red-500 hover:text-red-600" aria-label="Remove CAD row">×</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 font-medium dark:bg-white/2">
              <tr>
                <td className="px-3 py-2 text-xs text-gray-500">Totals</td>
                <td className="px-3 py-2 text-right text-xs text-gray-700">{totals.orderQty.toLocaleString()}</td>
                <td colSpan={1}></td>
                <td className="px-3 py-2 text-right text-xs text-gray-700">{totals.planQty.toLocaleString()}</td>
                <td></td>
                <td className="px-3 py-2 text-right text-xs font-semibold text-brand-600">{totals.totalWeight.toFixed(3)}</td>
                <td colSpan={readOnly ? 3 : 4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
