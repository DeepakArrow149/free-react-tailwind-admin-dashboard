/**
 * TemplateLibrary – Browse and use platform + custom form templates.
 *
 * Templates come exclusively from the API (`GET /api/forms/templates/list`).
 * The 15 platform-wide bound templates (Buyer, Supplier, Material, Style,
 * BuyerOrder, BOM, CostingSheet, PurchaseOrder, GRN, Allowance, FabricDesign,
 * Process, SplBom, TemplateBom, TnaTemplate) are seeded by the api-server on
 * boot from `apps/api-server/src/modules/saas/seedSystemTemplates.ts` — see
 * that file to add or modify a system template.
 *
 * Layout: templates are grouped by `targetModule` (Master, Merchandising,
 * Costing, Procurement, MRP, Planning, …). Within each module they're sorted
 * by category, then name. A "🔗 bound" badge appears on templates whose
 * snapshot has `binding.mode === 'bound'` — those write submissions to a real
 * ERP table on submit, not to the generic `form_submissions` JSON blob.
 */

import { useMemo, useState, useEffect } from 'react';
import {
  fetchTemplates,
  useTemplate as applyTemplate,
  deleteTemplate,
  saveFormAsTemplate,
  type FormTemplate,
} from '../../api/formBuilderApi';
import { useFormBuilderStore } from '../store';
import { toast } from 'sonner';

// ─── Module taxonomy ─────────────────────────────────────────
// Mirrors the VALID_TARGET_MODULES enum in apps/api-server/src/modules/saas/
// formBuilder.service.ts. Stays in sync via a one-time copy — both ends must
// be updated when a new module is introduced.

const MODULES: Array<{ value: string; label: string; icon: string }> = [
  { value: 'master', label: 'Master', icon: '🏷️' },
  { value: 'merchandising', label: 'Merchandising', icon: '📦' },
  { value: 'costing', label: 'Costing', icon: '💰' },
  { value: 'procurement', label: 'Procurement', icon: '🛒' },
  { value: 'mrp', label: 'MRP', icon: '⚙️' },
  { value: 'planning', label: 'Planning', icon: '📅' },
  { value: 'inventory', label: 'Inventory', icon: '📊' },
  { value: 'production', label: 'Production', icon: '🏭' },
  { value: 'quality', label: 'Quality', icon: '✅' },
  { value: 'packing-export', label: 'Packing & Export', icon: '🚢' },
  { value: 'finance', label: 'Finance', icon: '💵' },
  { value: 'hrm', label: 'HRM', icon: '👤' },
  { value: 'reports', label: 'Reports', icon: '📈' },
  { value: 'system-admin', label: 'System Admin', icon: '🛡️' },
  { value: 'custom', label: 'Custom', icon: '⭐' },
];

const MODULE_LOOKUP: Record<string, { label: string; icon: string }> = Object.fromEntries(
  MODULES.map((m) => [m.value, { label: m.label, icon: m.icon }]),
);

const UNGROUPED_KEY = '__ungrouped__';

// ─── Component ───────────────────────────────────────────────

interface TemplateLibraryProps {
  onClose: () => void;
  onFormCreated?: () => void;
}

export default function TemplateLibrary({ onClose, onFormCreated }: TemplateLibraryProps) {
  const { activeForm } = useFormBuilderStore();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const apiTemplates = await fetchTemplates();
      setTemplates(apiTemplates);
    } catch (err) {
      console.error('Failed to load templates', err);
      setTemplates([]);
    }
    setLoading(false);
  };

  const handleUseTemplate = async (template: FormTemplate) => {
    setCreating(template.id);
    try {
      await applyTemplate(template.id);
      toast.success(`Form created from "${template.name}" — open it from My Forms to customise.`);
      onFormCreated?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to create form from template');
    }
    setCreating(null);
  };

  const handleSaveAsTemplate = async () => {
    if (!activeForm) return;
    setSaving(true);
    try {
      await saveFormAsTemplate(activeForm);
      toast.success('Form saved as template!');
      await loadTemplates();
    } catch {
      toast.error('Failed to save template');
    }
    setSaving(false);
  };

  const handleDeleteTemplate = (id: string) => {
    toast.warning('Delete this template? This cannot be undone.', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteTemplate(id);
            toast.success('Template deleted');
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          } catch {
            toast.error('Failed to delete template');
          }
        },
      },
      duration: 8000,
    });
  };

  // ── Filter + group ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (moduleFilter !== 'all') {
        if ((t.targetModule || UNGROUPED_KEY) !== moduleFilter) return false;
      }
      if (!q) return true;
      const hay = `${t.name} ${t.description ?? ''} ${t.category ?? ''} ${t.binding?.model ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [templates, moduleFilter, search]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, FormTemplate[]>();
    for (const t of filtered) {
      const key = t.targetModule || UNGROUPED_KEY;
      const arr = buckets.get(key);
      if (arr) arr.push(t);
      else buckets.set(key, [t]);
    }
    // Order modules per MODULES array; ungrouped last
    const ordered: Array<{ key: string; label: string; icon: string; items: FormTemplate[] }> = [];
    for (const m of MODULES) {
      if (buckets.has(m.value)) {
        ordered.push({ key: m.value, label: m.label, icon: m.icon, items: buckets.get(m.value)! });
      }
    }
    if (buckets.has(UNGROUPED_KEY)) {
      ordered.push({ key: UNGROUPED_KEY, label: 'Uncategorised', icon: '📋', items: buckets.get(UNGROUPED_KEY)! });
    }
    return ordered;
  }, [filtered]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of templates) {
      const k = t.targetModule || UNGROUPED_KEY;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [templates]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Template library">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">📚 Template Library</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Start from a platform template or save your forms as reusable templates. Bound templates write submissions to real ERP tables.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeForm && (
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={saving}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {saving ? 'Saving…' : '💾 Save Current as Template'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close template library"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search + module filter */}
        <div className="space-y-2 border-b border-gray-200 px-6 py-3 dark:border-gray-700">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, or bound model…"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            aria-label="Search templates"
          />
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            <ModuleChip
              value="all"
              active={moduleFilter === 'all'}
              onClick={() => setModuleFilter('all')}
              label={`All (${templates.length})`}
              icon="🗂️"
            />
            {MODULES.map((m) => {
              const count = moduleCounts[m.value] || 0;
              if (count === 0) return null;
              return (
                <ModuleChip
                  key={m.value}
                  value={m.value}
                  active={moduleFilter === m.value}
                  onClick={() => setModuleFilter(m.value)}
                  label={`${m.label} (${count})`}
                  icon={m.icon}
                />
              );
            })}
            {moduleCounts[UNGROUPED_KEY] ? (
              <ModuleChip
                value={UNGROUPED_KEY}
                active={moduleFilter === UNGROUPED_KEY}
                onClick={() => setModuleFilter(UNGROUPED_KEY)}
                label={`Uncategorised (${moduleCounts[UNGROUPED_KEY]})`}
                icon="📋"
              />
            ) : null}
          </div>
        </div>

        {/* Template grid grouped by module */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-gray-400">Loading templates…</div>
          ) : grouped.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
              {templates.length === 0
                ? 'No templates yet. Platform templates are seeded by the api-server on boot — check server logs.'
                : 'No templates match your filter / search.'}
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <section key={g.key}>
                  <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <span className="text-base">{g.icon}</span>
                    <span>{g.label}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {g.items.length}
                    </span>
                  </header>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        creating={creating === t.id}
                        onUse={() => handleUseTemplate(t)}
                        onDelete={() => handleDeleteTemplate(t.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────

function ModuleChip({
  active,
  onClick,
  label,
  icon,
}: {
  value: string;
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
      }`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}

function TemplateCard({
  template,
  creating,
  onUse,
  onDelete,
}: {
  template: FormTemplate;
  creating: boolean;
  onUse: () => void;
  onDelete: () => void;
}) {
  const isBound = template.binding?.mode === 'bound';
  const moduleMeta = template.targetModule ? MODULE_LOOKUP[template.targetModule] : undefined;
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600">
      <div className="mb-2 flex items-start gap-2">
        <span className="text-2xl leading-none">{template.icon || '📋'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-white">{template.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {moduleMeta && (
              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {moduleMeta.label}
              </span>
            )}
            <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              {template.isSystem ? 'system' : 'custom'}
            </span>
            {isBound && (
              <span
                title={template.binding?.model ? `Writes to ${template.binding.model} table` : 'Writes to a bound ERP table'}
                className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                🔗 bound
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="mb-3 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
        {template.description || 'Custom template'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onUse}
          disabled={creating}
          className="flex-1 rounded-lg bg-blue-50 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400"
        >
          {creating ? 'Creating…' : 'Use Template'}
        </button>
        {!template.isSystem && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
            title="Delete template"
            aria-label={`Delete template ${template.name}`}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
