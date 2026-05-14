/**
 * Color × Size Matrix — bottom section, tied to the currently-selected PO line.
 *
 * Columns: Color · Size · Order Qty · Allow Type · Allow % · Allow Qty ·
 *          Extra 1 · Extra 2 · Extra 3 · Total Qty (computed) ·
 *          Production Qty · Cut Qty · Rate · Amount (computed)
 *
 * Features:
 *   - Auto-generate from selected colors × the PO line's size group
 *   - Per-row totals + amount auto-computed (mirrors server formula)
 *   - Add / remove rows manually
 *   - Save persists the full matrix via PATCH /po-lines/:id
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { orderPoLineApi, type AllowanceType, type PoLine, type PoMatrixRow } from '../../../../api/merchandising';
import EditableCell, { type CellOption } from './EditableCell';

interface Props {
  orderId: number;
  poLine: PoLine;
  colors: CellOption[];
  readOnly?: boolean;
  onChange: (next: PoLine) => void;
}

interface Draft extends PoMatrixRow {
  _key: string;        // stable React key
  _dirty?: boolean;
}

function rowKey(r: PoMatrixRow, idx: number) {
  return `${r.colorId}-${r.sizeCode}-${r.id ?? `n${idx}`}`;
}

// Mirror of the server formula (defense in depth).
function computeRow(r: Draft): Draft {
  const orderQty = Math.max(0, Math.floor(r.orderQty || 0));
  const pct = Number(r.allowancePct) || 0;
  const enteredAllow = Math.max(0, Math.floor(r.allowanceQty || 0));
  const extra1 = Math.max(0, Math.floor(r.extra1 || 0));
  const extra2 = Math.max(0, Math.floor(r.extra2 || 0));
  const extra3 = Math.max(0, Math.floor(r.extra3 || 0));
  const rate = Number(r.rate) || 0;
  const allowanceQty = r.allowanceType === 'PERCENT'
    ? Math.round(orderQty * pct / 100)
    : enteredAllow;
  const totalQty = orderQty + allowanceQty + extra1 + extra2 + extra3;
  const productionQty = r.productionQty ?? totalQty;
  const cutQty = r.cutQty ?? totalQty;
  const amount = Math.round(totalQty * rate * 100) / 100;
  return { ...r, allowanceQty, totalQty, productionQty, cutQty, amount };
}

export default function ColorSizeMatrix({ orderId, poLine, colors, readOnly, onChange }: Props) {
  const [rows, setRows] = useState<Draft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [pickedColorIds, setPickedColorIds] = useState<number[]>([]);
  const [defaultQty, setDefaultQty] = useState(0);
  const [defaultRate, setDefaultRate] = useState(0);

  // Hydrate from poLine when it changes
  useEffect(() => {
    const init: Draft[] = poLine.matrix.map((m, i) => computeRow({ ...m, _key: rowKey(m, i) }));
    setRows(init);
    setDirty(false);
  }, [poLine.id, poLine.matrix.length]);

  const patchRow = (key: string, patch: Partial<Draft>) => {
    setRows((prev) => prev.map((r) => (r._key === key ? computeRow({ ...r, ...patch, _dirty: true }) : r)));
    setDirty(true);
  };

  const addBlankRow = () => {
    if (colors.length === 0) { toast.error('No colors available'); return; }
    setRows((prev) => [...prev, computeRow({
      _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      colorId: colors[0].value as number,
      sizeId: null,
      sizeCode: '',
      orderQty: 0,
      allowanceType: 'PERCENT',
      allowancePct: 0,
      allowanceQty: 0,
      extra1: 0, extra2: 0, extra3: 0,
      rate: 0,
      remarks: null,
    })]);
    setDirty(true);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r._key !== key));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!dirty || readOnly) return;
    const invalid = rows.find((r) => !r.colorId || !r.sizeCode);
    if (invalid) { toast.error('Each row needs Color and Size'); return; }
    const seen = new Set<string>();
    for (const r of rows) {
      const key = `${r.colorId}|${r.sizeCode}`;
      if (seen.has(key)) { toast.error(`Duplicate Color+Size: ${r.sizeCode}`); return; }
      seen.add(key);
    }
    setSaving(true);
    try {
      const { data: resp } = await orderPoLineApi.update(orderId, poLine.id, {
        matrix: rows.map((r) => ({
          colorId: r.colorId, sizeId: r.sizeId ?? null, sizeCode: r.sizeCode,
          orderQty: r.orderQty, allowanceType: r.allowanceType,
          allowancePct: r.allowancePct, allowanceQty: r.allowanceQty,
          extra1: r.extra1, extra2: r.extra2, extra3: r.extra3,
          productionQty: r.productionQty, cutQty: r.cutQty,
          rate: r.rate, remarks: r.remarks ?? null,
        })),
      });
      onChange(resp.data);
      setDirty(false);
      toast.success('Matrix saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (pickedColorIds.length === 0) { toast.error('Pick at least one color'); return; }
    if (!poLine.sizeGroupId) { toast.error('PO line has no Size Group. Set it in the PO line row first.'); return; }
    try {
      const { data: resp } = await orderPoLineApi.autoGenerate(orderId, poLine.id, {
        colorIds: pickedColorIds,
        defaultOrderQty: defaultQty,
        defaultRate: defaultRate,
      });
      onChange(resp.data);
      setAutoGenOpen(false);
      setPickedColorIds([]);
      toast.success('Matrix rows generated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Generate failed');
    }
  };

  // Paste-from-Excel: when user pastes into orderQty column, distribute tab-separated values across columns of the same row
  const handlePaste = (rowIdx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const lines = text.trim().split(/\r?\n/).map((l) => l.split('\t'));
    setRows((prev) => {
      const next = [...prev];
      lines.forEach((parts, di) => {
        const target = next[rowIdx + di];
        if (!target) return;
        const [oq, ap, ae1, ae2, ae3, pr] = parts.map((p) => Number(p) || 0);
        next[rowIdx + di] = computeRow({
          ...target,
          orderQty: oq,
          allowancePct: ap,
          extra1: ae1, extra2: ae2, extra3: ae3,
          rate: pr || target.rate,
          _dirty: true,
        });
      });
      return next;
    });
    setDirty(true);
  };

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      orderQty: acc.orderQty + (r.orderQty || 0),
      allowanceQty: acc.allowanceQty + (r.allowanceQty || 0),
      extras: acc.extras + (r.extra1 || 0) + (r.extra2 || 0) + (r.extra3 || 0),
      totalQty: acc.totalQty + (r.totalQty || 0),
      productionQty: acc.productionQty + (r.productionQty || 0),
      cutQty: acc.cutQty + (r.cutQty || 0),
      amount: acc.amount + (r.amount || 0),
    }),
    { orderQty: 0, allowanceQty: 0, extras: 0, totalQty: 0, productionQty: 0, cutQty: 0, amount: 0 },
  ), [rows]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-white/2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Color × Size Matrix
            <span className="ml-2 text-xs font-normal text-gray-500">— for PO {poLine.buyerPoNo}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Order Qty + Allowance + Extras = Total Qty   •   Amount = Total Qty × Rate</p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAutoGenOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              ✨ Auto-generate
            </button>
            <button type="button" onClick={addBlankRow}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              + Row
            </button>
            <button type="button" onClick={handleSave} disabled={!dirty || saving}
              className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
              {saving ? 'Saving…' : dirty ? 'Save Matrix' : 'Saved'}
            </button>
          </div>
        )}
      </div>

      {autoGenOpen && (
        <div className="border-b border-gray-200 bg-amber-50 px-4 py-3 dark:border-gray-800 dark:bg-amber-900/10">
          <p className="mb-2 text-xs text-gray-700 dark:text-gray-300">
            Select colors → the system will create rows for each color × every size in the PO line's Size Group
            {poLine.sizeGroup ? <strong> ({poLine.sizeGroup.groupName})</strong> : <em className="ml-1 text-red-500"> (no Size Group set — pick one in the PO line row above)</em>}.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((c) => {
              const id = Number(c.value);
              const picked = pickedColorIds.includes(id);
              return (
                <button key={id} type="button" onClick={() => setPickedColorIds((p) => picked ? p.filter((x) => x !== id) : [...p, id])}
                  className={`rounded-full border px-3 py-1 text-xs ${picked ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              Default Order Qty:
              <input type="number" min={0} value={defaultQty} onChange={(e) => setDefaultQty(Number(e.target.value) || 0)} className="h-7 w-20 rounded border border-gray-300 px-2 dark:border-gray-700 dark:bg-gray-900" />
            </label>
            <label className="flex items-center gap-1.5">
              Default Rate:
              <input type="number" min={0} step={0.01} value={defaultRate} onChange={(e) => setDefaultRate(Number(e.target.value) || 0)} className="h-7 w-20 rounded border border-gray-300 px-2 dark:border-gray-700 dark:bg-gray-900" />
            </label>
            <button type="button" onClick={handleAutoGenerate} className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">Generate</button>
            <button type="button" onClick={() => setAutoGenOpen(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="max-h-[50vh] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-gray-100 text-[10px] uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th className="w-24 border-b border-gray-200 px-2 py-2 text-left">Color</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-left">Size</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Order Qty</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-left">Allow Type</th>
              <th className="w-16 border-b border-gray-200 px-2 py-2 text-right">Allow %</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Allow Qty</th>
              <th className="w-16 border-b border-gray-200 px-2 py-2 text-right">Extra 1</th>
              <th className="w-16 border-b border-gray-200 px-2 py-2 text-right">Extra 2</th>
              <th className="w-16 border-b border-gray-200 px-2 py-2 text-right">Extra 3</th>
              <th className="w-20 border-b border-gray-200 bg-emerald-50 px-2 py-2 text-right dark:bg-emerald-900/20">Total Qty</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Prod Qty</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Cut Qty</th>
              <th className="w-20 border-b border-gray-200 px-2 py-2 text-right">Rate</th>
              <th className="w-24 border-b border-gray-200 bg-emerald-50 px-2 py-2 text-right dark:bg-emerald-900/20">Amount</th>
              {!readOnly && <th className="w-10 border-b border-gray-200" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={readOnly ? 14 : 15} className="px-4 py-10 text-center text-sm text-gray-400">
                No matrix rows. {!readOnly && <button type="button" className="text-brand-500 hover:underline" onClick={() => setAutoGenOpen(true)}>Auto-generate from a size group →</button>}
              </td></tr>
            ) : rows.map((r, idx) => (
              <tr key={r._key} className="hover:bg-gray-50 dark:hover:bg-white/3">
                <EditableCell rowKey={r._key} colKey="colorId" type="select" options={colors} value={r.colorId} readOnly={readOnly}
                  onChange={(v) => patchRow(r._key, { colorId: Number(v) })} />
                <EditableCell rowKey={r._key} colKey="sizeCode" type="text" value={r.sizeCode} readOnly={readOnly}
                  onChange={(v) => patchRow(r._key, { sizeCode: String(v ?? '') })} />
                <td data-cell-id={`${r._key}:orderQty`} className="border-r border-b border-gray-100">
                  <input
                    aria-label="orderQty"
                    type="number" min={0} value={r.orderQty}
                    disabled={readOnly}
                    onChange={(e) => patchRow(r._key, { orderQty: Number(e.target.value) || 0 })}
                    onPaste={(e) => handlePaste(idx, e)}
                    className="w-full bg-transparent px-2 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </td>
                <EditableCell rowKey={r._key} colKey="allowanceType" type="select" value={r.allowanceType} readOnly={readOnly}
                  options={[{ value: 'PERCENT', label: '%' }, { value: 'QTY', label: 'Qty' }]}
                  onChange={(v) => patchRow(r._key, { allowanceType: v as AllowanceType })} />
                <EditableCell rowKey={r._key} colKey="allowancePct" type="number" align="right" value={r.allowancePct} readOnly={readOnly || r.allowanceType !== 'PERCENT'} numberStep={0.01} numberMin={0} numberMax={100}
                  onChange={(v) => patchRow(r._key, { allowancePct: Number(v) || 0 })} />
                <EditableCell rowKey={r._key} colKey="allowanceQty" type="number" align="right" value={r.allowanceQty} readOnly={readOnly || r.allowanceType !== 'QTY'} numberMin={0}
                  onChange={(v) => patchRow(r._key, { allowanceQty: Number(v) || 0 })} />
                <EditableCell rowKey={r._key} colKey="extra1" type="number" align="right" value={r.extra1} readOnly={readOnly} numberMin={0}
                  onChange={(v) => patchRow(r._key, { extra1: Number(v) || 0 })} />
                <EditableCell rowKey={r._key} colKey="extra2" type="number" align="right" value={r.extra2} readOnly={readOnly} numberMin={0}
                  onChange={(v) => patchRow(r._key, { extra2: Number(v) || 0 })} />
                <EditableCell rowKey={r._key} colKey="extra3" type="number" align="right" value={r.extra3} readOnly={readOnly} numberMin={0}
                  onChange={(v) => patchRow(r._key, { extra3: Number(v) || 0 })} />
                <td className="border-r border-b border-gray-100 bg-emerald-50 px-2 py-1 text-right text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{r.totalQty ?? 0}</td>
                <EditableCell rowKey={r._key} colKey="productionQty" type="number" align="right" value={r.productionQty ?? 0} readOnly={readOnly} numberMin={0}
                  onChange={(v) => patchRow(r._key, { productionQty: Number(v) || 0 })} />
                <EditableCell rowKey={r._key} colKey="cutQty" type="number" align="right" value={r.cutQty ?? 0} readOnly={readOnly} numberMin={0}
                  onChange={(v) => patchRow(r._key, { cutQty: Number(v) || 0 })} />
                <EditableCell rowKey={r._key} colKey="rate" type="number" align="right" value={r.rate} readOnly={readOnly} numberStep={0.01} numberMin={0}
                  onChange={(v) => patchRow(r._key, { rate: Number(v) || 0 })} />
                <td className="border-r border-b border-gray-100 bg-emerald-50 px-2 py-1 text-right text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">${(r.amount ?? 0).toFixed(2)}</td>
                {!readOnly && (
                  <td className="border-b border-gray-100 px-1 py-1 text-center">
                    <button type="button" onClick={() => removeRow(r._key)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Remove row">✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-white/2">
              <tr className="font-semibold text-xs text-gray-700 dark:text-gray-300">
                <td colSpan={2} className="px-2 py-2 text-right">TOTAL</td>
                <td className="px-2 py-2 text-right">{totals.orderQty.toLocaleString()}</td>
                <td />
                <td />
                <td className="px-2 py-2 text-right">{totals.allowanceQty.toLocaleString()}</td>
                <td colSpan={3} className="px-2 py-2 text-right">{totals.extras.toLocaleString()}</td>
                <td className="bg-emerald-50 px-2 py-2 text-right text-emerald-700 dark:bg-emerald-900/20">{totals.totalQty.toLocaleString()}</td>
                <td className="px-2 py-2 text-right">{totals.productionQty.toLocaleString()}</td>
                <td className="px-2 py-2 text-right">{totals.cutQty.toLocaleString()}</td>
                <td />
                <td className="bg-emerald-50 px-2 py-2 text-right text-emerald-700 dark:bg-emerald-900/20">${totals.amount.toFixed(2)}</td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
