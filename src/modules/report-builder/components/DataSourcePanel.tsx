/**
 * DataSourcePanel — Left sidebar of the Report Builder.
 *
 * Shows the catalog of available data sources grouped by module. When a
 * source is selected, expands its field tree (including joined fields).
 * Fields are click-to-add (or drag-to-add — Phase 2).
 */

import { useEffect, useMemo, useState } from 'react';
import { useReportBuilderStore } from '../store';
import type { CatalogSourceSummary, CatalogSourceDetail, CatalogField, AggregationFn } from '../types';

export function DataSourcePanel() {
  const catalog = useReportBuilderStore((s) => s.catalog);
  const catalogLoading = useReportBuilderStore((s) => s.catalogLoading);
  const loadCatalog = useReportBuilderStore((s) => s.loadCatalog);
  const loadSourceDetail = useReportBuilderStore((s) => s.loadSourceDetail);
  const sourceDetails = useReportBuilderStore((s) => s.sourceDetails);
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const setRootSource = useReportBuilderStore((s) => s.setRootSource);
  const addColumn = useReportBuilderStore((s) => s.addColumn);

  const [search, setSearch] = useState('');
  const [expandedJoins, setExpandedJoins] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (catalog.length === 0 && !catalogLoading) {
      void loadCatalog();
    }
  }, [catalog.length, catalogLoading, loadCatalog]);

  const grouped = useMemo(() => {
    const filtered = search
      ? catalog.filter((s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase()))
      : catalog;
    const groups = new Map<string, CatalogSourceSummary[]>();
    for (const s of filtered) {
      if (!groups.has(s.module)) groups.set(s.module, []);
      groups.get(s.module)!.push(s);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [catalog, search]);

  const rootSource = activeReport?.query.rootSource ?? null;
  const detail = rootSource ? sourceDetails.get(rootSource) ?? null : null;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      <header className="border-b border-gray-200 p-3 dark:border-gray-700">
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Data Sources
        </h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sources…"
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </header>

      <div className="flex-1 overflow-y-auto">
        {catalogLoading && (
          <div className="p-4 text-sm text-gray-500">Loading sources…</div>
        )}

        {!catalogLoading && grouped.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No accessible sources.</div>
        )}

        {!catalogLoading && grouped.map(([module, sources]) => (
          <SourceGroup
            key={module}
            module={module}
            sources={sources}
            activeSource={rootSource}
            onSelectSource={(s) => {
              if (!activeReport) return;
              if (rootSource && rootSource !== s.name) {
                if (!confirm('Changing the data source will reset columns and filters. Continue?')) return;
              }
              void setRootSource(s.name);
              void loadSourceDetail(s.name);
            }}
          />
        ))}
      </div>

      {detail && (
        <FieldTree
          detail={detail}
          expandedJoins={expandedJoins}
          onToggleJoin={(alias) => {
            setExpandedJoins((prev) => {
              const next = new Set(prev);
              if (next.has(alias)) next.delete(alias);
              else next.add(alias);
              return next;
            });
          }}
          activeColumns={new Set(activeReport?.query.columns.map((c) => c.field) ?? [])}
          onAddColumn={(field, agg) => addColumn(field, agg)}
        />
      )}
    </aside>
  );
}

// ── Source group ──

function SourceGroup({
  module, sources, activeSource, onSelectSource,
}: {
  module: string;
  sources: CatalogSourceSummary[];
  activeSource: string | null;
  onSelectSource: (s: CatalogSourceSummary) => void;
}) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="bg-gray-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {module}
      </div>
      <ul>
        {sources.map((s) => (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => onSelectSource(s)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                activeSource === s.name
                  ? 'bg-blue-100 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title={s.description}
            >
              <span className="truncate">{s.label}</span>
              <span className="ml-2 text-xs text-gray-400">{s.fieldCount}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Field tree ──

function FieldTree({
  detail, expandedJoins, onToggleJoin, activeColumns, onAddColumn,
}: {
  detail: CatalogSourceDetail;
  expandedJoins: Set<string>;
  onToggleJoin: (alias: string) => void;
  activeColumns: Set<string>;
  onAddColumn: (field: string, aggregation?: AggregationFn) => void;
}) {
  const visibleFields = detail.fields.filter((f) => !f.hidden);

  return (
    <section className="flex flex-col border-t border-gray-200 dark:border-gray-700">
      <div className="bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-800 dark:bg-blue-950 dark:text-blue-300">
        {detail.label} fields
      </div>
      <ul className="max-h-56 overflow-y-auto">
        {visibleFields.map((f) => (
          <FieldRow key={f.name} field={f} fieldPath={f.name}
            isAdded={activeColumns.has(f.name)}
            onAdd={() => onAddColumn(f.name)} />
        ))}
      </ul>

      {detail.joins.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between bg-amber-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <span>↗ Join to related tables</span>
            <span className="text-amber-600 dark:text-amber-400">{detail.joins.length}</span>
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {detail.joins.map((j) => {
              const isOpen = expandedJoins.has(j.alias);
              const isMany = j.cardinality === 'many';
              return (
                <li key={j.alias}>
                  <button
                    type="button"
                    onClick={() => onToggleJoin(j.alias)}
                    className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    title={isMany
                      ? `Adds rows: each parent record × N matching ${j.toSource} rows`
                      : `Single ${j.toSource} per row`}
                  >
                    <span className="inline-block w-3">{isOpen ? '▾' : '▸'}</span>
                    <span className="text-blue-600 dark:text-blue-400">↗ {j.alias}</span>
                    <span className="text-gray-400">({j.toSource})</span>
                    {isMany && (
                      <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        many
                      </span>
                    )}
                  </button>
                  {isOpen && <JoinedFields alias={j.alias} sourceName={j.toSource}
                    isManyRel={isMany}
                    activeColumns={activeColumns} onAddColumn={onAddColumn} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function FieldRow({
  field, fieldPath, isAdded, onAdd, isManyRel,
}: {
  field: CatalogField;
  fieldPath: string;
  isAdded: boolean;
  onAdd: (aggregation?: AggregationFn) => void;
  isManyRel?: boolean;
}) {
  // Numeric fields offer the full aggregation suite; non-numeric only count.
  const isNumeric = field.type === 'integer' || field.type === 'number' || field.type === 'decimal';
  void fieldPath;
  return (
    <li className="flex w-full items-center gap-1 pr-2">
      <button
        type="button"
        onClick={() => onAdd()}
        disabled={isAdded}
        className={`flex flex-1 items-center gap-2 px-4 py-1.5 text-left text-xs ${
          isAdded
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-950'
        }`}
        title={
          isManyRel
            ? `${field.label} — click to add as a row (one per child). Use the Σ menu to aggregate instead.`
            : field.description ?? `${field.label} (${field.type})`
        }
      >
        <FieldTypeIcon type={field.type} />
        <span className="flex-1 truncate">{field.label}</span>
        {isAdded && <span className="text-[10px]">✓</span>}
      </button>
      {isManyRel && !isAdded && (
        <select
          aria-label={`Aggregate ${field.label}`}
          title="Aggregate over related rows"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) onAdd(v as AggregationFn);
            e.target.value = '';
          }}
          className="cursor-pointer rounded border-0 bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-200 focus:outline-none dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800"
        >
          <option value="">Σ</option>
          {isNumeric && <option value="sum">Sum</option>}
          {isNumeric && <option value="avg">Avg</option>}
          {isNumeric && <option value="min">Min</option>}
          {isNumeric && <option value="max">Max</option>}
          <option value="count">Count</option>
          <option value="count_distinct">Distinct</option>
        </select>
      )}
    </li>
  );
}

function JoinedFields({
  alias, sourceName, isManyRel, activeColumns, onAddColumn,
}: {
  alias: string;
  sourceName: string;
  isManyRel?: boolean;
  activeColumns: Set<string>;
  onAddColumn: (field: string, aggregation?: AggregationFn) => void;
}) {
  const sourceDetails = useReportBuilderStore((s) => s.sourceDetails);
  const loadSourceDetail = useReportBuilderStore((s) => s.loadSourceDetail);
  const detail = sourceDetails.get(sourceName);

  useEffect(() => {
    if (!detail) {
      void loadSourceDetail(sourceName);
    }
  }, [sourceName, detail, loadSourceDetail]);

  if (!detail) return <li className="px-7 py-1.5 text-xs text-gray-400">Loading…</li>;

  const visibleFields = detail.fields.filter((f) => !f.hidden);
  return (
    <ul className="bg-gray-50 dark:bg-gray-900">
      {visibleFields.map((f) => {
        const path = `${alias}.${f.name}`;
        return (
          <FieldRow key={path} field={f} fieldPath={path}
            isManyRel={isManyRel}
            isAdded={activeColumns.has(path)}
            onAdd={(agg) => onAddColumn(path, agg)} />
        );
      })}
    </ul>
  );
}

function FieldTypeIcon({ type }: { type: CatalogField['type'] }) {
  const map: Record<CatalogField['type'], string> = {
    string: 'A',
    integer: '#',
    number: '#',
    decimal: '#',
    boolean: '☐',
    date: '📅',
    datetime: '📅',
    enum: '◉',
  };
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gray-200 text-[10px] font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {map[type] ?? '?'}
    </span>
  );
}
