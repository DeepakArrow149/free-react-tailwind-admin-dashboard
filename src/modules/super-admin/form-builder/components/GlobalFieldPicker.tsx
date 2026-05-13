/**
 * GlobalFieldPicker – Browse & add pre-defined global fields to the form.
 *
 * Fetches from the Global Field Registry API and lets users:
 *  - Search by label / key / description
 *  - Filter by category and module scope
 *  - Drag a global field onto the canvas (same DnD protocol as FieldPalette)
 *  - Click to add to the first section
 *  - See a sync badge for fields already bound to the active form
 *
 * When a global field is added, the component creates a FormField with
 * matching type/label/validation and stores the `global_field_id` so
 * the backend can track the binding.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFormBuilderStore } from '../store';
import { createDefaultField, generateId } from '../types';
import type { FieldType, FormField } from '../types';
import {
  fetchGlobalFields,
  fetchGlobalFieldCategories,
  seedGlobalFields,
  type GlobalFieldItem,
} from '../../api/formBuilderApi';
import { toast } from 'sonner';

// ─── Category display helpers ────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  contact: '👤',
  product: '👕',
  order: '📦',
  quality: '✅',
  production: '🏭',
  finance: '💰',
  hrm: '🧑‍💼',
  logistics: '🚚',
  compliance: '📋',
  custom: '⚙️',
};

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

// ─── Field type icon mapping (matches FieldPalette) ──────────

const FIELD_TYPE_ICONS: Record<string, string> = {
  text: '📝', number: '#️⃣', email: '✉️', phone: '📞',
  url: '🔗', password: '🔒', textarea: '📄', richtext: '📰',
  select: '📋', 'multi-select': '☑️', checkbox: '✓', switch: '🔘',
  date: '📅', datetime: '🕐', file: '📎', image: '🖼️',
  rating: '⭐', signature: '✍️', heading: '🔤', separator: '➖',
  columns: '▦', lookup: '🔍', calculated: '🧮', repeater: '🔁',
  currency: '💲', time: '⏰', radio: '⭕', 'checkbox-group': '☑️',
};

// ─── Component ───────────────────────────────────────────────

export default function GlobalFieldPicker() {
  const { activeForm } = useFormBuilderStore();
  const firstSectionId = activeForm?.sections[0]?.id;

  // State
  const [fields, setFields] = useState<GlobalFieldItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Set of global field keys already present in the active form
  const boundFieldKeys = useMemo(() => {
    if (!activeForm) return new Set<string>();
    const keys = new Set<string>();
    for (const section of activeForm.sections) {
      for (const field of section.fields) {
        // Field name matches global field_key
        keys.add(field.name);
      }
    }
    return keys;
  }, [activeForm]);

  // ─── Data fetching ───────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsData, catsData] = await Promise.all([
        fetchGlobalFields({
          category: selectedCategory || undefined,
          search: search.trim() || undefined,
        }),
        fetchGlobalFieldCategories(),
      ]);
      setFields(fieldsData);
      if (catsData.length > 0) {
        setCategories(catsData);
        setExpandedCategories((prev) => prev.size === 0 ? new Set(catsData) : prev);
      }
    } catch {
      // Silently fail — will show empty state
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    const debounceMs = search ? 300 : 0;
    const timer = setTimeout(() => {
      loadData();
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  // ─── Handlers ────────────────────────────────────────────

  const handleAddGlobalField = useCallback(
    (gf: GlobalFieldItem) => {
      if (!firstSectionId) {
        toast.error('Add a section to the form first');
        return;
      }

      // Check if already added
      if (boundFieldKeys.has(gf.fieldKey)) {
        toast.info(`"${gf.label}" is already on this form`);
        return;
      }

      // Create a form field from the global field definition
      const base = createDefaultField(gf.fieldType as FieldType);
      const field: FormField = {
        ...base,
        id: generateId(),
        name: gf.fieldKey,
        label: gf.label,
        placeholder: gf.description || base.placeholder,
        validation: gf.defaultValidation
          ? { ...base.validation, ...gf.defaultValidation }
          : base.validation,
        options: gf.defaultOptions
          ? (gf.defaultOptions as Array<{ label: string; value: string }>)
          : base.options,
      };

      // Use the store's addField with modified field
      // We call the raw set to inject our custom field
      const store = useFormBuilderStore.getState();
      const activeFormCopy = store.activeForm;
      if (!activeFormCopy) return;

      const sections = activeFormCopy.sections.map((sec) => {
        if (sec.id !== firstSectionId) return sec;
        return { ...sec, fields: [...sec.fields, field] };
      });

      useFormBuilderStore.setState((s) => ({
        activeForm: {
          ...activeFormCopy,
          sections,
          updatedAt: new Date().toISOString(),
        },
        selectedFieldId: field.id,
        selectedSectionId: firstSectionId,
        sidePanel: 'properties' as const,
        undoStack: [
          ...s.undoStack.slice(-19),
          JSON.parse(JSON.stringify(activeFormCopy)),
        ],
        redoStack: [],
      }));

      toast.success(`Added "${gf.label}" to form`);
    },
    [firstSectionId, boundFieldKeys],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, gf: GlobalFieldItem) => {
      // Use the same data transfer key as FieldPalette so FormCanvas can handle it
      e.dataTransfer.setData('application/form-field-type', gf.fieldType);
      // Also pass the global field key so we can identify it
      e.dataTransfer.setData('application/global-field-key', gf.fieldKey);
      e.dataTransfer.setData('application/global-field-json', JSON.stringify(gf));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const result = await seedGlobalFields();
      toast.success(`Seeded ${result.seeded} standard fields`);
      await loadData();
    } catch {
      toast.error('Failed to seed global fields');
    } finally {
      setSeeding(false);
    }
  }, [loadData]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // ─── Group fields by category ────────────────────────────

  const grouped = useMemo(() => {
    const map = new Map<string, GlobalFieldItem[]>();
    for (const f of fields) {
      const cat = f.category || 'custom';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(f);
    }
    return map;
  }, [fields]);

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-3" role="region" aria-label="Global field picker — drag or click to add standard fields">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          🌐 Global Fields
        </h3>
        {fields.length === 0 && !loading && (
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-medium text-green-600 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
          >
            {seeding ? 'Seeding…' : '🌱 Seed Defaults'}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Reusable fields with standard labels & validation. Drag or click to add.
      </p>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search global fields…"
          aria-label="Search global fields"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pl-8 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
        />
        <span className="absolute left-2.5 top-2 text-xs text-gray-400">🔍</span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
              !selectedCategory
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                selectedCategory === cat
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {CATEGORY_ICONS[cat] || '📁'} {categoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="ml-2 text-xs text-gray-400">Loading fields…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && fields.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {search || selectedCategory
              ? 'No fields match your search.'
              : 'No global fields yet. Click "Seed Defaults" to add standard apparel ERP fields.'}
          </p>
        </div>
      )}

      {/* Grouped field list */}
      {!loading &&
        Array.from(grouped.entries()).map(([cat, catFields]) => (
          <div key={cat} className="space-y-1">
            {/* Category header (collapsible) */}
            <button
              type="button"
              onClick={() => toggleCategory(cat)}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <span className={`text-[10px] transition-transform ${expandedCategories.has(cat) ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span>{CATEGORY_ICONS[cat] || '📁'}</span>
              <span>{categoryLabel(cat)}</span>
              <span className="ml-auto text-[10px] font-normal text-gray-300 dark:text-gray-600">
                {catFields.length}
              </span>
            </button>

            {/* Field cards */}
            {expandedCategories.has(cat) && (
              <div className="space-y-1 pl-1">
                {catFields.map((gf) => {
                  const isAdded = boundFieldKeys.has(gf.fieldKey);
                  return (
                    <button
                      key={gf.id}
                      type="button"
                      draggable={!isAdded}
                      onDragStart={(e) => handleDragStart(e, gf)}
                      onClick={() => handleAddGlobalField(gf)}
                      disabled={isAdded}
                      className={`group flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                        isAdded
                          ? 'cursor-default border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-blue-400 hover:bg-blue-50 hover:shadow-md active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 cursor-grab active:cursor-grabbing'
                      }`}
                      title={gf.description || `${gf.label} (${gf.fieldType})`}
                    >
                      {/* Field type icon */}
                      <span className="text-sm shrink-0">
                        {FIELD_TYPE_ICONS[gf.fieldType] || '📝'}
                      </span>

                      {/* Label + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate font-medium">{gf.label}</span>
                          {gf.isSystem && (
                            <span className="shrink-0 rounded bg-gray-200 px-1 py-px text-[9px] text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                              SYS
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                          {gf.fieldKey} · {gf.fieldType}
                        </div>
                      </div>

                      {/* Status badge */}
                      {isAdded ? (
                        <span className="shrink-0 text-[10px] font-medium text-green-600 dark:text-green-400">
                          ✓ Added
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 dark:text-gray-600">
                          + Add
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

      {/* Footer info */}
      {!loading && fields.length > 0 && (
        <p className="pt-2 text-center text-[10px] text-gray-300 dark:text-gray-600">
          {fields.length} field{fields.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
}
