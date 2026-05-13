/**
 * SavedViewsMenu — apply/save named filter+sort presets ("views") for a report.
 *
 * Visible only on saved reports (the `reportId` prop is required).
 *
 * Behavior:
 *   - Dropdown lists all views the user can apply: their own + shared views from
 *     others in the same company. Personal views are marked with a person icon.
 *   - Click an entry to apply: pushes filters/sort into the active report
 *     (which marks it dirty so the user can save the report or just preview).
 *   - "Save current as new view…" captures the active report's current filter
 *     rules + sort + (optional) name and POSTs to the API.
 *   - Delete is owner-only and confirms first.
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchSavedViews,
  createSavedView,
  deleteSavedView,
  type SavedView,
} from '../api/reportBuilderApi';
import { useReportBuilderStore } from '../store';
import type { FilterGroup, FilterRule, SortRule } from '../types';

export interface SavedViewsMenuProps {
  reportId: string;
}

export function SavedViewsMenu({ reportId }: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const setFilters = useReportBuilderStore((s) => s.setFilters);
  const setSort = useReportBuilderStore((s) => s.setSort);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Load views when first opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchSavedViews(reportId)
      .then((rows) => { if (!cancelled) setViews(rows); })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load views');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, reportId]);

  function applyView(v: SavedView) {
    // Translate the view's flat filter list back into a single AND group.
    const group: FilterGroup | undefined = v.filters.length > 0
      ? { combinator: 'and', rules: v.filters }
      : undefined;
    setFilters(group);
    setSort(v.sort ?? []);
    toast.success(`Applied view "${v.name}"`);
    setOpen(false);
  }

  async function handleSaveNew(name: string, isShared: boolean) {
    if (!name.trim()) return;
    setSavingNew(true);
    try {
      const filters = flattenFilters(activeReport?.query.filters);
      const sort: SortRule[] = activeReport?.query.sort ?? [];
      const created = await createSavedView(reportId, {
        name: name.trim(),
        filters,
        sort,
        isShared,
      });
      setViews((prev) => [created, ...prev]);
      setShowSaveForm(false);
      toast.success(`View "${created.name}" saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save view');
    } finally {
      setSavingNew(false);
    }
  }

  async function handleDelete(v: SavedView) {
    if (!confirm(`Delete saved view "${v.name}"?`)) return;
    try {
      await deleteSavedView(reportId, v.id);
      setViews((prev) => prev.filter((x) => x.id !== v.id));
      toast.success('View deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Saved views — recall named filter/sort combinations"
        className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        ⭐ Views
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              Saved Views
            </h4>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading && <p className="px-3 py-2 text-xs text-gray-500">Loading…</p>}
            {!loading && views.length === 0 && (
              <p className="px-3 py-2 text-xs italic text-gray-500">
                No saved views yet.
              </p>
            )}
            {!loading && views.map((v) => (
              <ViewRow
                key={v.id}
                view={v}
                onApply={() => applyView(v)}
                onDelete={() => handleDelete(v)}
              />
            ))}
          </div>

          <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
            {showSaveForm ? (
              <SaveViewForm
                onCancel={() => setShowSaveForm(false)}
                onSave={handleSaveNew}
                disabled={savingNew}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowSaveForm(true)}
                className="w-full rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                + Save current as new view…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row ──

function ViewRow({
  view, onApply, onDelete,
}: {
  view: SavedView;
  onApply: () => void;
  onDelete: () => void;
}) {
  const filterCount = view.filters.length;
  const sortCount = view.sort.length;
  return (
    <div className="group flex items-start gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
      <button
        type="button"
        onClick={onApply}
        className="min-w-0 flex-1 text-left"
        title={view.description || 'Click to apply this view'}
      >
        <div className="flex items-center gap-1">
          <span className="truncate font-medium text-gray-900 dark:text-gray-100">
            {view.name}
          </span>
          {view.isDefault && (
            <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              DEFAULT
            </span>
          )}
          {view.isShared && (
            <span className="rounded bg-violet-100 px-1 text-[9px] font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200">
              SHARED
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-gray-500 dark:text-gray-400">
          {filterCount} filter{filterCount === 1 ? '' : 's'} · {sortCount} sort rule{sortCount === 1 ? '' : 's'}
          {view.createdBy && ` · by ${view.createdBy}`}
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete view"
        aria-label={`Delete view ${view.name}`}
        className="opacity-0 transition group-hover:opacity-100 hover:text-red-600"
      >
        ✕
      </button>
    </div>
  );
}

// ── Save form ──

function SaveViewForm({
  onCancel, onSave, disabled,
}: {
  onCancel: () => void;
  onSave: (name: string, isShared: boolean) => void;
  disabled?: boolean;
}) {
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(name, isShared);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="View name (e.g. 'Q1 Top Buyers')"
        autoFocus
        aria-label="View name"
        maxLength={200}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      <label className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={isShared}
          onChange={(e) => setIsShared(e.target.checked)}
          className="h-3 w-3"
        />
        Share with everyone in my company
      </label>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || disabled}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {disabled ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

// ── Helpers ──

/**
 * Flatten the active report's filter group tree into a list of FilterRule.
 * Any AND/OR composition is collapsed to a single AND list — the saved view
 * model intentionally keeps things simple. Nested OR groups can't roundtrip
 * through this surface, but the rule itself is preserved.
 */
function flattenFilters(group: FilterGroup | undefined): FilterRule[] {
  if (!group) return [];
  const out: FilterRule[] = [];
  for (const r of group.rules) {
    if ('combinator' in r) {
      out.push(...flattenFilters(r));
    } else {
      out.push(r);
    }
  }
  return out;
}
