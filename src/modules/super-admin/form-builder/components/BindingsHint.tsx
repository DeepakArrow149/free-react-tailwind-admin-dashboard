/**
 * BindingsHint — small UI affordance shown under text inputs that support
 * `{{field}}` mustache bindings (email subject, body, webhook URL, success
 * message, etc.). Lists the available bindings as click-to-insert chips.
 *
 * Inspired by Appsmith's `{{ Form1.field }}` autocomplete — but kept
 * intentionally minimal: a flat list, no JS evaluator preview, no live
 * value resolution. Click a chip → calls `onInsert(token)` so the parent
 * can paste the binding into the active input at the cursor.
 */
import React from 'react';
import type { FormField } from '../types';

const SYSTEM_BINDINGS: Array<{ token: string; description: string }> = [
  { token: '{{form.name}}',     description: 'Form name' },
  { token: '{{form.id}}',       description: 'Form id' },
  { token: '{{submission.id}}', description: 'Submission id' },
  { token: '{{user.name}}',     description: 'Submitter name' },
  { token: '{{user.email}}',    description: 'Submitter email' },
  { token: '{{user.id}}',       description: 'Submitter user id' },
  { token: '{{_meta.submitted_at}}', description: 'Submission time (ISO)' },
];

export interface BindingsHintProps {
  /** Form fields available as `{{field_name}}` */
  fields: FormField[];
  /** Optional click handler — when provided, chips become clickable */
  onInsert?: (token: string) => void;
  /** Limit how many field chips to show before collapsing into a "+N more" */
  maxFieldChips?: number;
  /** Compact mode: only shows fields, hides the system row */
  compact?: boolean;
}

export const BindingsHint: React.FC<BindingsHintProps> = ({
  fields,
  onInsert,
  maxFieldChips = 8,
  compact = false,
}) => {
  const fieldChips = fields
    .filter((f) => !!f.name)
    .slice(0, maxFieldChips)
    .map((f) => ({ token: `{{${f.name}}}`, description: f.label || f.name }));
  const overflow = Math.max(0, fields.length - maxFieldChips);

  return (
    <div className="mt-1 space-y-1 text-[10px] text-gray-500 dark:text-gray-400">
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 inline-flex h-4 items-center rounded bg-gray-100 px-1.5 text-[9px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          Bindings
        </span>
        <span className="leading-relaxed">
          Use <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[9px] text-gray-700 dark:bg-gray-700 dark:text-gray-300">{'{{field_name}}'}</code>
          {' '}to insert any submitted value.
        </span>
      </div>

      {fieldChips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fieldChips.map((c) => (
            <Chip key={c.token} token={c.token} title={c.description} onClick={onInsert} />
          ))}
          {overflow > 0 && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              +{overflow} more
            </span>
          )}
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-1">
          {SYSTEM_BINDINGS.map((c) => (
            <Chip
              key={c.token}
              token={c.token}
              title={c.description}
              onClick={onInsert}
              variant="system"
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Chip: React.FC<{
  token: string;
  title: string;
  onClick?: (token: string) => void;
  variant?: 'field' | 'system';
}> = ({ token, title, onClick, variant = 'field' }) => {
  const base = 'rounded px-1.5 py-0.5 font-mono text-[9px] transition';
  const fieldCls = 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900';
  const sysCls = 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900';
  const cls = `${base} ${variant === 'system' ? sysCls : fieldCls} ${onClick ? 'cursor-pointer' : 'cursor-default'}`;

  if (!onClick) {
    return (
      <span className={cls} title={title}>
        {token}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onClick(token)}
      className={cls}
      title={`Insert — ${title}`}
    >
      {token}
    </button>
  );
};

export default BindingsHint;
