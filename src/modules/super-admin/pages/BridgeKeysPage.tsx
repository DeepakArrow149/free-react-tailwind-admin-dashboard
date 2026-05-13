/**
 * BridgeKeysPage — Operator UI for Form Bridge credentials.
 *
 * Super-admin only. Lists every issued bridge key, lets the admin issue a
 * new one, copy the one-time-revealed authorization header, and revoke a
 * key. The plaintext secret is shown EXACTLY ONCE at issue time; on every
 * subsequent visit it is gone (only the bcrypt hash lives in the DB).
 *
 * Wired into the super-admin sidebar — see menuConfig.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageMeta } from '@/components/common';
import {
  listBridgeKeys,
  createBridgeKey,
  revokeBridgeKey,
  type BridgeKeyRow,
} from '@/modules/super-admin/form-builder/bridge/bridgeClient';

interface NewKeyResult {
  keyId: string;
  secret: string;
  authorizationHeader: string;
}

export default function BridgeKeysPage() {
  const [rows, setRows] = useState<BridgeKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newResult, setNewResult] = useState<NewKeyResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBridgeKeys();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bridge keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (keyId: string) => {
    if (!confirm(`Revoke key ${keyId}? Active clients will start failing within seconds.`)) return;
    try {
      await revokeBridgeKey(keyId);
      toast.success('Key revoked');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageMeta title="Form Bridge Keys" description="Manage API keys for AI form ingestion" />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Form Bridge Keys</h1>
          <p className="mt-1 max-w-2xl text-xs text-gray-500 dark:text-gray-400">
            API credentials used by AI Form Builders and upstream automation systems to
            ingest form schemas. Each key carries an independent rate limit, optional expiry,
            and is scoped to one tenant. Plaintext secrets are returned exactly once at
            issue time — store them in your secret manager immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          + Issue new key
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Key ID</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Tenant</th>
              <th className="px-4 py-2 font-medium">Rate</th>
              <th className="px-4 py-2 font-medium">Last used</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                  No bridge keys yet. Click "Issue new key" to get started.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 dark:border-gray-700">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-200">{r.key_id}</td>
                <td className="px-4 py-2.5 text-xs">{r.name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {r.company_id === null ? <em>Platform-wide</em> : `Company #${r.company_id}`}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{r.rate_limit_per_min}/min</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {r.last_used_at ? new Date(r.last_used_at).toLocaleString() : <em>never</em>}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {r.is_active ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      Revoked
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.is_active && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(r.key_id)}
                      className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issue modal */}
      {showNew && (
        <IssueKeyModal
          onClose={() => setShowNew(false)}
          onIssued={(result) => {
            setNewResult(result);
            setShowNew(false);
            load();
          }}
        />
      )}

      {/* One-time reveal */}
      {newResult && (
        <RevealModal result={newResult} onClose={() => setNewResult(null)} />
      )}
    </div>
  );
}

// ─── Issue modal ───────────────────────────────────────────────

function IssueKeyModal({
  onClose, onIssued,
}: {
  onClose: () => void;
  onIssued: (r: NewKeyResult) => void;
}) {
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState<string>('');
  const [rateLimit, setRateLimit] = useState<string>('120');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    const rl = Number(rateLimit) || 120;
    setSubmitting(true);
    try {
      const out = await createBridgeKey({
        name: name.trim(),
        companyId: companyId.trim() ? Number(companyId.trim()) : null,
        rateLimit: rl,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      onIssued({
        keyId: out.keyId,
        secret: out.secret,
        authorizationHeader: out.authorizationHeader,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue key');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Issue a new bridge key" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AI service — prod"
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            autoFocus
          />
        </Field>
        <Field label="Tenant (company id — leave blank for platform-wide)">
          <input
            type="number"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="42"
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </Field>
        <Field label="Rate limit (requests / minute)">
          <input
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(e.target.value)}
            min={10}
            max={10000}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </Field>
        <Field label="Expires at (optional)">
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </Field>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Issuing…' : 'Issue key'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── One-time reveal modal ─────────────────────────────────────

function RevealModal({
  result, onClose,
}: {
  result: NewKeyResult;
  onClose: () => void;
}) {
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not access clipboard');
    }
  };

  return (
    <Modal title="Key issued — copy now, it won't be shown again" onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <strong>One-time reveal.</strong> The plaintext secret below is the
          only opportunity you will have to capture it. Store it in your
          secret manager <em>now</em>. After this dialog closes, only the
          bcrypt hash remains on the server.
        </div>

        <Field label="Key ID">
          <div className="flex gap-2">
            <input readOnly value={result.keyId} className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
            <CopyBtn onClick={() => copy('Key ID', result.keyId)} />
          </div>
        </Field>

        <Field label="Secret">
          <div className="flex gap-2">
            <input readOnly value={result.secret} className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
            <CopyBtn onClick={() => copy('Secret', result.secret)} />
          </div>
        </Field>

        <Field label="Authorization header (drop into Authorization)">
          <div className="flex gap-2">
            <input readOnly value={result.authorizationHeader} className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
            <CopyBtn onClick={() => copy('Authorization header', result.authorizationHeader)} />
          </div>
        </Field>

        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-[10px] text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <strong className="block mb-1">Quick test (curl):</strong>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono">{`curl -X GET https://api.example.com/api/v1/form-bridge/health \\
  -H 'Authorization: ${result.authorizationHeader}'`}</pre>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            I've stored it — close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Reusable bits ────────────────────────────────────────────

function Modal({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Close"
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function CopyBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
    >
      Copy
    </button>
  );
}

// Tailwind utility class names referenced above
// (kept inline so the page is self-contained):
//   .input — see tailwind base in app.css or your design tokens.
// If `.input` isn't a real utility in your codebase, swap for the
// explicit classes:
//   className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700"
