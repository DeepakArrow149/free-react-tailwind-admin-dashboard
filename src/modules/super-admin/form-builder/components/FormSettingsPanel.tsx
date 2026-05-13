/**
 * FormSettingsPanel – Configure form-level settings
 * Submit action, success message, layout options, wizard mode, theming.
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { useFormBuilderStore } from '../store';
import type { FormTheme, CrossFieldRule, NotificationConfig, PageSkipRule, ModuleAssignment, FormField } from '../types';
import { generateId, MODULE_TARGETS } from '../types';
import { toast } from 'sonner';
import BindingsHint from './BindingsHint';

export default function FormSettingsPanel() {
  const { activeForm, updateFormMeta, updateFormSettings, updateModuleAssignment } = useFormBuilderStore();
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Debounced module assignment — batches rapid keystrokes into a single API call
  const moduleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedUpdateModuleAssignment = useCallback(
    (assignment: ModuleAssignment) => {
      if (moduleDebounceRef.current) clearTimeout(moduleDebounceRef.current);
      moduleDebounceRef.current = setTimeout(() => {
        updateModuleAssignment(assignment);
      }, 500);
    },
    [updateModuleAssignment],
  );

  if (!activeForm) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        No form selected.
      </div>
    );
  }

  // Flat list of fields for the {{binding}} hint chips and option pickers.
  const allFields = useMemo(
    () =>
      activeForm.sections
        .flatMap((s) => s.fields)
        .filter((f: FormField) => !!f.name && !['heading', 'separator', 'columns'].includes(f.type)),
    [activeForm.sections],
  );

  const { settings } = activeForm;
  const theme: FormTheme = settings.theme || { primaryColor: '#3b82f6', fontFamily: 'default', borderRadius: 'md' };
  const rules = settings.crossFieldRules || [];
  const notif: NotificationConfig = settings.notifications || { emailEnabled: false, webhookEnabled: false };
  const skipRules: PageSkipRule[] = settings.pageSkipRules || [];
  const sections = activeForm.sections;
  const moduleAssignment: ModuleAssignment = activeForm.moduleAssignment || settings.moduleAssignment || {
    targetModule: null,
    menuParentId: null,
    menuLabel: activeForm.name,
    menuIcon: '📋',
    menuSortOrder: 999,
    allowedRoles: [],
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Form Settings
      </h3>

      {/* Status */}
      <FieldGroup label="Status">
        <select
          value={activeForm.status}
          onChange={(e) => updateFormMeta({ status: e.target.value as 'draft' | 'published' | 'archived' })}
          className="input-field"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </FieldGroup>

      {/* Migration governance — entity forms only */}
      {activeForm.kind === 'entity' && activeForm.bindingMode !== 'bound' && (
        <FieldGroup label="Migration governance">
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={activeForm.autoApplyMigrations !== false}
                onChange={(e) => updateFormMeta({ autoApplyMigrations: e.target.checked })}
                className="mt-0.5 rounded border-gray-300"
              />
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Auto-apply schema changes on publish</span>
                <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  When ON, publishing runs the DDL immediately. <strong>Turn OFF</strong> for SOX/audit-controlled deployments — DDL will queue as <span className="font-mono text-amber-600">pending</span> until an admin approves each step from the Migrations tab.
                </p>
              </div>
            </label>
            {activeForm.autoApplyMigrations === false && (
              <div className="rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                ⚠ Manual approval mode is ON. Schema changes won't run until you click <strong>✓ Approve &amp; Apply</strong> in the Migrations tab.
              </div>
            )}
          </div>
        </FieldGroup>
      )}

      {/* Layout */}
      <FieldGroup label="Layout">
        <div className="flex gap-2">
          {(['single-column', 'two-column'] as const).map((layout) => (
            <button
              key={layout}
              type="button"
              onClick={() => updateFormSettings({ layout })}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
                settings.layout === layout
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {layout === 'single-column' ? '⬜ Single' : '▥ Two-Col'}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Wizard Mode */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Multi-Page Wizard
        </h4>
        <label className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.wizardMode || false}
            onChange={(e) => updateFormSettings({ wizardMode: e.target.checked })}
            className="rounded border-gray-300"
          />
          Enable wizard mode (sections = pages)
        </label>
        {settings.wizardMode && (
          <>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showProgressBar !== false}
              onChange={(e) => updateFormSettings({ showProgressBar: e.target.checked })}
              className="rounded border-gray-300"
            />
            Show progress bar
          </label>

          {/* Page Skip Rules */}
          {sections.length > 1 && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Page Skip Logic
              </p>
              <p className="text-[10px] text-gray-400">
                Jump to a specific page based on field values (skips intermediate pages).
              </p>
              {skipRules.map((rule, idx) => (
                <div key={rule.id} className="rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-700/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-gray-500">Rule {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => updateFormSettings({ pageSkipRules: skipRules.filter((_, i) => i !== idx) })}
                      className="text-red-400 hover:text-red-600 text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <select
                      value={rule.fromPage}
                      onChange={(e) => { const u = [...skipRules]; u[idx] = { ...rule, fromPage: Number(e.target.value) }; updateFormSettings({ pageSkipRules: u }); }}
                      className="input-field text-[10px]"
                    >
                      {sections.map((s, si) => <option key={si} value={si}>Page {si + 1}: {s.title}</option>)}
                    </select>
                    <select
                      value={rule.fieldName}
                      onChange={(e) => { const u = [...skipRules]; u[idx] = { ...rule, fieldName: e.target.value }; updateFormSettings({ pageSkipRules: u }); }}
                      className="input-field text-[10px]"
                    >
                      <option value="">Field…</option>
                      {allFields.map((f) => <option key={f.id} value={f.name}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <select
                      value={rule.operator}
                      onChange={(e) => { const u = [...skipRules]; u[idx] = { ...rule, operator: e.target.value as PageSkipRule['operator'] }; updateFormSettings({ pageSkipRules: u }); }}
                      className="input-field text-[10px]"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="not_empty">Not Empty</option>
                      <option value="is_empty">Is Empty</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                    </select>
                    {!['is_empty', 'not_empty'].includes(rule.operator) && (
                      <input
                        type="text"
                        value={rule.value !== undefined ? String(rule.value) : ''}
                        onChange={(e) => { const u = [...skipRules]; u[idx] = { ...rule, value: e.target.value }; updateFormSettings({ pageSkipRules: u }); }}
                        className="input-field text-[10px]"
                        placeholder="Value"
                      />
                    )}
                    <select
                      value={rule.toPage}
                      onChange={(e) => { const u = [...skipRules]; u[idx] = { ...rule, toPage: Number(e.target.value) }; updateFormSettings({ pageSkipRules: u }); }}
                      className="input-field text-[10px]"
                    >
                      {sections.map((s, si) => <option key={si} value={si}>→ Page {si + 1}: {s.title}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  updateFormSettings({ pageSkipRules: [...skipRules, { id: generateId(), fromPage: 0, fieldName: allFields[0]?.name || '', operator: 'equals', value: '', toPage: Math.min(1, sections.length - 1) }] });
                }}
                className="w-full rounded-md border border-dashed border-gray-300 py-1 text-[10px] text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600"
              >
                + Add Skip Rule
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Submit Button Text */}
      <FieldGroup label="Submit Button Text">
        <input
          type="text"
          value={settings.submitButtonText}
          onChange={(e) => updateFormSettings({ submitButtonText: e.target.value })}
          className="input-field"
          placeholder="Submit"
        />
      </FieldGroup>

      {/* Success Message */}
      <FieldGroup label="Success Message">
        <textarea
          value={settings.successMessage}
          onChange={(e) => updateFormSettings({ successMessage: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="Thank you {{name}}! Your reference is {{submission.id}}."
        />
        <BindingsHint
          fields={allFields}
          onInsert={(token) =>
            updateFormSettings({ successMessage: `${settings.successMessage ?? ''}${token}` })
          }
        />
      </FieldGroup>

      {/* Submit Action */}
      <FieldGroup label="Submit Action">
        <select
          value={settings.submitAction}
          onChange={(e) => updateFormSettings({ submitAction: e.target.value as 'store' | 'email' | 'webhook' })}
          className="input-field"
        >
          <option value="store">Store in Database</option>
          <option value="email">Send via Email</option>
          <option value="webhook">Send to Webhook</option>
        </select>
      </FieldGroup>

      {settings.submitAction === 'email' && (
        <FieldGroup label="Notification Email">
          <input
            type="email"
            value={settings.notifyEmail || ''}
            onChange={(e) => updateFormSettings({ notifyEmail: e.target.value })}
            className="input-field"
            placeholder="admin@example.com"
          />
        </FieldGroup>
      )}

      {settings.submitAction === 'webhook' && (
        <FieldGroup label="Webhook URL">
          <input
            type="url"
            value={settings.webhookUrl || ''}
            onChange={(e) => updateFormSettings({ webhookUrl: e.target.value })}
            className="input-field"
            placeholder="https://api.example.com/webhook"
          />
        </FieldGroup>
      )}

      {/* Access Control */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Access Control
        </h4>

        <label className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.requireAuth}
            onChange={(e) => updateFormSettings({ requireAuth: e.target.checked })}
            className="rounded border-gray-300"
          />
          Require authentication
        </label>

        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.allowMultiple}
            onChange={(e) => updateFormSettings({ allowMultiple: e.target.checked })}
            className="rounded border-gray-300"
          />
          Allow multiple submissions
        </label>
      </div>

      {/* Theme / Branding */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Theme & Branding
        </h4>

        {/* Theme Presets */}
        <FieldGroup label="Quick Presets">
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { id: 'modern', name: 'Modern', preset: { primaryColor: '#2563eb', fontFamily: 'sans', borderRadius: 'md' } },
              { id: 'minimal', name: 'Minimal', preset: { primaryColor: '#111827', fontFamily: 'sans', borderRadius: 'sm' } },
              { id: 'vibrant', name: 'Vibrant', preset: { primaryColor: '#a855f7', fontFamily: 'sans', borderRadius: 'lg' } },
              { id: 'classic', name: 'Classic', preset: { primaryColor: '#1e3a8a', fontFamily: 'serif', borderRadius: 'sm' } },
              { id: 'soft', name: 'Soft', preset: { primaryColor: '#10b981', fontFamily: 'sans', borderRadius: 'full' } },
              { id: 'mono', name: 'Mono', preset: { primaryColor: '#374151', fontFamily: 'mono', borderRadius: 'none' } },
            ] as const).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => updateFormSettings({ theme: { ...theme, ...p.preset } as FormTheme })}
                className="group flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-700 transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                title={`Apply ${p.name} preset`}
              >
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-gray-200 dark:ring-gray-600"
                  style={{ backgroundColor: p.preset.primaryColor }}
                  aria-hidden="true"
                />
                {p.name}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Primary Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => updateFormSettings({ theme: { ...theme, primaryColor: e.target.value } })}
              className="h-8 w-10 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
            />
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) => updateFormSettings({ theme: { ...theme, primaryColor: e.target.value } })}
              className="input-field flex-1"
              placeholder="#3b82f6"
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Font Family">
          <select
            value={theme.fontFamily}
            onChange={(e) => updateFormSettings({ theme: { ...theme, fontFamily: e.target.value as FormTheme['fontFamily'] } })}
            className="input-field"
          >
            <option value="default">Default (System)</option>
            <option value="sans">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="mono">Monospace</option>
          </select>
        </FieldGroup>

        <FieldGroup label="Border Radius">
          <select
            value={theme.borderRadius}
            onChange={(e) => updateFormSettings({ theme: { ...theme, borderRadius: e.target.value as FormTheme['borderRadius'] } })}
            className="input-field"
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="full">Full (Pill)</option>
          </select>
        </FieldGroup>

        <FieldGroup label="Custom CSS">
          <textarea
            value={theme.customCss || ''}
            onChange={(e) => updateFormSettings({ theme: { ...theme, customCss: e.target.value } })}
            className="input-field font-mono"
            rows={4}
            placeholder={`.form-container {\n  /* your styles */\n}`}
          />
        </FieldGroup>
      </div>

      {/* Cross-Field Validation Rules */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Cross-Field Rules
        </h4>
        <p className="mb-2 text-[10px] text-gray-400">Validate relationships between fields on submit.</p>
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx] = { ...rule, name: e.target.value };
                    updateFormSettings({ crossFieldRules: updated });
                  }}
                  className="input-field text-xs font-medium"
                  placeholder="Rule name"
                />
                <button
                  type="button"
                  onClick={() => updateFormSettings({ crossFieldRules: rules.filter((_, i) => i !== idx) })}
                  className="ml-2 text-red-400 hover:text-red-600 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <select
                  value={rule.fieldA}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx] = { ...rule, fieldA: e.target.value };
                    updateFormSettings({ crossFieldRules: updated });
                  }}
                  className="input-field text-[10px]"
                >
                  <option value="">Field A…</option>
                  {allFields.map((f) => <option key={f.id} value={f.name}>{f.label}</option>)}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx] = { ...rule, operator: e.target.value as CrossFieldRule['operator'] };
                    updateFormSettings({ crossFieldRules: updated });
                  }}
                  className="input-field text-[10px]"
                >
                  <option value="greater_than">&gt;</option>
                  <option value="less_than">&lt;</option>
                  <option value="greater_or_equal">≥</option>
                  <option value="less_or_equal">≤</option>
                  <option value="equals">=</option>
                  <option value="not_equals">≠</option>
                </select>
                <select
                  value={rule.fieldB}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx] = { ...rule, fieldB: e.target.value };
                    updateFormSettings({ crossFieldRules: updated });
                  }}
                  className="input-field text-[10px]"
                >
                  <option value="">Field B…</option>
                  {allFields.map((f) => <option key={f.id} value={f.name}>{f.label}</option>)}
                </select>
              </div>
              <input
                type="text"
                value={rule.errorMessage}
                onChange={(e) => {
                  const updated = [...rules];
                  updated[idx] = { ...rule, errorMessage: e.target.value };
                  updateFormSettings({ crossFieldRules: updated });
                }}
                className="input-field text-[10px]"
                placeholder="Error message when rule fails"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newRule: CrossFieldRule = {
                id: generateId(),
                name: `Rule ${rules.length + 1}`,
                fieldA: '',
                operator: 'greater_than',
                fieldB: '',
                errorMessage: '',
              };
              updateFormSettings({ crossFieldRules: [...rules, newRule] });
            }}
            className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600"
          >
            + Add Rule
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Notifications
        </h4>

        {/* Email */}
        <label className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={notif.emailEnabled}
            onChange={(e) => updateFormSettings({ notifications: { ...notif, emailEnabled: e.target.checked } })}
            className="rounded border-gray-300"
          />
          Email notification on submission
        </label>
        {notif.emailEnabled && (
          <div className="ml-5 space-y-2 mb-3">
            <FieldGroup label="To (comma-separated)">
              <input
                type="text"
                value={notif.emailTo || ''}
                onChange={(e) => updateFormSettings({ notifications: { ...notif, emailTo: e.target.value } })}
                className="input-field"
                placeholder="admin@example.com, manager@example.com"
              />
            </FieldGroup>
            <FieldGroup label="Subject">
              <input
                type="text"
                value={notif.emailSubject || ''}
                onChange={(e) => updateFormSettings({ notifications: { ...notif, emailSubject: e.target.value } })}
                className="input-field"
                placeholder="New submission: {{form.name}}"
              />
              <BindingsHint
                fields={allFields}
                onInsert={(token) =>
                  updateFormSettings({
                    notifications: { ...notif, emailSubject: `${notif.emailSubject ?? ''}${token}` },
                  })
                }
              />
            </FieldGroup>
            <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={notif.emailIncludeData !== false}
                onChange={(e) => updateFormSettings({ notifications: { ...notif, emailIncludeData: e.target.checked } })}
                className="rounded border-gray-300"
              />
              Include submitted data in email
            </label>
          </div>
        )}

        {/* Webhook */}
        <label className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={notif.webhookEnabled}
            onChange={(e) => updateFormSettings({ notifications: { ...notif, webhookEnabled: e.target.checked } })}
            className="rounded border-gray-300"
          />
          Webhook notification on submission
        </label>
        {notif.webhookEnabled && (
          <div className="ml-5 space-y-2 mb-3">
            <FieldGroup label="Webhook URL">
              <input
                type="url"
                value={notif.webhookUrl || ''}
                onChange={(e) => updateFormSettings({ notifications: { ...notif, webhookUrl: e.target.value } })}
                className="input-field"
                placeholder="https://hooks.example.com/{{channel}}"
              />
              <BindingsHint
                fields={allFields}
                onInsert={(token) =>
                  updateFormSettings({
                    notifications: { ...notif, webhookUrl: `${notif.webhookUrl ?? ''}${token}` },
                  })
                }
              />
            </FieldGroup>
            <FieldGroup label="Method">
              <select
                value={notif.webhookMethod || 'POST'}
                onChange={(e) => updateFormSettings({ notifications: { ...notif, webhookMethod: e.target.value as 'POST' | 'PUT' } })}
                className="input-field"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Headers (JSON)">
              <textarea
                value={notif.webhookHeaders || ''}
                onChange={(e) => updateFormSettings({ notifications: { ...notif, webhookHeaders: e.target.value } })}
                className="input-field font-mono"
                rows={2}
                placeholder='{"Authorization": "Bearer xxx"}'
              />
            </FieldGroup>
            {/* Webhook Test Button */}
            <button
              type="button"
              disabled={!notif.webhookUrl || testingWebhook}
              onClick={async () => {
                if (!notif.webhookUrl) return;
                setTestingWebhook(true);
                try {
                  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                  if (notif.webhookHeaders) {
                    try { Object.assign(headers, JSON.parse(notif.webhookHeaders)); } catch { /* ignore */ }
                  }
                  const resp = await fetch(notif.webhookUrl, {
                    method: notif.webhookMethod || 'POST',
                    headers,
                    body: JSON.stringify({
                      event: 'test',
                      formId: activeForm.id,
                      formName: activeForm.name,
                      timestamp: new Date().toISOString(),
                      data: { _test: true, message: 'Test webhook from STITCH Form Builder' },
                    }),
                  });
                  if (resp.ok) {
                    toast.success(`Webhook test sent! Status: ${resp.status}`);
                  } else {
                    toast.error(`Webhook returned ${resp.status}: ${resp.statusText}`);
                  }
                } catch (err) {
                  toast.error(`Webhook test failed: ${err instanceof Error ? err.message : 'Network error'}`);
                } finally {
                  setTestingWebhook(false);
                }
              }}
              className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
            >
              {testingWebhook ? '⏳ Sending…' : '🧪 Send Test'}
            </button>
          </div>
        )}
      </div>

      {/* Form Scheduling */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Scheduling & Limits
        </h4>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <FieldGroup label="Open Date">
            <input
              type="datetime-local"
              value={settings.openDate || ''}
              onChange={(e) => updateFormSettings({ openDate: e.target.value || undefined })}
              className="input-field"
            />
          </FieldGroup>
          <FieldGroup label="Close Date">
            <input
              type="datetime-local"
              value={settings.closeDate || ''}
              onChange={(e) => updateFormSettings({ closeDate: e.target.value || undefined })}
              className="input-field"
            />
          </FieldGroup>
        </div>
        <FieldGroup label="Max Submissions (0 = unlimited)">
          <input
            type="number"
            value={settings.maxSubmissions ?? 0}
            onChange={(e) => updateFormSettings({ maxSubmissions: Number(e.target.value) })}
            className="input-field"
            min={0}
          />
        </FieldGroup>
      </div>

      {/* Share & Access Settings */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Share & Access
        </h4>

        <FieldGroup label="Password Protection (leave empty for none)">
          <input
            type="text"
            value={settings.accessPassword || ''}
            onChange={(e) => updateFormSettings({ accessPassword: e.target.value || undefined })}
            className="input-field font-mono"
            placeholder="Optional password for form access"
          />
        </FieldGroup>

        <FieldGroup label="Redirect URL (after submission)">
          <input
            type="url"
            value={settings.redirectUrl || ''}
            onChange={(e) => updateFormSettings({ redirectUrl: e.target.value || undefined })}
            className="input-field"
            placeholder="https://example.com/thank-you"
          />
          <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
            Leave empty to show the success message instead
          </p>
        </FieldGroup>

        <FieldGroup label="Closed Form Message">
          <textarea
            value={settings.closedMessage || ''}
            onChange={(e) => updateFormSettings({ closedMessage: e.target.value || undefined })}
            className="input-field"
            rows={2}
            placeholder="This form is no longer accepting responses."
          />
        </FieldGroup>
      </div>

      {/* ── Module Integration ── */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          🔗 Module Integration
        </h4>
        <p className="mb-3 text-[10px] text-gray-400 dark:text-gray-500">
          Assign this form to an ERP module so it appears in the sidebar navigation.
        </p>

        <FieldGroup label="Target Module">
          <select
            value={moduleAssignment.targetModule || ''}
            onChange={(e) => {
              const mod = e.target.value || null;
              const target = MODULE_TARGETS.find((m) => m.id === mod);
              updateModuleAssignment({
                targetModule: mod,
                menuParentId: mod === 'custom' ? null : mod,
                menuLabel: moduleAssignment.menuLabel || activeForm.name,
                menuIcon: target?.icon || '📋',
                menuSortOrder: moduleAssignment.menuSortOrder,
                allowedRoles: moduleAssignment.allowedRoles,
                customModuleName: mod === 'custom' ? moduleAssignment.customModuleName : undefined,
              });
            }}
            className="input-field"
          >
            <option value="">— Not assigned (standalone) —</option>
            {MODULE_TARGETS.map((m) => (
              <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
            ))}
          </select>
        </FieldGroup>

        {moduleAssignment.targetModule === 'custom' && (
          <FieldGroup label="Custom Module Name">
            <input
              type="text"
              value={moduleAssignment.customModuleName || ''}
              onChange={(e) => debouncedUpdateModuleAssignment({ ...moduleAssignment, customModuleName: e.target.value })}
              className="input-field"
              placeholder="e.g. Lab Tests, Custom Reports"
            />
          </FieldGroup>
        )}

        {moduleAssignment.targetModule && (
          <>
            <FieldGroup label="Sidebar Label">
              <input
                type="text"
                value={moduleAssignment.menuLabel || ''}
                onChange={(e) => debouncedUpdateModuleAssignment({ ...moduleAssignment, menuLabel: e.target.value })}
                className="input-field"
                placeholder={activeForm.name}
              />
            </FieldGroup>

            <FieldGroup label="Icon (emoji)">
              <input
                type="text"
                value={moduleAssignment.menuIcon || ''}
                onChange={(e) => debouncedUpdateModuleAssignment({ ...moduleAssignment, menuIcon: e.target.value.slice(0, 4) })}
                className="input-field w-16"
                maxLength={4}
                placeholder="📋"
              />
            </FieldGroup>

            <FieldGroup label="Sort Order">
              <input
                type="number"
                value={moduleAssignment.menuSortOrder ?? 999}
                onChange={(e) => debouncedUpdateModuleAssignment({ ...moduleAssignment, menuSortOrder: Number(e.target.value) })}
                className="input-field w-24"
                min={0}
                max={9999}
              />
            </FieldGroup>

            <FieldGroup label="Allowed Roles (comma-separated, empty = all)">
              <input
                type="text"
                value={(moduleAssignment.allowedRoles || []).join(', ')}
                onChange={(e) => {
                  const roles = e.target.value.split(',').map((r) => r.trim()).filter(Boolean);
                  debouncedUpdateModuleAssignment({ ...moduleAssignment, allowedRoles: roles });
                }}
                className="input-field"
                placeholder="e.g. admin, quality_manager"
              />
            </FieldGroup>

            {/* Preview */}
            <div className="mt-2 rounded-md border border-dashed border-blue-300 bg-blue-50/50 p-2 dark:border-blue-700 dark:bg-blue-900/20">
              <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">
                📎 Sidebar Preview
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                <span>{moduleAssignment.menuIcon || '📋'}</span>
                <span>{moduleAssignment.menuLabel || activeForm.name}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Will appear under: <strong>{MODULE_TARGETS.find((m) => m.id === moduleAssignment.targetModule)?.label || 'Custom'}</strong>
                {' → '} <code className="text-[9px]">/app/forms/{activeForm.slug}</code>
              </p>
            </div>
          </>
        )}
      </div>

      {/* CSS */}
      <style>{`
        .input-field {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #d1d5db;
          padding: 0.375rem 0.625rem;
          font-size: 0.75rem;
          background: white;
          color: #374151;
          transition: border-color 0.15s;
          resize: vertical;
        }
        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }
        .dark .input-field {
          background: #1f2937;
          border-color: #4b5563;
          color: #d1d5db;
        }
      `}</style>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}
