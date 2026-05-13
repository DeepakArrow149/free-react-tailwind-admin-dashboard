/**
 * SubscriptionsDrawer — schedule a saved report to be emailed on a cron.
 *
 * Lists existing subscriptions, lets the user create / pause / delete.
 * Cron expression has 4 quick presets (daily / weekly / monthly / hourly)
 * plus a free-text field for custom expressions.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  type Subscription,
  type CreateSubscriptionPayload,
} from '../api/reportBuilderApi';

const PRESETS: Array<{ label: string; cron: string; description: string }> = [
  { label: 'Every hour',  cron: '0 * * * *',   description: 'On the hour, every hour' },
  { label: 'Daily 9am',   cron: '0 9 * * *',   description: 'Every day at 09:00' },
  { label: 'Weekly Mon',  cron: '0 9 * * 1',   description: 'Every Monday at 09:00' },
  { label: 'Monthly 1st', cron: '0 9 1 * *',   description: 'First day of each month at 09:00' },
];

export interface SubscriptionsDrawerProps {
  reportId: string;
  open: boolean;
  onClose: () => void;
}

export function SubscriptionsDrawer({ reportId, open, onClose }: SubscriptionsDrawerProps) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchSubscriptions(reportId)
      .then((rows) => { if (!cancelled) setSubs(rows); })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, reportId]);

  async function reload() {
    try {
      const rows = await fetchSubscriptions(reportId);
      setSubs(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reload');
    }
  }

  async function handleCreate(payload: CreateSubscriptionPayload) {
    try {
      await createSubscription(reportId, payload);
      toast.success('Subscription created');
      setCreating(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function handleToggle(sub: Subscription) {
    try {
      await updateSubscription(reportId, sub.id, { isActive: !sub.isActive });
      toast.success(sub.isActive ? 'Paused' : 'Resumed');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleDelete(sub: Subscription) {
    if (!confirm(`Delete subscription "${sub.name}"?`)) return;
    try {
      await deleteSubscription(reportId, sub.id);
      toast.success('Deleted');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-115 max-w-full flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              📧 Email Subscriptions
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Schedule the report to be emailed on a cron — daily, weekly, etc.
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
          {loading && <p className="text-sm text-gray-500">Loading…</p>}

          {!loading && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Active subscriptions ({subs.length})
                </h3>
                {!creating && (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    + New
                  </button>
                )}
              </div>

              {subs.length === 0 && !creating && (
                <p className="text-sm italic text-gray-500">
                  No subscriptions yet. Click <em>+ New</em> to schedule email delivery.
                </p>
              )}

              <ul className="space-y-2">
                {subs.map((s) => (
                  <SubscriptionRow
                    key={s.id}
                    sub={s}
                    onToggle={() => handleToggle(s)}
                    onDelete={() => handleDelete(s)}
                  />
                ))}
              </ul>

              {creating && (
                <NewSubscriptionForm
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

// ── Subscription row ──

function SubscriptionRow({
  sub, onToggle, onDelete,
}: {
  sub: Subscription;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-md border border-gray-200 p-3 text-xs dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {sub.name}
            {!sub.isActive && (
              <span className="rounded bg-gray-200 px-1 text-[9px] font-bold text-gray-600 dark:bg-gray-700">
                PAUSED
              </span>
            )}
            {sub.alertOnly && sub.alertCondition && (
              <span
                className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                title="Conditional alert — email only when threshold passes"
              >
                ALERT
              </span>
            )}
            {sub.lastStatus === 'failure' && (
              <span className="rounded bg-red-100 px-1 text-[9px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                LAST FAILED
              </span>
            )}
            {sub.lastStatus === 'condition_not_met' && (
              <span
                className="rounded bg-blue-100 px-1 text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                title="Last run: condition not met → email suppressed"
              >
                QUIET
              </span>
            )}
          </p>
          <p className="mt-1 font-mono text-[10px] text-gray-600 dark:text-gray-400">
            {sub.scheduleCron} · {sub.format.toUpperCase()}
          </p>
          {sub.recipients.length > 0 && (
            <p className="mt-0.5 truncate text-[10px] text-gray-500">
              ✉ {sub.recipients.map((r) => r.email).join(', ')}
            </p>
          )}
          {sub.slackWebhookUrl && (
            <p
              className="mt-0.5 truncate text-[10px] text-purple-600 dark:text-purple-400"
              title={sub.slackWebhookUrl}
            >
              # Slack: {redactSlackUrl(sub.slackWebhookUrl)}
            </p>
          )}
          {sub.lastRunAt && (
            <p className="mt-0.5 text-[10px] text-gray-400">
              Last run: {new Date(sub.lastRunAt).toLocaleString()}
              {sub.lastError && <span className="ml-1 text-red-500">· {sub.lastError}</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={onToggle}
            className="rounded bg-gray-200 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {sub.isActive ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

// ── New subscription form ──

type AlertMode = 'off' | 'rows_returned' | 'aggregate' | 'anomaly';

function NewSubscriptionForm({
  onCancel, onSave,
}: {
  onCancel: () => void;
  onSave: (payload: CreateSubscriptionPayload) => void;
}) {
  const [name, setName] = useState('');
  const [cron, setCron] = useState('0 9 * * *');
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [emails, setEmails] = useState('');
  const [slackUrl, setSlackUrl] = useState('');

  // Alert condition state
  const [alertMode, setAlertMode] = useState<AlertMode>('off');
  const [rowOp, setRowOp] = useState<'gt' | 'gte' | 'eq'>('gt');
  const [rowValue, setRowValue] = useState<string>('0');
  const [aggField, setAggField] = useState<string>('');
  const [aggRollup, setAggRollup] = useState<'sum' | 'avg' | 'min' | 'max' | 'count'>('sum');
  const [aggOp, setAggOp] = useState<'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'>('gt');
  const [aggValue, setAggValue] = useState<string>('0');
  // Anomaly / trend alert state
  const [anomalyField, setAnomalyField] = useState<string>('');
  const [anomalyRollup, setAnomalyRollup] =
    useState<'sum' | 'avg' | 'min' | 'max' | 'count'>('sum');
  const [anomalyDeltaPct, setAnomalyDeltaPct] = useState<string>('20');
  const [anomalyDeltaAbs, setAnomalyDeltaAbs] = useState<string>('');
  const [anomalyDirection, setAnomalyDirection] = useState<'up' | 'down' | 'either'>('either');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name required'); return; }
    if (!cron.trim()) { toast.error('Schedule required'); return; }
    const recipientsList = emails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    const slackTrim = slackUrl.trim();
    if (recipientsList.length === 0 && !slackTrim) {
      toast.error('Add at least one email recipient or a Slack webhook URL');
      return;
    }
    if (slackTrim && !slackTrim.startsWith('https://hooks.slack.com/')) {
      toast.error('Slack URL must start with https://hooks.slack.com/');
      return;
    }

    // Build alert condition (when enabled)
    let alertCondition: CreateSubscriptionPayload['alertCondition'];
    let alertOnly = false;
    if (alertMode === 'rows_returned') {
      alertCondition = {
        mode: 'rows_returned',
        op: rowOp,
        value: Number.parseInt(rowValue, 10) || 0,
      };
      alertOnly = true;
    } else if (alertMode === 'aggregate') {
      if (!aggField.trim()) { toast.error('Aggregate field required'); return; }
      const v = Number(aggValue);
      if (!Number.isFinite(v)) { toast.error('Aggregate value must be a number'); return; }
      alertCondition = {
        mode: 'aggregate',
        field: aggField.trim(),
        rollup: aggRollup,
        op: aggOp,
        value: v,
      };
      alertOnly = true;
    } else if (alertMode === 'anomaly') {
      if (!anomalyField.trim()) {
        toast.error('Anomaly field required');
        return;
      }
      const pct = anomalyDeltaPct.trim() ? Number(anomalyDeltaPct) : NaN;
      const abs = anomalyDeltaAbs.trim() ? Number(anomalyDeltaAbs) : NaN;
      if (!Number.isFinite(pct) && !Number.isFinite(abs)) {
        toast.error('Specify a percent or absolute delta');
        return;
      }
      alertCondition = {
        mode: 'anomaly',
        field: anomalyField.trim(),
        rollup: anomalyRollup,
        ...(Number.isFinite(pct) ? { deltaPct: pct } : {}),
        ...(Number.isFinite(abs) ? { deltaAbs: abs } : {}),
        direction: anomalyDirection,
      };
      alertOnly = true;
    }

    onSave({
      name: name.trim(),
      scheduleCron: cron.trim(),
      format,
      recipients: recipientsList.map((email) => ({ email })),
      slackWebhookUrl: slackTrim || undefined,
      alertCondition,
      alertOnly,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
        New Subscription
      </h4>

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Daily summary"
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        />
      </Field>

      <Field label="Schedule (cron)">
        <input
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          placeholder="0 9 * * *"
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
        />
        <div className="mt-1 flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.cron}
              type="button"
              onClick={() => setCron(p.cron)}
              title={p.description}
              className="rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-700 hover:bg-blue-100 dark:bg-gray-800 dark:text-gray-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Format">
        <select
          aria-label="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value as 'xlsx' | 'csv' | 'pdf')}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV</option>
        </select>
      </Field>

      <Field label="Email recipients (optional, comma- or newline-separated)">
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={2}
          placeholder="alice@company.com, bob@company.com"
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        />
      </Field>

      <Field label="Slack webhook URL (optional)">
        <input
          type="url"
          value={slackUrl}
          onChange={(e) => setSlackUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-800"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-0.5 text-[10px] italic text-gray-500">
          Posts a Block Kit summary card to a Slack channel.{' '}
          <a
            href="https://api.slack.com/messaging/webhooks#getting_started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
          >
            How to get a webhook URL
          </a>
        </p>
      </Field>

      <p className="text-[10px] text-gray-500">
        At least one delivery channel (email or Slack) is required.
      </p>

      {/* ── Alert / threshold condition ── */}
      <Field label="Send only when (alert)">
        <select
          aria-label="Alert mode"
          value={alertMode}
          onChange={(e) => setAlertMode(e.target.value as AlertMode)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="off">Off — send on every schedule (default)</option>
          <option value="rows_returned">Rows returned — when row count crosses a threshold</option>
          <option value="aggregate">Aggregate value — when SUM/AVG/etc crosses a threshold</option>
          <option value="anomaly">Anomaly / trend — when value changes by X% vs. last run</option>
        </select>
      </Field>

      {alertMode === 'rows_returned' && (
        <div className="grid grid-cols-[auto_auto_1fr] gap-1.5 rounded border border-amber-200 bg-amber-50 p-2 text-xs dark:border-amber-800 dark:bg-amber-950">
          <span className="self-center text-[11px] font-medium">Row count</span>
          <select
            aria-label="Row count operator"
            value={rowOp}
            onChange={(e) => setRowOp(e.target.value as typeof rowOp)}
            className="rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="gt">&gt;</option>
            <option value="gte">≥</option>
            <option value="eq">=</option>
          </select>
          <input
            aria-label="Row count threshold"
            type="number"
            value={rowValue}
            onChange={(e) => setRowValue(e.target.value)}
            placeholder="0"
            className="rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
      )}

      {alertMode === 'aggregate' && (
        <div className="space-y-1.5 rounded border border-amber-200 bg-amber-50 p-2 text-xs dark:border-amber-800 dark:bg-amber-950">
          <div className="grid grid-cols-[1fr_auto] gap-1.5">
            <input
              aria-label="Aggregate field"
              type="text"
              value={aggField}
              onChange={(e) => setAggField(e.target.value)}
              placeholder="totalValue"
              className="rounded border border-gray-300 bg-white px-1 py-0.5 font-mono dark:border-gray-600 dark:bg-gray-800"
            />
            <select
              aria-label="Rollup"
              value={aggRollup}
              onChange={(e) => setAggRollup(e.target.value as typeof aggRollup)}
              className="rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="sum">SUM</option>
              <option value="avg">AVG</option>
              <option value="min">MIN</option>
              <option value="max">MAX</option>
              <option value="count">COUNT</option>
            </select>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-1.5">
            <select
              aria-label="Aggregate operator"
              value={aggOp}
              onChange={(e) => setAggOp(e.target.value as typeof aggOp)}
              className="rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="gt">&gt;</option>
              <option value="gte">≥</option>
              <option value="lt">&lt;</option>
              <option value="lte">≤</option>
              <option value="eq">=</option>
              <option value="ne">≠</option>
            </select>
            <input
              aria-label="Aggregate threshold"
              type="number"
              value={aggValue}
              onChange={(e) => setAggValue(e.target.value)}
              placeholder="100000"
              className="rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
        </div>
      )}

      {alertMode === 'anomaly' && (
        <div className="space-y-1.5 rounded border border-purple-200 bg-purple-50 p-2 text-xs dark:border-purple-800 dark:bg-purple-950">
          <p className="text-[10px] text-purple-700 dark:text-purple-300">
            Alerts when this run's value differs from the last run by more than
            the threshold below. No alert on the first run (no baseline).
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-1.5">
            <input
              aria-label="Anomaly field"
              type="text"
              value={anomalyField}
              onChange={(e) => setAnomalyField(e.target.value)}
              placeholder="openPos"
              className="rounded border border-gray-300 bg-white px-1 py-0.5 font-mono dark:border-gray-600 dark:bg-gray-800"
            />
            <select
              aria-label="Anomaly rollup"
              value={anomalyRollup}
              onChange={(e) => setAnomalyRollup(e.target.value as typeof anomalyRollup)}
              className="rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="sum">SUM</option>
              <option value="avg">AVG</option>
              <option value="min">MIN</option>
              <option value="max">MAX</option>
              <option value="count">COUNT</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium">±%</span>
              <input
                aria-label="Anomaly delta percent"
                type="number"
                value={anomalyDeltaPct}
                onChange={(e) => setAnomalyDeltaPct(e.target.value)}
                placeholder="20"
                className="w-full rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium">±abs</span>
              <input
                aria-label="Anomaly delta absolute"
                type="number"
                value={anomalyDeltaAbs}
                onChange={(e) => setAnomalyDeltaAbs(e.target.value)}
                placeholder="optional"
                className="w-full rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
          </div>
          <select
            aria-label="Anomaly direction"
            value={anomalyDirection}
            onChange={(e) => setAnomalyDirection(e.target.value as typeof anomalyDirection)}
            className="w-full rounded border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="either">↕ Either direction</option>
            <option value="up">↑ Only on increase</option>
            <option value="down">↓ Only on decrease</option>
          </select>
        </div>
      )}

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
          Create
        </button>
      </div>
    </form>
  );
}

/**
 * Mask the secret part of a Slack webhook URL for display.
 * Real URL: https://hooks.slack.com/services/T01ABCD/B05XYZ/aBcDeFg...
 * Display:  T01ABCD/B05XYZ/aBcDe…
 */
function redactSlackUrl(url: string): string {
  const m = url.match(/^https?:\/\/hooks\.slack\.com\/services\/(.+)$/);
  if (!m) return url;
  const tail = m[1];
  if (tail.length <= 20) return tail;
  return tail.slice(0, 18) + '…';
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
