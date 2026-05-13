/**
 * Command Palette (Ctrl+K) — fast keyboard navigation for the Form Builder.
 *
 * Capabilities:
 *  - Jump to any field by label/name (focuses + scrolls + auto-opens Properties)
 *  - Jump to any section
 *  - Quick actions: add section, undo, redo, save, toggle preview, AI assistant
 *  - Add a new field of any type (typed by name)
 *
 * Trigger: Ctrl/Cmd+K, or "/" when nothing is focused.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormBuilderStore } from '../store';
import { FIELD_PALETTE } from '../types';
import { useAiChatStore } from '../aiChatStore';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: 'Fields' | 'Sections' | 'Add field' | 'Actions';
  icon?: string;
  run: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    activeForm,
    selectField,
    setSidePanel,
    addField,
    addSection,
    saveForm,
    undo,
    redo,
    togglePreview,
  } = useFormBuilderStore();
  const { toggleChat: toggleAi } = useAiChatStore();

  // Open on Ctrl/Cmd+K. Also "/" if no input focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable;
      if (isCtrl && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.key === '/' && !inField) { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape' && open) { setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands: Command[] = useMemo(() => {
    if (!activeForm) return [];
    const out: Command[] = [];

    // Fields
    for (const sec of activeForm.sections) {
      for (const f of sec.fields) {
        out.push({
          id: `f:${f.id}`,
          group: 'Fields',
          icon: FIELD_PALETTE.find((p) => p.type === f.type)?.icon || '◯',
          label: f.label || f.name || '(unnamed)',
          hint: `${sec.title} · ${f.type}`,
          run: () => {
            selectField(f.id, sec.id);
            setSidePanel('properties');
            // Scroll the canvas into view
            setTimeout(() => {
              const el = document.querySelector(`[aria-label="${(f.label || f.type).replace(/"/g, '\\"')} field"]`);
              if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
          },
        });
      }
    }

    // Sections
    for (const sec of activeForm.sections) {
      out.push({
        id: `s:${sec.id}`,
        group: 'Sections',
        icon: '📂',
        label: sec.title || '(untitled section)',
        hint: `${sec.fields.length} field${sec.fields.length === 1 ? '' : 's'}`,
        run: () => selectField(null, sec.id),
      });
    }

    // Add-field commands
    const targetSectionId = activeForm.sections[0]?.id;
    if (targetSectionId) {
      for (const p of FIELD_PALETTE) {
        out.push({
          id: `add:${p.type}`,
          group: 'Add field',
          icon: p.icon,
          label: `Add ${p.label}`,
          hint: p.description,
          run: () => addField(targetSectionId, p.type),
        });
      }
    }

    // Actions
    out.push(
      { id: 'a:save', group: 'Actions', icon: '💾', label: 'Save form', hint: 'Ctrl+S', run: () => saveForm() },
      { id: 'a:undo', group: 'Actions', icon: '↩', label: 'Undo', hint: 'Ctrl+Z', run: () => undo() },
      { id: 'a:redo', group: 'Actions', icon: '↪', label: 'Redo', hint: 'Ctrl+Y', run: () => redo() },
      { id: 'a:preview', group: 'Actions', icon: '👁', label: 'Toggle preview', hint: 'Ctrl+P', run: () => togglePreview() },
      { id: 'a:ai', group: 'Actions', icon: '✨', label: 'Open AI Assistant', run: () => toggleAi() },
      { id: 'a:section', group: 'Actions', icon: '➕', label: 'Add section', run: () => addSection() },
    );

    return out;
  }, [activeForm, selectField, setSidePanel, addField, addSection, saveForm, undo, redo, togglePreview, toggleAi]);

  // Filter
  const q = query.trim().toLowerCase();
  const filtered = q
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint || '').toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
      )
    : commands;

  // Group preserving order
  const groups: Record<string, Command[]> = {};
  for (const c of filtered) (groups[c.group] ||= []).push(c);
  const flat = Object.values(groups).flat();

  // Keep activeIdx in range when filter changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  const onKeyInList = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, Math.max(flat.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = flat[activeIdx];
      if (cmd) { cmd.run(); setOpen(false); }
    }
  };

  // Auto-scroll active item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <span className="text-gray-400" aria-hidden="true">🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyInList}
            placeholder="Jump to a field, section, or run a command…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-100"
            aria-label="Command query"
          />
          <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No matches for "{query}"</div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="sticky top-0 bg-gradient-to-b from-white to-white/95 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:from-gray-800 dark:to-gray-800/95">
                  {group}
                </div>
                {items.map((cmd) => {
                  const idx = flat.indexOf(cmd);
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={cmd.id}
                      data-cmd-idx={idx}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => { cmd.run(); setOpen(false); }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                        active
                          ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span className="w-5 text-base" aria-hidden="true">{cmd.icon}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="shrink-0 truncate text-[11px] text-gray-400">{cmd.hint}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="rounded border border-gray-300 bg-white px-1 dark:border-gray-600 dark:bg-gray-700">↑↓</kbd>Navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border border-gray-300 bg-white px-1 dark:border-gray-600 dark:bg-gray-700">↵</kbd>Select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-300 bg-white px-1 dark:border-gray-600 dark:bg-gray-700">Ctrl+K</kbd>
            <span>to open</span>
          </span>
        </div>
      </div>
    </div>
  );
}
