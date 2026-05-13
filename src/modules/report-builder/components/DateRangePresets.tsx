/**
 * DateRangePresets — quick-select buttons that emit a [from, to] ISO tuple
 * for the `between` filter operator on date / datetime fields.
 *
 * Reduces the most common filter UX gripe: "give me last 30 days" shouldn't
 * require manually picking two dates.
 */

import { useMemo } from 'react';

export interface PresetRange {
  from: string;
  to: string;
}

export interface DateRangePresetsProps {
  /** Field type so we emit the right ISO precision. */
  fieldType: 'date' | 'datetime';
  /** Current value (tuple of two ISO strings) */
  value: unknown;
  onChange: (range: [string, string]) => void;
}

interface Preset {
  label: string;
  /** Range generator returns ISO strings */
  range: () => [Date, Date];
}

const PRESETS: Preset[] = [
  { label: 'Today',         range: () => { const s = startOfDay(); const e = endOfDay(); return [s, e]; } },
  { label: 'Yesterday',     range: () => { const s = startOfDay(-1); const e = endOfDay(-1); return [s, e]; } },
  { label: 'Last 7 days',   range: () => [startOfDay(-6), endOfDay()] },
  { label: 'Last 30 days',  range: () => [startOfDay(-29), endOfDay()] },
  { label: 'Last 90 days',  range: () => [startOfDay(-89), endOfDay()] },
  { label: 'This week',     range: () => weekRange(0) },
  { label: 'Last week',     range: () => weekRange(-1) },
  { label: 'This month',    range: () => monthRange(0) },
  { label: 'Last month',    range: () => monthRange(-1) },
  { label: 'This quarter',  range: () => quarterRange(0) },
  { label: 'Last quarter',  range: () => quarterRange(-1) },
  { label: 'This year',     range: () => yearRange(0) },
  { label: 'Last year',     range: () => yearRange(-1) },
  { label: 'YTD',           range: () => [new Date(new Date().getFullYear(), 0, 1, 0, 0, 0), endOfDay()] },
];

export function DateRangePresets({ fieldType, value, onChange }: DateRangePresetsProps) {
  const currentLabel = useMemo(() => activePresetLabel(value), [value]);

  function pick(preset: Preset) {
    const [from, to] = preset.range();
    if (fieldType === 'date') {
      onChange([toIsoDate(from), toIsoDate(to)]);
    } else {
      onChange([from.toISOString(), to.toISOString()]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => pick(p)}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
            currentLabel === p.label
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-950'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Date helpers ─────────────────────────────────────────────────────

/** Start of day, optionally offset by N days. */
function startOfDay(offsetDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(offsetDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** ISO week (Mon-Sun). offsetWeeks=-1 = last week, 0 = this week */
function weekRange(offsetWeeks: number): [Date, Date] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0=Mon..6=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return [monday, sunday];
}

function monthRange(offsetMonths: number): [Date, Date] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1, 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return [start, end];
}

function quarterRange(offsetQuarters: number): [Date, Date] {
  const today = new Date();
  const q = Math.floor(today.getMonth() / 3) + offsetQuarters;
  const year = today.getFullYear() + Math.floor(q / 4);
  const quarter = ((q % 4) + 4) % 4;
  const start = new Date(year, quarter * 3, 1, 0, 0, 0);
  const end = new Date(year, quarter * 3 + 3, 0, 23, 59, 59, 999);
  return [start, end];
}

function yearRange(offsetYears: number): [Date, Date] {
  const y = new Date().getFullYear() + offsetYears;
  return [new Date(y, 0, 1, 0, 0, 0), new Date(y, 11, 31, 23, 59, 59, 999)];
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Best-effort: which preset matches the current value? */
function activePresetLabel(value: unknown): string | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [from, to] = value as [string, string];
  for (const p of PRESETS) {
    const [pFrom, pTo] = p.range();
    const matchFrom = String(from).slice(0, 10) === toIsoDate(pFrom);
    const matchTo = String(to).slice(0, 10) === toIsoDate(pTo);
    if (matchFrom && matchTo) return p.label;
  }
  return null;
}
