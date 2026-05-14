/**
 * FabricCombinationSelector — multi-select table of candidate fabric combinations
 * (cross-product of fabricConsumption × colorMap × yarnDetail) sourced from the
 * candidate-combinations endpoint. User picks rows + adjusts reqQty per row; the
 * container persists the selection set as the process group's selections array.
 */

import { useMemo, useState } from 'react';
import type { CandidateFabricCombination, ProcessGroupSelection } from '../../../../api/merchandising';

interface SelectionState {
  fabricConsumptionId: number;
  fabricColorMapId:    number | null;
  fabricYarnDetailId:  number | null;
  reqQty:     number;
  reqGramQty: number;
}

interface Props {
  candidates: CandidateFabricCombination[];
  currentSelections: ProcessGroupSelection[];
  readOnly?: boolean;
  onChange: (rows: SelectionState[]) => void;
}

function keyFor(c: { fabricConsumptionId: number; fabricColorMapId: number | null; fabricYarnDetailId: number | null }) {
  return `${c.fabricConsumptionId}|${c.fabricColorMapId ?? ''}|${c.fabricYarnDetailId ?? ''}`;
}

export default function FabricCombinationSelector({ candidates, currentSelections, readOnly, onChange }: Props) {
  // Map of key → selected state (qty overrides)
  const initial = useMemo(() => {
    const m = new Map<string, SelectionState>();
    for (const s of currentSelections) {
      m.set(keyFor(s), {
        fabricConsumptionId: s.fabricConsumptionId,
        fabricColorMapId:    s.fabricColorMapId,
        fabricYarnDetailId:  s.fabricYarnDetailId,
        reqQty:     Number(s.reqQty     ?? 0),
        reqGramQty: Number(s.reqGramQty ?? 0),
      });
    }
    return m;
  }, [currentSelections]);

  const [selected, setSelected] = useState<Map<string, SelectionState>>(initial);
  const [filter, setFilter] = useState('');

  const commit = (next: Map<string, SelectionState>) => {
    setSelected(next);
    onChange(Array.from(next.values()));
  };

  const toggle = (c: CandidateFabricCombination, checked: boolean) => {
    const k = keyFor(c);
    const next = new Map(selected);
    if (checked) {
      next.set(k, {
        fabricConsumptionId: c.fabricConsumptionId,
        fabricColorMapId:    c.fabricColorMapId,
        fabricYarnDetailId:  c.fabricYarnDetailId,
        reqQty:     c.defaultReqQty,
        reqGramQty: c.defaultReqGram,
      });
    } else {
      next.delete(k);
    }
    commit(next);
  };

  const updateQty = (k: string, field: 'reqQty' | 'reqGramQty', v: number) => {
    const next = new Map(selected);
    const cur = next.get(k);
    if (!cur) return;
    next.set(k, { ...cur, [field]: v });
    commit(next);
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      const blob = [
        c.portion?.name, c.portion?.code,
        c.fabric?.materialCode, c.fabric?.materialName,
        c.dyeColor?.colorName, c.aopColor?.colorName,
        c.count?.name, c.yarnColor,
      ].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [candidates, filter]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(keyFor(c)));
  const toggleAll = (checked: boolean) => {
    const next = new Map(selected);
    for (const c of filtered) {
      const k = keyFor(c);
      if (checked) next.set(k, {
        fabricConsumptionId: c.fabricConsumptionId,
        fabricColorMapId:    c.fabricColorMapId,
        fabricYarnDetailId:  c.fabricYarnDetailId,
        reqQty:     c.defaultReqQty,
        reqGramQty: c.defaultReqGram,
      });
      else next.delete(k);
    }
    commit(next);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Fabric Combinations</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selected.size} of {candidates.length} selected
          </p>
        </div>
        <input
          type="text"
          placeholder="Filter by portion / fabric / color..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
          aria-label="Filter combinations"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/2">
            <tr>
              <th className="w-10 px-3 py-2 text-center">
                <input type="checkbox" checked={allSelected} disabled={readOnly}
                  onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" title="Select all" />
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Portion</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Dye Color</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">AOP Color</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Fabric</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Counts</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Yarn Color</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Req Qty</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Req Gram</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-xs text-gray-400">
                No fabric combinations available. Add Fabric Consumption rows first.
              </td></tr>
            )}
            {filtered.map((c) => {
              const k = keyFor(c);
              const isSel = selected.has(k);
              const sel = selected.get(k);
              return (
                <tr key={k} className={`border-t border-gray-100 dark:border-gray-800 ${isSel ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/2'}`}>
                  <td className="px-3 py-1.5 text-center">
                    <input type="checkbox" checked={isSel} disabled={readOnly}
                      onChange={(e) => toggle(c, e.target.checked)} aria-label={`Select row ${c.rowNo}`} title="Select" />
                  </td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-white/80">{c.portion?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-white/80">{c.dyeColor?.colorName ?? '—'}</td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-white/80">{c.aopColor?.colorName ?? '—'}</td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-white/80">
                    {c.fabric ? `${c.fabric.materialCode} — ${c.fabric.materialName}` : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-white/80">{c.count?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-white/80">{c.yarnColor ?? '—'}</td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      value={sel?.reqQty ?? c.defaultReqQty}
                      disabled={!isSel || readOnly}
                      step={0.001}
                      min={0}
                      onChange={(e) => updateQty(k, 'reqQty', Number(e.target.value))}
                      className="w-24 rounded border border-gray-200 bg-transparent px-2 py-1 text-right text-xs outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-50"
                      aria-label="Required qty"
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      value={sel?.reqGramQty ?? c.defaultReqGram}
                      disabled={!isSel || readOnly}
                      step={0.001}
                      min={0}
                      onChange={(e) => updateQty(k, 'reqGramQty', Number(e.target.value))}
                      className="w-24 rounded border border-gray-200 bg-transparent px-2 py-1 text-right text-xs outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-50"
                      aria-label="Required gram qty"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { SelectionState };
