/**
 * FabricColorMapGrid — garment color → fabric color → AOP color mapping.
 */

import EditableCell, { type CellOption } from './EditableCell';
import type { FabricColorMap } from '../../../../api/merchandising';

interface Props {
  rows: FabricColorMap[];
  colors: CellOption[];
  readOnly?: boolean;
  onChange: (rows: FabricColorMap[]) => void;
}

export default function FabricColorMapGrid({ rows, colors, readOnly, onChange }: Props) {
  const update = (idx: number, patch: Partial<FabricColorMap>) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch } as FabricColorMap;
    onChange(next);
  };

  const addRow = () => onChange([...rows, { garmentColorId: 0 }]);
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Color Mapping</h4>
        {!readOnly && (
          <button type="button" onClick={addRow}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
            + Mapping
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/2">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Garment Color *</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Fabric Color</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">AOP Color</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Remarks</th>
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={readOnly ? 4 : 5} className="px-3 py-6 text-center text-xs text-gray-400">
                No mappings. {!readOnly && 'Click "+ Mapping" to add one.'}
              </td></tr>
            )}
            {rows.map((r, idx) => {
              const rowKey = `cmap-${idx}`;
              const invalidGarment = !r.garmentColorId;
              return (
                <tr key={rowKey} className="border-t border-gray-100 dark:border-gray-800">
                  <EditableCell rowKey={rowKey} colKey="garmentColorId" type="select" options={colors}
                    value={r.garmentColorId || ''} readOnly={readOnly} invalid={invalidGarment} invalidMsg="Garment color is required"
                    onChange={(v) => update(idx, { garmentColorId: Number(v ?? 0) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="fabricColorId" type="select" options={colors}
                    value={r.fabricColorId ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { fabricColorId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="aopColorId" type="select" options={colors}
                    value={r.aopColorId ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { aopColorId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="remarks" type="text" value={r.remarks ?? ''} readOnly={readOnly}
                    onChange={(v) => update(idx, { remarks: v == null ? null : String(v) })} onCommit={() => {}} />
                  {!readOnly && (
                    <td className="border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                      <button type="button" onClick={() => removeRow(idx)} className="text-xs text-red-500 hover:text-red-600" aria-label="Remove mapping row">×</button>
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
