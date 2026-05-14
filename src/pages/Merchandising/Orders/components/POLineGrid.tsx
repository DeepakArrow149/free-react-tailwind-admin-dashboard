/**
 * PO Line Grid — top section of the new order entry screen.
 *
 * Each row represents one buyer PO (with its own date, ship date, port,
 * item description, size group, pack combo, UOM, pack/set, no of pieces,
 * quantity, order qty, production qty, cut qty rollups, attachments).
 *
 * Clicking a row selects it → the parent screen shows the matching
 * <ColorSizeMatrix> below.
 *
 * Excel-like UX: inline editable cells, sticky header, Tab/Arrow navigation.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { orderPoLineApi, type PoLine, type PoLineInput } from '../../../../api/merchandising';
import EditableCell, { type CellOption } from './EditableCell';

interface MasterOptions {
  ports: CellOption[];
  items: CellOption[];
  sizeGroups: CellOption[];
  uoms: CellOption[];
}

interface Props {
  orderId: number;
  lines: PoLine[];
  selectedLineId: number | null;
  masters: MasterOptions;
  readOnly?: boolean;
  onSelect: (lineId: number) => void;
  onChange: (lines: PoLine[]) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function POLineGrid({ orderId, lines, selectedLineId, masters, readOnly, onSelect, onChange }: Props) {
  const [busy, setBusy] = useState<number | null>(null);
  const [newRow, setNewRow] = useState<PoLineInput | null>(null);

  // Auto-select first line on mount
  useEffect(() => {
    if (!selectedLineId && lines.length > 0) onSelect(lines[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  const startNew = () => {
    if (readOnly) return;
    setNewRow({
      buyerPoNo: '',
      poDate: todayISO(),
      shipDate: todayISO(),
      noOfPieces: 1,
      portId: null, itemDescriptionId: null, sizeGroupId: null, uomId: null,
      packCombo: null, packSet: null, destination: null, remarks: null,
      matrix: [],
    });
  };

  const saveNew = async () => {
    if (!newRow) return;
    if (!newRow.buyerPoNo.trim()) { toast.error('Buyer PO No is required'); return; }
    try {
      const { data: resp } = await orderPoLineApi.create(orderId, newRow);
      onChange([...lines, resp.data]);
      onSelect(resp.data.id);
      setNewRow(null);
      toast.success('PO line created');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Create failed');
    }
  };

  const patchLine = async (lineId: number, patch: Partial<PoLineInput>) => {
    setBusy(lineId);
    try {
      const { data: resp } = await orderPoLineApi.update(orderId, lineId, patch);
      onChange(lines.map((l) => (l.id === lineId ? resp.data : l)));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = async (lineId: number, currentPoNo: string) => {
    const newPo = window.prompt('New Buyer PO No for the duplicate:', currentPoNo + '-COPY');
    if (!newPo?.trim()) return;
    try {
      const { data: resp } = await orderPoLineApi.duplicate(orderId, lineId, newPo);
      onChange([...lines, resp.data]);
      onSelect(resp.data.id);
      toast.success('PO line duplicated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Duplicate failed');
    }
  };

  const handleDelete = async (lineId: number) => {
    if (!confirm('Delete this PO line and all its matrix rows?')) return;
    try {
      await orderPoLineApi.delete(orderId, lineId);
      const next = lines.filter((l) => l.id !== lineId);
      onChange(next);
      if (selectedLineId === lineId) onSelect(next[0]?.id ?? 0);
      toast.success('PO line deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Delete failed');
    }
  };

  const totalRow = useMemo(() => {
    return lines.reduce(
      (acc, l) => ({
        quantity: acc.quantity + l.quantity,
        orderQty: acc.orderQty + l.orderQty,
        productionQty: acc.productionQty + l.productionQty,
        cutQty: acc.cutQty + l.cutQty,
      }),
      { quantity: 0, orderQty: 0, productionQty: 0, cutQty: 0 },
    );
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-white/2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">PO Lines</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Click a row to load its color × size matrix below</p>
        </div>
        {!readOnly && (
          <button type="button" onClick={startNew} disabled={!!newRow}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add PO Line
          </button>
        )}
      </div>

      <div className="max-h-[42vh] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-gray-100 text-[10px] uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th className="w-10 border-b border-gray-200 px-2 py-2 text-left">#</th>
              <th className="border-b border-gray-200 px-2 py-2 text-left">Buyer PO No</th>
              <th className="w-28 border-b border-gray-200 px-2 py-2 text-left">PO Date</th>
              <th className="w-28 border-b border-gray-200 px-2 py-2 text-left">Ship Date</th>
              <th className="w-28 border-b border-gray-200 px-2 py-2 text-left">Port</th>
              <th className="w-32 border-b border-gray-200 px-2 py-2 text-left">Destination</th>
              <th className="w-36 border-b border-gray-200 px-2 py-2 text-left">Item Desc</th>
              <th className="w-28 border-b border-gray-200 px-2 py-2 text-left">Size Group</th>
              <th className="w-28 border-b border-gray-200 px-2 py-2 text-left">Pack Combo</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-left">UOM</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-left">Pack/Set</th>
              <th className="w-14 border-b border-gray-200 px-2 py-2 text-right">Pcs</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Qty</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Order Qty</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Prod Qty</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Cut Qty</th>
              <th className="w-14 border-b border-gray-200 px-2 py-2 text-center">📎</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const isSelected = selectedLineId === l.id;
              const isBusy = busy === l.id;
              return (
                <tr
                  key={l.id}
                  onClick={() => onSelect(l.id)}
                  className={`cursor-pointer transition ${
                    isSelected ? 'bg-brand-50 ring-1 ring-inset ring-brand-300 dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/3'
                  } ${isBusy ? 'opacity-50' : ''}`}
                >
                  <td className="border-b border-gray-100 px-2 py-1 text-center text-gray-500">{l.lineNo}</td>
                  <EditableCell rowKey={l.id} colKey="buyerPoNo" type="text" value={l.buyerPoNo} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => v !== l.buyerPoNo && patchLine(l.id, { buyerPoNo: String(v) })} />
                  <EditableCell rowKey={l.id} colKey="poDate" type="date" value={l.poDate.slice(0, 10)} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => v && patchLine(l.id, { poDate: String(v) })} />
                  <EditableCell rowKey={l.id} colKey="shipDate" type="date" value={l.shipDate.slice(0, 10)} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => v && patchLine(l.id, { shipDate: String(v) })} />
                  <EditableCell rowKey={l.id} colKey="portId" type="select" options={masters.ports} value={l.portId ?? ''} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { portId: v == null ? null : Number(v) })} />
                  <EditableCell rowKey={l.id} colKey="destination" type="text" value={l.destination ?? ''} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { destination: v ? String(v) : null })} />
                  <EditableCell rowKey={l.id} colKey="itemDescriptionId" type="select" options={masters.items} value={l.itemDescriptionId ?? ''} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { itemDescriptionId: v == null ? null : Number(v) })} />
                  <EditableCell rowKey={l.id} colKey="sizeGroupId" type="select" options={masters.sizeGroups} value={l.sizeGroupId ?? ''} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { sizeGroupId: v == null ? null : Number(v) })} />
                  <EditableCell rowKey={l.id} colKey="packCombo" type="text" value={l.packCombo ?? ''} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { packCombo: v ? String(v) : null })} />
                  <EditableCell rowKey={l.id} colKey="uomId" type="select" options={masters.uoms} value={l.uomId ?? ''} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { uomId: v == null ? null : Number(v) })} />
                  <EditableCell rowKey={l.id} colKey="packSet" type="text" value={l.packSet ?? ''} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { packSet: v ? String(v) : null })} />
                  <EditableCell rowKey={l.id} colKey="noOfPieces" type="number" value={l.noOfPieces} align="right" numberMin={1} readOnly={readOnly}
                    onChange={() => {}} onCommit={(v) => patchLine(l.id, { noOfPieces: Number(v) || 1 })} />
                  <td className="border-b border-r border-gray-100 px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{l.quantity.toLocaleString()}</td>
                  <td className="border-b border-r border-gray-100 px-2 py-1 text-right font-medium text-emerald-600">{l.orderQty.toLocaleString()}</td>
                  <td className="border-b border-r border-gray-100 px-2 py-1 text-right text-gray-600">{l.productionQty.toLocaleString()}</td>
                  <td className="border-b border-r border-gray-100 px-2 py-1 text-right text-gray-600">{l.cutQty.toLocaleString()}</td>
                  <td className="border-b border-r border-gray-100 px-2 py-1 text-center text-gray-500">{l.attachments.length || ''}</td>
                  <td className="border-b border-gray-100 px-2 py-1 text-right">
                    {!readOnly && (
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleDuplicate(l.id, l.buyerPoNo)} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-800" title="Duplicate">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1m-6-3h6a2 2 0 002-2V5a2 2 0 00-2-2h-6a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <button type="button" onClick={() => handleDelete(l.id)} className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30" title="Delete">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Inline new-row */}
            {newRow && (
              <tr className="bg-emerald-50/40 dark:bg-emerald-900/10">
                <td className="border-b border-gray-100 px-2 py-1 text-center text-emerald-600">new</td>
                <td className="border-b border-r border-gray-100"><input autoFocus className="w-full bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="PO-001" value={newRow.buyerPoNo} onChange={(e) => setNewRow({ ...newRow, buyerPoNo: e.target.value })} /></td>
                <td className="border-b border-r border-gray-100"><input type="date" aria-label="po-date-new" className="w-full bg-transparent px-2 py-1.5 text-sm outline-none" value={newRow.poDate} onChange={(e) => setNewRow({ ...newRow, poDate: e.target.value })} /></td>
                <td className="border-b border-r border-gray-100"><input type="date" aria-label="ship-date-new" className="w-full bg-transparent px-2 py-1.5 text-sm outline-none" value={newRow.shipDate} onChange={(e) => setNewRow({ ...newRow, shipDate: e.target.value })} /></td>
                <td colSpan={11} className="border-b border-gray-100 px-2 text-xs text-gray-500">— remaining fields can be filled after save —</td>
                <td colSpan={2} className="border-b border-gray-100 px-2 py-1 text-right">
                  <button type="button" onClick={saveNew} className="rounded bg-brand-500 px-2 py-1 text-xs font-medium text-white hover:bg-brand-600">Save</button>
                  <button type="button" onClick={() => setNewRow(null)} className="ml-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                </td>
              </tr>
            )}

            {lines.length === 0 && !newRow && (
              <tr>
                <td colSpan={18} className="px-4 py-10 text-center text-sm text-gray-400">
                  No PO lines yet. {!readOnly && <button type="button" className="text-brand-500 hover:underline" onClick={startNew}>Add the first PO line →</button>}
                </td>
              </tr>
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-white/2">
              <tr className="font-semibold text-xs text-gray-700 dark:text-gray-300">
                <td colSpan={12} className="px-2 py-2 text-right">TOTAL</td>
                <td className="px-2 py-2 text-right">{totalRow.quantity.toLocaleString()}</td>
                <td className="px-2 py-2 text-right text-emerald-600">{totalRow.orderQty.toLocaleString()}</td>
                <td className="px-2 py-2 text-right">{totalRow.productionQty.toLocaleString()}</td>
                <td className="px-2 py-2 text-right">{totalRow.cutQty.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
