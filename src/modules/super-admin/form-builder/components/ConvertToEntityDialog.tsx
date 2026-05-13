/**
 * Convert-to-Entity Dialog
 *
 * Graduates a process form (JSON-stored submissions) into an entity form
 * (typed per-form table) via a 3-step wizard:
 *
 *   1. Preview — show field→column mapping, row count, warnings, DDL
 *   2. Confirm — checkbox + explicit "I understand" before running
 *   3. Result  — show migrated/errored counts, link to Entity Records
 *
 * Trigger: "🚀 Convert to Master" item in More menu (process forms only).
 */
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  planConvertToEntity,
  applyConvertToEntity,
  type ConversionPlan,
  type ConversionResult,
} from '../../api/formBuilderApi';

interface Props {
  formId: string;
  formName: string;
  open: boolean;
  onClose: () => void;
  /** Called after a successful conversion so the parent can refresh state. */
  onConverted?: () => void;
}

type Step = 'preview' | 'confirm' | 'result';

const COERCION_LABEL: Record<string, string> = {
  string: 'string',
  number: 'decimal',
  integer: 'integer',
  boolean: 'boolean',
  date: 'date',
  datetime: 'datetime',
  json: 'JSON',
  skip: 'skip',
};

export default function ConvertToEntityDialog({ formId, formName, open, onClose, onConverted }: Props) {
  const [step, setStep] = useState<Step>('preview');
  const [plan, setPlan] = useState<ConversionPlan | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const reset = useCallback(() => {
    setStep('preview');
    setPlan(null);
    setResult(null);
    setAcknowledged(false);
  }, []);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const p = await planConvertToEntity(formId);
      setPlan(p);
    } catch (err) {
      toast.error('Could not plan conversion: ' + ((err as { message?: string }).message ?? 'unknown'));
      onClose();
    } finally {
      setLoading(false);
    }
  }, [formId, onClose]);

  useEffect(() => {
    if (!open) return;
    reset();
    loadPlan();
  }, [open, reset, loadPlan]);

  // Esc closes (only when not actively running)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !running) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, running]);

  const handleRun = async () => {
    if (!plan) return;
    setRunning(true);
    try {
      const r = await applyConvertToEntity(formId);
      setResult(r);
      setStep('result');
      if (onConverted) onConverted();
    } catch (err) {
      toast.error('Conversion failed: ' + ((err as { message?: string }).message ?? 'unknown'));
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  const blockingWarnings = plan?.warnings.filter((w) => w.level === 'error') ?? [];
  const cautionWarnings = plan?.warnings.filter((w) => w.level === 'warn') ?? [];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Convert "${formName}" to entity master`}
      onClick={() => { if (!running) onClose(); }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-3 dark:border-gray-700 dark:from-amber-900/10 dark:to-orange-900/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🚀</span>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Convert to Entity Master</h2>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-gray-800 dark:text-amber-400 dark:ring-amber-900/40">
                {formName}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Promote this process form to a typed master table.
              {plan && <> Step <span className="font-semibold">{step === 'preview' ? '1' : step === 'confirm' ? '2' : '3'}</span> of 3.</>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span className="ml-3 text-sm text-gray-500">Planning conversion…</span>
            </div>
          )}

          {/* STEP 1 — PREVIEW */}
          {!loading && plan && step === 'preview' && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Submissions to migrate" value={plan.rowCount.toLocaleString()} icon="📋" />
                <Stat label="Fields → columns" value={String(plan.fieldMappings.length)} icon="📐" />
                <Stat label="New table" value={plan.tableName} icon="🗄️" mono />
              </div>

              {/* Warnings */}
              {blockingWarnings.length > 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
                  <p className="text-xs font-bold text-red-800 dark:text-red-300">⛔ Blocking issues — fix before converting</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-red-700 dark:text-red-400">
                    {blockingWarnings.map((w, i) => <li key={i}>• {w.message}</li>)}
                  </ul>
                </div>
              )}
              {cautionWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">⚠ Heads up — proceed with awareness</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                    {cautionWarnings.map((w, i) => (
                      <li key={i}>
                        • {w.message}
                        {w.fieldName && <span className="ml-1 font-mono text-[10px] opacity-70">({w.fieldName})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Field mapping table */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Field → Column mapping</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Field</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Form type</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">SQL column type</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Coerce as</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {plan.fieldMappings.map((m) => (
                        <tr key={m.fieldName}>
                          <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-200">{m.fieldName}</td>
                          <td className="px-3 py-1.5">
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-700">{m.fieldType}</span>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">{m.sqlType}</td>
                          <td className="px-3 py-1.5 text-[11px] text-gray-500">{COERCION_LABEL[m.coercion]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DDL preview */}
              <details className="rounded-md border border-gray-200 bg-gray-900 dark:border-gray-700">
                <summary className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-800">
                  📜 SQL DDL that will run
                </summary>
                <pre className="m-0 max-h-60 overflow-auto p-3 font-mono text-[10.5px] leading-relaxed text-gray-100">
                  <code>{plan.ddl}</code>
                </pre>
              </details>
            </div>
          )}

          {/* STEP 2 — CONFIRM */}
          {!loading && plan && step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">⚠ Final confirmation</h3>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                  This conversion will:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                  <li>1. Run <code className="rounded bg-white px-1 font-mono dark:bg-gray-800">CREATE TABLE {plan.tableName}</code> on the database</li>
                  <li>2. Migrate <strong>{plan.rowCount.toLocaleString()} submission(s)</strong> from JSON storage into typed columns</li>
                  <li>3. Flip the form's <strong>kind</strong> from <code className="rounded bg-white px-1 font-mono dark:bg-gray-800">process</code> to <code className="rounded bg-white px-1 font-mono dark:bg-gray-800">entity</code></li>
                  <li>4. Future submissions will write to <code className="rounded bg-white px-1 font-mono dark:bg-gray-800">{plan.tableName}</code></li>
                </ul>
                <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400">
                  ✓ Reversible: you can rollback the CREATE TABLE step from the Migrations tab if needed.<br />
                  ℹ Original <code className="font-mono">form_submissions</code> rows are preserved untouched as a backup.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300"
                />
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  I understand that this is a <strong>structural change</strong> to a production database. The DDL is reviewed above and I have permission to apply it.
                </div>
              </label>
            </div>
          )}

          {/* STEP 3 — RESULT */}
          {!loading && result && step === 'result' && (
            <div className="space-y-4">
              <div className={`rounded-xl border-2 p-4 ${
                result.rowsErrored > 0
                  ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                  : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
              }`}>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  {result.rowsErrored > 0 ? '⚠ Conversion completed with errors' : '✓ Conversion successful'}
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Stat label="Rows migrated" value={result.rowsMigrated.toLocaleString()} icon="✅" />
                  <Stat label="Rows errored" value={result.rowsErrored.toLocaleString()} icon={result.rowsErrored > 0 ? '⚠' : '—'} />
                  <Stat label="Duration" value={`${(result.durationMs / 1000).toFixed(1)}s`} icon="⏱" />
                </div>
                <p className="mt-3 text-[11px] text-gray-600 dark:text-gray-300">
                  Table created: <code className="rounded bg-white px-1 font-mono dark:bg-gray-800">{result.tableName}</code>
                </p>
              </div>

              {result.errors.length > 0 && (
                <details className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-700 dark:bg-red-900/20">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-red-800 dark:text-red-300">
                    Show {result.errors.length} row error{result.errors.length === 1 ? '' : 's'} (first 50)
                  </summary>
                  <div className="max-h-48 space-y-1 overflow-y-auto px-3 py-2 text-[10px]">
                    {result.errors.map((e, i) => (
                      <div key={i} className="font-mono text-red-700 dark:text-red-400">
                        submission #{e.submissionId}: {e.error}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                The form is now an <strong>entity master</strong>. Refresh the page to see the new badge in the editor header.
                Records can be managed from <strong>⋯ More → 🗂️ Entity Records</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/50">
          {step === 'preview' && (
            <>
              <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={!plan || blockingWarnings.length > 0}
                className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Continue → Confirm
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button type="button" onClick={() => setStep('preview')} disabled={running} className="rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700">
                ← Back
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={!acknowledged || running}
                className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {running ? 'Converting…' : '🚀 Run conversion now'}
              </button>
            </>
          )}
          {step === 'result' && (
            <>
              <span className="text-[11px] text-gray-400">DDL migration #{result?.ddlMigrationId} recorded for audit.</span>
              <button type="button" onClick={onClose} className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, mono }: { label: string; value: string; icon: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-1.5">
        <span className="text-base" aria-hidden="true">{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className={`mt-1 text-base font-bold text-gray-800 dark:text-gray-100 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  );
}
