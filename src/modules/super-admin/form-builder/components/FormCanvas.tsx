/**
 * FormCanvas – Visual form editor canvas
 * Displays sections and fields, supports drag-and-drop reordering,
 * and field selection for property editing.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useFormBuilderStore } from '../store';
import type { FormField, FormSection, SectionVisibility } from '../types';

export default function FormCanvas() {
  const {
    activeForm,
    selectedFieldId,
    selectedSectionId,
    selectField,
    addField,
    removeField,
    moveField,
    moveSection,
    duplicateField,
    addSection,
    removeSection,
    updateSection,
    multiSelectedFieldIds,
    clearMultiSelect,
    bulkRemoveFields,
    bulkDuplicateFields,
    bulkSetWidth,
  } = useFormBuilderStore();

  const [dragOverSectionIdx, setDragOverSectionIdx] = useState<number | null>(null);

  const handleSectionDragStart = (e: React.DragEvent, sectionIdx: number) => {
    e.dataTransfer.setData('application/form-section-reorder', String(sectionIdx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, idx: number) => {
    const hasSection = e.dataTransfer.types.includes('application/form-section-reorder');
    if (!hasSection) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSectionIdx(idx);
  };

  const handleSectionDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    setDragOverSectionIdx(null);
    const fromIdxStr = e.dataTransfer.getData('application/form-section-reorder');
    if (fromIdxStr === '') return;
    const fromIdx = Number(fromIdxStr);
    if (fromIdx !== toIdx) moveSection(fromIdx, toIdx);
  };

  if (!activeForm) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-4xl shadow-inner dark:from-blue-900/20 dark:to-indigo-900/20">
            📋
          </div>
          <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No form selected</p>
          <p className="mt-1 text-sm">Create a new form or pick one from the list.</p>
        </div>
      </div>
    );
  }

  const multiCount = multiSelectedFieldIds.size;

  return (
    <div className="flex-1 overflow-y-auto p-6" role="main" aria-label="Form editor canvas">
      {/* Multi-select action bar (sticky at top of canvas) */}
      {multiCount > 0 && (
        <div
          className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/95 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-blue-900/40 dark:bg-blue-900/30"
          role="toolbar"
          aria-label="Multi-selection bulk actions"
        >
          <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
            {multiCount} field{multiCount === 1 ? '' : 's'} selected
          </span>
          <div className="mx-1 h-4 w-px bg-blue-200 dark:bg-blue-800" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">Width:</span>
          {(['full', 'half', 'third'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => bulkSetWidth(w)}
              className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 dark:bg-gray-800 dark:text-blue-300 dark:ring-blue-900/40 dark:hover:bg-blue-900/40"
            >
              {w}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-blue-200 dark:bg-blue-800" />
          <button
            type="button"
            onClick={bulkDuplicateFields}
            className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 dark:bg-gray-800 dark:text-blue-300 dark:ring-blue-900/40 dark:hover:bg-blue-900/40"
          >
            ⎘ Duplicate
          </button>
          <button
            type="button"
            onClick={() => {
              const n = multiCount;
              toast.warning(`Delete ${n} field${n === 1 ? '' : 's'}?`, {
                action: { label: 'Delete', onClick: () => bulkRemoveFields() },
                cancel: { label: 'Cancel', onClick: () => { /* dismiss */ } },
                duration: 6000,
              });
            }}
            className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-900/50"
          >
            🗑 Delete
          </button>
          <div className="ml-auto" />
          <button
            type="button"
            onClick={clearMultiSelect}
            className="rounded-md px-2 py-1 text-[11px] text-blue-600 hover:bg-white/60 dark:text-blue-400 dark:hover:bg-gray-800"
          >
            Clear
          </button>
        </div>
      )}

      {/* Form Header */}
      <div className="mb-6">
        <input
          type="text"
          value={activeForm.name}
          onChange={(e) =>
            useFormBuilderStore.getState().updateFormMeta({ name: e.target.value })
          }
          className="w-full border-0 bg-transparent text-2xl font-bold text-gray-800 placeholder-gray-300 focus:outline-none dark:text-white"
          placeholder="Form Title"
          aria-label="Form title"
        />
        <input
          type="text"
          value={activeForm.description || ''}
          onChange={(e) =>
            useFormBuilderStore.getState().updateFormMeta({ description: e.target.value })
          }
          className="mt-1 w-full border-0 bg-transparent text-sm text-gray-500 placeholder-gray-300 focus:outline-none dark:text-gray-400"
          placeholder="Form description (optional)"
          aria-label="Form description"
        />
      </div>

      {/* Sections */}
      {activeForm.sections.map((section, sectionIdx) => (
        <div
          key={section.id}
          draggable
          onDragStart={(e) => {
            // Only start section drag from the section header grip area
            const target = e.target as HTMLElement;
            if (!target.closest('[data-section-grip]')) {
              e.preventDefault();
              return;
            }
            handleSectionDragStart(e, sectionIdx);
          }}
          onDragOver={(e) => handleSectionDragOver(e, sectionIdx)}
          onDrop={(e) => handleSectionDrop(e, sectionIdx)}
          onDragLeave={() => setDragOverSectionIdx(null)}
          className={`transition-all ${dragOverSectionIdx === sectionIdx ? 'border-t-2 border-blue-500 pt-1' : ''}`}
        >
          <LazySection eager={sectionIdx < 3}>
          <SectionBlock
            section={section}
            sectionIdx={sectionIdx}
            totalSections={activeForm.sections.length}
            isLast={activeForm.sections.length <= 1}
            selectedFieldId={selectedFieldId}
            selectedSectionId={selectedSectionId}
            onSelectField={selectField}
            onAddField={addField}
            onRemoveField={removeField}
            onMoveField={moveField}
            onDuplicateField={duplicateField}
            onRemoveSection={removeSection}
            onUpdateSection={updateSection}
            onMoveSection={moveSection}
          />
        </LazySection>
        </div>
      ))}

      {/* Add Section */}
      <button
        type="button"
        onClick={addSection}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
      >
        <span aria-hidden="true" className="text-lg">+</span> Add Section
      </button>
    </div>
  );
}

// ─── Lazy Section (IntersectionObserver) ─────────────────────

/**
 * Defers mounting of offscreen sections until they approach the viewport.
 * The first `eager` sections render immediately; the rest show a skeleton
 * placeholder until the observer fires (200 px root-margin).
 * Once activated a section stays mounted — no unmount / remount flicker.
 */
function LazySection({ eager = false, children }: { eager?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(eager);

  useEffect(() => {
    if (activated) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activated]);

  if (activated) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="flex h-18 items-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 dark:border-gray-700 dark:bg-gray-800/20"
    >
      <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

// ─── Section Block ───────────────────────────────────────────

interface SectionBlockProps {
  section: FormSection;
  sectionIdx: number;
  totalSections: number;
  isLast: boolean;
  selectedFieldId: string | null;
  selectedSectionId: string | null;
  onSelectField: (fieldId: string | null, sectionId?: string | null, event?: React.MouseEvent) => void;
  onAddField: (sectionId: string, fieldType: string, insertIndex?: number) => void;
  onRemoveField: (sectionId: string, fieldId: string) => void;
  onMoveField: (fromSection: string, fromIdx: number, toSection: string, toIdx: number) => void;
  onDuplicateField: (sectionId: string, fieldId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<FormSection>) => void;
  onMoveSection: (fromIndex: number, toIndex: number) => void;
}

function SectionBlock({
  section,
  sectionIdx,
  totalSections,
  isLast,
  selectedFieldId,
  selectedSectionId,
  onSelectField,
  onAddField,
  onRemoveField,
  onMoveField,
  onDuplicateField,
  onRemoveSection,
  onUpdateSection,
  onMoveSection,
}: SectionBlockProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after'>('before');
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);

  // Multi-select state (sourced directly from the store; selecting Sets via
  // shallow zustand requires equality work, so we read the full hook here)
  const multiSelectedFieldIds = useFormBuilderStore((s) => s.multiSelectedFieldIds);
  const toggleMultiSelectField = useFormBuilderStore((s) => s.toggleMultiSelectField);
  const clearMultiSelect = useFormBuilderStore((s) => s.clearMultiSelect);

  // Determine drop type from current dataTransfer types (fallbacks gracefully)
  const dropEffectFor = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/form-field-reorder')) return 'move' as const;
    if (e.dataTransfer.types.includes('application/form-field-type')) return 'copy' as const;
    return 'move' as const;
  };

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = dropEffectFor(e);
    // Detect cursor position relative to the hovered card to choose before/after
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDragOverIndex(index);
    setDragOverPos(pos);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the actual zone (not entering a child)
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const finalIndex = dragOverPos === 'after' ? dropIndex + 1 : dropIndex;
      setDragOverIndex(null);
      setDraggingFieldId(null);

      // Drop from palette
      const fieldType = e.dataTransfer.getData('application/form-field-type');
      if (fieldType) {
        onAddField(section.id, fieldType, finalIndex);
        return;
      }

      // Drop from reorder
      const reorderData = e.dataTransfer.getData('application/form-field-reorder');
      if (reorderData) {
        try {
          const { sectionId: fromSec, fieldIndex: fromIdx } = JSON.parse(reorderData);
          // Adjust target index if moving within same section to a later slot
          let target = finalIndex;
          if (fromSec === section.id && fromIdx < target) target -= 1;
          if (fromSec !== section.id || fromIdx !== target) {
            onMoveField(fromSec, fromIdx, section.id, target);
          }
        } catch {
          /* malformed payload — ignore */
        }
      }
    },
    [section.id, onAddField, onMoveField, dragOverPos],
  );

  const handleFieldDragStart = (e: React.DragEvent, fieldIndex: number, fieldId: string) => {
    e.dataTransfer.setData(
      'application/form-field-reorder',
      JSON.stringify({ sectionId: section.id, fieldIndex }),
    );
    e.dataTransfer.effectAllowed = 'move';
    setDraggingFieldId(fieldId);
  };

  const handleFieldDragEnd = () => {
    setDraggingFieldId(null);
    setDragOverIndex(null);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
      {/* Section Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <span
          data-section-grip
          className="cursor-grab text-xs text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
          title="Drag to reorder section"
        >
          ⠿
        </span>
        <button
          type="button"
          onClick={() => onUpdateSection(section.id, { collapsed: !section.collapsed })}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {section.collapsed ? '▶' : '▼'}
        </button>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdateSection(section.id, { title: e.target.value })}
          className="flex-1 border-0 bg-transparent text-sm font-semibold text-gray-700 focus:outline-none dark:text-gray-200"
          placeholder="Section Title"
        />
        {/* Section reorder arrows */}
        {totalSections > 1 && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={sectionIdx === 0}
              onClick={() => onMoveSection(sectionIdx, sectionIdx - 1)}
              className="rounded px-1 py-0.5 text-[10px] text-gray-400 hover:bg-gray-100 disabled:opacity-20 dark:hover:bg-gray-700"
              title="Move section up"
              aria-label="Move section up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={sectionIdx === totalSections - 1}
              onClick={() => onMoveSection(sectionIdx, sectionIdx + 1)}
              className="rounded px-1 py-0.5 text-[10px] text-gray-400 hover:bg-gray-100 disabled:opacity-20 dark:hover:bg-gray-700"
              title="Move section down"
              aria-label="Move section down"
            >
              ↓
            </button>
          </div>
        )}
        {!isLast && (
          <button
            type="button"
            onClick={() => onRemoveSection(section.id)}
            className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            Remove
          </button>
        )}
        {/* Section Visibility indicator */}
        {section.visibility && section.visibility.dependsOn && (
          <span
            className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            title={`Visible when "${section.visibility.dependsOn}" ${section.visibility.operator} ${section.visibility.value ?? ''}`}
          >
            👁️ Conditional
          </span>
        )}
      </div>

      {/* Section Body */}
      {!section.collapsed && (
        <div className="p-4">
          {/* Section Visibility Config (collapsible) */}
          <SectionVisibilityConfig
            section={section}
            onUpdateSection={onUpdateSection}
          />

          {section.fields.length === 0 ? (
            <div
              className={`flex min-h-32 items-center justify-center rounded-xl border-2 border-dashed transition ${
                dragOverIndex === 0
                  ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-900/20 dark:ring-blue-900/40'
                  : 'border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-blue-600/40'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = dropEffectFor(e);
                setDragOverIndex(0);
                setDragOverPos('before');
              }}
              onDragLeave={(e) => {
                const related = e.relatedTarget as Node | null;
                if (related && (e.currentTarget as Node).contains(related)) return;
                setDragOverIndex(null);
              }}
              onDrop={(e) => handleDrop(e, 0)}
            >
              <div className={`px-6 py-3 text-center transition ${dragOverIndex === 0 ? 'scale-105' : ''}`}>
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-base shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" aria-hidden="true">
                  {dragOverIndex === 0 ? '⤓' : '＋'}
                </div>
                <p className={`text-sm font-medium ${dragOverIndex === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {dragOverIndex === 0 ? 'Release to drop' : 'Drag a field here'}
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  or click a tile in the field palette →
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {section.fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  sectionId={section.id}
                  isSelected={selectedFieldId === field.id && selectedSectionId === section.id}
                  isMultiSelected={multiSelectedFieldIds.has(field.id)}
                  isDragOver={dragOverIndex === index}
                  dragOverPos={dragOverIndex === index ? dragOverPos : null}
                  isDragging={draggingFieldId === field.id}
                  onSelect={(e) => {
                    if (e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
                      toggleMultiSelectField(field.id);
                    } else {
                      if (multiSelectedFieldIds.size > 0) clearMultiSelect();
                      onSelectField(field.id, section.id);
                    }
                  }}
                  onRemove={() => onRemoveField(section.id, field.id)}
                  onDuplicate={() => onDuplicateField(section.id, field.id)}
                  onDragStart={(e) => handleFieldDragStart(e, index, field.id)}
                  onDragEnd={handleFieldDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                />
              ))}

              {/* End drop zone — always present, expands when dragging */}
              <div
                className={`rounded-lg transition-all ${
                  draggingFieldId
                    ? 'min-h-10 border-2 border-dashed border-gray-300 dark:border-gray-600'
                    : 'h-2'
                } ${
                  dragOverIndex === section.fields.length
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-900/40'
                    : ''
                }`}
                aria-hidden="true"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = dropEffectFor(e);
                  setDragOverIndex(section.fields.length);
                  setDragOverPos('before');
                }}
                onDragLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (related && (e.currentTarget as Node).contains(related)) return;
                  setDragOverIndex(null);
                }}
                onDrop={(e) => handleDrop(e, section.fields.length)}
              >
                {dragOverIndex === section.fields.length && (
                  <div className="flex h-full items-center justify-center py-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Field Card ──────────────────────────────────────────────

interface FieldCardProps {
  field: FormField;
  index: number;
  sectionId: string;
  isSelected: boolean;
  isMultiSelected: boolean;
  isDragOver: boolean;
  dragOverPos: 'before' | 'after' | null;
  isDragging: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function FieldCard({
  field,
  isSelected,
  isMultiSelected,
  isDragOver,
  dragOverPos,
  isDragging,
  onSelect,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FieldCardProps) {
  const widthClass =
    field.width === 'half'
      ? 'w-1/2'
      : field.width === 'third'
        ? 'w-1/3'
        : 'w-full';

  const setSidePanel = useFormBuilderStore((s) => s.setSidePanel);

  // Suppress the click-to-select that fires after a successful drag
  const dragMovedRef = useRef(false);

  return (
    <div
      className={`relative ${widthClass} inline-block align-top transition`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop-position indicator (horizontal blue line) */}
      {isDragOver && dragOverPos === 'before' && (
        <div className="pointer-events-none absolute -top-1 left-0 right-0 z-10 h-1 rounded-full bg-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-900/40" />
      )}
      {isDragOver && dragOverPos === 'after' && (
        <div className="pointer-events-none absolute -bottom-1 left-0 right-0 z-10 h-1 rounded-full bg-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-900/40" />
      )}

      <div
        draggable
        onDragStart={(e) => { dragMovedRef.current = true; onDragStart(e); }}
        onDragEnd={() => { onDragEnd(); /* re-enable click after a tick */ setTimeout(() => { dragMovedRef.current = false; }, 50); }}
        onClick={(e) => { if (!dragMovedRef.current) onSelect(e); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        tabIndex={0}
        aria-label={`${field.label || field.type} field`}
        className={`group relative rounded-xl border px-4 py-3 transition cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
          isDragging
            ? 'opacity-30 ring-2 ring-blue-300'
            : isDragOver
              ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/10'
              : isMultiSelected
                ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-300 dark:bg-blue-900/20 dark:ring-blue-700'
                : isSelected
                  ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400 shadow-sm dark:bg-blue-900/15 dark:ring-blue-500/60'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50/70 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-blue-500/40'
        }`}
      >
        {/* Multi-select tick badge */}
        {isMultiSelected && (
          <div className="absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-800" aria-hidden="true">
            ✓
          </div>
        )}
        {/* Always-visible drag grip on the left edge */}
        <div
          className={`absolute left-0 top-0 flex h-full w-5 items-center justify-center rounded-l-xl select-none text-gray-300 transition ${
            isSelected ? 'text-blue-400' : 'group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400'
          }`}
          aria-hidden="true"
        >
          ⠿
        </div>

        {/* Type badge & action buttons */}
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <span
            className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider transition group-hover:hidden group-focus-within:hidden ${
              isSelected
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400'
            }`}
          >
            {field.type}
          </span>
          <div className="hidden items-center gap-0.5 rounded-md bg-white shadow-sm ring-1 ring-gray-200 group-hover:flex group-focus-within:flex dark:bg-gray-700 dark:ring-gray-600">
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onSelect(); setSidePanel('properties'); }}
              className="rounded-l-md p-1 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              title="Edit properties"
              aria-label="Edit properties"
            >
              <span aria-hidden="true">⚙</span>
            </button>
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-600"
              title="Duplicate (Ctrl+D)"
              aria-label="Duplicate field"
            >
              <span aria-hidden="true">⎘</span>
            </button>
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="rounded-r-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20"
              title="Delete (Del)"
              aria-label="Delete field"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          </div>
        </div>

        {/* Field Preview */}
        <div className="pl-3">
          <FieldPreview field={field} />
        </div>
      </div>
    </div>
  );
}

// ─── Section Visibility Config ───────────────────────────────

const VISIBILITY_OPERATORS: Array<{ value: SectionVisibility['operator']; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_empty', label: 'Is Not Empty' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

function SectionVisibilityConfig({
  section,
  onUpdateSection,
}: {
  section: FormSection;
  onUpdateSection: (id: string, updates: Partial<FormSection>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeForm = useFormBuilderStore((s) => s.activeForm);
  const allFields = activeForm?.sections.flatMap((s) => s.fields).filter((f) => !['heading', 'separator', 'columns'].includes(f.type)) || [];

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-gray-400 hover:text-blue-500 dark:text-gray-500"
      >
        {expanded ? '▼' : '▶'} Section Visibility{section.visibility?.dependsOn ? ' (configured)' : ''}
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/60 p-2.5 dark:border-gray-600 dark:bg-gray-700/30 space-y-2">
          <label className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={!!section.visibility}
              onChange={(e) => {
                if (e.target.checked) {
                  onUpdateSection(section.id, {
                    visibility: { dependsOn: allFields[0]?.name || '', operator: 'not_empty' },
                  });
                } else {
                  onUpdateSection(section.id, { visibility: undefined });
                }
              }}
              className="rounded border-gray-300"
            />
            Show section only when condition is met
          </label>
          {section.visibility && (
            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={section.visibility.dependsOn}
                onChange={(e) =>
                  onUpdateSection(section.id, {
                    visibility: { ...section.visibility!, dependsOn: e.target.value },
                  })
                }
                className="rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                aria-label="Visibility depends on field"
              >
                <option value="">Field…</option>
                {allFields.map((f) => (
                  <option key={f.id} value={f.name}>{f.label}</option>
                ))}
              </select>
              <select
                value={section.visibility.operator}
                onChange={(e) =>
                  onUpdateSection(section.id, {
                    visibility: { ...section.visibility!, operator: e.target.value as SectionVisibility['operator'] },
                  })
                }
                className="rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                aria-label="Visibility operator"
              >
                {VISIBILITY_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {!['is_empty', 'not_empty'].includes(section.visibility.operator) && (
                <input
                  type="text"
                  value={section.visibility.value !== undefined ? String(section.visibility.value) : ''}
                  onChange={(e) =>
                    onUpdateSection(section.id, {
                      visibility: { ...section.visibility!, value: e.target.value },
                    })
                  }
                  className="rounded border border-gray-300 bg-white px-1.5 py-1 text-[10px] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  aria-label="Visibility comparison value"
                  placeholder="Value"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline Field Preview ────────────────────────────────────

function FieldPreview({ field }: { field: FormField }) {
  const labelEl = (
    <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
      {field.label}
      {field.validation?.required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );

  switch (field.type) {
    case 'heading':
      return <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{field.label}</h3>;

    case 'separator':
      return <hr className="border-gray-300 dark:border-gray-600" />;

    case 'textarea':
      return (
        <>
          {labelEl}
          <div className="h-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            {field.placeholder || 'Enter text...'}
          </div>
        </>
      );

    case 'select':
    case 'multi-select':
      return (
        <>
          {labelEl}
          <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            <span>{field.placeholder || 'Select...'}</span>
            <span>▾</span>
          </div>
        </>
      );

    case 'radio':
      return (
        <>
          {labelEl}
          <div className="space-y-1">
            {(field.options || []).slice(0, 3).map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600" aria-hidden="true" />
                {o.label}
              </label>
            ))}
            {(field.options || []).length > 3 && (
              <p className="text-[10px] text-gray-400">+{(field.options || []).length - 3} more</p>
            )}
          </div>
        </>
      );

    case 'checkbox-group':
      return (
        <>
          {labelEl}
          <div className="space-y-1">
            {(field.options || []).slice(0, 3).map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-3 w-3 rounded-sm border border-gray-300 dark:border-gray-600" aria-hidden="true" />
                {o.label}
              </label>
            ))}
            {(field.options || []).length > 3 && (
              <p className="text-[10px] text-gray-400">+{(field.options || []).length - 3} more</p>
            )}
          </div>
        </>
      );

    case 'time':
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            ⏰ HH:MM
          </div>
        </>
      );

    case 'currency':
      return (
        <>
          {labelEl}
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            <span className="font-mono text-gray-500">$</span>
            <span>{field.placeholder || '0.00'}</span>
          </div>
        </>
      );

    case 'slider':
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-white px-2 py-2 dark:border-gray-600 dark:bg-gray-700">
            <div className="relative h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-600">
              <div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-blue-500" />
              <div className="absolute -top-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-blue-500 ring-2 ring-white shadow-sm dark:ring-gray-700" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>{field.validation?.min ?? 0}</span>
              <span>{field.validation?.max ?? 100}</span>
            </div>
          </div>
        </>
      );

    case 'color':
      return (
        <>
          {labelEl}
          <div className="flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-md border border-gray-200 shadow-sm dark:border-gray-600"
              style={{ backgroundColor: (field.defaultValue as string) || '#3b82f6' }}
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              {(field.defaultValue as string) || '#3b82f6'}
            </span>
          </div>
        </>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600" />
          {field.label}
        </label>
      );

    case 'switch':
      return (
        <label className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{field.label}</span>
          <div className="h-5 w-9 rounded-full bg-gray-300 dark:bg-gray-600" />
        </label>
      );

    case 'file':
    case 'image':
      return (
        <>
          {labelEl}
          <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            <span>{field.type === 'image' ? '🖼️' : '📎'}</span>
            Click to upload or drag & drop
          </div>
        </>
      );

    case 'rating':
      return (
        <>
          {labelEl}
          <div className="flex gap-1 text-lg text-gray-300 dark:text-gray-600">
            {'★★★★★'.split('').map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        </>
      );

    case 'signature':
      return (
        <>
          {labelEl}
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            ✍️ Click to sign
          </div>
        </>
      );

    case 'richtext':
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700">
            <div className="flex gap-1 border-b border-gray-200 px-2 py-1 dark:border-gray-600">
              <span className="text-[10px] text-gray-400">B</span>
              <span className="text-[10px] text-gray-400">I</span>
              <span className="text-[10px] text-gray-400">U</span>
              <span className="text-[10px] text-gray-400">•</span>
            </div>
            <div className="h-12 px-2 py-1 text-xs text-gray-400">
              {field.placeholder || 'Rich text...'}
            </div>
          </div>
        </>
      );

    case 'url':
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            🌐 {field.placeholder || 'https://...'}
          </div>
        </>
      );

    case 'password':
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            🔒 ••••••••
          </div>
        </>
      );

    case 'calculated':
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-600 italic dark:border-gray-600 dark:bg-amber-900/20 dark:text-amber-400">
            🧮 = {field.calculated?.formula || 'No formula set'}
          </div>
        </>
      );

    case 'repeater':
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-indigo-50 px-3 py-2 dark:border-gray-600 dark:bg-indigo-900/20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                🔁 Repeater &middot; {field.repeaterConfig?.subFields?.length || 0} sub-fields
              </span>
            </div>
            {field.repeaterConfig?.subFields && field.repeaterConfig.subFields.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {field.repeaterConfig.subFields.map((sf) => (
                  <span key={sf.id} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-500 border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
                    {sf.label}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-[10px] text-gray-400">
              {field.repeaterConfig?.minRows ? `Min ${field.repeaterConfig.minRows}` : ''}{' '}
              {field.repeaterConfig?.maxRows ? `· Max ${field.repeaterConfig.maxRows} rows` : '· Unlimited rows'}
            </p>
          </div>
        </>
      );

    default:
      return (
        <>
          {labelEl}
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
            {field.placeholder || `Enter ${field.type}...`}
          </div>
        </>
      );
  }
}
