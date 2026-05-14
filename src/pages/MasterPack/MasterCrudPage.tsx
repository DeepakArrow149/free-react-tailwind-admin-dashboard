/**
 * Generic Master CRUD page — list + slide-over drawer form.
 *
 * Single component powering all 25+ masters in the pack. Each per-master page
 * (see pages.tsx) provides columns + fields + apiResource and the rest is
 * uniform: search, pagination, status badge, edit/delete actions, drawer form,
 * FK dropdown async loading.
 *
 * The drawer renders via React Portal at document.body so it overlays the
 * sidebar (which is fixed z-50) and any transformed ancestor.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import PageMeta from '../../components/common/PageMeta';
import { Pagination } from '../../components/table';
import TableSkeleton from '@/components/common/TableSkeleton';

// ─── Column & field types ───
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'date' | 'email';

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  /** Static option list (use for fixed enums) */
  options?: { value: string | number; label: string }[];
  /** Async option loader. The function is captured per-render — keep stable */
  loadOptions?: () => Promise<{ value: string | number; label: string }[]>;
  /** Coerce value before submit (e.g. number, boolean) */
  coerce?: (v: unknown) => unknown;
  /** Min/max/step for number inputs */
  min?: number;
  max?: number;
  step?: number;
  /** Render only on create (e.g. unique code) */
  createOnly?: boolean;
  /** Disable on edit (e.g. code) */
  readOnlyOnEdit?: boolean;
  /** Span this many grid columns (defaults to 1) */
  colSpan?: 1 | 2;
  /** Section heading — when set, this field starts a new section in the drawer */
  section?: string;
}

export interface MasterApi<T = Record<string, unknown>> {
  list: (params?: Record<string, unknown>) => Promise<{ data: { data: T[]; meta?: { page: number; limit: number; total: number; totalPages: number } } }>;
  get: (id: number) => Promise<{ data: { data: T } }>;
  create: (data: Record<string, unknown>) => Promise<{ data: { data: T } }>;
  update: (id: number, data: Record<string, unknown>) => Promise<{ data: { data: T } }>;
  delete: (id: number) => Promise<unknown>;
}

export interface MasterCrudPageProps<T extends { id: number }> {
  title: string;
  description?: string;
  api: MasterApi<T>;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  /** Default record values for create */
  defaults?: Record<string, unknown>;
  /** Extra fixed filters merged into list calls */
  listParams?: Record<string, unknown>;
  /** Optional extra header actions (right of "+ New" button) */
  headerActions?: React.ReactNode;
  /** Hide search bar (for very small masters) */
  hideSearch?: boolean;
}

// ─── Component ───
export default function MasterCrudPage<T extends { id: number; isActive?: boolean }>(props: MasterCrudPageProps<T>) {
  const { title, description, api, columns, fields, defaults = {}, listParams = {}, headerActions, hideSearch } = props;

  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>(defaults);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [optionsCache, setOptionsCache] = useState<Record<string, { value: string | number; label: string }[]>>({});
  const [optionsLoading, setOptionsLoading] = useState<Record<string, boolean>>({});

  const fetchRows = useCallback(async (override?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params = { page: meta.page, limit: meta.limit, search: search || undefined, ...listParams, ...override };
      const { data: resp } = await api.list(params);
      setRows(resp.data as T[]);
      if (resp.meta) setMeta(resp.meta);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : 'Failed to load') ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.page, meta.limit, search]);

  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fetchRows]);

  // Eager-load async select options when the drawer opens
  useEffect(() => {
    if (!showForm) return;
    fields.forEach(async (f) => {
      if (f.type !== 'select' || !f.loadOptions || optionsCache[f.name]) return;
      setOptionsLoading((s) => ({ ...s, [f.name]: true }));
      try {
        const opts = await f.loadOptions();
        setOptionsCache((prev) => ({ ...prev, [f.name]: opts }));
      } catch (e) {
        console.warn(`Failed to load options for ${f.name}:`, e);
        setOptionsCache((prev) => ({ ...prev, [f.name]: [] }));
      } finally {
        setOptionsLoading((s) => ({ ...s, [f.name]: false }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (showForm) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = orig; };
    }
  }, [showForm]);

  const openNew = () => {
    setEditId(null);
    setFormData({ ...defaults });
    setFormError('');
    setFieldErrors({});
    setShowForm(true);
  };

  const openEdit = async (id: number) => {
    try {
      const { data: resp } = await api.get(id);
      setEditId(id);
      setFormData(resp.data as unknown as Record<string, unknown>);
      setFormError('');
      setFieldErrors({});
      setShowForm(true);
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Failed to load record');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Delete this ${title.toLowerCase()}?\n\nIt will be soft-deleted (deactivated). This action can be undone by an admin.`)) return;
    try {
      await api.delete(id);
      toast.success(`${title} deleted`);
      fetchRows();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Delete failed';
      toast.error(msg);
    }
  };

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};
    for (const f of fields) {
      if (editId && f.readOnlyOnEdit) continue;
      const v = formData[f.name];
      const empty = v === null || v === undefined || v === '';
      if (f.required && empty) errors[f.name] = `${f.label} is required`;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!validateFields()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        let v = formData[f.name];
        if (v === '' || v === undefined) v = null;
        if (f.coerce && v !== null) v = f.coerce(v);
        else if (f.type === 'number' && v !== null && v !== '') v = Number(v);
        else if (f.type === 'boolean') v = !!v;
        if (editId && f.readOnlyOnEdit) continue;
        if (v !== null) payload[f.name] = v;
      }
      if (editId) await api.update(editId, payload);
      else await api.create(payload);
      toast.success(`${title} ${editId ? 'updated' : 'created'}`);
      setShowForm(false);
      fetchRows();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Save failed';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Auto-append Status column if not specified
  const finalColumns: ColumnDef<T>[] = useMemo(() => {
    const hasStatus = columns.some((c) => c.key === 'isActive');
    if (hasStatus) return columns;
    return [
      ...columns,
      {
        key: 'isActive',
        header: 'Status',
        width: '110px',
        render: (row) => <StatusBadge active={row.isActive ?? true} />,
      },
    ];
  }, [columns]);

  // Group fields by section
  const fieldSections = useMemo(() => {
    const sections: { title: string; fields: FieldDef[] }[] = [];
    let current: { title: string; fields: FieldDef[] } | null = null;
    for (const f of fields) {
      if (f.section) {
        if (current) sections.push(current);
        current = { title: f.section, fields: [f] };
      } else {
        if (!current) current = { title: '', fields: [] };
        current.fields.push(f);
      }
    }
    if (current) sections.push(current);
    return sections;
  }, [fields]);

  return (
    <>
      <PageMeta title={`${title} | ERP TRACK`} description={description ?? `${title} master`} />
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {meta.total > 0 && <>Showing {rows.length} of {meta.total.toLocaleString()} {title.toLowerCase()}(s)</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New {title}
            </button>
          </div>
        </div>

        {/* Filters */}
        {!hideSearch && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:w-80">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.5 10.5a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setMeta((m) => ({ ...m, page: 1 })); }}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:ring-brand-900"
              />
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? <TableSkeleton rows={6} cols={finalColumns.length + 1} /> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <colgroup>
                {finalColumns.map((c) => <col key={String(c.key)} width={c.width ?? 'auto'} />)}
                <col width="112" />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-white/2">
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {finalColumns.map((c) => (
                    <th
                      key={String(c.key)}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      {c.header}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={finalColumns.length + 1} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0l-2 5H6l-2-5m16 0H4" />
                        </svg>
                        <div className="text-sm">No {title.toLowerCase()}s yet</div>
                        <button type="button" onClick={openNew} className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                          + Create first {title.toLowerCase()}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 transition hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-white/3">
                    {finalColumns.map((c) => (
                      <td key={String(c.key)} className={`px-4 py-3 ${c.className ?? 'text-gray-700 dark:text-gray-300'}`}>
                        {c.render ? c.render(row) : <span>{String(((row as unknown) as Record<string, unknown>)[c.key as string] ?? '—')}</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(row.id)} title="Edit"
                          className="rounded-md p-1.5 text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-900/30 dark:hover:text-brand-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => handleDelete(row.id)} title="Delete"
                          className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={(p) => fetchRows({ page: p })}
          totalItems={meta.total}
          pageSize={meta.limit}
        />
      </div>

      {/* Drawer rendered via Portal at body — overlays sidebar + everything */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-999 flex items-stretch animate-[fadein_120ms_ease-out]" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            onClick={() => setShowForm(false)}
            aria-label="Close drawer"
            className="flex-1 cursor-default bg-gray-900/50 backdrop-blur-[1px]"
          />

          {/* Panel */}
          <div className="flex w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-gray-900">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editId ? `Edit ${title}` : `New ${title}`}
                </h3>
                {editId && <p className="text-xs text-gray-500 dark:text-gray-400">Record #{editId}</p>}
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200" title="Close">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {formError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              {fieldSections.map((sec, idx) => (
                <div key={idx} className={idx > 0 ? 'mt-6' : ''}>
                  {sec.title && (
                    <h4 className="mb-3 border-b border-gray-100 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      {sec.title}
                    </h4>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {sec.fields.map((f) => (
                      <FieldRenderer
                        key={f.name}
                        f={f}
                        value={formData[f.name]}
                        editId={editId}
                        error={fieldErrors[f.name]}
                        options={optionsCache[f.name]}
                        optionsLoading={!!optionsLoading[f.name]}
                        onChange={(v) => {
                          setFormData((d) => ({ ...d, [f.name]: v }));
                          if (fieldErrors[f.name]) setFieldErrors((s) => { const x = { ...s }; delete x[f.name]; return x; });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60">
                {saving && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v3" stroke="currentColor" strokeWidth="3" className="opacity-75" />
                  </svg>
                )}
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── Status badge ───
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      active
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Field renderer ───
interface FieldRendererProps {
  f: FieldDef;
  value: unknown;
  editId: number | null;
  error?: string;
  options?: { value: string | number; label: string }[];
  optionsLoading: boolean;
  onChange: (v: unknown) => void;
}

function FieldRenderer({ f, value, editId, error, options, optionsLoading, onChange }: FieldRendererProps) {
  const disabled = !!editId && !!f.readOnlyOnEdit;
  const opts = f.options ?? options ?? [];
  const colSpan = f.colSpan === 2 ? 'sm:col-span-2' : '';

  const baseInputCls = `h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 transition focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-white/90
    ${error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-700 dark:focus:ring-red-900'
      : 'border-gray-300 focus:border-brand-400 focus:ring-brand-100 dark:border-gray-700 dark:focus:ring-brand-900'}
    ${disabled ? 'cursor-not-allowed bg-gray-50 dark:bg-gray-900/50' : ''}`;

  const v = value;

  return (
    <div className={colSpan}>
      {f.type !== 'boolean' && (
        <label className="mb-1.5 flex items-baseline gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
          <span>{f.label}</span>
          {f.required && <span className="text-red-500">*</span>}
          {disabled && <span className="text-gray-400">(locked)</span>}
        </label>
      )}

      {f.type === 'textarea' ? (
        <textarea
          value={v == null ? '' : String(v)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          disabled={disabled}
          rows={3}
          className={baseInputCls.replace('h-10', 'h-auto py-2.5')}
        />
      ) : f.type === 'select' ? (
        <div className="relative">
          <select
            aria-label={f.label}
            title={f.label}
            value={v == null ? '' : String(v)}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') return onChange(null);
              const num = Number(raw);
              onChange(Number.isFinite(num) && String(num) === raw ? num : raw);
            }}
            disabled={disabled || optionsLoading}
            className={baseInputCls + ' appearance-none pr-9'}
          >
            <option value="">{optionsLoading ? 'Loading...' : `— Select ${f.label.toLowerCase()} —`}</option>
            {opts.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      ) : f.type === 'boolean' ? (
        <label className="flex cursor-pointer items-center gap-2 pt-5">
          <input
            type="checkbox"
            checked={!!v}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</span>
          {f.helperText && <span className="text-xs text-gray-400">— {f.helperText}</span>}
        </label>
      ) : (
        <input
          type={f.type}
          value={v == null ? '' : String(v)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          disabled={disabled}
          min={f.min} max={f.max} step={f.step}
          className={baseInputCls}
        />
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {!error && f.helperText && f.type !== 'boolean' && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{f.helperText}</p>}
    </div>
  );
}
