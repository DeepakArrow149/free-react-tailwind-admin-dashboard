/**
 * FilterBuilder — Recursive AND/OR filter editor.
 *
 * Renders the report's `filters` group tree. Each leaf rule has:
 *   field selector (catalog-aware) → operator → value | parameter.
 */

import { useMemo } from 'react';
import { useReportBuilderStore } from '../store';
import { DateRangePresets } from './DateRangePresets';
import {
  OPERATOR_LABELS,
  operatorsForType,
  type FilterGroup,
  type FilterRule,
  type CatalogField,
  type CatalogSourceDetail,
  type FilterOperator,
} from '../types';

export function FilterBuilder() {
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const sourceDetails = useReportBuilderStore((s) => s.sourceDetails);
  const addFilterRule = useReportBuilderStore((s) => s.addFilterRule);
  const updateFilterRule = useReportBuilderStore((s) => s.updateFilterRule);
  const removeFilterRule = useReportBuilderStore((s) => s.removeFilterRule);
  const setFilters = useReportBuilderStore((s) => s.setFilters);

  if (!activeReport) return null;
  const detail = sourceDetails.get(activeReport.query.rootSource);
  const filters = activeReport.query.filters;

  if (!detail) {
    return (
      <div className="rounded border border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-700">
        Pick a data source to start filtering.
      </div>
    );
  }

  const filterableFields = collectFilterableFields(detail);

  return (
    <div className="space-y-2">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Filters
        </h3>
        <div className="flex gap-1">
          {filters && (
            <select
              aria-label="Combinator"
              value={filters.combinator}
              onChange={(e) =>
                setFilters({ ...filters, combinator: e.target.value as 'and' | 'or' })
              }
              className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="and">AND</option>
              <option value="or">OR</option>
            </select>
          )}
          <button
            type="button"
            onClick={() =>
              addFilterRule({
                field: filterableFields[0]?.path ?? '',
                operator: 'eq',
              })
            }
            className="rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={filterableFields.length === 0}
          >
            + Add filter
          </button>
        </div>
      </header>

      {!filters || filters.rules.length === 0 ? (
        <p className="text-xs italic text-gray-500">No filters. Click <em>Add filter</em> to start.</p>
      ) : (
        <ul className="space-y-1.5">
          {filters.rules.map((r, idx) =>
            'combinator' in r ? (
              <li key={r.id ?? `g-${idx}`} className="rounded border border-amber-300 bg-amber-50 p-2 text-xs dark:border-amber-700 dark:bg-amber-950">
                Nested groups: edit JSON directly (UI Phase 2)
              </li>
            ) : (
              <FilterRuleRow
                key={r.id}
                rule={r}
                fields={filterableFields}
                onChange={(updates) => updateFilterRule(r.id!, updates)}
                onRemove={() => removeFilterRule(r.id!)}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}

interface FilterableField {
  path: string;
  label: string;
  type: CatalogField['type'];
  enumValues?: string[];
}

function collectFilterableFields(detail: CatalogSourceDetail): FilterableField[] {
  // Direct fields
  const fields: FilterableField[] = detail.fields
    .filter((f) => f.filterable !== false && !f.hidden)
    .map((f) => ({
      path: f.name,
      label: f.label,
      type: f.type,
      enumValues: f.enumValues,
    }));
  // We don't have joined source details in this snapshot — UI shows only root
  // direct fields here. Joined filters are still settable via the field picker
  // (the catalog detail for joined sources is fetched lazily in DataSourcePanel).
  return fields;
}

function FilterRuleRow({
  rule, fields, onChange, onRemove,
}: {
  rule: FilterRule;
  fields: FilterableField[];
  onChange: (updates: Partial<FilterRule>) => void;
  onRemove: () => void;
}) {
  const field = useMemo(
    () => fields.find((f) => f.path === rule.field),
    [fields, rule.field]
  );

  const operators = field ? operatorsForType(field.type) : (Object.keys(OPERATOR_LABELS) as FilterOperator[]);

  const requiresValue = !['is_null', 'is_not_null'].includes(rule.operator);
  const requiresArray = ['in', 'not_in'].includes(rule.operator);
  const requiresRange = rule.operator === 'between';

  return (
    <li className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5 rounded border border-gray-200 bg-white p-1.5 text-xs dark:border-gray-700 dark:bg-gray-800">
      {/* Field picker */}
      <select
        aria-label="Filter field"
        value={rule.field}
        onChange={(e) => onChange({ field: e.target.value, operator: 'eq', value: undefined })}
        className="min-w-0 truncate rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
      >
        {fields.map((f) => (
          <option key={f.path} value={f.path}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        aria-label="Filter operator"
        value={rule.operator}
        onChange={(e) => onChange({ operator: e.target.value as FilterOperator, value: undefined })}
        className="rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
      >
        {operators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {/* Value */}
      {requiresValue ? (
        requiresRange ? (
          <RangeInput field={field} value={rule.value} onChange={(v) => onChange({ value: v })} />
        ) : requiresArray ? (
          <ArrayInput value={rule.value} onChange={(v) => onChange({ value: v })} />
        ) : (
          <ValueInput field={field} value={rule.value} onChange={(v) => onChange({ value: v })} />
        )
      ) : (
        <span className="text-gray-400">—</span>
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        title="Remove filter"
        aria-label="Remove filter"
      >
        ✕
      </button>
    </li>
  );
}

function ValueInput({
  field, value, onChange,
}: {
  field: FilterableField | undefined;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const ariaLabel = field ? `Value for ${field.label}` : 'Filter value';
  if (!field) {
    return (
      <input
        aria-label={ariaLabel}
        placeholder="Value"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
      />
    );
  }
  if (field.type === 'boolean') {
    return (
      <select aria-label={ariaLabel} value={String(value ?? '')} onChange={(e) => onChange(e.target.value === 'true')}
        className="rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900">
        <option value="">—</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (field.type === 'enum' && field.enumValues) {
    return (
      <select aria-label={ariaLabel} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900">
        <option value="">—</option>
        {field.enumValues.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    );
  }
  if (field.type === 'date' || field.type === 'datetime') {
    return (
      <input aria-label={ariaLabel}
        type={field.type === 'date' ? 'date' : 'datetime-local'}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
      />
    );
  }
  if (field.type === 'integer' || field.type === 'number' || field.type === 'decimal') {
    return (
      <input aria-label={ariaLabel} type="number" value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="min-w-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
      />
    );
  }
  return (
    <input aria-label={ariaLabel} type="text" value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
    />
  );
}

function RangeInput({
  field, value, onChange,
}: {
  field: FilterableField | undefined;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const range = Array.isArray(value) && value.length === 2 ? value : ['', ''];
  const isDate = field?.type === 'date' || field?.type === 'datetime';
  const inputType = field?.type === 'date' ? 'date'
    : field?.type === 'datetime' ? 'datetime-local'
    : (field?.type === 'integer' || field?.type === 'number' || field?.type === 'decimal') ? 'number'
    : 'text';
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 gap-1">
        <input
          aria-label="From"
          type={inputType}
          value={String(range[0] ?? '')}
          onChange={(e) => onChange([e.target.value, range[1]])}
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
          placeholder="From"
        />
        <input
          aria-label="To"
          type={inputType}
          value={String(range[1] ?? '')}
          onChange={(e) => onChange([range[0], e.target.value])}
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
          placeholder="To"
        />
      </div>
      {isDate && (
        <DateRangePresets
          fieldType={field!.type as 'date' | 'datetime'}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function ArrayInput({
  value, onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const text = Array.isArray(value) ? (value as unknown[]).join(',') : '';
  return (
    <input type="text" value={text}
      onChange={(e) => onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
      placeholder="value1, value2, value3"
      className="min-w-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
    />
  );
}
