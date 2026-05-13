/**
 * FieldPalette – Drag source for field types
 * Users drag fields from this palette onto the canvas.
 *
 * Features:
 * - Search across name, type and description
 * - Collapsible categories with localStorage-persisted expanded state
 * - "Recently used" tile row at the top (last 6 types, persisted)
 * - Click-to-add OR drag-and-drop to canvas
 */

import { useEffect, useMemo, useState } from 'react';
import { FIELD_PALETTE, type PaletteItem, type FieldType } from '../types';
import { useFormBuilderStore } from '../store';

const CATEGORIES: { key: PaletteItem['category']; label: string; hint: string }[] = [
  { key: 'basic', label: 'Basic Fields', hint: 'Common inputs' },
  { key: 'advanced', label: 'Advanced', hint: 'Specialized inputs' },
  { key: 'layout', label: 'Layout', hint: 'Structure your form' },
];

const RECENT_KEY = 'fb_palette_recent';
const COLLAPSED_KEY = 'fb_palette_collapsed';
const MAX_RECENT = 6;

function getRecent(): FieldType[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

function saveRecent(list: FieldType[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function getCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/**
 * Entity forms are physical-table-backed — they can't have fields that don't
 * map cleanly to a column (rich-text formatting, in-form repeaters, signatures
 * stored as canvas data, free-form columns layouts). The list below is what's
 * disallowed in entity-form mode.
 */
const ENTITY_DISALLOWED_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  'richtext',
  'signature',
  'repeater',
  'columns',
]);

export default function FieldPalette() {
  const { activeForm, addField, selectedSectionId } = useFormBuilderStore();
  const targetSectionId = selectedSectionId || activeForm?.sections[0]?.id;
  const isEntity = activeForm?.kind === 'entity';
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<FieldType[]>(() => getRecent());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => getCollapsed());

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/form-field-type', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (item: PaletteItem) => {
    if (!targetSectionId) return;
    addField(targetSectionId, item.type);
    const next = [item.type, ...recent.filter((t) => t !== item.type)].slice(0, MAX_RECENT);
    setRecent(next);
    saveRecent(next);
  };

  const normalizedSearch = search.toLowerCase().trim();
  const isSearching = normalizedSearch.length > 0;

  const recentItems = useMemo(
    () => recent.map((t) => FIELD_PALETTE.find((p) => p.type === t)).filter(Boolean) as PaletteItem[],
    [recent],
  );

  const matchesSearch = (p: PaletteItem) =>
    !isSearching ||
    p.label.toLowerCase().includes(normalizedSearch) ||
    p.type.toLowerCase().includes(normalizedSearch) ||
    (p.description || '').toLowerCase().includes(normalizedSearch);

  /** Hide disallowed types from entity palette (richtext/signature/repeater/columns). */
  const matchesKind = (p: PaletteItem) => !isEntity || !ENTITY_DISALLOWED_TYPES.has(p.type);

  const totalMatches = isSearching ? FIELD_PALETTE.filter(matchesSearch).length : 0;

  return (
    <div className="space-y-4" role="region" aria-label="Field palette">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Field Palette
          </h3>
          <div className="flex items-center gap-1">
            {isEntity && (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-900/40" title="Entity / Master mode — fields map to real DB columns">
                🗂 entity
              </span>
            )}
            {targetSectionId && targetSectionId !== activeForm?.sections[0]?.id && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-900/40">
                into selected section
              </span>
            )}
          </div>
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
          {isEntity
            ? 'Each field becomes a real DB column on publish. Some types are unavailable.'
            : 'Click a tile or drag onto the canvas'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search 25+ field types…"
          aria-label="Search field types"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pl-8 text-xs text-gray-700 placeholder-gray-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:ring-blue-900/40"
        />
        <span className="pointer-events-none absolute left-2.5 top-2 text-xs text-gray-400" aria-hidden="true">🔍</span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1.5 rounded p-0.5 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        {isSearching && (
          <p className="mt-1 text-[10px] text-gray-400">
            {totalMatches} match{totalMatches === 1 ? '' : 'es'}
          </p>
        )}
      </div>

      {/* Recently used */}
      {!isSearching && recentItems.length > 0 && (
        <PaletteGroup
          label="Recently used"
          hint="Your last picks"
          collapsed={collapsed['__recent']}
          onToggle={() => setCollapsed((c) => ({ ...c, __recent: !c.__recent }))}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {recentItems.map((item) => (
              <PaletteTile key={item.type} item={item} onDragStart={handleDragStart} onClick={() => handleClick(item)} />
            ))}
          </div>
        </PaletteGroup>
      )}

      {CATEGORIES.map(({ key, label, hint }) => {
        const items = FIELD_PALETTE.filter((p) => p.category === key && matchesSearch(p) && matchesKind(p));
        if (items.length === 0) return null;
        const isCollapsed = !!collapsed[key];
        return (
          <PaletteGroup
            key={key}
            label={label}
            hint={hint}
            count={items.length}
            collapsed={isSearching ? false : isCollapsed}
            onToggle={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((item) => (
                <PaletteTile key={item.type} item={item} onDragStart={handleDragStart} onClick={() => handleClick(item)} />
              ))}
            </div>
          </PaletteGroup>
        );
      })}

      {isSearching && totalMatches === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-400 dark:border-gray-600">
          No fields match "<span className="font-medium">{search}</span>"
        </div>
      )}
    </div>
  );
}

function PaletteGroup({
  label,
  hint,
  count,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  hint?: string;
  count?: number;
  collapsed?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-[11px] uppercase tracking-wider text-gray-500 transition hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block transition-transform text-gray-400 ${collapsed ? '-rotate-90' : ''}`}
            aria-hidden="true"
          >
            ▾
          </span>
          <span className="font-semibold">{label}</span>
          {hint && <span className="hidden xl:inline normal-case font-normal opacity-70">· {hint}</span>}
        </span>
        {typeof count === 'number' && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {count}
          </span>
        )}
      </button>
      {!collapsed && children}
    </div>
  );
}

function PaletteTile({
  item,
  onDragStart,
  onClick,
}: {
  item: PaletteItem;
  onDragStart: (e: React.DragEvent, item: PaletteItem) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onClick={onClick}
      className="group relative flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left text-xs font-medium text-gray-700 shadow-xs transition hover:-translate-y-px hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
      title={item.description}
    >
      <span className="text-base leading-none transition-transform group-hover:scale-110" aria-hidden="true">
        {item.icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <span className="absolute right-1 top-1 hidden text-[8px] uppercase tracking-wider text-gray-300 group-hover:block dark:text-gray-600" aria-hidden="true">
        +
      </span>
    </button>
  );
}
