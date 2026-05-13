/**
 * ReportListPage — List of saved reports + actions to open / create / clone.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useReportBuilderStore } from '../store';
import {
  fetchTemplates,
  instantiateTemplate,
  type ReportTemplate,
} from '../api/reportBuilderApi';
import type { ReportListItem, ReportType } from '../types';

export default function ReportListPage() {
  const navigate = useNavigate();
  const reports = useReportBuilderStore((s) => s.reports);
  const reportsLoading = useReportBuilderStore((s) => s.reportsLoading);
  const loadReports = useReportBuilderStore((s) => s.loadReports);
  const removeReport = useReportBuilderStore((s) => s.removeReport);
  const cloneReport = useReportBuilderStore((s) => s.cloneReport);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);

  useEffect(() => {
    void loadReports();
    fetchTemplates().then(setTemplates).catch(() => undefined);
  }, [loadReports]);

  async function handleUseTemplate(tpl: ReportTemplate) {
    try {
      const created = await instantiateTemplate(tpl.id);
      toast.success(`Created "${created.name}" from template`);
      navigate(`/reports/builder/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not use template');
    }
  }

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q))
          return false;
      }
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, search, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportListItem[]>();
    for (const r of filtered) {
      const key = r.category || 'general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function handleDelete(r: ReportListItem) {
    if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await removeReport(r.id);
      toast.success('Report deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleClone(r: ReportListItem) {
    try {
      const copy = await cloneReport(r.id);
      toast.success('Report duplicated');
      navigate(`/reports/builder/${copy.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Clone failed');
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Custom Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Build, save, and share your own reports — no SQL required.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Report
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports…"
          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {reportsLoading && (
        <p className="py-8 text-center text-sm text-gray-500">Loading reports…</p>
      )}

      {!reportsLoading && filtered.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">
            No reports yet
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Create your first custom report — pick a data source, add columns, save.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create your first report
          </button>
        </div>
      )}

      {showCreate && (
        <CreateReportModal
          onClose={() => setShowCreate(false)}
          onPick={(type) => {
            setShowCreate(false);
            navigate(`/reports/builder/new?type=${type}`);
          }}
        />
      )}

      {!reportsLoading && templates.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            ✨ Starter Templates
            <span className="text-[10px] font-normal text-gray-400">
              · click to clone
            </span>
          </h2>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => handleUseTemplate(t)}
                  className="flex w-full items-start gap-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-600"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      {t.category}
                    </p>
                    {t.description && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {t.description}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!reportsLoading && grouped.map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            {category}
          </h2>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <li key={r.id}>
                <ReportCard
                  report={r}
                  onOpen={() => navigate(`/reports/builder/${r.id}`)}
                  onClone={() => handleClone(r)}
                  onDelete={() => handleDelete(r)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ReportCard({
  report, onOpen, onClone, onDelete,
}: {
  report: ReportListItem;
  onOpen: () => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      onClick={onOpen}
      className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl">{report.icon}</span>
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {report.name}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
            report.status === 'published'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {report.status}
        </span>
      </header>

      {report.description && (
        <p className="mb-3 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
          {report.description}
        </p>
      )}

      <footer className="flex items-center justify-between text-[11px] text-gray-500">
        <span>{report.rootSource}</span>
        <span>{new Date(report.updatedAt).toLocaleDateString()}</span>
      </footer>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClone(); }}
          className="rounded bg-white p-1 text-xs text-gray-600 shadow-sm hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300"
          title="Duplicate"
        >
          ⎘
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded bg-white p-1 text-xs text-gray-600 shadow-sm hover:text-red-600 dark:bg-gray-800 dark:text-gray-300"
          title="Delete"
        >
          ✕
        </button>
      </div>
    </article>
  );
}

// ── Create modal: pick report type ───────────────────────────────

const REPORT_TYPES: Array<{
  id: ReportType;
  label: string;
  icon: string;
  description: string;
}> = [
  { id: 'operational', label: 'Operational',
    icon: '⊞',
    description: 'Tabular report — pick columns, add filters, export to Excel.' },
  { id: 'analytical', label: 'Analytical',
    icon: '📊',
    description: 'Single chart or KPI — bars, lines, pies, single metrics.' },
  { id: 'dashboard', label: 'Dashboard',
    icon: '📈',
    description: 'Grid of multiple widgets — combine charts, tables, KPIs.' },
];

function CreateReportModal({
  onClose, onPick,
}: {
  onClose: () => void;
  onPick: (type: ReportType) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto w-160 max-w-full rounded-lg border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              New Report
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >✕</button>
          </header>

          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Pick a report type — you can always change visualization later.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t.id)}
                className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-950"
              >
                <span className="text-2xl">{t.icon}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
