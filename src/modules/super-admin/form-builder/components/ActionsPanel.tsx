/**
 * ActionsPanel — visual editor for the action chain that runs on submission
 * events. Mirrors Appsmith's event-handler concept but specialised for
 * forms: pick a trigger (on_submit / on_approve / on_reject / on_review),
 * pick an action type (email / webhook / notify / set_status / set_field),
 * fill in templated config, and optionally guard with an `if` condition.
 *
 * Storage: form.settings.actions = FormAction[].
 * Runtime: dispatched by apps/api-server/src/modules/saas/actionChain.ts.
 */
import { useMemo } from 'react';
import { useFormBuilderStore } from '../store';
import type { FormAction, ActionEvent, ActionType, FormField } from '../types';
import { generateId } from '../types';
import BindingsHint from './BindingsHint';

// ─── Catalog ─────────────────────────────────────────────────────

const EVENT_LABELS: Record<ActionEvent, string> = {
  on_submit:  '🆕 On submit',
  on_approve: '✅ On approve',
  on_reject:  '❌ On reject',
  on_review:  '🔁 On any review',
};

const TYPE_LABELS: Record<ActionType, { label: string; emoji: string; help: string }> = {
  email:      { label: 'Send email',         emoji: '📧', help: 'Send a templated email to one or more recipients.' },
  webhook:    { label: 'Call webhook',       emoji: '🪝', help: 'POST/PUT/etc. to an HTTP endpoint with a templated body.' },
  notify:     { label: 'Notify user',        emoji: '🔔', help: 'Insert an in-app Notification row for a specific user.' },
  set_status: { label: 'Set review status',  emoji: '🏷️', help: 'Update the submission\'s review_status to a fixed value.' },
  set_field:  { label: 'Patch field value',  emoji: '✏️', help: 'Patch a single field in the submission JSON.' },
};

const DEFAULT_CONFIG: Record<ActionType, Record<string, unknown>> = {
  email:      { to: '', subject: '', body: '' },
  webhook:    { url: '', method: 'POST', body: '' },
  notify:     { userId: '', title: '', message: '', notificationType: 'info' },
  set_status: { status: 'reviewed' },
  set_field:  { field: '', value: '' },
};

// ─── Component ───────────────────────────────────────────────────

export default function ActionsPanel() {
  const { activeForm, updateFormSettings } = useFormBuilderStore();

  const actions = activeForm?.settings.actions ?? [];

  const allFields = useMemo<FormField[]>(
    () => (activeForm?.sections.flatMap((s) => s.fields) ?? []).filter((f) => !!f.name),
    [activeForm?.sections],
  );

  if (!activeForm) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        No form selected.
      </div>
    );
  }

  const writeActions = (next: FormAction[]) => updateFormSettings({ actions: next });

  const addAction = (event: ActionEvent) => {
    const newAction: FormAction = {
      id: generateId(),
      event,
      type: 'email',
      name: '',
      config: { ...DEFAULT_CONFIG.email },
    };
    writeActions([...(actions || []), newAction]);
  };

  const removeAction = (id: string) => writeActions(actions.filter((a) => a.id !== id));
  const updateAction = (id: string, patch: Partial<FormAction>) =>
    writeActions(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const updateConfig = (id: string, key: string, value: unknown) =>
    writeActions(actions.map((a) =>
      a.id === id ? { ...a, config: { ...a.config, [key]: value } } : a,
    ));
  const move = (id: string, delta: -1 | 1) => {
    const idx = actions.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const ni = idx + delta;
    if (ni < 0 || ni >= actions.length) return;
    const copy = actions.slice();
    [copy[idx], copy[ni]] = [copy[ni], copy[idx]];
    writeActions(copy);
  };
  const changeType = (id: string, newType: ActionType) => {
    updateAction(id, { type: newType, config: { ...DEFAULT_CONFIG[newType] } });
  };

  // Group actions by event for display
  const byEvent: Record<ActionEvent, FormAction[]> = {
    on_submit: [], on_approve: [], on_reject: [], on_review: [],
  };
  for (const a of actions) byEvent[a.event].push(a);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <p className="font-medium">⚡ Workflow actions</p>
        <p className="mt-1 text-[11px] leading-relaxed">
          Chain of actions that fire when a submission is received, approved,
          or rejected. Every string supports{' '}
          <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">{'{{field_name}}'}</code>
          {' '}bindings. Add an optional condition like{' '}
          <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">{'{{cost}} > 1000'}</code>{' '}
          to gate execution.
        </p>
      </div>

      {(['on_submit', 'on_approve', 'on_reject', 'on_review'] as ActionEvent[]).map((event) => (
        <EventGroup
          key={event}
          event={event}
          actions={byEvent[event]}
          allFields={allFields}
          onAdd={() => addAction(event)}
          onRemove={removeAction}
          onUpdate={updateAction}
          onUpdateConfig={updateConfig}
          onChangeType={changeType}
          onMove={move}
        />
      ))}
    </div>
  );
}

// ─── EventGroup ─────────────────────────────────────────────────

const EventGroup: React.FC<{
  event: ActionEvent;
  actions: FormAction[];
  allFields: FormField[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FormAction>) => void;
  onUpdateConfig: (id: string, key: string, value: unknown) => void;
  onChangeType: (id: string, type: ActionType) => void;
  onMove: (id: string, delta: -1 | 1) => void;
}> = ({ event, actions, allFields, onAdd, onRemove, onUpdate, onUpdateConfig, onChangeType, onMove }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        {EVENT_LABELS[event]}
      </h4>
      <button
        type="button"
        onClick={onAdd}
        className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700 transition"
      >
        + Add
      </button>
    </div>

    {actions.length === 0 && (
      <p className="rounded border border-dashed border-gray-200 p-2 text-center text-[10px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
        No actions configured for this event.
      </p>
    )}

    {actions.map((a, idx) => (
      <ActionCard
        key={a.id}
        action={a}
        index={idx}
        total={actions.length}
        allFields={allFields}
        onRemove={() => onRemove(a.id)}
        onUpdate={(patch) => onUpdate(a.id, patch)}
        onUpdateConfig={(k, v) => onUpdateConfig(a.id, k, v)}
        onChangeType={(t) => onChangeType(a.id, t)}
        onMove={(d) => onMove(a.id, d)}
      />
    ))}
  </div>
);

// ─── ActionCard ─────────────────────────────────────────────────

const ActionCard: React.FC<{
  action: FormAction;
  index: number;
  total: number;
  allFields: FormField[];
  onRemove: () => void;
  onUpdate: (patch: Partial<FormAction>) => void;
  onUpdateConfig: (k: string, v: unknown) => void;
  onChangeType: (t: ActionType) => void;
  onMove: (d: -1 | 1) => void;
}> = ({ action, index, total, allFields, onRemove, onUpdate, onUpdateConfig, onChangeType, onMove }) => {
  const meta = TYPE_LABELS[action.type];

  return (
    <div className="rounded-md border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1.5">
          <span className="text-base">{meta.emoji}</span>
          <select
            value={action.type}
            onChange={(e) => onChangeType(e.target.value as ActionType)}
            className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700"
            aria-label="Action type"
          >
            {(Object.keys(TYPE_LABELS) as ActionType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t].label}</option>
            ))}
          </select>
          <input
            value={action.name ?? ''}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Step name (optional)"
            className="flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="rounded px-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="rounded px-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Move down"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            aria-label="Remove action"
          >
            ✕
          </button>
        </div>
      </div>

      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{meta.help}</p>

      {/* Condition */}
      <div className="mt-2">
        <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          If (optional condition)
        </label>
        <input
          value={action.if ?? ''}
          onChange={(e) => onUpdate({ if: e.target.value || undefined })}
          placeholder="{{cost}} > 1000"
          className="mt-0.5 w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700"
        />
        <BindingsHint fields={allFields} compact />
      </div>

      {/* Type-specific config */}
      <div className="mt-2 space-y-1.5">
        {action.type === 'email' && (
          <EmailConfig action={action} fields={allFields} onUpdate={onUpdateConfig} />
        )}
        {action.type === 'webhook' && (
          <WebhookConfig action={action} fields={allFields} onUpdate={onUpdateConfig} />
        )}
        {action.type === 'notify' && (
          <NotifyConfig action={action} fields={allFields} onUpdate={onUpdateConfig} />
        )}
        {action.type === 'set_status' && (
          <SetStatusConfig action={action} onUpdate={onUpdateConfig} />
        )}
        {action.type === 'set_field' && (
          <SetFieldConfig action={action} fields={allFields} onUpdate={onUpdateConfig} />
        )}
      </div>
    </div>
  );
};

// ─── Type-specific config inputs ────────────────────────────────

const inputCls = 'w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700';

const EmailConfig: React.FC<{
  action: FormAction;
  fields: FormField[];
  onUpdate: (k: string, v: unknown) => void;
}> = ({ action, fields, onUpdate }) => (
  <>
    <input className={inputCls} placeholder="To: {{user.email}}, manager@example.com"
      value={String(action.config.to ?? '')} onChange={(e) => onUpdate('to', e.target.value)} />
    <input className={inputCls} placeholder="Subject: Request {{submission.id}} needs review"
      value={String(action.config.subject ?? '')} onChange={(e) => onUpdate('subject', e.target.value)} />
    <textarea className={inputCls} rows={4} placeholder="Body (HTML allowed). Use {{field_name}} for values."
      value={String(action.config.body ?? '')} onChange={(e) => onUpdate('body', e.target.value)} />
    <BindingsHint fields={fields} compact />
  </>
);

const WebhookConfig: React.FC<{
  action: FormAction;
  fields: FormField[];
  onUpdate: (k: string, v: unknown) => void;
}> = ({ action, fields, onUpdate }) => (
  <>
    <input className={inputCls} placeholder="URL: https://hooks.example.com/{{channel}}"
      value={String(action.config.url ?? '')} onChange={(e) => onUpdate('url', e.target.value)} />
    <div className="flex gap-1">
      <select className={inputCls + ' max-w-[100px]'} value={String(action.config.method ?? 'POST')}
        onChange={(e) => onUpdate('method', e.target.value)}>
        <option>POST</option>
        <option>PUT</option>
        <option>PATCH</option>
        <option>GET</option>
        <option>DELETE</option>
      </select>
      <input className={inputCls} placeholder='Headers JSON: {"X-Token":"…"}'
        value={typeof action.config.headers === 'string' ? action.config.headers : ''}
        onChange={(e) => onUpdate('headers', e.target.value)} />
    </div>
    <textarea className={inputCls} rows={4} placeholder='Body — string or omit for default JSON. Use {{bindings}}.'
      value={String(action.config.body ?? '')} onChange={(e) => onUpdate('body', e.target.value)} />
    <BindingsHint fields={fields} compact />
  </>
);

const NotifyConfig: React.FC<{
  action: FormAction;
  fields: FormField[];
  onUpdate: (k: string, v: unknown) => void;
}> = ({ action, fields, onUpdate }) => (
  <>
    <input className={inputCls} placeholder="User id (e.g. {{requester_user_id}})"
      value={String(action.config.userId ?? '')} onChange={(e) => onUpdate('userId', e.target.value)} />
    <input className={inputCls} placeholder="Title"
      value={String(action.config.title ?? '')} onChange={(e) => onUpdate('title', e.target.value)} />
    <textarea className={inputCls} rows={2} placeholder="Message"
      value={String(action.config.message ?? '')} onChange={(e) => onUpdate('message', e.target.value)} />
    <select className={inputCls} value={String(action.config.notificationType ?? 'info')}
      onChange={(e) => onUpdate('notificationType', e.target.value)}>
      <option value="info">Info</option>
      <option value="success">Success</option>
      <option value="warning">Warning</option>
      <option value="error">Error</option>
    </select>
    <BindingsHint fields={fields} compact />
  </>
);

const SetStatusConfig: React.FC<{
  action: FormAction;
  onUpdate: (k: string, v: unknown) => void;
}> = ({ action, onUpdate }) => (
  <select className={inputCls} value={String(action.config.status ?? 'pending')}
    onChange={(e) => onUpdate('status', e.target.value)}>
    <option value="pending">Pending</option>
    <option value="reviewed">Reviewed</option>
    <option value="approved">Approved</option>
    <option value="rejected">Rejected</option>
    <option value="flagged">Flagged</option>
  </select>
);

const SetFieldConfig: React.FC<{
  action: FormAction;
  fields: FormField[];
  onUpdate: (k: string, v: unknown) => void;
}> = ({ action, fields, onUpdate }) => (
  <>
    <select className={inputCls} value={String(action.config.field ?? '')}
      onChange={(e) => onUpdate('field', e.target.value)}>
      <option value="">— Pick field —</option>
      {fields.map((f) => (
        <option key={f.name} value={f.name}>{f.label || f.name}</option>
      ))}
    </select>
    <input className={inputCls} placeholder="Value (supports {{bindings}})"
      value={String(action.config.value ?? '')} onChange={(e) => onUpdate('value', e.target.value)} />
    <BindingsHint fields={fields} compact />
  </>
);
