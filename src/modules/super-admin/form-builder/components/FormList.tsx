/**
 * FormList – Saved forms listing with CRUD actions
 * Shows all created forms with status badges, submission stats,
 * bulk operations, and lets users create, edit, duplicate, or delete forms.
 * Phase 8: Dashboard stats + bulk form operations + accessibility
 */

import { useRef, useState } from 'react';
import { useFormBuilderStore } from '../store';
import type { FormDefinition } from '../types';
import { importFormJson, changeFormStatus } from '../../api/formBuilderApi';
import { toast } from 'sonner';
import TemplateLibrary from './TemplateLibrary';
import QuickStartDialog from './QuickStartDialog';

interface FormListProps {
  onEdit: (form: FormDefinition) => void;
  onViewSubmissions?: (form: FormDefinition) => void;
}

export default function FormList({ onEdit, onViewSubmissions }: FormListProps) {
  const { forms, deleteForm, duplicateForm, loadFromStorage, formStats } = useFormBuilderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importFormJson(data);
      toast.success('Form imported successfully!');
      loadFromStorage(); // refresh list
    } catch {
      toast.error('Failed to import form — invalid JSON');
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStatusChange = async (formId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      await changeFormStatus(formId, newStatus);
      toast.success(`Form ${newStatus === 'archived' ? 'archived' : newStatus === 'published' ? 'published' : 'moved to draft'}`);
      loadFromStorage();
    } catch {
      toast.error('Failed to change form status');
    }
  };

  const toggleFormSelect = (id: string) => {
    setSelectedFormIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFormIds.size === forms.length) {
      setSelectedFormIds(new Set());
    } else {
      setSelectedFormIds(new Set(forms.map((f) => f.id)));
    }
  };

  const handleBulkArchive = () => {
    if (selectedFormIds.size === 0) return;
    const n = selectedFormIds.size;
    toast.warning(`Archive ${n} form${n === 1 ? '' : 's'}?`, {
      action: {
        label: 'Archive',
        onClick: async () => {
          setBulkProcessing(true);
          try {
            for (const id of selectedFormIds) {
              try { await changeFormStatus(id, 'archived'); } catch { /* skip */ }
            }
            setSelectedFormIds(new Set());
            toast.success(`${n} form${n === 1 ? '' : 's'} archived`);
            loadFromStorage();
          } finally {
            setBulkProcessing(false);
          }
        },
      },
      duration: 6000,
    });
  };

  const handleBulkDelete = () => {
    if (selectedFormIds.size === 0) return;
    const n = selectedFormIds.size;
    toast.warning(`Permanently delete ${n} form${n === 1 ? '' : 's'}? This cannot be undone.`, {
      action: {
        label: 'Delete',
        onClick: async () => {
          setBulkProcessing(true);
          try {
            for (const id of selectedFormIds) {
              try { await deleteForm(id); } catch { /* skip */ }
            }
            setSelectedFormIds(new Set());
            toast.success('Forms deleted');
          } finally {
            setBulkProcessing(false);
          }
        },
      },
      duration: 8000,
    });
  };

  const statusBadge = (status: FormDefinition['status']) => {
    const map = {
      draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      archived: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Form Builder</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage custom forms with drag & drop — no code required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            ⬆ Import JSON
          </button>
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 shadow-sm hover:bg-purple-100 transition dark:border-purple-600 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          >
            📚 Templates
          </button>
          <button
            type="button"
            onClick={() => setShowQuickStart(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
          >
            + New Form
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {forms.length > 0 && (
        <div className="mb-4 grid grid-cols-4 gap-3" role="region" aria-label="Form statistics">
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{forms.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Forms</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{forms.filter((f) => f.status === 'published').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Published</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Array.from(formStats.values()).reduce((acc, s) => acc + s.submissionCount, 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Submissions</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{forms.filter((f) => f.status === 'draft').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Drafts</p>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedFormIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-900/20" role="toolbar" aria-label="Bulk actions">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedFormIds.size} selected
          </span>
          <button
            type="button"
            onClick={handleBulkArchive}
            disabled={bulkProcessing}
            className="rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-400"
          >
            📦 Archive Selected
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkProcessing}
            className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400"
          >
            🗑️ Delete Selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormIds(new Set())}
            className="rounded-md px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Empty State */}
      {forms.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center dark:border-gray-600">
          <span className="mb-4 block text-5xl">📋</span>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No forms yet</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your first form to get started with the no-code builder.
          </p>
          <button
            type="button"
            onClick={() => setShowQuickStart(true)}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create First Form
          </button>
        </div>
      ) : (
        /* Form Cards Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Select All row */}
          <div className="col-span-full flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={selectedFormIds.size === forms.length && forms.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
              aria-label="Select all forms"
            />
            <span>Select all ({forms.length})</span>
          </div>

          {forms.map((form) => {
            const stats = formStats.get(form.id);
            const subCount = stats?.submissionCount ?? 0;
            const lastSub = stats?.lastSubmissionAt;
            const isSelected = selectedFormIds.has(form.id);

            return (
              <div
                key={form.id}
                role="article"
                aria-label={`Form: ${form.name}`}
                className={`group relative rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-gray-800 ${
                  isSelected
                    ? 'border-blue-400 ring-2 ring-blue-200 dark:border-blue-500 dark:ring-blue-900'
                    : 'border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-600'
                }`}
              >
                {/* Select checkbox + Status */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFormSelect(form.id)}
                      className="rounded border-gray-300"
                      aria-label={`Select ${form.name}`}
                    />
                    {statusBadge(form.status)}
                    {/* Two-Track kind badge */}
                    {form.kind === 'entity' ? (
                      form.bindingMode === 'bound' ? (
                        <span
                          className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                          title={`Bound to existing master: ${form.boundModel ?? '?'}`}
                        >
                          🔗 bound
                        </span>
                      ) : (
                        <span
                          className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          title={form.entityTableName ? `Owns DB table: ${form.entityTableName}` : 'Will be provisioned on publish'}
                        >
                          🆕 entity
                        </span>
                      )
                    ) : (
                      <span
                        className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        title="Process form — JSON submissions"
                      >
                        📝 process
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {form.sections.reduce((acc, s) => acc + s.fields.length, 0)} fields
                  </span>
                </div>

                {/* Title */}
                <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white truncate">
                  {form.name}
                </h3>
                {form.kind === 'entity' && form.bindingMode === 'bound' && form.boundModel && (
                  <p className="mb-1 inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 font-mono text-[9px] text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
                    🔗 {form.boundModel} ({form.boundTableName ?? '?'})
                  </p>
                )}
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {form.description || 'No description'}
                </p>

                {/* Submission Stats */}
                <div className="mb-3 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                    📝 {subCount} submission{subCount !== 1 ? 's' : ''}
                  </span>
                  {lastSub && (
                    <span className="text-gray-400 dark:text-gray-500" title={new Date(lastSub).toLocaleString()}>
                      Last: {new Date(lastSub).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                  Updated {new Date(form.updatedAt).toLocaleDateString()}
                </div>

                {/* Published link */}
                {form.status === 'published' && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      🔗 /forms/{form.slug}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2" role="toolbar" aria-label={`Actions for ${form.name}`}>
                  <button
                    type="button"
                    onClick={() => onEdit(form)}
                    className="flex-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                    aria-label="Edit form"
                  >
                    Edit
                  </button>
                  {onViewSubmissions && (
                    <button
                      type="button"
                      onClick={() => onViewSubmissions(form)}
                      className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40"
                      title="View Submissions"
                      aria-label="View submissions"
                    >
                      📊
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => duplicateForm(form.id)}
                    className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                    title="Duplicate"
                    aria-label="Duplicate form"
                  >
                    📋
                  </button>
                  {/* Status management */}
                  {form.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(form.id, 'published')}
                      className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                      title="Publish"
                      aria-label="Publish form"
                    >
                      🚀
                    </button>
                  )}
                  {form.status === 'published' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(form.id, 'archived')}
                      className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                      title="Archive"
                      aria-label="Archive form"
                    >
                      📦
                    </button>
                  )}
                  {form.status === 'archived' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(form.id, 'draft')}
                      className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
                      title="Restore to Draft"
                      aria-label="Restore form to draft"
                    >
                      ♻️
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      toast.warning(`Delete "${form.name}"? This cannot be undone.`, {
                        action: { label: 'Delete', onClick: () => { deleteForm(form.id); } },
                        duration: 8000,
                      });
                    }}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    title="Delete"
                    aria-label="Delete form"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Library Modal */}
      {showTemplates && (
        <TemplateLibrary
          onClose={() => setShowTemplates(false)}
          onFormCreated={() => {
            setShowTemplates(false);
            loadFromStorage();
          }}
        />
      )}

      {/* Quick-Start Dialog (opened from "+ New Form") */}
      <QuickStartDialog open={showQuickStart} onClose={() => setShowQuickStart(false)} />
    </div>
  );
}
