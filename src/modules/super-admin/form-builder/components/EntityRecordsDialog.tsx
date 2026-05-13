/**
 * Entity Records Dialog
 *
 * For an entity-form, shows three tabs:
 *  • Records  — list of rows in the real entity_<slug> table, with create/edit/delete
 *  • Schema   — field definition + DB column mapping
 *  • Migrations — every CREATE/ALTER applied, with status, plus a "Plan & Apply" button
 *
 * Trigger: "Records" item in More menu (only visible when activeForm.kind === 'entity'
 * AND status === 'published').
 */
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  fetchEntitySchema,
  listEntityRecords,
  createEntityRecord,
  updateEntityRecord,
  deleteEntityRecord,
  planEntityMigration,
  listEntityMigrations,
  applyEntityMigration,
  approveMigrationStep,
  rollbackMigrationStep,
  type EntityRecord,
  type EntitySchemaResponse,
  type EntityMigration,
  type EntityMigrationPlan,
} from '../../api/formBuilderApi';
import EntityImportExportDialog from './EntityImportExportDialog';

interface Props {
  slug: string;
  formName: string;
  open: boolean;
  onClose: () => void;
}

type TabKey = 'records' | 'schema' | 'migrations';

export default function EntityRecordsDialog({ slug, formName, open, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('records');
  const [schema, setSchema] = useState<EntitySchemaResponse | null>(null);
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [migrations, setMigrations] = useState<EntityMigration[]>([]);
  const [plan, setPlan] = useState<EntityMigrationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<EntityRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [showImportExport, setShowImportExport] = useState(false);

  const loadSchema = useCallback(async () => {
    try { setSchema(await fetchEntitySchema(slug)); }
    catch { toast.error('Could not load form schema'); }
  }, [slug]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listEntityRecords(slug, { page: pagination.page, limit: pagination.limit, search });
      setRecords(r.data);
      setPagination(r.pagination);
    } catch { toast.error('Could not load records'); }
    finally { setLoading(false); }
  }, [slug, pagination.page, pagination.limit, search]);

  const loadMigrations = useCallback(async () => {
    try {
      const [list, p] = await Promise.all([listEntityMigrations(slug), planEntityMigration(slug).catch(() => null)]);
      setMigrations(list);
      setPlan(p);
    } catch { toast.error('Could not load migrations'); }
  }, [slug]);

  useEffect(() => {
    if (!open) return;
    loadSchema();
  }, [open, loadSchema]);

  useEffect(() => {
    if (!open || !schema) return;
    if (tab === 'records') loadRecords();
    if (tab === 'migrations') loadMigrations();
  }, [open, schema, tab, loadRecords, loadMigrations]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editing && !creating) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, editing, creating]);

  const startCreate = () => {
    setEditing(null);
    setFormValues({});
    setCreating(true);
  };

  const startEdit = (r: EntityRecord) => {
    setCreating(false);
    setEditing(r);
    const v: Record<string, unknown> = {};
    if (schema) for (const f of schema.fields) v[f.name] = r[f.name];
    setFormValues(v);
  };

  const cancelForm = () => { setCreating(false); setEditing(null); setFormValues({}); };

  const handleSubmit = async () => {
    try {
      if (editing) await updateEntityRecord(slug, editing.id, formValues);
      else         await createEntityRecord(slug, formValues);
      toast.success(editing ? 'Record updated' : 'Record created');
      cancelForm();
      loadRecords();
    } catch (err) {
      toast.error('Save failed: ' + ((err as { message?: string }).message ?? 'unknown'));
    }
  };

  const handleDelete = (r: EntityRecord) => {
    toast.warning('Delete this record? Cannot be undone.', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try { await deleteEntityRecord(slug, r.id); toast.success('Deleted'); loadRecords(); }
          catch { toast.error('Delete failed'); }
        },
      },
      duration: 6000,
    });
  };

  const handleApplyMigration = async () => {
    try {
      const res = await applyEntityMigration(slug);
      toast.success(`Applied ${res.appliedChanges} change(s) to ${res.tableName}`);
      loadMigrations();
      loadSchema();
    } catch (err) {
      toast.error('Migration failed: ' + ((err as { message?: string }).message ?? 'unknown'));
    }
  };

  /** Approve a single pending migration row (manual-approval mode). */
  const handleApproveStep = (migId: number) => {
    toast.warning('Approve & apply this schema change?', {
      action: {
        label: 'Approve',
        onClick: async () => {
          try {
            const res = await approveMigrationStep(slug, migId);
            toast.success(`Migration applied (${res.status})`);
            loadMigrations();
            loadSchema();
          } catch (err) {
            toast.error('Approval failed: ' + ((err as { message?: string }).message ?? 'unknown'));
          }
        },
      },
      duration: 8000,
    });
  };

  /**
   * Rollback an applied migration. Warns about data loss because MySQL DDL
   * is non-transactional — once a column is dropped, its data is gone.
   */
  const handleRollbackStep = (mig: EntityMigration) => {
    const willDropData =
      mig.change_type === 'add_column' || mig.change_type === 'modify_column' || mig.change_type === 'create';
    const warning = willDropData
      ? `⚠ Rolling back will run: ${mig.rollback_sql}\nIf this drops a column or table, the data in it will be permanently lost.`
      : 'Rollback this migration?';
    toast.warning(warning, {
      action: {
        label: 'Rollback',
        onClick: async () => {
          try {
            const res = await rollbackMigrationStep(slug, mig.id);
            toast.success(`Rolled back (${res.status})`);
            loadMigrations();
            loadSchema();
          } catch (err) {
            toast.error('Rollback failed: ' + ((err as { message?: string }).message ?? 'unknown'));
          }
        },
      },
      duration: 12000,
    });
  };

  if (!open) return null;

  const formattedValue = (v: unknown): string => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? '✓' : '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Entity records — ${formName}`}
      onClick={() => { if (!creating && !editing) onClose(); }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 px-5 py-3 dark:border-gray-700 dark:from-emerald-900/10 dark:to-teal-900/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🗂️</span>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Entity Records</h2>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-gray-800 dark:text-emerald-400 dark:ring-emerald-900/40">
                {formName}
              </span>
            </div>
            {schema?.tableName && (
              <p className="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                table <span className="font-semibold text-gray-600 dark:text-gray-300">{schema.tableName}</span>
                {schema.tableCreatedAt && (
                  <> · provisioned {new Date(schema.tableCreatedAt).toLocaleDateString()}</>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700" role="tablist">
          {([
            { k: 'records', label: 'Records', icon: '📊' },
            { k: 'schema', label: 'Schema', icon: '📐' },
            { k: 'migrations', label: 'Migrations', icon: '🚂' },
          ] as const).map((t) => (
            <button
              key={t.k}
              type="button"
              role="tab"
              aria-selected={tab === t.k}
              onClick={() => setTab(t.k)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                tab === t.k
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/50'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
              {t.k === 'migrations' && plan && plan.changes.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-200 px-1.5 text-[9px] font-bold text-amber-900 dark:bg-amber-700 dark:text-amber-100">
                  {plan.changes.length} pending
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* RECORDS TAB */}
          {tab === 'records' && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                  placeholder="Search records…"
                  className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setShowImportExport(true)}
                  className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
                  title="CSV / Excel / JSON bulk operations"
                >
                  📦 Import / Export
                </button>
                <button
                  type="button"
                  onClick={startCreate}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  + New record
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : records.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No records yet</p>
                  <p className="mt-1 text-xs text-gray-400">Click "+ New record" above to add the first one.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">id</th>
                        {(schema?.fields || []).slice(0, 6).map((f) => (
                          <th key={f.name} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
                            {f.label || f.name}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {records.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{r.id}</td>
                          {(schema?.fields || []).slice(0, 6).map((f) => (
                            <td key={f.name} className="max-w-xs truncate px-3 py-2 text-gray-700 dark:text-gray-300">
                              {formattedValue(r[f.name])}
                            </td>
                          ))}
                          <td className="space-x-1 px-3 py-2 text-right whitespace-nowrap">
                            <button type="button" onClick={() => startEdit(r)} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400">
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDelete(r)} className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{pagination.total} record{pagination.total === 1 ? '' : 's'}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="rounded-md px-2 py-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    >← Prev</button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="rounded-md px-2 py-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    >Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCHEMA TAB */}
          {tab === 'schema' && (
            <div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                These fields map 1:1 to columns in the physical table <code className="rounded bg-gray-100 px-1 font-mono dark:bg-gray-700">{schema?.tableName ?? '(not provisioned)'}</code>.
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Column</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Label</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Field type</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(schema?.fields || []).map((f) => (
                      <tr key={f.name}>
                        <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{f.name}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{f.label}</td>
                        <td className="px-3 py-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-700">{f.type}</span>
                        </td>
                        <td className="px-3 py-2">
                          {(f.validation as { required?: boolean })?.required ? (
                            <span className="text-red-500">required</span>
                          ) : (
                            <span className="text-gray-400">optional</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MIGRATIONS TAB */}
          {tab === 'migrations' && (
            <div>
              {plan && plan.changes.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        🟡 {plan.changes.length} pending schema change{plan.changes.length === 1 ? '' : 's'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                        Review the SQL below, then click Apply. Each ALTER auto-commits in MySQL.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyMigration}
                      className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      Apply changes
                    </button>
                  </div>
                  <ol className="mt-2 space-y-1.5">
                    {plan.changes.map((c, i) => (
                      <li key={i} className="rounded-md bg-white px-2.5 py-1.5 dark:bg-gray-800">
                        <p className="text-[11px] font-medium text-gray-700 dark:text-gray-200">
                          {i + 1}. {c.description}
                        </p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] font-mono text-gray-500 dark:text-gray-400">
                          {c.ddl}
                        </pre>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {plan && plan.changes.length === 0 && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  ✓ Schema is in sync — no pending migrations
                </div>
              )}

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">History</h3>
              {migrations.length === 0 ? (
                <p className="text-xs text-gray-400">No migrations applied yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {migrations.map((m) => {
                    const isPending = m.status === 'pending' || m.status === 'approved';
                    const isApplied = m.status === 'applied';
                    const isRolledBack = m.status === 'rolled_back';
                    const isFailed = m.status === 'failed';
                    return (
                      <div key={m.id} className={`rounded-md border px-3 py-2 ${
                        isPending ? 'border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-900/15'
                        : isFailed ? 'border-red-300 bg-red-50/30 dark:border-red-700 dark:bg-red-900/10'
                        : isRolledBack ? 'border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-900/20'
                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              isApplied ? 'bg-emerald-100 text-emerald-700' :
                              isFailed ? 'bg-red-100 text-red-700' :
                              isPending ? 'bg-amber-100 text-amber-700' :
                              isRolledBack ? 'bg-gray-200 text-gray-600' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {m.status}
                            </span>
                            <span className="font-mono text-[10px] text-gray-500">{m.change_type}</span>
                            <span className="font-mono text-[10px] text-gray-400">on {m.table_name}</span>
                            <span className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleString()}</span>
                          </div>
                          {/* Per-row actions */}
                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleApproveStep(m.id)}
                                className="rounded-md bg-amber-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-amber-700"
                                title="Approve & apply this schema change"
                              >
                                ✓ Approve &amp; Apply
                              </button>
                            )}
                            {isApplied && m.rollback_sql && m.change_type !== 'rollback' && (
                              <button
                                type="button"
                                onClick={() => handleRollbackStep(m)}
                                className="rounded-md border border-red-300 bg-white px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                title="Run the stored rollback DDL — may drop data"
                              >
                                ↶ Rollback
                              </button>
                            )}
                            {isFailed && (
                              <button
                                type="button"
                                onClick={() => handleApproveStep(m.id)}
                                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50"
                                title="Retry this failed migration"
                              >
                                🔄 Retry
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] font-mono text-gray-500 dark:text-gray-400">{m.ddl_sql}</pre>
                        {m.error_message && (
                          <p className="mt-1 text-[10px] text-red-600">⚠ {m.error_message}</p>
                        )}
                        {m.applied_by && (
                          <p className="mt-1 text-[10px] text-gray-400">
                            applied by <span className="font-mono">{m.applied_by}</span>
                            {m.approved_by && m.approved_by !== m.applied_by && <> · approved by <span className="font-mono">{m.approved_by}</span></>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Import / Export sub-dialog */}
        <EntityImportExportDialog
          slug={slug}
          formName={formName}
          recordCount={pagination.total}
          open={showImportExport}
          onClose={() => setShowImportExport(false)}
          onImported={() => loadRecords()}
        />

        {/* Edit/Create form overlay */}
        {(creating || editing) && schema && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {editing ? `Edit record #${editing.id}` : 'New record'}
                </h3>
                <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="space-y-3">
                {schema.fields.map((f) => (
                  <div key={f.name}>
                    <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                      {f.label || f.name}
                      {(f.validation as { required?: boolean })?.required && <span className="text-red-500"> *</span>}
                      <span className="ml-2 font-mono text-[9px] text-gray-400">{f.type}</span>
                    </label>
                    {(f.type === 'textarea' || f.type === 'richtext') ? (
                      <textarea
                        rows={3}
                        value={(formValues[f.name] as string) ?? ''}
                        onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      />
                    ) : (f.type === 'select' || f.type === 'radio') && f.options?.length ? (
                      <select
                        value={(formValues[f.name] as string) ?? ''}
                        onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      >
                        <option value="">—</option>
                        {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (f.type === 'checkbox' || f.type === 'switch') ? (
                      <input
                        type="checkbox"
                        checked={Boolean(formValues[f.name])}
                        onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                    ) : f.type === 'number' || f.type === 'currency' || f.type === 'rating' || f.type === 'slider' ? (
                      <input
                        type="number"
                        value={(formValues[f.name] as number) ?? ''}
                        onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value === '' ? null : Number(e.target.value) }))}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      />
                    ) : (
                      <input
                        type={f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : f.type === 'time' ? 'time' : 'text'}
                        value={(formValues[f.name] as string) ?? ''}
                        onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={cancelForm} className="rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
