/**
 * VersionHistory – Shows version history timeline for a form
 * Allows viewing snapshots and restoring previous versions.
 */

import { useState, useEffect, useCallback } from 'react';
import type { FormDefinition } from '../types';
import {
  fetchVersions,
  fetchVersionDetail,
  restoreVersion,
  type FormVersion,
} from '../../api/formBuilderApi';
import { toast } from 'sonner';

interface Props {
  form: FormDefinition;
  onClose: () => void;
  onRestored: () => void;
}

export default function VersionHistory({ form, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [snapshot, setSnapshot] = useState<Record<string, any> | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVersions(form.id);
      setVersions(data);
    } catch {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [form.id]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleViewSnapshot = async (versionId: string) => {
    setSelectedVersion(versionId);
    setSnapshotLoading(true);
    try {
      const detail = await fetchVersionDetail(form.id, versionId);
      setSnapshot(detail.snapshot);
    } catch {
      toast.error('Failed to load version snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleRestore = (versionId: string) => {
    toast.warning('Restore this version? Current state will be saved as a new version first.', {
      action: {
        label: 'Restore',
        onClick: async () => {
          setRestoring(true);
          try {
            await restoreVersion(form.id, versionId);
            toast.success('Version restored successfully');
            onRestored();
          } catch {
            toast.error('Failed to restore version');
          } finally {
            setRestoring(false);
          }
        },
      },
      duration: 8000,
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            ← Back
          </button>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Version History: {form.name}
          </h2>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Version List */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">Loading...</div>
          ) : versions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No versions yet.</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Versions are created automatically when you save or publish.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`cursor-pointer p-4 transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedVersion === v.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => handleViewSnapshot(v.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {v.label || `v${v.versionNumber}`}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      #{v.versionNumber}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(v.createdAt)} · {v.createdBy || 'system'}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(v.id);
                      }}
                      disabled={restoring}
                      className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/20 dark:text-amber-400"
                    >
                      ↩ Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Snapshot Viewer */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
          {!selectedVersion ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Select a version to view its snapshot
            </div>
          ) : snapshotLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading snapshot...
            </div>
          ) : snapshot ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                {(snapshot.name as string) || 'Untitled'}
              </h3>
              {snapshot.description && (
                <p className="text-sm text-gray-500">{snapshot.description as string}</p>
              )}

              <div className="flex gap-3">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  Layout: {(snapshot.layout as string) || 'single'}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  Status: {(snapshot.status as string) || 'draft'}
                </span>
              </div>

              {/* Sections preview */}
              {Array.isArray(snapshot.sections) &&
                (snapshot.sections as Array<Record<string, unknown>>).map(
                  (section, si) => (
                    <div
                      key={si}
                      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-200">
                        {(section.title as string) || `Section ${si + 1}`}
                      </h4>
                      {Array.isArray(section.fields) && (section.fields as Array<Record<string, unknown>>).length > 0 ? (
                        <div className="space-y-1">
                          {(section.fields as Array<Record<string, unknown>>).map(
                            (field, fi) => (
                              <div
                                key={fi}
                                className="flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 text-sm dark:bg-gray-700/50"
                              >
                                <span className="text-gray-400">{(field.type as string) || '?'}</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200">
                                  {(field.label as string) || 'Untitled'}
                                </span>
                                <span className="text-xs text-gray-400">({(field.name as string) || ''})</span>
                                {(field.width as string) && (field.width as string) !== 'full' && (
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-500 dark:bg-blue-900/20">
                                    {field.width as string}
                                  </span>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No fields</p>
                      )}
                    </div>
                  ),
                )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
