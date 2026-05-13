/**
 * Form Outline / Minimap
 *
 * Collapsible left-rail tree of sections + fields. Click a row to focus that
 * field/section in the canvas and open Properties. Drag handle (grip) on the
 * section header lets you reorder. Type icons + a "conditional" badge make
 * structure scannable for long forms.
 */
import { useEffect, useState } from 'react';
import { useFormBuilderStore } from '../store';
import { FIELD_PALETTE } from '../types';

const COLLAPSE_KEY = 'fb_outline_open';

export default function FormOutline() {
  const {
    activeForm,
    selectedFieldId,
    selectedSectionId,
    selectField,
    setSidePanel,
    moveSection,
  } = useFormBuilderStore();

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem(COLLAPSE_KEY);
    return v === null ? true : v === '1';
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLLAPSE_KEY, open ? '1' : '0');
    }
  }, [open]);

  if (!activeForm) return null;

  const totalFields = activeForm.sections.reduce((n, s) => n + s.fields.length, 0);

  const onJumpToField = (fieldId: string, sectionId: string, label: string) => {
    selectField(fieldId, sectionId);
    setSidePanel('properties');
    setTimeout(() => {
      const el = document.querySelector(`[aria-label="${label.replace(/"/g, '\\"')} field"]`);
      if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute left-2 top-2 z-10 flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        title="Show form outline"
        aria-label="Show form outline"
      >
        <span aria-hidden="true">🗂</span>
        <span className="hidden sm:inline">Outline</span>
      </button>
    );
  }

  return (
    <aside
      className="flex h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      aria-label="Form outline"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true">🗂</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Outline</span>
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {activeForm.sections.length}/{totalFields}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Hide outline"
          title="Hide outline"
        >
          <span aria-hidden="true">◀</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeForm.sections.map((section, sIdx) => {
          const sCollapsed = !!collapsedSections[section.id];
          const sActive = selectedSectionId === section.id && !selectedFieldId;
          return (
            <div key={section.id} className="mb-1">
              <div
                className={`group flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition ${
                  sActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCollapsedSections((c) => ({ ...c, [section.id]: !c[section.id] }))}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={sCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  <span aria-hidden="true" className={`inline-block transition-transform ${sCollapsed ? '-rotate-90' : ''}`}>▾</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectField(null, section.id)}
                  className="min-w-0 flex-1 truncate text-left font-semibold text-gray-700 dark:text-gray-200"
                  title={section.title || '(untitled)'}
                >
                  {section.title || '(untitled)'}
                </button>
                <span className="shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[9px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {section.fields.length}
                </span>
                {/* Reorder mini-controls */}
                <div className="hidden shrink-0 gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    disabled={sIdx === 0}
                    onClick={() => moveSection(sIdx, sIdx - 1)}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-600"
                    title="Move section up"
                    aria-label="Move section up"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    disabled={sIdx === activeForm.sections.length - 1}
                    onClick={() => moveSection(sIdx, sIdx + 1)}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-600"
                    title="Move section down"
                    aria-label="Move section down"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </div>
              </div>

              {!sCollapsed && (
                <div className="ml-3 border-l border-gray-100 pl-2 dark:border-gray-700">
                  {section.fields.length === 0 ? (
                    <p className="py-1 pl-2 text-[10px] italic text-gray-400">no fields</p>
                  ) : (
                    section.fields.map((f) => {
                      const isActive = selectedFieldId === f.id;
                      const icon = FIELD_PALETTE.find((p) => p.type === f.type)?.icon || '◯';
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onJumpToField(f.id, section.id, f.label || f.type)}
                          className={`group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition ${
                            isActive
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                          title={f.name}
                        >
                          <span className="shrink-0 text-sm" aria-hidden="true">{icon}</span>
                          <span className="min-w-0 flex-1 truncate">{f.label || '(no label)'}</span>
                          {f.validation?.required && (
                            <span className="text-red-500" aria-hidden="true" title="Required">*</span>
                          )}
                          {f.conditionalVisibility && (
                            <span className="text-amber-500" aria-hidden="true" title="Conditional">◇</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          <kbd className="rounded border border-gray-200 bg-white px-1 font-mono dark:border-gray-700 dark:bg-gray-800">
            Ctrl+K
          </kbd>{' '}
          for command palette
        </p>
      </div>
    </aside>
  );
}
