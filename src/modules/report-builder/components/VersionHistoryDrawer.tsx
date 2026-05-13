/**
 * VersionHistoryDrawer — list snapshots and restore.
 *
 * Every save to a report creates a snapshot (autosave too — see backend
 * service.updateReport). This drawer shows the timeline and lets you
 * restore any version, which appends a new snapshot rather than rewriting
 * history.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useReportBuilderStore } from '../store';
import {
  fetchVersions,
  restoreVersion as apiRestoreVersion,
} from '../api/reportBuilderApi';
import type { ReportVersion } from '../types';

export interface VersionHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function VersionHistoryDrawer({ open, onClose }: VersionHistoryDrawerProps) {
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const loadReport = useReportBuilderStore((s) => s.loadReport);

  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeReport?.id) return;
    let cancelled = false;
    setLoading(true);
    fetchVersions(activeReport.id)
      .then((rows) => { if (!cancelled) setVersions(rows); })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load versions'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, activeReport?.id]);

  if (!open) return null;

  async function handleRestore(version: ReportVersion) {
    if (!activeReport?.id) return;
    if (!confirm(`Restore version ${version.versionNumber}? This will create a new snapshot — no history is lost.`)) {
      return;
    }
    setRestoring(version.id);
    try {
      await apiRestoreVersion(activeReport.id, version.id);
      // Reload the active report to pick up the restored state
      await loadReport(activeReport.id);
      toast.success(`Restored v${version.versionNumber}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoring(null);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-100 max-w-full flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Version History
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Every save creates a snapshot. Restore any version — nothing is lost.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close version history"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {!activeReport?.id && (
            <p className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Save the report first to see version history.
            </p>
          )}

          {loading && (
            <p className="text-sm text-gray-500">Loading versions…</p>
          )}

          {!loading && activeReport?.id && versions.length === 0 && (
            <p className="text-sm text-gray-500">No versions yet.</p>
          )}

          {!loading && versions.length > 0 && (
            <ol className="space-y-2">
              {versions.map((v, idx) => (
                <VersionRow
                  key={v.id}
                  version={v}
                  isCurrent={idx === 0}
                  isPinned={v.isPinned}
                  restoring={restoring === v.id}
                  onRestore={() => handleRestore(v)}
                />
              ))}
            </ol>
          )}
        </div>
      </aside>
    </>
  );
}

function VersionRow({
  version, isCurrent, isPinned, restoring, onRestore,
}: {
  version: ReportVersion;
  isCurrent: boolean;
  isPinned: boolean;
  restoring: boolean;
  onRestore: () => void;
}) {
  const isPublished = version.status === 'published';
  return (
    <li className={`rounded-md border p-3 ${
      isCurrent
        ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            v{version.versionNumber}
            {isCurrent && (
              <span className="rounded bg-blue-200 px-1 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                CURRENT
              </span>
            )}
            {isPublished && (
              <span className="rounded bg-green-200 px-1 text-[10px] font-bold text-green-700 dark:bg-green-900 dark:text-green-200">
                PUBLISHED
              </span>
            )}
            {isPinned && !isPublished && (
              <span className="text-amber-500" title="Pinned">📌</span>
            )}
          </p>
          {version.label && (
            <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400">
              {version.label}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-gray-400">
            {version.createdBy} · {new Date(version.createdAt).toLocaleString()}
          </p>
        </div>
        {!isCurrent && (
          <button
            type="button"
            onClick={onRestore}
            disabled={restoring}
            className="shrink-0 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {restoring ? '…' : 'Restore'}
          </button>
        )}
      </div>
    </li>
  );
}
