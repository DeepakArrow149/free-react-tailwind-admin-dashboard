/**
 * Report Query Diff
 * Produces a compact, human-readable summary of changes between two
 * (ReportQuery, Visualization) pairs. Used by the AI assistant to show
 * "what will change" before Apply and "what changed" after.
 */

import type {
  FilterGroup,
  FilterRule,
  ReportColumn,
  ReportQuery,
  SortRule,
  Visualization,
} from '../types';

export interface ColumnChange {
  field: string;
  label?: string;
  /** What was modified about an existing column (label / aggregation). */
  changes?: string[];
}

export interface ReportDiff {
  /** Aggregate flag — true if any change exists. */
  hasChanges: boolean;
  sourceChanged: { from: string; to: string } | null;
  vizChanged: { from: Visualization; to: Visualization } | null;
  columnsAdded: ColumnChange[];
  columnsRemoved: ColumnChange[];
  columnsModified: ColumnChange[];
  /** Old / new filter rule counts (flat, recursive). */
  filterCount: { from: number; to: number };
  groupByAdded: string[];
  groupByRemoved: string[];
  sortChanged: boolean;
  newSort: SortRule[];
  limitChanged: { from?: number; to?: number } | null;
}

function flattenRules(group?: FilterGroup): FilterRule[] {
  if (!group) return [];
  const out: FilterRule[] = [];
  for (const r of group.rules) {
    if ('rules' in r) out.push(...flattenRules(r));
    else out.push(r);
  }
  return out;
}

function columnKey(c: ReportColumn): string {
  // Aggregation is part of identity — `sum(totalValue)` and raw `totalValue`
  // are different columns from the user's perspective.
  return c.aggregation ? `${c.aggregation}(${c.field})` : c.field;
}

function diffColumn(oldC: ReportColumn, newC: ReportColumn): string[] {
  const changes: string[] = [];
  if (oldC.label !== newC.label && (oldC.label || newC.label)) {
    changes.push(`label: "${oldC.label ?? ''}" → "${newC.label ?? ''}"`);
  }
  if (oldC.aggregation !== newC.aggregation) {
    changes.push(`aggregation: ${oldC.aggregation ?? 'none'} → ${newC.aggregation ?? 'none'}`);
  }
  return changes;
}

export function computeReportDiff(
  oldQuery: ReportQuery | undefined,
  oldViz: Visualization | undefined,
  newQuery: ReportQuery,
  newViz: Visualization,
): ReportDiff {
  // No prior state → everything is new. Treat as "all added", no diff context.
  if (!oldQuery) {
    return {
      hasChanges: true,
      sourceChanged: null,
      vizChanged: null,
      columnsAdded: newQuery.columns.map((c) => ({ field: c.field, label: c.label })),
      columnsRemoved: [],
      columnsModified: [],
      filterCount: { from: 0, to: flattenRules(newQuery.filters).length },
      groupByAdded: newQuery.groupBy ?? [],
      groupByRemoved: [],
      sortChanged: !!newQuery.sort?.length,
      newSort: newQuery.sort ?? [],
      limitChanged: newQuery.limit !== undefined ? { from: undefined, to: newQuery.limit } : null,
    };
  }

  const sourceChanged = oldQuery.rootSource !== newQuery.rootSource
    ? { from: oldQuery.rootSource, to: newQuery.rootSource }
    : null;

  const vizChanged = oldViz !== newViz && oldViz && newViz
    ? { from: oldViz, to: newViz }
    : null;

  // Columns: match by `aggregation(field)` key.
  const oldByKey = new Map<string, ReportColumn>(oldQuery.columns.map((c) => [columnKey(c), c]));
  const newByKey = new Map<string, ReportColumn>(newQuery.columns.map((c) => [columnKey(c), c]));

  const columnsAdded: ColumnChange[] = [];
  const columnsRemoved: ColumnChange[] = [];
  const columnsModified: ColumnChange[] = [];

  for (const [key, newC] of newByKey) {
    const oldC = oldByKey.get(key);
    if (!oldC) {
      columnsAdded.push({ field: newC.field, label: newC.label });
    } else {
      const changes = diffColumn(oldC, newC);
      if (changes.length > 0) {
        columnsModified.push({ field: newC.field, label: newC.label, changes });
      }
    }
  }
  for (const [key, oldC] of oldByKey) {
    if (!newByKey.has(key)) {
      columnsRemoved.push({ field: oldC.field, label: oldC.label });
    }
  }

  const oldFilterCount = flattenRules(oldQuery.filters).length;
  const newFilterCount = flattenRules(newQuery.filters).length;

  const oldGroup = new Set(oldQuery.groupBy ?? []);
  const newGroup = new Set(newQuery.groupBy ?? []);
  const groupByAdded = [...newGroup].filter((g) => !oldGroup.has(g));
  const groupByRemoved = [...oldGroup].filter((g) => !newGroup.has(g));

  const sortFingerprint = (sort?: SortRule[]) =>
    (sort ?? []).map((s) => `${s.field}:${s.direction}`).join('|');
  const sortChanged = sortFingerprint(oldQuery.sort) !== sortFingerprint(newQuery.sort);

  const limitChanged = (oldQuery.limit ?? undefined) !== (newQuery.limit ?? undefined)
    ? { from: oldQuery.limit, to: newQuery.limit }
    : null;

  const hasChanges =
    !!sourceChanged ||
    !!vizChanged ||
    columnsAdded.length > 0 ||
    columnsRemoved.length > 0 ||
    columnsModified.length > 0 ||
    oldFilterCount !== newFilterCount ||
    groupByAdded.length > 0 ||
    groupByRemoved.length > 0 ||
    sortChanged ||
    !!limitChanged;

  return {
    hasChanges,
    sourceChanged,
    vizChanged,
    columnsAdded,
    columnsRemoved,
    columnsModified,
    filterCount: { from: oldFilterCount, to: newFilterCount },
    groupByAdded,
    groupByRemoved,
    sortChanged,
    newSort: newQuery.sort ?? [],
    limitChanged,
  };
}
