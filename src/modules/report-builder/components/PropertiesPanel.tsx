/**
 * PropertiesPanel — Right sidebar.
 * Shows properties for the selected column (label, format, alignment,
 * aggregation), or report-level settings when nothing is selected.
 */

import { Children, cloneElement, isValidElement, useState, type ReactElement } from 'react';
import { useReportBuilderStore } from '../store';
import { FilterBuilder } from './FilterBuilder';
import type {
  ReportColumn, AggregationFn, ChartAnnotation,
  ConditionalFormatRule, ConditionalFormatOperator,
} from '../types';

export function PropertiesPanel() {
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const selectedField = useReportBuilderStore((s) => s.selectedColumnField);
  const sidePanel = useReportBuilderStore((s) => s.sidePanel);
  const setSidePanel = useReportBuilderStore((s) => s.setSidePanel);

  if (!activeReport) return null;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <nav className="flex border-b border-gray-200 dark:border-gray-700">
        <TabButton active={sidePanel === 'fields'} onClick={() => setSidePanel('fields')} label="Filters" />
        <TabButton active={sidePanel === 'properties'} onClick={() => setSidePanel('properties')} label="Column" />
        <TabButton active={sidePanel === 'parameters'} onClick={() => setSidePanel('parameters')} label="Params" />
        <TabButton active={sidePanel === 'settings'} onClick={() => setSidePanel('settings')} label="Settings" />
      </nav>

      <div className="flex-1 overflow-y-auto p-3">
        {sidePanel === 'fields' && <FilterBuilder />}
        {sidePanel === 'properties' && (selectedField ? <ColumnEditor /> : <EmptyHint />)}
        {sidePanel === 'parameters' && <ParametersEditor />}
        {sidePanel === 'settings' && <SettingsEditor />}
      </div>
    </aside>
  );
}

function TabButton({
  active, onClick, label,
}: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium transition ${
        active
          ? 'border-b-2 border-blue-600 text-blue-700 dark:text-blue-300'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyHint() {
  return (
    <p className="text-xs italic text-gray-500">
      Select a column to edit its properties.
    </p>
  );
}

// ── Column editor ─────────────────────────────────────────────────

function ColumnEditor() {
  const activeReport = useReportBuilderStore((s) => s.activeReport)!;
  const selectedField = useReportBuilderStore((s) => s.selectedColumnField)!;
  const updateColumn = useReportBuilderStore((s) => s.updateColumn);
  const removeColumn = useReportBuilderStore((s) => s.removeColumn);
  const sourceDetails = useReportBuilderStore((s) => s.sourceDetails);

  const col = activeReport.query.columns.find((c) => c.field === selectedField);
  if (!col) return <EmptyHint />;

  const detail = sourceDetails.get(activeReport.query.rootSource);
  const fieldMeta = detail?.fields.find((f) => f.name === selectedField);
  const allowedAggregations: AggregationFn[] =
    fieldMeta?.aggregations ?? ['count', 'count_distinct'];

  const set = (patch: Partial<ReportColumn>) => updateColumn(selectedField, patch);

  return (
    <div className="space-y-3 text-xs">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Column
        </h3>
        <button
          type="button"
          onClick={() => removeColumn(selectedField)}
          className="rounded px-2 py-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          Remove
        </button>
      </header>

      <Field label="Field" value={col.field} readOnly />

      {col.isCalculated && (
        <FormulaEditor col={col} set={set} otherColumns={activeReport.query.columns.filter((c) => c.field !== col.field)} />
      )}

      <Field label="Label">
        <input
          aria-label="Column label"
          value={col.label ?? ''}
          onChange={(e) => set({ label: e.target.value })}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        />
      </Field>

      <Field label="Width (px)">
        <input
          aria-label="Column width in pixels"
          type="number"
          value={col.width ?? ''}
          onChange={(e) => set({ width: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          placeholder="auto"
        />
      </Field>

      <Field label="Align">
        <select
          aria-label="Column text alignment"
          value={col.align ?? ''}
          onChange={(e) => set({ align: (e.target.value || undefined) as ReportColumn['align'] })}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">default</option>
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </Field>

      <Field label="Aggregation">
        <select
          aria-label="Column aggregation function"
          value={col.aggregation ?? ''}
          onChange={(e) =>
            set({ aggregation: (e.target.value || undefined) as AggregationFn | undefined })
          }
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">none (group/show)</option>
          {allowedAggregations.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </Field>

      <Field label="Format">
        <select
          aria-label="Column format kind"
          value={col.format?.kind ?? ''}
          onChange={(e) =>
            set({ format: { ...(col.format ?? {}), kind: (e.target.value || undefined) as never } })
          }
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">plain</option>
          <option value="number">number</option>
          <option value="currency">currency</option>
          <option value="percent">percent</option>
          <option value="date">date</option>
          <option value="datetime">datetime</option>
        </select>
      </Field>

      {col.format?.kind === 'currency' && (
        <Field label="Currency Code">
          <input
            value={col.format.currencyCode ?? 'INR'}
            onChange={(e) =>
              set({ format: { ...(col.format ?? {}), currencyCode: e.target.value.toUpperCase() } })
            }
            maxLength={3}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 uppercase dark:border-gray-600 dark:bg-gray-800"
          />
        </Field>
      )}

      {(col.format?.kind === 'date' || col.format?.kind === 'datetime' || isLikelyDateField(col.field)) && (
        <Field label="Time grain (rollup)">
          <select
            aria-label="Time grain rollup"
            value={col.timeGrain ?? ''}
            onChange={(e) =>
              set({ timeGrain: (e.target.value || undefined) as ReportColumn['timeGrain'] })
            }
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">none (raw values)</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </Field>
      )}

      <DrillTargetEditor col={col} set={set} />
      <ConditionalFormatEditor col={col} set={set} />
    </div>
  );
}

// ── Drill-down configuration ─────────────────────────────────────

function DrillTargetEditor({
  col, set,
}: {
  col: ReportColumn;
  set: (patch: Partial<ReportColumn>) => void;
}) {
  const reports = useReportBuilderStore((s) => s.reports);
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const drill = col.drillTarget;
  const enabled = Boolean(drill);

  // Drill candidates: saved reports OTHER than the current one
  const candidates = reports.filter((r) => activeReport && r.id !== activeReport.id);

  return (
    <div className="rounded border border-dashed border-gray-300 bg-gray-50/50 p-2 dark:border-gray-700 dark:bg-gray-800/30">
      <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <input
          type="checkbox"
          aria-label="Enable drill-down"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              set({ drillTarget: { reportId: candidates[0]?.id ?? '', paramMapping: {}, newTab: true } });
            } else {
              set({ drillTarget: undefined });
            }
          }}
        />
        🔗 Drill-down on click
      </label>

      {enabled && drill && (
        <div className="mt-2 space-y-1.5">
          <Field label="Target report">
            <select
              aria-label="Drill-down target report"
              value={drill.reportId}
              onChange={(e) => set({ drillTarget: { ...drill, reportId: e.target.value } })}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
            >
              {candidates.length === 0 ? (
                <option value="">No other reports yet — save more reports first</option>
              ) : (
                <>
                  <option value="">— Select target —</option>
                  {candidates.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </>
              )}
            </select>
          </Field>

          <Field label="Param mapping (rowField → paramKey)">
            <ParamMappingEditor
              mapping={drill.paramMapping ?? {}}
              currentField={col.field}
              onChange={(m) => set({ drillTarget: { ...drill, paramMapping: m } })}
            />
          </Field>

          <label className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              aria-label="Open in new tab"
              checked={drill.newTab !== false}
              onChange={(e) => set({ drillTarget: { ...drill, newTab: e.target.checked } })}
            />
            Open in new tab
          </label>
        </div>
      )}
    </div>
  );
}

// ── Conditional formatting ─────────────────────────────────────

const CF_OPERATOR_LABELS: Record<ConditionalFormatOperator, string> = {
  eq: '=',
  ne: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'between',
  contains: 'contains',
  is_null: 'is empty',
  is_not_null: 'is not empty',
};

const CF_DEFAULT_PALETTE: Array<{ bg: string; text: string; label: string }> = [
  { bg: '#dcfce7', text: '#166534', label: 'Good (green)' },
  { bg: '#fee2e2', text: '#991b1b', label: 'Bad (red)' },
  { bg: '#fef3c7', text: '#92400e', label: 'Warn (amber)' },
  { bg: '#dbeafe', text: '#1e3a8a', label: 'Info (blue)' },
];

function ConditionalFormatEditor({
  col, set,
}: {
  col: ReportColumn;
  set: (patch: Partial<ReportColumn>) => void;
}) {
  const rules = col.conditionalFormats ?? [];

  function update(next: ConditionalFormatRule[]) {
    set({ conditionalFormats: next.length > 0 ? next : undefined });
  }

  function addRule() {
    const palette = CF_DEFAULT_PALETTE[rules.length % CF_DEFAULT_PALETTE.length];
    const rule: ConditionalFormatRule = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      operator: 'gt',
      value: 0,
      bgColor: palette?.bg,
      textColor: palette?.text,
    };
    update([...rules, rule]);
  }

  function patchRule(id: string, patch: Partial<ConditionalFormatRule>) {
    update(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRule(id: string) {
    update(rules.filter((r) => r.id !== id));
  }

  function moveRule(id: string, dir: -1 | 1) {
    const idx = rules.findIndex((r) => r.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= rules.length) return;
    const next = rules.slice();
    const [item] = next.splice(idx, 1);
    if (item) next.splice(target, 0, item);
    update(next);
  }

  return (
    <div className="space-y-1.5 rounded border border-gray-200 p-2 dark:border-gray-700">
      <header className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Conditional Formatting
        </h4>
        <button
          type="button"
          onClick={addRule}
          className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-700"
        >
          + Rule
        </button>
      </header>

      {rules.length === 0 && (
        <p className="text-[10px] italic text-gray-500">
          Paint cells based on their value. Top-to-bottom, first match wins.
        </p>
      )}

      <ul className="space-y-1.5">
        {rules.map((rule, idx) => (
          <li
            key={rule.id}
            className="rounded border border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center gap-1">
              <select
                aria-label="Operator"
                value={rule.operator}
                onChange={(e) =>
                  patchRule(rule.id, { operator: e.target.value as ConditionalFormatOperator })
                }
                className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] dark:border-gray-600 dark:bg-gray-800"
              >
                {(Object.keys(CF_OPERATOR_LABELS) as ConditionalFormatOperator[]).map((op) => (
                  <option key={op} value={op}>{CF_OPERATOR_LABELS[op]}</option>
                ))}
              </select>

              {rule.operator !== 'is_null' && rule.operator !== 'is_not_null' && (
                <input
                  aria-label="Value"
                  value={rule.value === undefined ? '' : String(rule.value)}
                  onChange={(e) => patchRule(rule.id, { value: coerceCfValue(e.target.value) })}
                  placeholder="value"
                  className="w-20 rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] dark:border-gray-600 dark:bg-gray-800"
                />
              )}
              {rule.operator === 'between' && (
                <>
                  <span className="text-[10px] text-gray-500">…</span>
                  <input
                    aria-label="Upper bound"
                    value={rule.value2 === undefined ? '' : String(rule.value2)}
                    onChange={(e) => patchRule(rule.id, { value2: coerceCfValue(e.target.value) })}
                    placeholder="upper"
                    className="w-20 rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] dark:border-gray-600 dark:bg-gray-800"
                  />
                </>
              )}

              <div className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveRule(rule.id, -1)}
                  disabled={idx === 0}
                  aria-label="Move up"
                  className="rounded px-1 text-[10px] text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                >▲</button>
                <button
                  type="button"
                  onClick={() => moveRule(rule.id, 1)}
                  disabled={idx === rules.length - 1}
                  aria-label="Move down"
                  className="rounded px-1 text-[10px] text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                >▼</button>
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  aria-label="Remove rule"
                  className="rounded px-1 text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >✕</button>
              </div>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5">
              <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                <span>Bg</span>
                <input
                  type="color"
                  aria-label="Background color"
                  value={rule.bgColor ?? '#ffffff'}
                  onChange={(e) => patchRule(rule.id, { bgColor: e.target.value })}
                  className="h-5 w-7 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                <span>Text</span>
                <input
                  type="color"
                  aria-label="Text color"
                  value={rule.textColor ?? '#111827'}
                  onChange={(e) => patchRule(rule.id, { textColor: e.target.value })}
                  className="h-5 w-7 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(rule.bold)}
                  onChange={(e) => patchRule(rule.id, { bold: e.target.checked })}
                  className="h-3 w-3"
                />
                <span className="font-bold">B</span>
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(rule.italic)}
                  onChange={(e) => patchRule(rule.id, { italic: e.target.checked })}
                  className="h-3 w-3"
                />
                <span className="italic">I</span>
              </label>
              <label className="ml-auto flex items-center gap-0.5 text-[10px] text-gray-700 dark:text-gray-300" title="Paint the entire row instead of just this cell">
                <input
                  type="checkbox"
                  checked={Boolean(rule.rowScope)}
                  onChange={(e) => patchRule(rule.id, { rowScope: e.target.checked })}
                  className="h-3 w-3"
                />
                Row
              </label>
            </div>

            {/* Preview chip */}
            <div className="mt-1 flex justify-end">
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[10px]"
                style={cfPreviewStyle(rule)}
              >
                Preview
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Best-effort coercion for the rule value input. Numeric input → number. */
function coerceCfValue(raw: string): string | number | boolean | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return raw;
}

function cfPreviewStyle(rule: ConditionalFormatRule): React.CSSProperties {
  const out: React.CSSProperties = {};
  if (rule.bgColor) out.backgroundColor = rule.bgColor;
  if (rule.textColor) out.color = rule.textColor;
  if (rule.bold) out.fontWeight = 'bold';
  if (rule.italic) out.fontStyle = 'italic';
  return out;
}

function ParamMappingEditor({
  mapping, currentField, onChange,
}: {
  mapping: Record<string, string>;
  currentField: string;
  onChange: (m: Record<string, string>) => void;
}) {
  const entries = Object.entries(mapping);

  function setEntry(idx: number, key: string, value: string) {
    const next = [...entries];
    next[idx] = [key, value];
    onChange(Object.fromEntries(next.filter(([k]) => k.length > 0)));
  }

  function addEntry() {
    onChange({ ...mapping, [currentField]: deriveParamName(currentField) });
  }

  function removeEntry(idx: number) {
    const next = entries.filter((_, i) => i !== idx);
    onChange(Object.fromEntries(next));
  }

  return (
    <div className="space-y-1">
      {entries.length === 0 && (
        <p className="text-[10px] italic text-gray-500">
          No mappings — clicking a row will open the target without parameters.
        </p>
      )}
      {entries.map(([k, v], idx) => (
        <div key={`${k}-${idx}`} className="flex items-center gap-1">
          <input
            aria-label="Source field"
            value={k}
            onChange={(e) => setEntry(idx, e.target.value, v)}
            placeholder="row.field"
            className="flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[11px] dark:border-gray-600 dark:bg-gray-800"
          />
          <span className="text-[11px] text-gray-400">→</span>
          <input
            aria-label="Target parameter key"
            value={v}
            onChange={(e) => setEntry(idx, k, e.target.value)}
            placeholder="paramKey"
            className="flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[11px] dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            type="button"
            onClick={() => removeEntry(idx)}
            className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            aria-label="Remove mapping"
          >✕</button>
        </div>
      ))}
      <button
        type="button"
        onClick={addEntry}
        className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
      >
        + Add mapping
      </button>
    </div>
  );
}

// ── Calculated-column formula editor ────────────────────────────

function FormulaEditor({
  col, set, otherColumns,
}: {
  col: ReportColumn;
  set: (patch: Partial<ReportColumn>) => void;
  otherColumns: ReportColumn[];
}) {
  const [error, setError] = useState<string | null>(null);

  function onChange(value: string) {
    set({ formula: value });
    // Lightweight validation: parse-only, no row context
    setError(quickValidate(value));
  }

  function insert(fieldName: string) {
    const next = (col.formula ?? '') + (col.formula?.endsWith(' ') ? '' : ' ') + fieldName;
    onChange(next);
  }

  return (
    <div className="rounded border border-purple-200 bg-purple-50/50 p-2 dark:border-purple-900 dark:bg-purple-950/30">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
        ƒ Formula
      </p>
      <textarea
        aria-label="Formula"
        value={col.formula ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="(qtyShipped / totalQty) * 100"
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
        spellCheck={false}
      />
      {error ? (
        <p className="mt-1 text-[10px] text-red-600">⚠ {error}</p>
      ) : (
        <p className="mt-1 text-[10px] text-gray-500">
          Operators: + − × ÷ % ( ) &amp;&amp; || == != &gt;= &lt;= |
          Functions: IF, ROUND, ABS, MIN, MAX, COALESCE, CONCAT
        </p>
      )}
      {otherColumns.length > 0 && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Insert field
          </summary>
          <div className="mt-1 flex flex-wrap gap-1">
            {otherColumns.map((c) => (
              <button
                key={c.field}
                type="button"
                onClick={() => insert(c.field)}
                className="rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[10px] text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
              >
                {c.field}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * Lightweight client-side validation. We don't ship the full parser to the
 * browser — just balance parens / quotes and reject obvious typos.
 */
function quickValidate(formula: string): string | null {
  if (formula.trim().length === 0) return null;
  let parens = 0;
  let inStr: '"' | "'" | null = null;
  for (let i = 0; i < formula.length; i += 1) {
    const c = formula[i];
    if (inStr) {
      if (c === inStr && formula[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '(') parens += 1;
    if (c === ')') parens -= 1;
    if (parens < 0) return 'Unmatched closing paren';
  }
  if (parens > 0) return 'Unmatched opening paren';
  if (inStr) return 'Unterminated string';
  return null;
}

/**
 * Heuristic: does the field name suggest it holds a date?
 * Used to surface the Time-grain selector even when the column hasn't been
 * given an explicit date format yet.
 */
function isLikelyDateField(fieldPath: string): boolean {
  const last = fieldPath.split('.').pop()?.toLowerCase() ?? '';
  return /date|time|at$|^dob$|joined|created|updated|expires|delivered|invoiced|shipped|exfactory/i.test(last);
}

function deriveParamName(fieldPath: string): string {
  const last = fieldPath.split('.').pop() ?? fieldPath;
  return `p_${last}`;
}

function Field({
  label, value, readOnly, children,
}: {
  label: string;
  value?: string;
  readOnly?: boolean;
  children?: React.ReactNode;
}) {
  // Auto-inject aria-label on the form control(s) inside so axe recognises
  // the labelling. Implicit `<label>` association works in HTML but axe wants
  // explicit text — this gives every input/select/textarea an accessible name.
  const labelledChildren = readOnly
    ? null
    : Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const tag = typeof child.type === 'string' ? child.type : '';
        if (['input', 'select', 'textarea'].includes(tag)) {
          const props = child.props as Record<string, unknown>;
          if (!props['aria-label'] && !props['aria-labelledby']) {
            const el = child as ReactElement<Record<string, unknown>>;
            return cloneElement(el, { 'aria-label': label });
          }
        }
        return child;
      });

  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium uppercase text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {readOnly ? (
        <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          {value}
        </div>
      ) : (
        labelledChildren
      )}
    </label>
  );
}

// ── Parameters editor ─────────────────────────────────────────────

function ParametersEditor() {
  const activeReport = useReportBuilderStore((s) => s.activeReport)!;
  const setParameters = useReportBuilderStore((s) => s.setParameters);

  return (
    <div className="space-y-2 text-xs">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Parameters
        </h3>
        <button
          type="button"
          onClick={() =>
            setParameters([
              ...activeReport.parameters,
              { key: `param_${activeReport.parameters.length + 1}`, label: 'New Parameter', type: 'string', required: false },
            ])
          }
          className="rounded bg-blue-600 px-2 py-0.5 font-medium text-white hover:bg-blue-700"
        >
          + Add
        </button>
      </header>

      {activeReport.parameters.length === 0 ? (
        <p className="italic text-gray-500">No parameters. Parameters bind to filter rules at runtime.</p>
      ) : (
        <ul className="space-y-1.5">
          {activeReport.parameters.map((p, idx) => (
            <li key={p.key} className="rounded border border-gray-200 p-2 dark:border-gray-700">
              <div className="flex gap-1.5">
                <input
                  aria-label={`Parameter ${idx + 1} key`}
                  value={p.key}
                  onChange={(e) => {
                    const next = [...activeReport.parameters];
                    next[idx] = { ...p, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') };
                    setParameters(next);
                  }}
                  className="flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono dark:border-gray-600 dark:bg-gray-800"
                />
                <select
                  aria-label={`Parameter ${idx + 1} type`}
                  value={p.type}
                  onChange={(e) => {
                    const next = [...activeReport.parameters];
                    next[idx] = { ...p, type: e.target.value as typeof p.type };
                    setParameters(next);
                  }}
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="date">date</option>
                  <option value="datetime">datetime</option>
                  <option value="boolean">boolean</option>
                </select>
                <button
                  type="button"
                  onClick={() => setParameters(activeReport.parameters.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:text-red-800"
                >✕</button>
              </div>
              <input
                aria-label={`Parameter ${idx + 1} display label`}
                value={p.label}
                onChange={(e) => {
                  const next = [...activeReport.parameters];
                  next[idx] = { ...p, label: e.target.value };
                  setParameters(next);
                }}
                placeholder="Display label"
                className="mt-1 w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-800"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Settings editor ───────────────────────────────────────────────

function SettingsEditor() {
  const activeReport = useReportBuilderStore((s) => s.activeReport)!;
  const updateMeta = useReportBuilderStore((s) => s.updateMeta);
  const updateSettings = useReportBuilderStore((s) => s.updateSettings);
  const updateVizConfig = useReportBuilderStore((s) => s.updateVizConfig);

  return (
    <div className="space-y-3 text-xs">
      <Field label="Name">
        <input
          aria-label="Report name"
          value={activeReport.name}
          onChange={(e) => updateMeta({ name: e.target.value })}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        />
      </Field>
      <Field label="Description">
        <textarea
          aria-label="Report description"
          value={activeReport.description}
          onChange={(e) => updateMeta({ description: e.target.value })}
          rows={3}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        />
      </Field>
      <Field label="Category">
        <input
          aria-label="Report category"
          value={activeReport.category}
          onChange={(e) => updateMeta({ category: e.target.value })}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        />
      </Field>
      <Field label="Page size">
        <input
          aria-label="Page size"
          type="number"
          value={activeReport.settings.pageSize ?? 50}
          onChange={(e) => updateSettings({ pageSize: Number(e.target.value) || 50 })}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        />
      </Field>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          aria-label="Show row numbers"
          checked={activeReport.settings.showRowNumbers ?? true}
          onChange={(e) => updateSettings({ showRowNumbers: e.target.checked })}
        />
        Show row numbers
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          aria-label="Striped rows"
          checked={activeReport.settings.striped ?? true}
          onChange={(e) => updateSettings({ striped: e.target.checked })}
        />
        Striped rows
      </label>

      {/* ── Period-over-period comparison ── */}
      <Field label="Compare to previous period (YoY)">
        <select
          aria-label="Compare to previous period"
          value={activeReport.vizConfig?.compareWith ?? ''}
          onChange={(e) =>
            updateVizConfig({
              compareWith: (e.target.value || undefined) as
                | 'previous_year' | 'previous_period' | undefined,
            })
          }
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">Off</option>
          <option value="previous_year">Same period last year</option>
          <option value="previous_period">Previous period (same length)</option>
        </select>
      </Field>
      {activeReport.vizConfig?.compareWith && (
        <p className="text-[10px] italic text-gray-500">
          Requires a date filter on the report (between or ≥). Charts render twin
          series; KPI cards show a delta vs the prior period.
        </p>
      )}

      <AnnotationsEditor
        annotations={activeReport.vizConfig?.annotations ?? []}
        onChange={(annotations) => updateVizConfig({ annotations })}
      />

      <ForecastEditor
        forecast={activeReport.vizConfig?.forecast}
        visualization={activeReport.visualization}
        onChange={(forecast) => updateVizConfig({ forecast })}
      />
    </div>
  );
}

// ── Annotations editor ──────────────────────────────────────────

function AnnotationsEditor({
  annotations, onChange,
}: {
  annotations: ChartAnnotation[];
  onChange: (next: ChartAnnotation[]) => void;
}) {
  function addAnnotation() {
    const today = new Date().toISOString().slice(0, 10);
    const newAnno: ChartAnnotation = {
      id: `ann_${Date.now().toString(36)}`,
      date: today,
      label: 'New event',
      color: '#f59e0b',
    };
    onChange([...annotations, newAnno]);
  }

  function update(idx: number, patch: Partial<ChartAnnotation>) {
    onChange(annotations.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function remove(idx: number) {
    onChange(annotations.filter((_, i) => i !== idx));
  }

  return (
    <div className="rounded border border-amber-200 bg-amber-50/40 p-2 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
          📌 Time-series annotations
        </span>
        <button
          type="button"
          onClick={addAnnotation}
          className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-amber-700"
        >
          + Add
        </button>
      </div>

      {annotations.length === 0 ? (
        <p className="text-[10px] italic text-gray-500">
          Mark events on the X-axis (Diwali, audit, system upgrade…). Visible only
          on line / area / bar charts grouped by a date dimension.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {annotations.map((a, idx) => (
            <li
              key={a.id}
              className="rounded border border-amber-200 bg-white p-1.5 text-xs dark:border-amber-800 dark:bg-gray-900"
            >
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <input
                  aria-label={`Annotation ${idx + 1} label`}
                  value={a.label}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  placeholder="Event label"
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  aria-label={`Remove annotation ${idx + 1}`}
                >✕</button>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <input
                  aria-label={`Annotation ${idx + 1} start date`}
                  type="date"
                  value={a.date.slice(0, 10)}
                  onChange={(e) => update(idx, { date: e.target.value })}
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[11px] dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  aria-label={`Annotation ${idx + 1} end date (optional)`}
                  type="date"
                  value={a.endDate?.slice(0, 10) ?? ''}
                  onChange={(e) => update(idx, { endDate: e.target.value || undefined })}
                  placeholder="end (optional)"
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[11px] dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  aria-label={`Annotation ${idx + 1} color`}
                  type="color"
                  value={a.color ?? '#f59e0b'}
                  onChange={(e) => update(idx, { color: e.target.value })}
                  className="h-5 w-7 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
                <span className="text-[10px] text-gray-500">
                  {a.endDate ? 'Range (shaded band)' : 'Point (vertical line)'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Forecast editor ─────────────────────────────────────────────

type ForecastConfig = {
  enabled: boolean;
  periods: number;
  method: 'linear' | 'holt';
} | undefined;

function ForecastEditor({
  forecast, visualization, onChange,
}: {
  forecast: ForecastConfig;
  visualization: string | undefined;
  onChange: (next: ForecastConfig) => void;
}) {
  // Forecast only renders meaningfully on line/area charts
  const supported = visualization === 'line' || visualization === 'area';
  if (!supported) return null;

  const enabled = Boolean(forecast?.enabled);
  const periods = forecast?.periods ?? 7;
  const method: 'linear' | 'holt' = forecast?.method ?? 'linear';

  return (
    <div className="rounded border border-violet-200 bg-violet-50/40 p-2 dark:border-violet-900 dark:bg-violet-950/20">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
          🔮 Forecast
        </span>
        <label className="flex items-center gap-1 text-[10px] text-violet-800 dark:text-violet-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              onChange(e.target.checked
                ? { enabled: true, periods, method }
                : forecast ? { ...forecast, enabled: false } : undefined)
            }
            className="h-3 w-3"
            aria-label="Enable forecast"
          />
          Enable
        </label>
      </div>

      {!enabled ? (
        <p className="text-[10px] italic text-gray-500">
          Project the trend forward N periods using linear regression or Holt&rsquo;s
          exponential smoothing. Visible only on line/area charts.
        </p>
      ) : (
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Periods ahead
            <input
              type="number"
              min={1}
              max={180}
              value={periods}
              onChange={(e) => {
                const n = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                onChange({ enabled: true, method, periods: n });
              }}
              aria-label="Periods ahead"
              className="mt-0.5 w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Method
            <select
              value={method}
              onChange={(e) =>
                onChange({ enabled: true, periods, method: e.target.value as 'linear' | 'holt' })
              }
              aria-label="Forecast method"
              className="mt-0.5 w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="linear">Linear regression (cheap, monotonic)</option>
              <option value="holt">Holt exp. smoothing (drifts with recent trend)</option>
            </select>
          </label>
          <p className="text-[10px] italic text-gray-500">
            Disabled at render time when period-over-period comparison is on (the
            chart is already extended backward — adding a forward extrapolation
            gets visually noisy).
          </p>
        </div>
      )}
    </div>
  );
}
