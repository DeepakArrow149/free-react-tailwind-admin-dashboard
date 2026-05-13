/**
 * Form Builder Store
 * Zustand-based state management for the No-Code Form Builder.
 * Manages form definitions, selected field, undo/redo, and persistence.
 */

import { create } from 'zustand';
import type { FormDefinition, FormField, FormSection, ModuleAssignment } from './types';
import {
  createEmptyForm,
  createDefaultField,
  createDefaultSection,
  generateId,
  slugify,
} from './types';
import {
  fetchForms as apiFetchForms,
  fetchForm as apiFetchForm,
  createFormApi,
  updateFormApi,
  deleteFormApi,
  cloneFormApi,
  mapResponseToForm,
  assignToModule as apiAssignToModule,
} from '../api/formBuilderApi';

interface FormBuilderState {
  /** All saved form definitions */
  forms: FormDefinition[];
  /** Currently editing form */
  activeForm: FormDefinition | null;
  /** Currently selected field id */
  selectedFieldId: string | null;
  /** Currently selected section id */
  selectedSectionId: string | null;
  /** Undo stack */
  undoStack: FormDefinition[];
  /** Redo stack */
  redoStack: FormDefinition[];
  /** Sidebar panel */
  sidePanel: 'palette' | 'properties' | 'settings' | 'actions' | 'notes' | 'globalFields';
  /** Preview mode */
  previewMode: boolean;
  /** Loading state */
  loading: boolean;
  /** Whether connected to backend */
  apiConnected: boolean;
  /** Per-form submission stats from API list endpoint */
  formStats: Map<string, { submissionCount: number; lastSubmissionAt: string | null }>;

  // ── Form CRUD ──
  /**
   * Create a new form. Without args → blank starter form.
   * With `starter` → use the partial as the seed (sections/fields/settings/name).
   */
  createForm: (starter?: Partial<FormDefinition>) => void;
  loadForm: (form: FormDefinition) => void;
  /** Apply an AI-generated form while preserving undo stack */
  applyAiForm: (form: FormDefinition) => void;
  saveForm: () => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  duplicateForm: (id: string) => Promise<void>;
  updateFormMeta: (updates: Partial<Pick<FormDefinition, 'name' | 'description' | 'status' | 'autoApplyMigrations' | 'bindingMode' | 'boundModel' | 'boundTableName' | 'boundValueField' | 'boundDisplayField'>>) => void;
  updateFormSettings: (settings: Partial<FormDefinition['settings']>) => void;
  updateModuleAssignment: (assignment: ModuleAssignment) => Promise<void>;

  // ── Section operations ──
  addSection: () => void;
  removeSection: (sectionId: string) => void;
  updateSection: (sectionId: string, updates: Partial<FormSection>) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;

  // ── Field operations ──
  addField: (sectionId: string, fieldType: string, insertIndex?: number) => void;
  removeField: (sectionId: string, fieldId: string) => void;
  updateField: (sectionId: string, fieldId: string, updates: Partial<FormField>) => void;
  moveField: (fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) => void;
  duplicateField: (sectionId: string, fieldId: string) => void;

  // ── Selection (single + multi) ──
  selectField: (fieldId: string | null, sectionId?: string | null) => void;
  /** Set of field ids included in the current multi-selection. Empty = none. */
  multiSelectedFieldIds: Set<string>;
  toggleMultiSelectField: (fieldId: string) => void;
  clearMultiSelect: () => void;
  bulkRemoveFields: () => void;
  bulkDuplicateFields: () => void;
  bulkSetWidth: (width: 'full' | 'half' | 'third' | 'quarter') => void;

  // ── UI ──
  setSidePanel: (panel: 'palette' | 'properties' | 'settings' | 'notes' | 'globalFields') => void;
  togglePreview: () => void;

  // ── Undo/Redo ──
  undo: () => void;
  redo: () => void;

  // ── Persistence ──
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => void;
}

function pushUndo(state: FormBuilderState): Pick<FormBuilderState, 'undoStack' | 'redoStack'> {
  if (!state.activeForm) return { undoStack: state.undoStack, redoStack: [] };
  return {
    undoStack: [...state.undoStack.slice(-19), structuredClone(state.activeForm)],
    redoStack: [],
  };
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  forms: [],
  activeForm: null,
  selectedFieldId: null,
  selectedSectionId: null,
  undoStack: [],
  redoStack: [],
  sidePanel: 'palette',
  previewMode: false,
  loading: false,
  apiConnected: false,
  formStats: new Map(),
  multiSelectedFieldIds: new Set<string>(),

  toggleMultiSelectField: (fieldId) => set((s) => {
    const next = new Set(s.multiSelectedFieldIds);
    if (next.has(fieldId)) next.delete(fieldId);
    else next.add(fieldId);
    return { multiSelectedFieldIds: next };
  }),

  clearMultiSelect: () => set({ multiSelectedFieldIds: new Set() }),

  bulkRemoveFields: () => set((s) => {
    if (!s.activeForm || s.multiSelectedFieldIds.size === 0) return {};
    const ids = s.multiSelectedFieldIds;
    const next = structuredClone(s.activeForm);
    for (const sec of next.sections) {
      sec.fields = sec.fields.filter((f) => !ids.has(f.id));
    }
    return {
      ...pushUndo(s),
      activeForm: next,
      multiSelectedFieldIds: new Set(),
    };
  }),

  bulkDuplicateFields: () => set((s) => {
    if (!s.activeForm || s.multiSelectedFieldIds.size === 0) return {};
    const ids = s.multiSelectedFieldIds;
    const next = structuredClone(s.activeForm);
    for (const sec of next.sections) {
      const additions: typeof sec.fields = [];
      for (const f of sec.fields) {
        if (ids.has(f.id)) {
          const clone = structuredClone(f);
          clone.id = generateId();
          clone.name = `${f.name}_copy`;
          additions.push(clone);
        }
      }
      sec.fields = [...sec.fields, ...additions];
    }
    return {
      ...pushUndo(s),
      activeForm: next,
    };
  }),

  bulkSetWidth: (width) => set((s) => {
    if (!s.activeForm || s.multiSelectedFieldIds.size === 0) return {};
    const ids = s.multiSelectedFieldIds;
    const next = structuredClone(s.activeForm);
    for (const sec of next.sections) {
      for (const f of sec.fields) if (ids.has(f.id)) f.width = width;
    }
    return { ...pushUndo(s), activeForm: next };
  }),

  // ── Form CRUD ───────────────────────────────────────────

  createForm: (starter) => {
    const empty = createEmptyForm();
    const newForm: FormDefinition = starter
      ? {
          ...empty,
          ...starter,
          id: empty.id,
          createdAt: empty.createdAt,
          updatedAt: empty.updatedAt,
          status: empty.status,
          slug: starter.slug || slugify(starter.name || empty.name),
        }
      : empty;
    set((s) => ({
      forms: [...s.forms, newForm],
      activeForm: newForm,
      selectedFieldId: null,
      selectedSectionId: null,
      undoStack: [],
      redoStack: [],
      sidePanel: 'palette',
      previewMode: false,
    }));
    get().saveToStorage();
  },

  loadForm: (form) => {
    set({
      activeForm: structuredClone(form),
      selectedFieldId: null,
      selectedSectionId: null,
      undoStack: [],
      redoStack: [],
      sidePanel: 'palette',
      previewMode: false,
    });
  },

  applyAiForm: (form) => {
    // Push current form to undo stack (preserving undo history) so user can Ctrl+Z
    set((s) => ({
      ...pushUndo(s),
      activeForm: structuredClone(form),
      selectedFieldId: null,
      selectedSectionId: null,
      sidePanel: 'palette',
      previewMode: false,
    }));
    get().saveToStorage();
  },

  saveForm: async () => {
    const { activeForm, forms, apiConnected } = get();
    if (!activeForm) return;

    const updated = { ...activeForm, updatedAt: new Date().toISOString() };
    const idx = forms.findIndex((f) => f.id === updated.id);
    const isNew = idx < 0;

    set({
      activeForm: updated,
      forms: isNew ? [...forms, updated] : forms.map((f) => (f.id === updated.id ? updated : f)),
    });

    // Persist to API if connected, otherwise fallback to localStorage
    if (apiConnected) {
      try {
        if (isNew) {
          const res = await createFormApi(updated);
          // Update the local form with the server-assigned ID
          const serverForm = { ...updated, id: res.id };
          set((s) => ({
            activeForm: s.activeForm?.id === updated.id ? serverForm : s.activeForm,
            forms: s.forms.map((f) => (f.id === updated.id ? serverForm : f)),
          }));
        } else {
          await updateFormApi(updated.id, updated);
        }
      } catch {
        // Fallback to localStorage on API failure
        get().saveToStorage();
      }
    } else {
      get().saveToStorage();
    }
  },

  deleteForm: async (id) => {
    set((s) => ({
      forms: s.forms.filter((f) => f.id !== id),
      activeForm: s.activeForm?.id === id ? null : s.activeForm,
    }));

    if (get().apiConnected) {
      try { await deleteFormApi(id); } catch { /* ignore */ }
    }
    get().saveToStorage();
  },

  duplicateForm: async (id) => {
    const { apiConnected } = get();
    const form = get().forms.find((f) => f.id === id);
    if (!form) return;

    if (apiConnected) {
      try {
        const res = await cloneFormApi(id);
        // Fetch the cloned form from API
        const cloned = await apiFetchForm(res.id);
        const mapped = mapResponseToForm(cloned);
        set((s) => ({ forms: [...s.forms, mapped] }));
        return;
      } catch { /* fallback below */ }
    }

    // Local-only fallback
    const dupe: FormDefinition = {
      ...structuredClone(form),
      id: generateId(),
      name: `${form.name} (Copy)`,
      slug: `${form.slug}-copy`,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({ forms: [...s.forms, dupe] }));
    get().saveToStorage();
  },

  updateFormMeta: (updates) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      const form = {
        ...s.activeForm,
        ...updates,
        slug: updates.name ? slugify(updates.name) : s.activeForm.slug,
        updatedAt: new Date().toISOString(),
      };
      return { activeForm: form, ...undo };
    });
  },

  updateFormSettings: (settings) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          settings: { ...s.activeForm.settings, ...settings },
          updatedAt: new Date().toISOString(),
        },
        ...undo,
      };
    });
  },

  updateModuleAssignment: async (assignment) => {
    const { activeForm, apiConnected } = get();
    if (!activeForm) return;

    // Update local state immediately
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          moduleAssignment: assignment,
          updatedAt: new Date().toISOString(),
        },
        ...undo,
      };
    });

    // Persist to API if connected
    if (apiConnected) {
      try {
        await apiAssignToModule(activeForm.id, assignment);
      } catch {
        // Silently fail — local state is already updated
      }
    }
  },

  // ── Section operations ──────────────────────────────────

  addSection: () => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          sections: [...s.activeForm.sections, createDefaultSection()],
          updatedAt: new Date().toISOString(),
        },
        ...undo,
      };
    });
  },

  removeSection: (sectionId) => {
    set((s) => {
      if (!s.activeForm || s.activeForm.sections.length <= 1) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          sections: s.activeForm.sections.filter((sec) => sec.id !== sectionId),
          updatedAt: new Date().toISOString(),
        },
        selectedSectionId: s.selectedSectionId === sectionId ? null : s.selectedSectionId,
        ...undo,
      };
    });
  },

  updateSection: (sectionId, updates) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          sections: s.activeForm.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, ...updates } : sec,
          ),
          updatedAt: new Date().toISOString(),
        },
        ...undo,
      };
    });
  },

  moveSection: (fromIndex, toIndex) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      const sections = [...s.activeForm.sections];
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      return {
        activeForm: { ...s.activeForm, sections, updatedAt: new Date().toISOString() },
        ...undo,
      };
    });
  },

  // ── Field operations ────────────────────────────────────

  addField: (sectionId, fieldType, insertIndex) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      const field = createDefaultField(fieldType as import('./types').FieldType);

      return {
        activeForm: {
          ...s.activeForm,
          sections: s.activeForm.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            const fields = [...sec.fields];
            if (insertIndex !== undefined) {
              fields.splice(insertIndex, 0, field);
            } else {
              fields.push(field);
            }
            return { ...sec, fields };
          }),
          updatedAt: new Date().toISOString(),
        },
        selectedFieldId: field.id,
        selectedSectionId: sectionId,
        sidePanel: 'properties',
        ...undo,
      };
    });
  },

  removeField: (sectionId, fieldId) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          sections: s.activeForm.sections.map((sec) =>
            sec.id === sectionId
              ? { ...sec, fields: sec.fields.filter((f) => f.id !== fieldId) }
              : sec,
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedFieldId: s.selectedFieldId === fieldId ? null : s.selectedFieldId,
        ...undo,
      };
    });
  },

  updateField: (sectionId, fieldId, updates) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          sections: s.activeForm.sections.map((sec) =>
            sec.id === sectionId
              ? {
                  ...sec,
                  fields: sec.fields.map((f) =>
                    f.id === fieldId ? { ...f, ...updates } : f,
                  ),
                }
              : sec,
          ),
          updatedAt: new Date().toISOString(),
        },
        ...undo,
      };
    });
  },

  moveField: (fromSectionId, fromIndex, toSectionId, toIndex) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      const sections = s.activeForm.sections.map((sec) => ({ ...sec, fields: [...sec.fields] }));
      const fromSec = sections.find((sec) => sec.id === fromSectionId);
      const toSec = sections.find((sec) => sec.id === toSectionId);
      if (!fromSec || !toSec) return s;

      const [movedField] = fromSec.fields.splice(fromIndex, 1);
      toSec.fields.splice(toIndex, 0, movedField);

      return {
        activeForm: { ...s.activeForm, sections, updatedAt: new Date().toISOString() },
        ...undo,
      };
    });
  },

  duplicateField: (sectionId, fieldId) => {
    set((s) => {
      if (!s.activeForm) return s;
      const undo = pushUndo(s);
      return {
        activeForm: {
          ...s.activeForm,
          sections: s.activeForm.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            const idx = sec.fields.findIndex((f) => f.id === fieldId);
            if (idx < 0) return sec;
            const original = sec.fields[idx];
            const dupe: FormField = {
              ...structuredClone(original),
              id: generateId(),
              name: `${original.name}_copy`,
              label: `${original.label} (Copy)`,
            };
            const fields = [...sec.fields];
            fields.splice(idx + 1, 0, dupe);
            return { ...sec, fields };
          }),
          updatedAt: new Date().toISOString(),
        },
        ...undo,
      };
    });
  },

  // ── Selection ───────────────────────────────────────────

  selectField: (fieldId, sectionId) => {
    set({
      selectedFieldId: fieldId,
      selectedSectionId: sectionId ?? null,
      sidePanel: fieldId ? 'properties' : get().sidePanel === 'globalFields' ? 'globalFields' : 'palette',
    });
  },

  // ── UI ──────────────────────────────────────────────────

  setSidePanel: (panel) => set({ sidePanel: panel }),
  togglePreview: () => set((s) => ({ previewMode: !s.previewMode })),

  // ── Undo/Redo ───────────────────────────────────────────

  undo: () => {
    set((s) => {
      if (s.undoStack.length === 0 || !s.activeForm) return s;
      const prev = s.undoStack[s.undoStack.length - 1];
      return {
        activeForm: prev,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, structuredClone(s.activeForm)],
      };
    });
  },

  redo: () => {
    set((s) => {
      if (s.redoStack.length === 0 || !s.activeForm) return s;
      const next = s.redoStack[s.redoStack.length - 1];
      return {
        activeForm: next,
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, structuredClone(s.activeForm)],
      };
    });
  },

  // ── Persistence (API-first, localStorage fallback) ───────

  loadFromStorage: async () => {
    set({ loading: true });
    try {
      // Try API first
      const apiList = await apiFetchForms();
      // Build stats map from list data
      const stats = new Map<string, { submissionCount: number; lastSubmissionAt: string | null }>();
      for (const item of apiList) {
        stats.set(item.id, {
          submissionCount: (item as unknown as Record<string, unknown>).submissionCount as number ?? 0,
          lastSubmissionAt: (item as unknown as Record<string, unknown>).lastSubmissionAt as string | null ?? null,
        });
      }
      // Fetch full details for each form
      const fullForms = await Promise.all(
        apiList.map(async (item) => {
          const detail = await apiFetchForm(item.id);
          return mapResponseToForm(detail);
        }),
      );
      set({ forms: fullForms, formStats: stats, apiConnected: true, loading: false });
    } catch {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem('erp_form_builder_forms');
        if (raw) {
          const forms: FormDefinition[] = JSON.parse(raw);
          set({ forms });
        }
      } catch { /* ignore */ }
      set({ apiConnected: false, loading: false });
    }
  },

  saveToStorage: () => {
    try {
      const { forms } = get();
      localStorage.setItem('erp_form_builder_forms', JSON.stringify(forms));
    } catch {
      // ignore
    }
  },
}));
