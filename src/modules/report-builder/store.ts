/**
 * Report Builder Store (Zustand)
 *
 * Holds the editing state for the active report — query (root source,
 * columns, filters, sort), parameters, settings — plus loaded catalog
 * sources, undo/redo stacks, and autosave plumbing.
 *
 * Mirrors the form-builder store: same undo/redo discipline, debounced
 * autosave, and ApiConnected indicator.
 */

import { create } from 'zustand';
import type {
  ReportDefinition,
  ReportListItem,
  ReportQuery,
  ReportColumn,
  FilterGroup,
  FilterRule,
  ReportParameter,
  CatalogSourceSummary,
  CatalogSourceDetail,
  SortRule,
  Visualization,
  VizConfig,
  ReportType,
} from './types';
import { emptyReport, generateClientId } from './types';
import {
  fetchDataSources,
  fetchDataSource,
  fetchReports,
  fetchReport,
  createReport,
  updateReport,
  deleteReport,
  duplicateReport,
  publishReport,
  type CreateReportPayload,
} from './api/reportBuilderApi';

const UNDO_LIMIT = 50;
const AUTOSAVE_DELAY_MS = 1500;

interface ReportBuilderState {
  // ── Catalog ──
  /** Lightweight summaries (name + label) for the data source picker */
  catalog: CatalogSourceSummary[];
  /** Cached source details, keyed by source name */
  sourceDetails: Map<string, CatalogSourceDetail>;
  catalogLoading: boolean;

  // ── Active report being edited ──
  activeReport: ReportDefinition | null;
  /** True once dirty changes are queued for autosave */
  dirty: boolean;
  /** True while a save is in flight */
  saving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;

  // ── Saved reports list ──
  reports: ReportListItem[];
  reportsLoading: boolean;

  // ── Editor UI state ──
  selectedColumnField: string | null;
  selectedFilterId: string | null;
  sidePanel: 'fields' | 'properties' | 'parameters' | 'settings';

  // ── Undo / redo stacks (snapshots of activeReport) ──
  undoStack: ReportDefinition[];
  redoStack: ReportDefinition[];

  // ── Catalog ──
  loadCatalog: () => Promise<void>;
  loadSourceDetail: (name: string) => Promise<CatalogSourceDetail | null>;

  // ── Reports list ──
  loadReports: () => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  cloneReport: (id: string) => Promise<ReportDefinition>;

  // ── Active report lifecycle ──
  newReport: (rootSource?: string, type?: ReportType) => Promise<void>;
  loadReport: (id: string) => Promise<void>;
  saveReport: () => Promise<void>;
  publishActiveReport: (label?: string) => Promise<void>;
  closeReport: () => void;

  // ── Mutations on active report ──
  updateMeta: (patch: Partial<Pick<ReportDefinition, 'name' | 'description' | 'icon' | 'category'>>) => void;
  setRootSource: (sourceName: string) => Promise<void>;

  addColumn: (field: string, aggregation?: import('./types').AggregationFn) => void;
  addCalculatedColumn: () => void;
  removeColumn: (field: string) => void;
  updateColumn: (field: string, updates: Partial<ReportColumn>) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;

  setFilters: (filters: FilterGroup | undefined) => void;
  addFilterRule: (rule: Omit<FilterRule, 'id'>) => void;
  updateFilterRule: (id: string, updates: Partial<FilterRule>) => void;
  removeFilterRule: (id: string) => void;

  setSort: (sort: SortRule[]) => void;
  setLimit: (limit: number | undefined) => void;

  setParameters: (parameters: ReportParameter[]) => void;

  updateSettings: (patch: Partial<ReportDefinition['settings']>) => void;

  // ── Visualization ──
  setVisualization: (viz: Visualization) => void;
  updateVizConfig: (patch: Partial<VizConfig>) => void;

  // ── UI ──
  selectColumn: (field: string | null) => void;
  selectFilter: (id: string | null) => void;
  setSidePanel: (panel: ReportBuilderState['sidePanel']) => void;

  // ── Undo / redo ──
  undo: () => void;
  redo: () => void;
}

// ── Helpers (pure) ─────────────────────────────────────────────────

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withRuleId(rule: FilterRule): FilterRule {
  return rule.id ? rule : { ...rule, id: generateClientId('flt') };
}

function ensureGroupIds(group: FilterGroup): FilterGroup {
  return {
    ...group,
    id: group.id ?? generateClientId('grp'),
    rules: group.rules.map((r) =>
      'combinator' in r ? ensureGroupIds(r) : withRuleId(r)
    ),
  };
}

function findAndUpdate(
  group: FilterGroup,
  ruleId: string,
  updater: (r: FilterRule) => FilterRule
): FilterGroup {
  return {
    ...group,
    rules: group.rules.map((r) => {
      if ('combinator' in r) return findAndUpdate(r, ruleId, updater);
      return r.id === ruleId ? updater(r) : r;
    }),
  };
}

function findAndRemove(group: FilterGroup, ruleId: string): FilterGroup {
  return {
    ...group,
    rules: group.rules.flatMap((r) => {
      if ('combinator' in r) return [findAndRemove(r, ruleId)];
      return r.id === ruleId ? [] : [r];
    }),
  };
}

// ── Store ──────────────────────────────────────────────────────────

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useReportBuilderStore = create<ReportBuilderState>((set, get) => {
  /** Push current activeReport onto undo stack. Caller mutates next. */
  function pushHistory(): void {
    const current = get().activeReport;
    if (!current) return;
    set((s) => {
      const next = [...s.undoStack, clone(current)];
      if (next.length > UNDO_LIMIT) next.shift();
      return { undoStack: next, redoStack: [] };
    });
  }

  /** Mutate the active report in-place via an updater function. */
  function mutate(updater: (r: ReportDefinition) => ReportDefinition): void {
    pushHistory();
    set((s) => {
      if (!s.activeReport) return s;
      return { activeReport: updater(s.activeReport), dirty: true };
    });
    queueAutosave();
  }

  function queueAutosave(): void {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      const { activeReport, saving } = get();
      if (!activeReport || saving) return;
      // Only autosave existing reports — new ones must be saved manually first
      if (!activeReport.id) return;
      void get().saveReport();
    }, AUTOSAVE_DELAY_MS);
  }

  return {
    // ── Initial state ──
    catalog: [],
    sourceDetails: new Map(),
    catalogLoading: false,
    activeReport: null,
    dirty: false,
    saving: false,
    saveError: null,
    lastSavedAt: null,
    reports: [],
    reportsLoading: false,
    selectedColumnField: null,
    selectedFilterId: null,
    sidePanel: 'fields',
    undoStack: [],
    redoStack: [],

    // ── Catalog ──
    async loadCatalog() {
      set({ catalogLoading: true });
      try {
        const sources = await fetchDataSources();
        set({ catalog: sources });
      } finally {
        set({ catalogLoading: false });
      }
    },

    async loadSourceDetail(name) {
      const cached = get().sourceDetails.get(name);
      if (cached) return cached;
      try {
        const detail = await fetchDataSource(name);
        set((s) => {
          const next = new Map(s.sourceDetails);
          next.set(name, detail);
          return { sourceDetails: next };
        });
        return detail;
      } catch {
        return null;
      }
    },

    // ── Reports list ──
    async loadReports() {
      set({ reportsLoading: true });
      try {
        const reports = await fetchReports();
        set({ reports });
      } finally {
        set({ reportsLoading: false });
      }
    },

    async removeReport(id) {
      await deleteReport(id);
      set((s) => ({ reports: s.reports.filter((r) => r.id !== id) }));
    },

    async cloneReport(id) {
      const copy = await duplicateReport(id);
      set((s) => ({ reports: [copy, ...s.reports] }));
      return copy;
    },

    // ── Active report ──
    async newReport(rootSource, type = 'operational') {
      const draft = emptyReport('Untitled Report');
      draft.type = type;
      if (type === 'dashboard') {
        // Dashboards have no top-level query — widgets carry their own queries.
        draft.icon = '📈';
      }
      if (rootSource && type !== 'dashboard') {
        draft.rootSource = rootSource;
        draft.query.rootSource = rootSource;
        const detail = await get().loadSourceDetail(rootSource);
        if (detail && detail.defaultColumns.length > 0) {
          draft.query.columns = detail.defaultColumns.map((field) => {
            const f = detail.fields.find((x) => x.name === field);
            return { field, label: f?.label ?? field };
          });
        }
      }
      set({
        activeReport: draft,
        dirty: false,
        undoStack: [],
        redoStack: [],
        selectedColumnField: null,
        selectedFilterId: null,
        sidePanel: 'fields',
      });
    },

    async loadReport(id) {
      const report = await fetchReport(id);
      // Pre-load source detail
      if (report.query.rootSource) {
        await get().loadSourceDetail(report.query.rootSource);
      }
      set({
        activeReport: report,
        dirty: false,
        saving: false,
        saveError: null,
        undoStack: [],
        redoStack: [],
        selectedColumnField: null,
        selectedFilterId: null,
      });
    },

    async saveReport() {
      const { activeReport } = get();
      if (!activeReport) return;
      set({ saving: true, saveError: null });
      try {
        const payload: CreateReportPayload = {
          name: activeReport.name,
          description: activeReport.description,
          type: activeReport.type,
          visualization: activeReport.visualization,
          vizConfig: activeReport.vizConfig,
          category: activeReport.category,
          icon: activeReport.icon,
          query: activeReport.query,
          parameters: activeReport.parameters,
          settings: activeReport.settings,
        };
        let saved: ReportDefinition;
        if (activeReport.id) {
          saved = await updateReport(activeReport.id, { ...payload, etag: activeReport.etag });
        } else {
          saved = await createReport(payload);
        }
        set({
          activeReport: saved,
          dirty: false,
          saving: false,
          lastSavedAt: Date.now(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Save failed';
        set({ saving: false, saveError: msg });
        throw err;
      }
    },

    async publishActiveReport(label) {
      const { activeReport } = get();
      if (!activeReport?.id) return;
      // Save any pending edits first
      if (get().dirty) {
        await get().saveReport();
      }
      const published = await publishReport(activeReport.id, label);
      set({ activeReport: published });
    },

    closeReport() {
      if (autosaveTimer) clearTimeout(autosaveTimer);
      set({
        activeReport: null,
        dirty: false,
        saveError: null,
        undoStack: [],
        redoStack: [],
        selectedColumnField: null,
        selectedFilterId: null,
      });
    },

    // ── Active mutations ──
    updateMeta(patch) {
      mutate((r) => ({ ...r, ...patch }));
    },

    async setRootSource(sourceName) {
      const detail = await get().loadSourceDetail(sourceName);
      mutate((r) => {
        const cols: ReportColumn[] = detail?.defaultColumns.length
          ? detail.defaultColumns.map((field) => {
              const f = detail.fields.find((x) => x.name === field);
              return { field, label: f?.label ?? field };
            })
          : [];
        return {
          ...r,
          rootSource: sourceName,
          query: {
            rootSource: sourceName,
            columns: cols,
            filters: undefined,
            sort: [],
            groupBy: [],
          },
        };
      });
    },

    addColumn(field, aggregation) {
      mutate((r) => {
        if (r.query.columns.some((c) => c.field === field)) return r;
        const detail = get().sourceDetails.get(r.query.rootSource);
        let label = field;
        if (detail) {
          if (field.includes('.')) {
            const [alias, rest] = field.split('.', 2);
            const join = detail.joins.find((j) => j.alias === alias);
            const joinedDetail = join ? get().sourceDetails.get(join.toSource) : null;
            const f = joinedDetail?.fields.find((x) => x.name === rest);
            label = f ? `${join?.alias ?? alias} ${f.label}` : field;
          } else {
            const f = detail.fields.find((x) => x.name === field);
            if (f) label = f.label;
          }
        }
        const aggLabel = aggregation
          ? aggregation === 'count' ? 'Count'
            : aggregation === 'count_distinct' ? 'Distinct'
            : aggregation === 'sum' ? 'Sum'
            : aggregation === 'avg' ? 'Avg'
            : aggregation === 'min' ? 'Min'
            : aggregation === 'max' ? 'Max'
            : aggregation
          : null;
        const finalLabel = aggLabel ? `${aggLabel} of ${label}` : label;
        return {
          ...r,
          query: { ...r.query, columns: [...r.query.columns, { field, label: finalLabel, ...(aggregation ? { aggregation } : {}) }] },
        };
      });
    },

    addCalculatedColumn() {
      mutate((r) => {
        // Generate a unique calc field name (calc1, calc2, ...)
        const existing = new Set(r.query.columns.map((c) => c.field));
        let i = 1;
        while (existing.has(`calc${i}`)) i += 1;
        const field = `calc${i}`;
        return {
          ...r,
          query: {
            ...r.query,
            columns: [
              ...r.query.columns,
              { field, label: `Calculated ${i}`, isCalculated: true, formula: '' },
            ],
          },
        };
      });
      // Auto-select the new column so the FormulaEditor opens immediately
      const next = get().activeReport;
      if (next) {
        const lastCol = next.query.columns[next.query.columns.length - 1];
        if (lastCol) set({ selectedColumnField: lastCol.field });
      }
    },

    removeColumn(field) {
      mutate((r) => ({
        ...r,
        query: { ...r.query, columns: r.query.columns.filter((c) => c.field !== field) },
      }));
    },

    updateColumn(field, updates) {
      mutate((r) => ({
        ...r,
        query: {
          ...r.query,
          columns: r.query.columns.map((c) => (c.field === field ? { ...c, ...updates } : c)),
        },
      }));
    },

    reorderColumns(fromIndex, toIndex) {
      mutate((r) => {
        const cols = [...r.query.columns];
        const [moved] = cols.splice(fromIndex, 1);
        cols.splice(toIndex, 0, moved);
        return { ...r, query: { ...r.query, columns: cols } };
      });
    },

    setFilters(filters) {
      mutate((r) => ({
        ...r,
        query: { ...r.query, filters: filters ? ensureGroupIds(filters) : undefined },
      }));
    },

    addFilterRule(rule) {
      mutate((r) => {
        const newRule = withRuleId(rule);
        if (!r.query.filters) {
          return {
            ...r,
            query: {
              ...r.query,
              filters: ensureGroupIds({ combinator: 'and', rules: [newRule] }),
            },
          };
        }
        return {
          ...r,
          query: {
            ...r.query,
            filters: { ...r.query.filters, rules: [...r.query.filters.rules, newRule] },
          },
        };
      });
    },

    updateFilterRule(id, updates) {
      mutate((r) => {
        if (!r.query.filters) return r;
        return {
          ...r,
          query: {
            ...r.query,
            filters: findAndUpdate(r.query.filters, id, (rule) => ({ ...rule, ...updates })),
          },
        };
      });
    },

    removeFilterRule(id) {
      mutate((r) => {
        if (!r.query.filters) return r;
        const next = findAndRemove(r.query.filters, id);
        return {
          ...r,
          query: { ...r.query, filters: next.rules.length === 0 ? undefined : next },
        };
      });
    },

    setSort(sort) {
      mutate((r) => ({ ...r, query: { ...r.query, sort } }));
    },

    setLimit(limit) {
      mutate((r) => ({ ...r, query: { ...r.query, limit } }));
    },

    setParameters(parameters) {
      mutate((r) => ({ ...r, parameters }));
    },

    updateSettings(patch) {
      mutate((r) => ({ ...r, settings: { ...r.settings, ...patch } }));
    },

    setVisualization(viz) {
      mutate((r) => {
        // Quick path: same viz, no contract changes needed
        if (r.visualization === viz) return r;

        // Switching back to table — leave columns untouched
        if (viz === 'table') return { ...r, visualization: viz };

        // Smart promote: if the new viz needs a measure but the query has
        // none, auto-aggregate a sensible column so the chart renders
        // immediately rather than showing the "needs a measure" empty state.
        const measures = r.query.columns.filter((c) => c.aggregation);
        const dimensions = r.query.columns.filter((c) => !c.aggregation);

        const needsMeasure = ['kpi', 'bar', 'line', 'area', 'pie', 'donut'].includes(viz);
        if (!needsMeasure || measures.length > 0) {
          return { ...r, visualization: viz };
        }

        // Find a sensible measure: prefer existing numeric column, else
        // count() on the first column.
        const detail = get().sourceDetails.get(r.query.rootSource);
        const numericTypes = new Set(['number', 'integer', 'decimal']);

        const numericCol = dimensions.find((c) => {
          const f = detail?.fields.find((x) => x.name === c.field);
          return f && numericTypes.has(f.type) && (f.aggregations?.length ?? 0) > 0;
        });

        let nextColumns = r.query.columns;
        let nextGroupBy = r.query.groupBy;

        if (numericCol) {
          // Promote the numeric column to a SUM measure
          nextColumns = r.query.columns.map((c) =>
            c.field === numericCol.field ? { ...c, aggregation: 'sum' as const } : c
          );
        } else {
          // No numeric — append a COUNT measure on the first available id-like field
          const countField = detail?.fields.find((f) => f.name === 'id') ?? detail?.fields[0];
          if (countField) {
            nextColumns = [
              ...r.query.columns,
              { field: countField.name, label: 'Count', aggregation: 'count' as const },
            ];
          }
        }

        // For aggregated queries, group by the remaining non-aggregated dimensions
        const newMeasures = nextColumns.filter((c) => c.aggregation);
        if (newMeasures.length > 0) {
          const newDims = nextColumns.filter((c) => !c.aggregation).map((c) => c.field);
          // Pie/donut/kpi work best with at most 1 dimension — keep first only
          if (viz === 'kpi') {
            nextGroupBy = [];
            // KPI: drop dimensions, keep only measures
            nextColumns = nextColumns.filter((c) => c.aggregation);
          } else if (viz === 'pie' || viz === 'donut') {
            nextGroupBy = newDims.slice(0, 1);
            nextColumns = nextColumns.filter((c) => c.aggregation || c.field === newDims[0]);
          } else {
            nextGroupBy = newDims;
          }
        }

        return {
          ...r,
          visualization: viz,
          query: {
            ...r.query,
            columns: nextColumns,
            groupBy: nextGroupBy,
          },
        };
      });
    },

    updateVizConfig(patch) {
      mutate((r) => ({ ...r, vizConfig: { ...r.vizConfig, ...patch } }));
    },

    // ── UI ──
    selectColumn(field) {
      set({ selectedColumnField: field, selectedFilterId: null,
            sidePanel: field ? 'properties' : get().sidePanel });
    },

    selectFilter(id) {
      set({ selectedFilterId: id, selectedColumnField: null });
    },

    setSidePanel(panel) {
      set({ sidePanel: panel });
    },

    // ── Undo / redo ──
    undo() {
      const { undoStack, activeReport } = get();
      if (undoStack.length === 0 || !activeReport) return;
      const previous = undoStack[undoStack.length - 1];
      set((s) => ({
        activeReport: previous,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, clone(activeReport)],
        dirty: true,
      }));
      queueAutosave();
    },

    redo() {
      const { redoStack, activeReport } = get();
      if (redoStack.length === 0 || !activeReport) return;
      const next = redoStack[redoStack.length - 1];
      set((s) => ({
        activeReport: next,
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, clone(activeReport)],
        dirty: true,
      }));
      queueAutosave();
    },
  };
});
