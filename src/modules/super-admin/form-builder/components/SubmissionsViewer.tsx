/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SubmissionsViewer – Table view for form submissions.
 * Shows all submissions for a given form with search, date filter,
 * pagination, field-column mapping, detail drawer, bulk delete, and CSV export.
 */

import { useState, useEffect, useCallback } from 'react';
import type { FormDefinition, FormField } from '../types';
import { fetchSubmissions, deleteSubmission, bulkDeleteSubmissions, updateReviewStatus, updateSubmissionData, type FormSubmission } from '../../api/formBuilderApi';
import { api, apiRoutes } from '@/core/api';
import SubmissionsKanban from './SubmissionsKanban';

interface Props {
  form: FormDefinition;
  onClose: () => void;
}

export default function SubmissionsViewer({ form, onClose }: Props) {
  // Display mode: classic table or Kanban board (grouped by review status).
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<FormSubmission | null>(null);
  const [exporting, setExporting] = useState(false);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'reviewed' | 'flagged'>('all');

  // Advanced per-field filters
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Flatten all fields for column headers
  const allFields: FormField[] = form.sections.flatMap((s) => s.fields).filter(
    (f) => !['heading', 'separator', 'columns'].includes(f.type),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSubmissions(form.id, page, 20);
      setSubmissions(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [form.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side filtering (search + date + field filters)
  const filtered = submissions.filter((sub) => {
    // Review status filter
    if (reviewFilter !== 'all' && (sub.reviewStatus || 'pending') !== reviewFilter) return false;

    // Date range filter
    if (dateFrom && sub.createdAt && new Date(sub.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && sub.createdAt && new Date(sub.createdAt) > new Date(dateTo + 'T23:59:59')) return false;

    // Text search (across all field values + submitter)
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const matchesSubmitter = (sub.submittedBy || 'anonymous').toLowerCase().includes(query);
      const matchesData = Object.values(sub.data).some((v) =>
        v !== null && v !== undefined && String(v).toLowerCase().includes(query),
      );
      if (!matchesSubmitter && !matchesData) return false;
    }

    // Per-field advanced filters
    for (const [fieldName, filterVal] of Object.entries(fieldFilters)) {
      if (!filterVal) continue;
      const dataVal = sub.data[fieldName];
      const dataStr = dataVal !== null && dataVal !== undefined ? String(dataVal).toLowerCase() : '';
      const fv = filterVal.toLowerCase();

      // Numeric range: ">=10", "<=50", ">5", "<20"
      const rangeMatch = filterVal.match(/^([<>]=?)\s*(-?\d+\.?\d*)$/);
      if (rangeMatch) {
        const [, op, numStr] = rangeMatch;
        const num = Number(numStr);
        const val = Number(dataVal);
        if (isNaN(val)) return false;
        if (op === '>' && !(val > num)) return false;
        if (op === '>=' && !(val >= num)) return false;
        if (op === '<' && !(val < num)) return false;
        if (op === '<=' && !(val <= num)) return false;
        continue;
      }

      // Exact match with = prefix
      if (fv.startsWith('=')) {
        if (dataStr !== fv.slice(1)) return false;
        continue;
      }

      // Default: contains
      if (!dataStr.includes(fv)) return false;
    }

    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    toast.warning(`Delete ${n} submission${n === 1 ? '' : 's'}? This cannot be undone.`, {
      action: {
        label: 'Delete',
        onClick: async () => {
          setDeleting(true);
          try {
            await bulkDeleteSubmissions(form.id, Array.from(selectedIds));
            setSelectedIds(new Set());
            load();
          } catch {
            // Fallback: try individual deletes
            for (const id of selectedIds) {
              try { await deleteSubmission(form.id, id); } catch { /* skip */ }
            }
            setSelectedIds(new Set());
            load();
          } finally {
            setDeleting(false);
          }
        },
      },
      duration: 8000,
    });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get(
        `${apiRoutes.forms.submissions(form.id)}?page=1&limit=10000&format=csv`,
        { responseType: 'blob' } as any,
      );
      const blob = res instanceof Blob ? res : new Blob([JSON.stringify(res)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.slug}-submissions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      exportCsvClient();
    } finally {
      setExporting(false);
    }
  };

  const exportCsvClient = () => {
    const headers = ['#', 'Submitted At', 'Submitted By', ...allFields.map((f) => f.label)];
    const dataToExport = filtered.length > 0 ? filtered : submissions;
    const rows = dataToExport.map((sub, i) => [
      String(i + 1),
      sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '',
      sub.submittedBy || 'Anonymous',
      ...allFields.map((f) => {
        const val = sub.data[f.name];
        if (val === null || val === undefined) return '';
        if (Array.isArray(val)) return val.join('; ');
        return String(val);
      }),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.slug}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (val: any): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  return (
    <div className="flex h-full flex-col" role="region" aria-label={`Submissions for ${form.name}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800" role="toolbar" aria-label="Submissions toolbar">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            ← Back
          </button>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Submissions: {form.name}
          </h2>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {total} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View-mode toggle */}
          <div className="inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600" role="tablist" aria-label="View mode">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              role="tab"
              aria-selected={viewMode === 'table'}
              className={
                'px-2 py-1 text-xs font-medium transition ' +
                (viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700')
              }
            >
              📋 Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              role="tab"
              aria-selected={viewMode === 'kanban'}
              className={
                'px-2 py-1 text-xs font-medium transition ' +
                (viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700')
              }
            >
              📊 Kanban
            </button>
          </div>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : `🗑️ Delete (${selectedIds.size})`}
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || submissions.length === 0}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
          >
            {exporting ? 'Exporting…' : '📄 Export CSV'}
          </button>
        </div>
      </div>

      {/* Kanban view — short-circuits the rest of the table UI */}
      {viewMode === 'kanban' && (
        <div className="flex-1 overflow-auto p-3">
          <SubmissionsKanban formId={form.id} />
        </div>
      )}
      {viewMode === 'table' && (
      <>

      {/* Table-mode sections start here; the closing </> is right before
          the final </div> of the component. */}

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search submissions…"
            aria-label="Search submissions"
            className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Filter from date"
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          />
          <span>To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Filter to date"
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          />
          {(searchTerm || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setReviewFilter('all'); setFieldFilters({}); }}
              className="rounded-md px-2 py-1 text-xs text-gray-400 hover:text-red-500"
            >
              ✕ Clear
            </button>
          )}
        </div>
        {/* Review status filter */}
        <select
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value as typeof reviewFilter)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          aria-label="Filter by review status"
        >
          <option value="all">All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="reviewed">✅ Reviewed</option>
          <option value="flagged">🚩 Flagged</option>
        </select>
        <span className="text-[10px] text-gray-400">
          {filtered.length !== submissions.length && `Showing ${filtered.length} of ${submissions.length}`}
        </span>
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
            showAdvancedFilters || Object.values(fieldFilters).some(Boolean)
              ? 'border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              : 'border-gray-300 text-gray-500 hover:border-gray-400 dark:border-gray-600 dark:text-gray-400'
          }`}
          title="Per-field advanced filters"
        >
          🔎 Filters{Object.values(fieldFilters).filter(Boolean).length > 0 ? ` (${Object.values(fieldFilters).filter(Boolean).length})` : ''}
        </button>
      </div>

      {/* Advanced Per-Field Filters */}
      {showAdvancedFilters && (
        <div className="border-b border-gray-200 bg-blue-50/50 px-4 py-2 dark:border-gray-700 dark:bg-blue-900/5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Field Filters</span>
            {Object.values(fieldFilters).some(Boolean) && (
              <button
                type="button"
                onClick={() => setFieldFilters({})}
                className="text-[10px] text-red-500 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
          <p className="mb-2 text-[10px] text-gray-400 dark:text-gray-500">
            Use "contains" by default. Prefix with <code className="bg-gray-100 px-0.5 rounded dark:bg-gray-700">=</code> for exact match, or <code className="bg-gray-100 px-0.5 rounded dark:bg-gray-700">&gt;=10</code> <code className="bg-gray-100 px-0.5 rounded dark:bg-gray-700">&lt;5</code> for numeric ranges.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {allFields.slice(0, 12).map((f) => (
              <div key={f.id} className="flex flex-col">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 truncate" title={f.label}>
                  {f.label}
                </label>
                {f.type === 'select' || f.type === 'multi-select' ? (
                  <select
                    value={fieldFilters[f.name] || ''}
                    onChange={(e) => setFieldFilters((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    aria-label={`Filter by ${f.label}`}
                  >
                    <option value="">Any</option>
                    {(f.options || []).map((opt) => (
                      <option key={opt.value} value={`=${opt.value}`}>{opt.label}</option>
                    ))}
                  </select>
                ) : f.type === 'checkbox' || f.type === 'switch' ? (
                  <select
                    value={fieldFilters[f.name] || ''}
                    onChange={(e) => setFieldFilters((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    aria-label={`Filter by ${f.label}`}
                  >
                    <option value="">Any</option>
                    <option value="=true">Yes</option>
                    <option value="=false">No</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={fieldFilters[f.name] || ''}
                    onChange={(e) => setFieldFilters((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    placeholder={f.type === 'number' ? 'e.g. >=10' : 'Contains…'}
                    aria-label={`Filter by ${f.label}`}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="ml-2 text-sm">Loading submissions…</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="mb-2 text-3xl">📭</span>
            <p className="text-sm">No submissions yet</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-500 dark:text-gray-400">By</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
                {allFields.slice(0, 6).map((f) => (
                  <th key={f.id} className="whitespace-nowrap px-4 py-2 font-medium text-gray-500 dark:text-gray-400">
                    {f.label}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-500 dark:text-gray-400" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((sub, idx) => (
                <tr
                  key={sub.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${selectedIds.has(sub.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  onClick={() => setSelectedSub(sub)}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sub.id)}
                      onChange={() => toggleSelect(sub.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-2 text-gray-500">{idx + 1 + (page - 1) * 20}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600 dark:text-gray-300">
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    {sub.submittedBy || 'Anonymous'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <ReviewBadge status={sub.reviewStatus || 'pending'} />
                  </td>
                  {allFields.slice(0, 6).map((f) => (
                    <td key={f.id} className="max-w-50 truncate px-4 py-2 text-gray-700 dark:text-gray-200">
                      {formatCellValue(sub.data[f.name])}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        onClick={(e) => { e.stopPropagation(); setSelectedSub(sub); }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline dark:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.warning('Delete this submission?', {
                            action: {
                              label: 'Delete',
                              onClick: async () => {
                                try {
                                  await deleteSubmission(form.id, sub.id);
                                  load();
                                } catch { /* ignore */ }
                              },
                            },
                            duration: 6000,
                          });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
          <span className="text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-40 dark:border-gray-600"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-40 dark:border-gray-600"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedSub && (
        <DetailDrawer
          submission={selectedSub}
          fields={allFields}
          formId={form.id}
          onClose={() => setSelectedSub(null)}
          onReviewChange={(id, status) => {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === id ? { ...s, reviewStatus: status } : s)),
            );
          }}
          onDataChange={(id, newData) => {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === id ? { ...s, data: newData } : s)),
            );
            setSelectedSub((prev) => prev && prev.id === id ? { ...prev, data: newData } : prev);
          }}
          onPrev={() => {
            const idx = filtered.findIndex((s) => s.id === selectedSub.id);
            if (idx > 0) setSelectedSub(filtered[idx - 1]);
          }}
          onNext={() => {
            const idx = filtered.findIndex((s) => s.id === selectedSub.id);
            if (idx < filtered.length - 1) setSelectedSub(filtered[idx + 1]);
          }}
          hasPrev={filtered.findIndex((s) => s.id === selectedSub.id) > 0}
          hasNext={filtered.findIndex((s) => s.id === selectedSub.id) < filtered.length - 1}
          currentIndex={filtered.findIndex((s) => s.id === selectedSub.id) + 1}
          totalCount={filtered.length}
        />
      )}
      </>
      )}
    </div>
  );
}

// ─── Review Badge ────────────────────────────────────────────

function ReviewBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    reviewed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    flagged: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const icons: Record<string, string> = { pending: '⏳', reviewed: '✅', flagged: '🚩' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] || map.pending}`}>
      {icons[status] || '⏳'} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Detail Drawer ───────────────────────────────────────────

function DetailDrawer({
  submission,
  fields,
  formId,
  onClose,
  onReviewChange,
  onDataChange,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
}: {
  submission: FormSubmission;
  fields: FormField[];
  formId: string;
  onClose: () => void;
  onReviewChange: (id: string, status: 'pending' | 'reviewed' | 'flagged') => void;
  onDataChange: (id: string, data: Record<string, any>) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
}) {
  const [updatingReview, setUpdatingReview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Reset edit state when submission changes
  useEffect(() => {
    setEditMode(false);
    setEditData({});
  }, [submission.id]);

  const startEdit = () => {
    setEditData({ ...submission.data });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData({});
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateSubmissionData(formId, submission.id, editData);
      onDataChange(submission.id, editData);
      setEditMode(false);
    } catch {
      /* show inline error handled by UX */
    }
    setSaving(false);
  };

  const setFieldValue = (fieldName: string, value: any) => {
    setEditData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleReviewChange = async (newStatus: 'pending' | 'reviewed' | 'flagged') => {
    setUpdatingReview(true);
    try {
      await updateReviewStatus(formId, submission.id, newStatus);
      onReviewChange(submission.id, newStatus);
    } catch { /* ignore */ }
    setUpdatingReview(false);
  };

  const handlePrintPdf = () => {
    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) return;

    const rows = fields
      .map((field) => {
        const val = submission.data[field.name];
        const display =
          val === null || val === undefined
            ? '—'
            : typeof val === 'boolean'
              ? val ? 'Yes' : 'No'
              : Array.isArray(val)
                ? val.join(', ')
                : String(val);
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;color:#374151;width:35%">${field.label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563">${display}</td></tr>`;
      })
      .join('');

    printWin.document.write(`<!DOCTYPE html><html><head><title>Submission #${submission.id}</title>
      <style>body{font-family:system-ui,-apple-system,sans-serif;margin:40px;color:#1f2937}
      h1{font-size:18px;margin-bottom:4px}p.meta{font-size:12px;color:#6b7280;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:14px}
      @media print{body{margin:20px}}</style></head><body>
      <h1>Submission #${submission.id}</h1>
      <p class="meta">Submitted: ${submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '—'} &nbsp;|&nbsp; By: ${submission.submittedBy || 'Anonymous'}${submission.ipAddress ? ` &nbsp;|&nbsp; IP: ${submission.ipAddress}` : ''}</p>
      <table>${rows}</table></body></html>`);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-105 overflow-y-auto bg-white shadow-2xl dark:bg-gray-800" role="dialog" aria-modal="true" aria-label="Submission detail">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Submission #{submission.id}
            </h3>
            <span className="text-[10px] text-gray-400">{currentIndex}/{totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : '✓ Save'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-md bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                title="Edit submission data"
                aria-label="Edit submission"
              >
                ✏️ Edit
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
              title="Print / Export PDF"
              aria-label="Export submission as PDF"
            >
              📄 PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close detail drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-2 dark:border-gray-700">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className="rounded-md px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Previous submission"
          >
            ← Prev
          </button>
          {/* Review status selector */}
          <div className="flex items-center gap-1">
            {(['pending', 'reviewed', 'flagged'] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={updatingReview}
                onClick={() => handleReviewChange(s)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${
                  (submission.reviewStatus || 'pending') === s
                    ? s === 'reviewed'
                      ? 'bg-green-600 text-white'
                      : s === 'flagged'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                {s === 'pending' ? '⏳' : s === 'reviewed' ? '✅' : '🚩'} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="rounded-md px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Next submission"
          >
            Next →
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Meta */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400 dark:text-gray-500">Submitted</span>
                <p className="font-medium text-gray-700 dark:text-gray-200">
                  {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500">By</span>
                <p className="font-medium text-gray-700 dark:text-gray-200">
                  {submission.submittedBy || 'Anonymous'}
                </p>
              </div>
              {submission.ipAddress && (
                <div>
                  <span className="text-gray-400 dark:text-gray-500">IP</span>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{submission.ipAddress}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400 dark:text-gray-500">Review</span>
                <p className="mt-0.5"><ReviewBadge status={submission.reviewStatus || 'pending'} /></p>
              </div>
            </div>
          </div>

          {/* Field values */}
          {fields.map((field) => {
            const val = editMode ? editData[field.name] : submission.data[field.name];
            const isEditable = editMode && !['heading', 'separator', 'columns', 'repeater'].includes(field.type);
            return (
              <div key={field.id} className="border-b border-gray-100 pb-3 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{field.label}</p>
                {isEditable ? (
                  <EditableFieldInput
                    field={field}
                    value={val}
                    onChange={(v) => setFieldValue(field.name, v)}
                  />
                ) : (
                  <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">
                    {val === null || val === undefined
                      ? '—'
                      : typeof val === 'boolean'
                        ? val ? 'Yes' : 'No'
                        : Array.isArray(val)
                          ? val.join(', ')
                          : String(val)}
                  </p>
                )}
              </div>
            );
          })}

          {/* Raw JSON */}
          <details className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
            <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400">
              Raw JSON
            </summary>
            <pre className="mt-2 max-h-60 overflow-auto text-xs text-gray-600 dark:text-gray-300">
              {JSON.stringify(editMode ? editData : submission.data, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </>
  );
}

// ─── Editable Field Input (for submission editing) ──────────────

function EditableFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: any;
  onChange: (v: any) => void;
}) {
  const cls = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200';

  switch (field.type) {
    case 'textarea':
    case 'richtext':
      return (
        <textarea
          className={`${cls} min-h-[60px] resize-y`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
    case 'currency':
      return (
        <input
          type="number"
          className={cls}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          className={cls}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'time':
      return (
        <input
          type="time"
          className={cls}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'checkbox':
    case 'switch':
      return (
        <label className="mt-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-blue-600"
          />
          {value ? 'Yes' : 'No'}
        </label>
      );
    case 'select':
    case 'radio': {
      const opts = field.options || [];
      return (
        <select className={cls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    case 'multi-select':
    case 'checkbox-group': {
      const opts = field.options || [];
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {opts.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <label key={o.value} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    onChange(checked ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
                  }}
                  className="h-3 w-3 accent-blue-600"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      );
    }
    case 'rating': {
      const rating = typeof value === 'number' ? value : 0;
      return (
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star === rating ? 0 : star)}
              className={`text-lg ${star <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
            >
              ★
            </button>
          ))}
        </div>
      );
    }
    default:
      return (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
          className={cls}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
