/**
 * Report Builder — TypeScript types
 *
 * Mirrors the backend Zod schemas in apps/api-server/src/modules/reports/builder/
 * reportBuilder.schema.ts. Keep in sync.
 */

// ── Field metadata (catalog) ───────────────────────────────────────

export type FieldType =
  | 'string' | 'number' | 'integer' | 'decimal'
  | 'boolean' | 'date' | 'datetime' | 'enum';

export interface CatalogField {
  name: string;
  label: string;
  type: FieldType;
  filterable?: boolean;
  sortable?: boolean;
  aggregations?: AggregationFn[];
  enumValues?: string[];
  fk?: { sourceName: string; via: string };
  hidden?: boolean;
  description?: string;
}

export interface CatalogJoin {
  fromField?: string;
  backRelation?: string;
  toSource: string;
  toField?: string;
  alias: string;
  type?: 'inner' | 'left';
  /** 'one' (default) — single related row; 'many' — collection that row-explodes. */
  cardinality?: 'one' | 'many';
}

export interface CatalogSourceSummary {
  name: string;
  label: string;
  module: string;
  description: string;
  fieldCount: number;
}

export interface CatalogSourceDetail extends Omit<CatalogSourceSummary, 'fieldCount'> {
  fields: CatalogField[];
  joins: CatalogJoin[];
  defaultColumns: string[];
}

// ── Filters ────────────────────────────────────────────────────────

export type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'starts_with' | 'ends_with'
  | 'in' | 'not_in' | 'between'
  | 'is_null' | 'is_not_null';

export interface FilterRule {
  id?: string; // client-only, for React keys
  field: string;
  operator: FilterOperator;
  value?: unknown;
  parameter?: string;
}

export interface FilterGroup {
  id?: string;
  combinator: 'and' | 'or';
  rules: Array<FilterRule | FilterGroup>;
}

// ── Columns / sort / parameters ────────────────────────────────────

export type AggregationFn = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct';

export interface ColumnFormat {
  kind?: 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'duration' | 'plain';
  locale?: string;
  currencyCode?: string;
  decimals?: number;
  dateFormat?: string;
}

export interface DrillTarget {
  /** Saved report id to open when a row is clicked */
  reportId: string;
  /** Map row field → target report parameter key. */
  paramMapping?: Record<string, string>;
  /** Open in a new tab (default true) */
  newTab?: boolean;
}

export type ConditionalFormatOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between' | 'contains' | 'is_null' | 'is_not_null';

/**
 * Per-column rule painting cells (or their entire row) when the value matches
 * a predicate. Rules are evaluated top-to-bottom — first match wins.
 */
export interface ConditionalFormatRule {
  id: string;
  operator: ConditionalFormatOperator;
  value?: string | number | boolean;
  value2?: string | number | boolean;
  bgColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  rowScope?: boolean;
  label?: string;
}

export interface ReportColumn {
  field: string;
  label?: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  aggregation?: AggregationFn;
  format?: ColumnFormat;
  hidden?: boolean;
  /** Drill-down — clicking a row in this column opens another report with context. */
  drillTarget?: DrillTarget;
  /** Date / datetime rollup grain. Truncates each value to the bucket-start. */
  timeGrain?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  /** When true, cell value comes from `formula` evaluated post-aggregation. */
  isCalculated?: boolean;
  /** Formula for calculated columns — see formulaEvaluator.ts for grammar. */
  formula?: string;
  /** Conditional formatting rules — first match wins. */
  conditionalFormats?: ConditionalFormatRule[];
}

export interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
}

export type ParameterType =
  | 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'enum' | 'date_range';

export interface ReportParameter {
  key: string;
  label: string;
  type: ParameterType;
  required: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
}

// ── Report query + definition ──────────────────────────────────────

export interface ReportQuery {
  rootSource: string;
  columns: ReportColumn[];
  filters?: FilterGroup;
  groupBy?: string[];
  sort?: SortRule[];
  limit?: number;
  /** Merge tail rows beyond `limit` into a single "Others" row (aggregated only). */
  othersBucket?: boolean;
  /** Label for the Others bucket (default "Others"). */
  othersLabel?: string;
}

export type ReportType = 'operational' | 'analytical' | 'dashboard' | 'banded';

export type Visualization =
  | 'table' | 'bar' | 'line' | 'area'
  | 'pie' | 'donut' | 'kpi' | 'banded' | 'pivot' | 'heatmap' | 'geo'
  | 'scatter' | 'bubble';

export interface ChartAnnotation {
  /** Stable client id */
  id: string;
  /** ISO date or datetime — start of the annotation */
  date: string;
  /** Optional end date — when set, renders as a shaded range */
  endDate?: string;
  label: string;
  description?: string;
  /** Hex color (default amber) */
  color?: string;
}

export interface VizConfig {
  /** Column field used as the X-axis / category dimension. */
  xField?: string;
  /** Column fields used as Y-axis / measure series. */
  yFields?: string[];
  palette?: string | string[];
  stacked?: boolean;
  dataLabels?: boolean;
  showLegend?: boolean;
  comparisonField?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  /** Period-over-period comparison (twin series for charts, delta for KPI). */
  compareWith?: 'previous_year' | 'previous_period';
  /** Time-series annotations — vertical lines or shaded ranges with labels. */
  annotations?: ChartAnnotation[];
  /** Forecast extrapolation (line/area charts only) — Phase 6.14. */
  forecast?: {
    enabled: boolean;
    /** How many points to project (1..180). */
    periods: number;
    method: 'linear' | 'holt';
  };
}

export interface ReportSettings {
  pageSize?: number;
  defaultExportFormat?: 'xlsx' | 'csv' | 'pdf' | 'json';
  showRowNumbers?: boolean;
  striped?: boolean;
}

// ── Widgets (for dashboards) ─────────────────────────────────────

export type WidgetType = Visualization | 'markdown';

export interface Widget {
  id: string;
  reportId: string;
  widgetType: WidgetType;
  title: string;
  query: ReportQuery | null;
  vizConfig: VizConfig;
  markdown: string | null;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  sortOrder: number;
}

export interface CreateWidgetPayload {
  widgetType: WidgetType;
  title?: string;
  query?: ReportQuery;
  vizConfig?: VizConfig;
  markdown?: string;
  gridX?: number;
  gridY?: number;
  gridW?: number;
  gridH?: number;
  sortOrder?: number;
}

export interface WidgetRunResult {
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  page: number;
  pageSize: number;
  durationMs: number;
  /** Set when the widget is a `markdown` widget. */
  markdown?: string | null;
  /** Period-over-period comparison data (set when vizConfig.compareWith is configured). */
  priorRows?: Array<Record<string, unknown>>;
  comparedRange?: {
    current: { from: string; to: string };
    prior: { from: string; to: string };
  } | null;
}

/** Visualization metadata for the picker UI */
export interface VisualizationMeta {
  id: Visualization;
  label: string;
  icon: string;
  /** Minimum dimensions/measures required */
  requirements: { dimensions: number; measures: number };
  description: string;
}

export const VISUALIZATIONS: VisualizationMeta[] = [
  { id: 'table',  label: 'Table',     icon: '⊞',
    requirements: { dimensions: 0, measures: 0 },
    description: 'Tabular grid of rows and columns' },
  { id: 'bar',    label: 'Bar',       icon: '▥',
    requirements: { dimensions: 1, measures: 1 },
    description: 'Compare values across categories' },
  { id: 'line',   label: 'Line',      icon: '╱',
    requirements: { dimensions: 1, measures: 1 },
    description: 'Show trends over time' },
  { id: 'area',   label: 'Area',      icon: '◢',
    requirements: { dimensions: 1, measures: 1 },
    description: 'Stacked trend over time' },
  { id: 'pie',    label: 'Pie',       icon: '◐',
    requirements: { dimensions: 1, measures: 1 },
    description: 'Proportional breakdown' },
  { id: 'donut',  label: 'Donut',     icon: '◯',
    requirements: { dimensions: 1, measures: 1 },
    description: 'Proportional with center label' },
  { id: 'kpi',    label: 'KPI',       icon: '#',
    requirements: { dimensions: 0, measures: 1 },
    description: 'Single big-number metric' },
  { id: 'pivot',  label: 'Pivot',     icon: '⊟',
    requirements: { dimensions: 2, measures: 1 },
    description: '2-D matrix: rows × columns × measure' },
  { id: 'heatmap', label: 'Heatmap',  icon: '▦',
    requirements: { dimensions: 2, measures: 1 },
    description: 'Cell-intensity matrix — same shape as pivot, gradient-coloured' },
  { id: 'geo',     label: 'Geo Map',   icon: '🌍',
    requirements: { dimensions: 1, measures: 1 },
    description: 'World bubble map — country code (ISO-2) × measure' },
  { id: 'scatter', label: 'Scatter',   icon: '⋯',
    requirements: { dimensions: 0, measures: 2 },
    description: 'Correlation: each row a point on (X measure, Y measure)' },
  { id: 'bubble',  label: 'Bubble',    icon: '◉',
    requirements: { dimensions: 0, measures: 3 },
    description: 'Scatter + size dimension — three measures (X, Y, size)' },
];

export interface ReportListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: ReportType;
  status: 'draft' | 'published' | 'archived';
  rootSource: string;
  category: string;
  icon: string;
  createdBy: string;
  updatedAt: string;
}

export interface ReportDefinition extends ReportListItem {
  query: ReportQuery;
  parameters: ReportParameter[];
  settings: ReportSettings;
  theme: Record<string, unknown>;
  layout: Record<string, unknown> | null;
  visualization: Visualization;
  vizConfig: VizConfig;
  etag: string;
  currentPublishedVersionId: number | null;
  createdAt: string;
}

// ── Run / preview / export ─────────────────────────────────────────

export interface ReportRunResult {
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  page: number;
  pageSize: number;
  durationMs: number;
}

export interface ReportRunResponse extends ReportRunResult {
  report: {
    id: string;
    name: string;
    columns: ReportColumn[];
  };
}

export interface ReportVersion {
  id: string;
  versionNumber: number;
  label: string;
  status: string;
  createdBy: string;
  createdAt: string;
  isPinned: boolean;
}

// ── Helpers / factory functions ────────────────────────────────────

let __idCounter = 0;
export function generateClientId(prefix = 'cl'): string {
  __idCounter += 1;
  return `${prefix}_${Date.now()}_${__idCounter}`;
}

export function emptyReport(name = 'Untitled Report'): ReportDefinition {
  return {
    id: '',
    name,
    slug: '',
    description: '',
    type: 'operational',
    status: 'draft',
    rootSource: '',
    category: 'general',
    icon: '📊',
    createdBy: '',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    query: { rootSource: '', columns: [] },
    parameters: [],
    settings: { pageSize: 50, striped: true, showRowNumbers: true, defaultExportFormat: 'xlsx' },
    theme: {},
    layout: null,
    visualization: 'table',
    vizConfig: { showLegend: true, dataLabels: false },
    etag: '',
    currentPublishedVersionId: null,
  };
}

/**
 * Classify columns into dimensions vs measures.
 * Measure: any column with `aggregation` set.
 * Dimension: everything else.
 */
export function classifyColumns(columns: ReportColumn[]): {
  dimensions: ReportColumn[];
  measures: ReportColumn[];
} {
  const dimensions: ReportColumn[] = [];
  const measures: ReportColumn[] = [];
  for (const c of columns) {
    if (c.aggregation) measures.push(c);
    else dimensions.push(c);
  }
  return { dimensions, measures };
}

/** Pick X (dimension) and Y (measures) for chart visualizations. */
export function inferChartAxes(
  columns: ReportColumn[],
  vizConfig: VizConfig | undefined
): { xField: string | null; yFields: string[] } {
  const { dimensions, measures } = classifyColumns(columns);
  const xField = vizConfig?.xField ?? dimensions[0]?.field ?? null;
  const yFields = (vizConfig?.yFields && vizConfig.yFields.length > 0)
    ? vizConfig.yFields
    : measures.map((m) => m.field);
  return { xField, yFields };
}

/** Operators legal for a given field type. */
export function operatorsForType(type: FieldType): FilterOperator[] {
  switch (type) {
    case 'string':
      return ['eq', 'ne', 'contains', 'starts_with', 'ends_with', 'in', 'not_in', 'is_null', 'is_not_null'];
    case 'number':
    case 'integer':
    case 'decimal':
      return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'not_in', 'is_null', 'is_not_null'];
    case 'date':
    case 'datetime':
      return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null'];
    case 'boolean':
      return ['eq', 'is_null', 'is_not_null'];
    case 'enum':
      return ['eq', 'ne', 'in', 'not_in', 'is_null', 'is_not_null'];
  }
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'equals',
  ne: 'not equals',
  gt: 'greater than',
  gte: 'greater or equal',
  lt: 'less than',
  lte: 'less or equal',
  contains: 'contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  in: 'in (any of)',
  not_in: 'not in',
  between: 'between',
  is_null: 'is empty',
  is_not_null: 'is not empty',
};

export function fieldLabel(source: CatalogSourceDetail | null, fieldPath: string): string {
  if (!source) return fieldPath;
  // Direct field
  const direct = source.fields.find((f) => f.name === fieldPath);
  if (direct) return direct.label;
  // Joined: 'buyer.name'
  if (fieldPath.includes('.')) {
    const [alias, rest] = fieldPath.split('.', 2);
    const join = source.joins.find((j) => j.alias === alias);
    return join ? `${join.alias}.${rest}` : fieldPath;
  }
  return fieldPath;
}
