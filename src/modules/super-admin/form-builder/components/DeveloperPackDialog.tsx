/**
 * Developer Pack Dialog
 *
 * Tabbed view of the auto-generated artifacts for a form:
 *  • Prisma fragment        — paste into schema.prisma
 *  • SQL DDL                — CREATE TABLE for a typed physical table
 *  • Materialized View      — CREATE OR REPLACE VIEW v_form_<slug>
 *  • TypeScript types       — Submission interface + Ref types
 *  • OpenAPI 3.1 spec       — for Swagger / Postman / SDK gen
 *  • Sample queries         — 5 ready-to-run SQL queries against the view
 *
 * Trigger: "Developer Pack" item in the FormBuilderPage More menu.
 */
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { fetchDeveloperPack, refreshFormView, type DeveloperPack } from '../../api/formBuilderApi';

interface DeveloperPackDialogProps {
  formId: string;
  formName: string;
  open: boolean;
  onClose: () => void;
}

type TabKey = 'prisma' | 'sql' | 'view' | 'typescript' | 'openapi' | 'queries';

const TABS: Array<{ key: TabKey; label: string; icon: string; lang: string; ext: string; desc: string }> = [
  { key: 'prisma',     label: 'Prisma',       icon: '🔷', lang: 'prisma',     ext: 'prisma', desc: 'Drop into schema.prisma → run prisma migrate dev' },
  { key: 'sql',        label: 'SQL Table',    icon: '🗄',  lang: 'sql',        ext: 'sql',    desc: 'Physical table — fastest queries, real FKs' },
  { key: 'view',       label: 'View',         icon: '👁',  lang: 'sql',        ext: 'sql',    desc: 'CREATE OR REPLACE VIEW over form_submissions JSON' },
  { key: 'typescript', label: 'TypeScript',   icon: '🟦', lang: 'typescript', ext: 'ts',     desc: 'Typed submission interface + Ref types' },
  { key: 'openapi',    label: 'OpenAPI',      icon: '🌐', lang: 'json',       ext: 'json',   desc: 'OpenAPI 3.1 spec — Swagger / Postman / SDKs' },
  { key: 'queries',    label: 'Sample SQL',   icon: '⚡', lang: 'sql',        ext: 'sql',    desc: 'Ready-to-run queries against the view' },
];

export default function DeveloperPackDialog({ formId, formName, open, onClose }: DeveloperPackDialogProps) {
  const [pack, setPack] = useState<DeveloperPack | null>(null);
  const [tab, setTab] = useState<TabKey>('prisma');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDeveloperPack(formId);
      setPack(data);
    } catch {
      toast.error('Failed to load developer pack');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tabContent = (() => {
    if (!pack) return '';
    switch (tab) {
      case 'prisma':     return pack.prisma;
      case 'sql':        return pack.sql;
      case 'view':       return pack.view;
      case 'typescript': return pack.typescript;
      case 'openapi':    return pack.openapi;
      case 'queries':    return pack.sampleQueries;
    }
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(tabContent || '').then(
      () => toast.success(`${TABS.find((t) => t.key === tab)?.label} copied to clipboard`),
      () => toast.error('Copy failed'),
    );
  };

  const handleDownload = () => {
    const t = TABS.find((tt) => tt.key === tab)!;
    const blob = new Blob([tabContent || ''], {
      type: t.lang === 'json' ? 'application/json' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack?.formSlug || 'form'}.${t.ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefreshView = async () => {
    setRefreshing(true);
    try {
      const res = await refreshFormView(formId);
      toast.success(`View ${res.viewName} refreshed`);
    } catch {
      toast.error('Failed to refresh view (does the form have any fields?)');
    } finally {
      setRefreshing(false);
    }
  };

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Developer Pack — auto-generated schema artifacts"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 px-5 py-3 dark:border-gray-700 dark:from-blue-900/10 dark:to-indigo-900/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">⚙️</span>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Developer Pack</h2>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-gray-800 dark:text-blue-400 dark:ring-blue-900/40">
                {formName}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Auto-generated artifacts so developers can query &amp; integrate this form.
            </p>
            {pack && (
              <p className="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                model <span className="font-semibold text-gray-600 dark:text-gray-300">{pack.modelName}</span>
                {' · '}table <span className="font-semibold text-gray-600 dark:text-gray-300">{pack.tableName}</span>
                {' · '}view <span className="font-semibold text-gray-600 dark:text-gray-300">{pack.viewName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-200 px-3 py-1.5 dark:border-gray-700" role="tablist" aria-label="Developer Pack artifacts">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                tab === t.key
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-900/50'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            {tab === 'view' && (
              <button
                type="button"
                onClick={handleRefreshView}
                disabled={refreshing}
                className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/40"
                title="Run CREATE OR REPLACE VIEW on the database now"
              >
                {refreshing ? 'Running…' : '↻ Apply view to DB'}
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!pack}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              📋 Copy
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!pack}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              ⬇ Download
            </button>
          </div>
        </div>

        {/* Description strip */}
        <div className="shrink-0 border-b border-gray-100 bg-gray-50/60 px-5 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          <span className="mr-2 text-gray-400" aria-hidden="true">{activeTab.icon}</span>
          {activeTab.desc}
        </div>

        {/* Code body */}
        <div className="flex-1 overflow-y-auto bg-gray-900">
          {loading ? (
            <div className="flex h-full items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" aria-label="Loading developer pack" />
            </div>
          ) : !pack ? (
            <div className="flex h-full items-center justify-center py-20 text-sm text-gray-500">
              Failed to load — try reopening the dialog.
            </div>
          ) : (
            <pre className="m-0 whitespace-pre overflow-x-auto p-5 font-mono text-[11.5px] leading-relaxed text-gray-100">
              <code>{tabContent}</code>
            </pre>
          )}
        </div>

        {/* Footer hints */}
        <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-5 py-2 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          <span className="mr-3">
            <kbd className="rounded border border-gray-300 bg-white px-1 font-mono dark:border-gray-600 dark:bg-gray-800">Esc</kbd> close
          </span>
          <span className="mr-3">
            Materialized views are refreshed automatically on every <strong>publish</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
