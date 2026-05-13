/**
 * Entity Import/Export Dialog
 *
 * Two-tab dialog for bulk operations on an entity table:
 *   • Export — pick a format (CSV / JSON / Excel), download the file
 *   • Import — drop a file, see preview (errors highlighted), then commit
 *
 * Trigger: "📥 Import / Export" button in the EntityRecordsDialog Records tab.
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  downloadEntityExport,
  previewEntityImport,
  applyEntityImport,
  type ImportPreview,
  type ImportResult,
} from '../../api/formBuilderApi';

interface Props {
  slug: string;
  formName: string;
  recordCount: number;
  open: boolean;
  onClose: () => void;
  /** Called after a successful import so the parent can reload records. */
  onImported?: () => void;
}

type Tab = 'export' | 'import';

export default function EntityImportExportDialog({ slug, formName, recordCount, open, onClose, onImported }: Props) {
  const [tab, setTab] = useState<Tab>('export');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab('export');
    setImportFile(null);
    setPreview(null);
    setResult(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !applying) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, applying]);

  const handleDownload = () => {
    downloadEntityExport(slug, exportFormat);
    toast.success(`Downloading ${recordCount} record${recordCount === 1 ? '' : 's'} as .${exportFormat}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImportFile(f);
    setPreview(null);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setImportFile(f);
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    if (!importFile) return;
    setPreviewing(true);
    try {
      const p = await previewEntityImport(slug, importFile);
      setPreview(p);
    } catch (err) {
      toast.error('Preview failed: ' + ((err as { message?: string }).message ?? 'unknown'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!importFile) return;
    setApplying(true);
    try {
      const r = await applyEntityImport(slug, importFile);
      setResult(r);
      if (r.inserted > 0) {
        toast.success(`Imported ${r.inserted} record${r.inserted === 1 ? '' : 's'}`);
        if (onImported) onImported();
      } else {
        toast.warning('No records inserted — see error log');
      }
    } catch (err) {
      toast.error('Import failed: ' + ((err as { message?: string }).message ?? 'unknown'));
    } finally {
      setApplying(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!open) return null;

  const fileSize = importFile ? (importFile.size / 1024).toFixed(1) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Import / Export ${formName}`}
      onClick={() => { if (!applying) onClose(); }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-blue-50 px-5 py-3 dark:border-gray-700 dark:from-indigo-900/10 dark:to-blue-900/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">📦</span>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Bulk Data Operations</h2>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-gray-800 dark:text-indigo-400 dark:ring-indigo-900/40">
                {formName}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              CSV / JSON / Excel — for data migration, BI exports, mass updates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700" role="tablist">
          {([
            { k: 'export', label: 'Export', icon: '📤' },
            { k: 'import', label: 'Import', icon: '📥' },
          ] as const).map((t) => (
            <button
              key={t.k}
              type="button"
              role="tab"
              aria-selected={tab === t.k}
              onClick={() => setTab(t.k)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                tab === t.k
                  ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-900/50'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* EXPORT TAB */}
          {tab === 'export' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40">
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Export <strong>{recordCount.toLocaleString()}</strong> record{recordCount === 1 ? '' : 's'} from <code className="rounded bg-white px-1 font-mono text-[11px] dark:bg-gray-700">{formName}</code>.
                </p>
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  Up to 50,000 rows per export. For larger datasets, paginate via search filter.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'csv', label: 'CSV', icon: '📄', desc: 'Universal — Excel, Sheets, scripts' },
                    { id: 'xlsx', label: 'Excel', icon: '📊', desc: 'Native .xlsx with header row' },
                    { id: 'json', label: 'JSON', icon: '🔧', desc: 'For scripts & API integrations' },
                  ] as const).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setExportFormat(f.id)}
                      className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                        exportFormat === f.id
                          ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300 dark:border-indigo-600 dark:bg-indigo-900/20 dark:ring-indigo-900/40'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <span className="text-2xl" aria-hidden="true">{f.icon}</span>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{f.label}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={recordCount === 0}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  ⬇ Download .{exportFormat}
                </button>
              </div>
            </div>
          )}

          {/* IMPORT TAB */}
          {tab === 'import' && (
            <div className="space-y-4">
              {/* Step 1: file picker */}
              {!preview && !result && (
                <div>
                  <label
                    htmlFor="entity-import-file"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-6 py-8 text-center hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-gray-600 dark:bg-gray-800/40 dark:hover:border-indigo-500"
                  >
                    <span className="text-3xl" aria-hidden="true">📥</span>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {importFile ? importFile.name : 'Drop a CSV, Excel, or JSON file here'}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {importFile
                        ? `${fileSize} KB`
                        : 'Up to 25 MB. Header row should match the form\'s field names.'}
                    </p>
                    <input
                      ref={fileInputRef}
                      id="entity-import-file"
                      type="file"
                      accept=".csv,.json,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {importFile && (
                      <button type="button" onClick={resetImport} className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Pick different file
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={!importFile || previewing}
                      className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {previewing ? 'Validating…' : 'Preview & validate →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: preview */}
              {preview && !result && (
                <div className="space-y-3">
                  <div className={`rounded-xl border-2 p-3 ${
                    preview.errors.length > 0 || preview.validRows === 0
                      ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                      : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                  }`}>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-2xl" aria-hidden="true">{preview.errors.length > 0 ? '⚠' : '✓'}</span>
                      <span><strong>{preview.totalRows}</strong> rows in file</span>
                      <span className="text-emerald-700">→ <strong>{preview.validRows}</strong> valid</span>
                      {preview.errors.length > 0 && <span className="text-amber-700">⚠ <strong>{preview.errors.length}</strong> errors</span>}
                    </div>
                  </div>

                  {preview.unknownColumns.length > 0 && (
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      ⚠ Unknown columns in file (will be ignored): <strong>{preview.unknownColumns.join(', ')}</strong>
                    </div>
                  )}

                  {preview.errors.length > 0 && (
                    <details className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-700 dark:bg-red-900/15">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-red-800 dark:text-red-300">
                        Show {preview.errors.length} validation error{preview.errors.length === 1 ? '' : 's'} (first 200)
                      </summary>
                      <div className="max-h-48 overflow-y-auto px-3 py-2 text-[10px]">
                        <table className="min-w-full">
                          <thead className="text-left">
                            <tr><th>Row</th><th className="px-2">Field</th><th>Error</th></tr>
                          </thead>
                          <tbody>
                            {preview.errors.map((e, i) => (
                              <tr key={i} className="font-mono">
                                <td>{e.rowIndex}</td>
                                <td className="px-2">{e.field || '—'}</td>
                                <td>{e.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}

                  {preview.sample.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Sample of first {preview.sample.length} valid row{preview.sample.length === 1 ? '' : 's'}
                      </p>
                      <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-gray-50 dark:bg-gray-700/40">
                            <tr>
                              {Object.keys(preview.sample[0] || {}).slice(0, 8).map((k) => (
                                <th key={k} className="px-2 py-1 text-left font-mono font-semibold text-gray-600 dark:text-gray-300">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {preview.sample.map((r, i) => (
                              <tr key={i}>
                                {Object.keys(preview.sample[0] || {}).slice(0, 8).map((k) => (
                                  <td key={k} className="max-w-32 truncate px-2 py-1 text-gray-700 dark:text-gray-300">
                                    {String((r as Record<string, unknown>)[k] ?? '—').slice(0, 40)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={resetImport} className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      ← Pick a different file
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={preview.validRows === 0 || applying}
                      className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {applying ? 'Importing…' : `Import ${preview.validRows} valid row${preview.validRows === 1 ? '' : 's'}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: result */}
              {result && (
                <div className="space-y-3">
                  <div className={`rounded-xl border-2 p-4 ${
                    result.errored > 0
                      ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                      : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                  }`}>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                      {result.errored > 0 ? '⚠ Import completed with errors' : '✓ Import successful'}
                    </h3>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-center text-xs">
                      <div>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.inserted.toLocaleString()}</p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">inserted</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{result.errored.toLocaleString()}</p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">errored</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{(result.durationMs / 1000).toFixed(1)}s</p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">duration</p>
                      </div>
                    </div>
                  </div>
                  {(result.validationErrors.length > 0 || result.insertErrors.length > 0) && (
                    <details className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/15">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                        Show errors ({result.validationErrors.length} validation, {result.insertErrors.length} insert)
                      </summary>
                      <div className="max-h-48 space-y-1 overflow-y-auto px-3 py-2 text-[10px]">
                        {result.validationErrors.map((e, i) => (
                          <p key={`v${i}`} className="font-mono text-amber-700 dark:text-amber-400">
                            row {e.rowIndex} · {e.field ?? '—'}: {e.message}
                          </p>
                        ))}
                        {result.insertErrors.map((e, i) => (
                          <p key={`i${i}`} className="font-mono text-red-700 dark:text-red-400">
                            batch starting row {e.rowIndex}: {e.error}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={resetImport} className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Import another file
                    </button>
                    <button type="button" onClick={onClose} className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
