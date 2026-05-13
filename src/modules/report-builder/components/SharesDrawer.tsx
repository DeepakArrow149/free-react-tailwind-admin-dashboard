/**
 * SharesDrawer — generate tokenized read-only links for the active report.
 *
 * Token lifecycle:
 *   - Created with a 32-byte cryptographically random token (server side).
 *   - Token is shown ONCE in the drawer right after creation, then never again
 *     — the DB only stores the SHA-256 hash. If the user loses it, they must
 *     revoke and re-create.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchShares,
  createShare,
  deleteShare,
  type Share,
  type CreateSharePayload,
} from '../api/reportBuilderApi';

const EXPIRY_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: 'Never', days: null },
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export interface SharesDrawerProps {
  reportId: string;
  reportName: string;
  open: boolean;
  onClose: () => void;
}

export function SharesDrawer({ reportId, reportName, open, onClose }: SharesDrawerProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  /** Last-created share's plaintext token — shown once. */
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchShares(reportId)
      .then((rows) => { if (!cancelled) setShares(rows); })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load shares'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, reportId]);

  async function reload() {
    try {
      const rows = await fetchShares(reportId);
      setShares(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reload');
    }
  }

  async function handleCreate(payload: CreateSharePayload) {
    try {
      const created = await createShare(reportId, payload);
      if (created.token) setRevealedToken(created.token);
      toast.success('Share link created — copy the URL now (it won\'t be shown again)');
      setCreating(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function handleDelete(s: Share) {
    if (!confirm('Revoke this share? The link will stop working immediately.')) return;
    try {
      await deleteShare(reportId, s.id);
      toast.success('Share revoked');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Revoke failed');
    }
  }

  const publicUrl = revealedToken ? `${window.location.origin}/reports/public/${revealedToken}` : '';

  function copyUrl() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(
      () => toast.success('URL copied'),
      () => toast.error('Could not copy — please select and copy manually'),
    );
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-115 max-w-full flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              🔗 Share Links
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Read-only links — recipients don&rsquo;t need an ERP login.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {revealedToken && (
            <RevealedTokenBanner
              url={publicUrl}
              onCopy={copyUrl}
              onDismiss={() => setRevealedToken(null)}
            />
          )}

          {loading && <p className="text-sm text-gray-500">Loading…</p>}

          {!loading && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Active links ({shares.length})
                </h3>
                {!creating && (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    + New link
                  </button>
                )}
              </div>

              {shares.length === 0 && !creating && (
                <p className="text-sm italic text-gray-500">
                  No share links yet. Click <em>+ New link</em> to create one.
                </p>
              )}

              <ul className="space-y-2">
                {shares.map((s) => (
                  <ShareRow key={s.id} share={s} onDelete={() => handleDelete(s)} />
                ))}
              </ul>

              {creating && (
                <NewShareForm
                  reportName={reportName}
                  onCancel={() => setCreating(false)}
                  onSave={handleCreate}
                />
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Revealed token banner (only shown right after create) ──

type EmbedTab = 'url' | 'iframe' | 'sdk';

function RevealedTokenBanner({
  url, onCopy, onDismiss,
}: {
  url: string;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  const [tab, setTab] = useState<EmbedTab>('url');

  // Derive the origin + token from the URL so we don't need to thread them in.
  const parsed = (() => {
    try {
      const u = new URL(url);
      const token = u.pathname.split('/').filter(Boolean).pop() ?? '';
      return { origin: u.origin, token };
    } catch {
      return { origin: '', token: '' };
    }
  })();

  const iframeSnippet =
`<iframe
  src="${url}?embed=1"
  style="width:100%; height:480px; border:0;"
  title="Embedded report"
  loading="lazy"
></iframe>`;

  const sdkSnippet =
`<div id="report-host"></div>
<script type="module">
  import { ReportEmbedSdk } from '${parsed.origin}/embed/ReportEmbedSdk.js';

  const embed = new ReportEmbedSdk({
    container: document.getElementById('report-host'),
    baseUrl:   '${parsed.origin}',
    token:     '${parsed.token}',
    autoResize: true,
  });

  embed.on('ready',       (e) => console.log('ready:', e.reportName));
  embed.on('data-loaded', (e) => console.log('rows:', e.rowCount));
  embed.on('error',       (e) => console.error('embed error:', e.message));

  // Re-bind parameters at any time:
  // embed.setParameters({ from: '2026-01-01', to: '2026-12-31' });
</script>`;

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error('Could not copy — please select and copy manually'),
    );
  }

  return (
    <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-950">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-green-800 dark:text-green-200">
          ✓ Share link created — copy now, won&rsquo;t be shown again
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-green-700 hover:text-green-900 dark:text-green-300"
          aria-label="Dismiss"
        >✕</button>
      </div>

      <div aria-label="Share output format" className="mt-2 flex gap-1 border-b border-green-200 dark:border-green-800">
        <TabBtn active={tab === 'url'} onClick={() => setTab('url')}>URL</TabBtn>
        <TabBtn active={tab === 'iframe'} onClick={() => setTab('iframe')}>Iframe HTML</TabBtn>
        <TabBtn active={tab === 'sdk'} onClick={() => setTab('sdk')}>JS SDK</TabBtn>
      </div>

      {tab === 'url' && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={url}
            readOnly
            aria-label="Share URL"
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded border border-green-200 bg-white px-2 py-1 font-mono text-xs text-gray-800 dark:border-green-800 dark:bg-gray-900 dark:text-gray-200"
          />
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
          >
            Copy
          </button>
        </div>
      )}

      {tab === 'iframe' && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] text-green-800 dark:text-green-300">
            Drop into any HTML page. The iframe auto-resizes when JS SDK is used; with plain HTML, set a fixed height that fits your report.
          </p>
          <textarea
            readOnly
            value={iframeSnippet}
            aria-label="Iframe HTML snippet"
            rows={6}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-y rounded border border-green-200 bg-white p-2 font-mono text-[11px] text-gray-800 dark:border-green-800 dark:bg-gray-900 dark:text-gray-200"
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => copyText(iframeSnippet, 'Iframe HTML')}
              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {tab === 'sdk' && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] text-green-800 dark:text-green-300">
            Use the JS SDK for two-way control: typed events, auto-resize, runtime parameter binding, and cross-filter commands.
          </p>
          <textarea
            readOnly
            value={sdkSnippet}
            aria-label="JS SDK snippet"
            rows={14}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-y rounded border border-green-200 bg-white p-2 font-mono text-[11px] text-gray-800 dark:border-green-800 dark:bg-gray-900 dark:text-gray-200"
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => copyText(sdkSnippet, 'SDK snippet')}
              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-t border-b-2 px-2.5 py-1 text-[11px] font-medium transition ' +
        (active
          ? 'border-green-600 text-green-800 dark:border-green-400 dark:text-green-200'
          : 'border-transparent text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200')
      }
    >
      {children}
    </button>
  );
}

// ── Share row ──

function ShareRow({ share, onDelete }: { share: Share; onDelete: () => void }) {
  const expired = share.expiresAt && new Date(share.expiresAt).getTime() < Date.now();
  return (
    <li className="rounded-md border border-gray-200 p-3 text-xs dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Share #{share.id}
            {expired && (
              <span className="rounded bg-red-100 px-1 text-[9px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                EXPIRED
              </span>
            )}
            <span className="rounded bg-gray-200 px-1 text-[9px] font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {share.permissions.toUpperCase()}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500">
            Created {new Date(share.createdAt).toLocaleDateString()} by {share.createdBy}
          </p>
          {share.expiresAt && (
            <p className="mt-0.5 text-[10px] text-gray-500">
              Expires {new Date(share.expiresAt).toLocaleString()}
            </p>
          )}
          {Object.keys(share.parameters).length > 0 && (
            <p className="mt-0.5 font-mono text-[10px] text-gray-400">
              params: {JSON.stringify(share.parameters)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
        >
          Revoke
        </button>
      </div>
    </li>
  );
}

// ── New share form ──

function NewShareForm({
  reportName, onCancel, onSave,
}: {
  reportName: string;
  onCancel: () => void;
  onSave: (payload: CreateSharePayload) => void;
}) {
  const [permissions, setPermissions] = useState<'view' | 'view,export'>('view');
  const [expiryDays, setExpiryDays] = useState<number | null>(7);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
    onSave({ permissions, expiresAt, shareKind: 'link' });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
        New Share Link
      </h4>
      <p className="text-[11px] text-blue-700 dark:text-blue-300">
        Anyone with the URL can view <strong>{reportName}</strong> read-only.
      </p>

      <Field label="Permissions">
        <select
          aria-label="Permissions"
          value={permissions}
          onChange={(e) => setPermissions(e.target.value as 'view' | 'view,export')}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="view">View only</option>
          <option value="view,export">View + Export (CSV/Excel)</option>
        </select>
      </Field>

      <Field label="Expiry">
        <select
          aria-label="Expiry"
          value={String(expiryDays ?? 'null')}
          onChange={(e) => setExpiryDays(e.target.value === 'null' ? null : Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        >
          {EXPIRY_PRESETS.map((p) => (
            <option key={p.label} value={p.days === null ? 'null' : p.days}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Create link
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}
