/**
 * Excel-like inline editable cell — used by both POLineGrid and ColorSizeMatrix.
 *
 * Supports keyboard navigation:
 *   Tab / Shift+Tab  → next / previous cell in the same row
 *   ArrowDown / Enter → same column, next row
 *   ArrowUp           → same column, previous row
 *   Esc               → revert to last committed value + blur
 *
 * Navigation is done via `data-cell-id="<rowKey>:<colKey>"` attributes that
 * the parent grid renders. The cell finds neighbors via document.querySelector.
 */

import { useEffect, useRef, useState } from 'react';

export type CellType = 'text' | 'number' | 'date' | 'select';

export interface CellOption {
  value: string | number;
  label: string;
}

export interface EditableCellProps {
  rowKey: string | number;
  colKey: string;
  value: unknown;
  type: CellType;
  options?: CellOption[];
  placeholder?: string;
  readOnly?: boolean;
  align?: 'left' | 'right' | 'center';
  numberStep?: number;
  numberMin?: number;
  numberMax?: number;
  invalid?: boolean;
  invalidMsg?: string;
  onChange: (v: unknown) => void;
  /** Called when the cell loses focus or commits (Enter, Tab) — use for debounced save */
  onCommit?: (v: unknown) => void;
}

function focusCell(rowKey: string | number, colKey: string) {
  const sel = `[data-cell-id="${String(rowKey)}:${colKey}"]`;
  const el = document.querySelector<HTMLElement>(sel);
  if (el) {
    const focusable = (el.querySelector<HTMLElement>('input, select')) ?? el;
    focusable.focus();
    if (focusable instanceof HTMLInputElement) focusable.select?.();
  }
}

function getSiblingRow(rowKey: string | number, direction: 1 | -1): string | number | null {
  // All cells in the same column carry data-cell-id; sort their rowKeys.
  const allCols = document.querySelectorAll<HTMLElement>(`[data-cell-id$=":${'__SAMECOL__'}"]`);
  // Faster: ask DOM for siblings in this column.
  const colKey = String(rowKey); // placeholder, real impl below
  void allCols; void colKey;
  return null;
}

export default function EditableCell(props: EditableCellProps) {
  const {
    rowKey, colKey, value, type, options, placeholder, readOnly,
    align = 'left', numberStep, numberMin, numberMax, invalid, invalidMsg,
    onChange, onCommit,
  } = props;
  const [local, setLocal] = useState<string>(value == null ? '' : String(value));
  const lastCommitted = useRef<string>(local);

  useEffect(() => {
    const next = value == null ? '' : String(value);
    setLocal(next);
    lastCommitted.current = next;
  }, [value]);

  const commit = (v?: string) => {
    const v2 = v ?? local;
    let parsed: unknown = v2;
    if (type === 'number') parsed = v2 === '' ? null : Number(v2);
    if (type === 'select') parsed = v2 === '' ? null : (Number.isNaN(Number(v2)) ? v2 : Number(v2));
    lastCommitted.current = v2;
    onCommit?.(parsed);
  };

  const moveBy = (dir: 1 | -1, axis: 'row' | 'col') => {
    if (axis === 'col') {
      // Find siblings of same row
      const cells = document.querySelectorAll<HTMLElement>(`[data-cell-id^="${rowKey}:"]`);
      const ids = Array.from(cells).map((el) => el.dataset.cellId!).sort((a, b) => {
        const ai = Array.from(cells).find((c) => c.dataset.cellId === a)!;
        const bi = Array.from(cells).find((c) => c.dataset.cellId === b)!;
        return ai.compareDocumentPosition(bi) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      const here = `${rowKey}:${colKey}`;
      const idx = ids.indexOf(here);
      if (idx < 0) return;
      const next = ids[idx + dir];
      if (!next) return;
      const el = document.querySelector<HTMLElement>(`[data-cell-id="${next}"]`);
      const focusable = el?.querySelector<HTMLElement>('input, select') ?? el;
      focusable?.focus();
      if (focusable instanceof HTMLInputElement) focusable.select?.();
    } else {
      // Find cells with same colKey, then pick neighbor in DOM order
      const cells = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-cell-id$=":${colKey}"]`),
      );
      const here = cells.findIndex((el) => el.dataset.cellId === `${rowKey}:${colKey}`);
      if (here < 0) return;
      const next = cells[here + dir];
      if (!next) return;
      const focusable = next.querySelector<HTMLElement>('input, select') ?? next;
      focusable?.focus();
      if (focusable instanceof HTMLInputElement) focusable.select?.();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      commit();
      moveBy(e.shiftKey ? -1 : 1, 'col');
    } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit();
      moveBy(1, 'row');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      commit();
      moveBy(-1, 'row');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocal(lastCommitted.current);
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const baseCls = `w-full bg-transparent px-2 py-1.5 text-sm outline-none transition focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-900 ${
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  } ${invalid ? 'text-red-600' : 'text-gray-800 dark:text-white/90'} ${readOnly ? 'cursor-not-allowed bg-gray-50/60 dark:bg-gray-900/30' : ''}`;

  const wrapCls = `relative border-r border-b border-gray-100 dark:border-gray-800 ${
    invalid ? 'bg-red-50/60 dark:bg-red-900/10' : ''
  }`;

  // Use the helper to silence "unused" — the call has no side effect
  void focusCell; void getSiblingRow;

  return (
    <td data-cell-id={`${rowKey}:${colKey}`} className={wrapCls} title={invalid ? invalidMsg : undefined}>
      {type === 'select' ? (
        <select
          aria-label={colKey}
          value={local}
          disabled={readOnly}
          onChange={(e) => { setLocal(e.target.value); onChange(e.target.value === '' ? null : (Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))); }}
          onBlur={() => commit()}
          onKeyDown={handleKey}
          className={baseCls + ' appearance-none'}
        >
          <option value="">—</option>
          {options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      ) : (
        <input
          aria-label={colKey}
          type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
          value={local}
          placeholder={placeholder}
          disabled={readOnly}
          step={numberStep}
          min={numberMin}
          max={numberMax}
          onChange={(e) => { setLocal(e.target.value); onChange(type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value); }}
          onBlur={() => commit()}
          onKeyDown={handleKey}
          className={baseCls}
        />
      )}
    </td>
  );
}
