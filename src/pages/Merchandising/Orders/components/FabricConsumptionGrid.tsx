/**
 * FabricConsumptionGrid — top-level grid listing engineered fabric rows for an order.
 * Click a row to reveal its CAD / Yarn / Color sub-grids (managed by the parent section).
 */

import EditableCell, { type CellOption } from './EditableCell';
import type { FabricConsumption } from '../../../../api/merchandising';

export interface FabricGridMasters {
  styleComponents: CellOption[];
  portions: CellOption[];
  fabricStructures: CellOption[];
  materials: CellOption[];                // all fabric-type materials
  materialsByStructure: Record<number, CellOption[]>; // optional filtered subsets
  knitTypes: CellOption[];
  washTypes: CellOption[];
  uoms: CellOption[];
}

interface Props {
  rows: FabricConsumption[];
  selectedId: number | null;
  masters: FabricGridMasters;
  readOnly?: boolean;
  onSelect: (id: number) => void;
  onPatch: (id: number, patch: Partial<FabricConsumption>) => void;
  onAdd: () => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function FabricConsumptionGrid({
  rows, selectedId, masters, readOnly,
  onSelect, onPatch, onAdd, onDuplicate, onDelete,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Fabric Consumption</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {rows.length} engineered fabric row{rows.length === 1 ? '' : 's'} — click a row to edit CAD / Yarn / Colors
          </p>
        </div>
        {!readOnly && (
          <button type="button" onClick={onAdd}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
            + Fabric Row
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1800px] text-sm">
          <thead className="bg-gray-50 dark:bg-white/2">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-500 w-12">#</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Style Component</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Portion</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Collar / Twill</th>
              <th className="px-2 py-2 text-center font-medium text-gray-500" title="Main Part">Main</th>
              <th className="px-2 py-2 text-center font-medium text-gray-500" title="Folding">Fold</th>
              <th className="px-2 py-2 text-center font-medium text-gray-500" title="Collar">Collar</th>
              <th className="px-2 py-2 text-center font-medium text-gray-500" title="Hand Cutting">H/C</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Structure</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Fabric</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500">Buy GSM</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500">Req GSM</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Wash</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Knit</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Design Ref</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">UOM</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">CAD Ref</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500">CAD Eff %</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500">Fabric Qty</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500">Yarn Qty</th>
              {!readOnly && <th className="w-24"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={readOnly ? 20 : 21} className="px-3 py-8 text-center text-xs text-gray-400">
                No engineered fabric rows. {!readOnly && 'Click "+ Fabric Row" to start.'}
              </td></tr>
            )}
            {rows.map((r) => {
              const rowKey = `fc-${r.id}`;
              const isSel = r.id === selectedId;
              const materialOptions = r.fabricStructureId
                ? (masters.materialsByStructure[r.fabricStructureId] ?? masters.materials)
                : masters.materials;
              return (
                <tr key={rowKey}
                    className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer ${isSel ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/2'}`}
                    onClick={() => onSelect(r.id)}>
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-800">
                    {r.rowNo}
                  </td>
                  <EditableCell rowKey={rowKey} colKey="styleComponentId" type="select" options={masters.styleComponents}
                    value={r.styleComponentId ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { styleComponentId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="portionId" type="select" options={masters.portions}
                    value={r.portionId ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { portionId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="collarTwill" type="text" value={r.collarTwill ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { collarTwill: v == null ? null : String(v) })} onCommit={() => {}} />
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                    <input type="checkbox" aria-label="Main part" title="Main part" checked={r.isMainPart} disabled={readOnly}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onPatch(r.id, { isMainPart: e.target.checked })} />
                  </td>
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                    <input type="checkbox" aria-label="Folding" title="Folding" checked={r.isFolding} disabled={readOnly}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onPatch(r.id, { isFolding: e.target.checked })} />
                  </td>
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                    <input type="checkbox" aria-label="Collar" title="Collar" checked={r.isCollar} disabled={readOnly}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onPatch(r.id, { isCollar: e.target.checked })} />
                  </td>
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                    <input type="checkbox" aria-label="Hand cutting" title="Hand cutting" checked={r.isHandCutting} disabled={readOnly}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onPatch(r.id, { isHandCutting: e.target.checked })} />
                  </td>
                  <EditableCell rowKey={rowKey} colKey="fabricStructureId" type="select" options={masters.fabricStructures}
                    value={r.fabricStructureId ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { fabricStructureId: v == null ? null : Number(v), materialId: null })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="materialId" type="select" options={materialOptions}
                    value={r.materialId ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { materialId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="buyGsm" type="number" align="right" value={r.buyGsm ?? ''} readOnly={readOnly} numberStep={0.01}
                    onChange={(v) => onPatch(r.id, { buyGsm: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="requiredGsm" type="number" align="right" value={r.requiredGsm ?? ''} readOnly={readOnly} numberStep={0.01}
                    onChange={(v) => onPatch(r.id, { requiredGsm: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="washTypeId" type="select" options={masters.washTypes}
                    value={r.washTypeId ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { washTypeId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="knitTypeId" type="select" options={masters.knitTypes}
                    value={r.knitTypeId ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { knitTypeId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="designReference" type="text" value={r.designReference ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { designReference: v == null ? null : String(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="uomId" type="select" options={masters.uoms}
                    value={r.uomId ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { uomId: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="cadReference" type="text" value={r.cadReference ?? ''} readOnly={readOnly}
                    onChange={(v) => onPatch(r.id, { cadReference: v == null ? null : String(v) })} onCommit={() => {}} />
                  <EditableCell rowKey={rowKey} colKey="cadEfficiency" type="number" align="right" value={r.cadEfficiency ?? ''} readOnly={readOnly} numberStep={0.001}
                    onChange={(v) => onPatch(r.id, { cadEfficiency: v == null ? null : Number(v) })} onCommit={() => {}} />
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-right text-gray-700 dark:border-gray-800 dark:text-white/80">
                    {Number(r.fabricQty ?? 0).toFixed(3)}
                  </td>
                  <td className="border-r border-b border-gray-100 px-2 py-1.5 text-right text-gray-700 dark:border-gray-800 dark:text-white/80">
                    {Number(r.yarnQty ?? 0).toFixed(3)}
                  </td>
                  {!readOnly && (
                    <td className="border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(r.id); }}
                        className="mr-2 text-xs text-brand-500 hover:text-brand-600" aria-label="Duplicate row">⎘</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                        className="text-xs text-red-500 hover:text-red-600" aria-label="Delete row">×</button>
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
