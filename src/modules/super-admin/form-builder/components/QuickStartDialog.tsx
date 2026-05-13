/**
 * Quick-Start Dialog
 *
 * Opened from "+ New Form" — lets the user pick a starter:
 *  - Blank form (default)
 *  - Common patterns: Contact, Feedback, Registration, RSVP, Application, Survey
 *  - Or "Generate with AI" (delegates to AI assistant)
 *
 * Each preset injects a `Partial<FormDefinition>` (sections + fields)
 * into store.createForm(starter). No backend round-trip required.
 */
import { useEffect, useState } from 'react';
import { useFormBuilderStore } from '../store';
import { useAiChatStore } from '../aiChatStore';
import type { FormDefinition, FormField, FormKind, FormSection } from '../types';
import { generateId, createDefaultField, FORM_KIND_INFO } from '../types';
import { fetchErpMasters, type ErpMaster } from '../../api/formBuilderApi';
import { toast } from 'sonner';

interface QuickStartDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Preset {
  id: string;
  name: string;
  icon: string;
  description: string;
  build: () => Partial<FormDefinition>;
}

function field(type: Parameters<typeof createDefaultField>[0], overrides: Partial<FormField>): FormField {
  return { ...createDefaultField(type), ...overrides };
}
function section(title: string, fields: FormField[]): FormSection {
  return { id: generateId(), title, fields, collapsed: false };
}

/** Convert Prisma model PascalCase → likely snake_case SQL table name. */
function inferTableName(modelName: string): string {
  return modelName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .toLowerCase();
}

const PRESETS: Preset[] = [
  {
    id: 'contact',
    name: 'Contact Form',
    icon: '✉️',
    description: 'Name, email, message — classic contact request.',
    build: () => ({
      name: 'Contact Us',
      description: 'Get in touch with our team.',
      sections: [
        section('Your details', [
          field('text', { name: 'full_name', label: 'Full Name', validation: { required: true, maxLength: 100 } }),
          field('email', { name: 'email', label: 'Email', validation: { required: true } }),
          field('phone', { name: 'phone', label: 'Phone (optional)' }),
          field('select', {
            name: 'topic',
            label: 'Topic',
            options: [
              { label: 'General inquiry', value: 'general' },
              { label: 'Sales', value: 'sales' },
              { label: 'Support', value: 'support' },
            ],
          }),
          field('textarea', { name: 'message', label: 'Message', validation: { required: true, minLength: 10 } }),
        ]),
      ],
    }),
  },
  {
    id: 'feedback',
    name: 'Feedback Survey',
    icon: '⭐',
    description: 'Rating, NPS-style, with comment box.',
    build: () => ({
      name: 'Customer Feedback',
      description: 'We value your feedback — it takes less than a minute.',
      sections: [
        section('Tell us about your experience', [
          field('rating', { name: 'overall_rating', label: 'Overall rating', validation: { required: true, max: 5 } }),
          field('radio', {
            name: 'recommend',
            label: 'Would you recommend us?',
            options: [
              { label: 'Definitely', value: 'def' },
              { label: 'Maybe', value: 'maybe' },
              { label: 'No', value: 'no' },
            ],
          }),
          field('checkbox-group', {
            name: 'liked',
            label: 'What did you like? (select all that apply)',
            options: [
              { label: 'Product quality', value: 'quality' },
              { label: 'Customer service', value: 'service' },
              { label: 'Pricing', value: 'pricing' },
              { label: 'Delivery speed', value: 'delivery' },
            ],
          }),
          field('textarea', { name: 'comments', label: 'Anything else you would like to share?' }),
        ]),
      ],
    }),
  },
  {
    id: 'registration',
    name: 'Registration',
    icon: '👤',
    description: 'New user signup with name, email, password.',
    build: () => ({
      name: 'Sign Up',
      description: 'Create your account.',
      sections: [
        section('Account', [
          field('text', { name: 'first_name', label: 'First Name', width: 'half', validation: { required: true } }),
          field('text', { name: 'last_name', label: 'Last Name', width: 'half', validation: { required: true } }),
          field('email', { name: 'email', label: 'Email', validation: { required: true } }),
          field('password', { name: 'password', label: 'Password', validation: { required: true, minLength: 8 } }),
          field('password', { name: 'confirm_password', label: 'Confirm Password', validation: { required: true, minLength: 8 } }),
        ]),
        section('Profile (optional)', [
          field('phone', { name: 'phone', label: 'Phone' }),
          field('date', { name: 'birthday', label: 'Birthday' }),
        ]),
      ],
    }),
  },
  {
    id: 'rsvp',
    name: 'RSVP',
    icon: '🎉',
    description: 'Event RSVP with attending toggle and plus-one count.',
    build: () => ({
      name: 'RSVP',
      description: 'Please respond by the date in the invitation.',
      sections: [
        section('Your response', [
          field('text', { name: 'name', label: 'Name', validation: { required: true } }),
          field('email', { name: 'email', label: 'Email', validation: { required: true } }),
          field('switch', { name: 'attending', label: 'Attending?', defaultValue: true }),
          field('number', { name: 'plus_ones', label: 'How many guests?', defaultValue: 0, validation: { min: 0, max: 10 } }),
          field('textarea', { name: 'dietary_notes', label: 'Dietary restrictions or notes' }),
        ]),
      ],
    }),
  },
  {
    id: 'order',
    name: 'Order Form',
    icon: '🛒',
    description: 'Items repeater with quantity + auto-calculated total.',
    build: () => ({
      name: 'Order Form',
      description: 'Place a new order.',
      sections: [
        section('Items', [
          field('repeater', {
            name: 'order_lines',
            label: 'Items',
            repeaterConfig: {
              addButtonLabel: '+ Add line',
              minRows: 1,
              maxRows: 0,
              subFields: [
                field('text', { name: 'item', label: 'Item', width: 'half', validation: { required: true } }),
                field('number', { name: 'quantity', label: 'Qty', width: 'half', validation: { required: true, min: 1 } }),
                field('currency', { name: 'unit_price', label: 'Unit price' }),
              ],
            },
          }),
          field('calculated', {
            name: 'subtotal',
            label: 'Subtotal',
            calculated: { formula: 'SUM({order_lines.quantity})', outputFormat: 'currency', precision: 2 },
            readOnly: true,
          }),
        ]),
        section('Shipping', [
          field('text', { name: 'name', label: 'Recipient name', validation: { required: true } }),
          field('textarea', { name: 'address', label: 'Address', validation: { required: true } }),
        ]),
      ],
    }),
  },
  {
    id: 'application',
    name: 'Job Application',
    icon: '📝',
    description: 'Contact, resume upload, references.',
    build: () => ({
      name: 'Job Application',
      description: 'Apply for an open role.',
      sections: [
        section('About you', [
          field('text', { name: 'full_name', label: 'Full Name', validation: { required: true } }),
          field('email', { name: 'email', label: 'Email', validation: { required: true } }),
          field('phone', { name: 'phone', label: 'Phone', validation: { required: true } }),
          field('url', { name: 'linkedin', label: 'LinkedIn (optional)' }),
        ]),
        section('Position', [
          field('select', {
            name: 'role',
            label: 'Role',
            validation: { required: true },
            options: [
              { label: 'Software Engineer', value: 'eng' },
              { label: 'Product Manager', value: 'pm' },
              { label: 'Designer', value: 'design' },
              { label: 'Other', value: 'other' },
            ],
          }),
          field('file', { name: 'resume', label: 'Resume (PDF)', validation: { required: true, fileTypes: ['application/pdf'] } }),
          field('textarea', { name: 'cover_letter', label: 'Cover letter / why are you a fit?' }),
        ]),
      ],
    }),
  },
];

type Step = 'kind' | 'entity-mode' | 'pick-master' | 'template';

export default function QuickStartDialog({ open, onClose }: QuickStartDialogProps) {
  const { createForm } = useFormBuilderStore();
  const { toggleChat: toggleAi } = useAiChatStore();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('kind');
  const [kind, setKind] = useState<FormKind>('process');
  const [bindingMode, setBindingMode] = useState<'standalone' | 'bound'>('standalone');
  const [boundMaster, setBoundMaster] = useState<ErpMaster | null>(null);
  const [erpCatalog, setErpCatalog] = useState<Record<string, ErpMaster[]>>({});
  const [erpLoading, setErpLoading] = useState(false);
  const [erpSearch, setErpSearch] = useState('');

  // Load ERP catalog when user reaches the picker
  useEffect(() => {
    if (step !== 'pick-master') return;
    setErpLoading(true);
    fetchErpMasters(erpSearch || undefined)
      .then((c) => setErpCatalog(c.grouped))
      .catch(() => toast.error('Could not load ERP master catalog'))
      .finally(() => setErpLoading(false));
  }, [step, erpSearch]);

  if (!open) return null;

  const handleClose = () => {
    setStep('kind');
    setKind('process');
    setBindingMode('standalone');
    setBoundMaster(null);
    setErpSearch('');
    onClose();
  };

  const handlePick = (preset: Preset | null) => {
    const baseStarter: Partial<FormDefinition> = preset ? preset.build() : {};
    const starter: Partial<FormDefinition> = {
      ...baseStarter,
      kind,
      bindingMode,
    };
    if (bindingMode === 'bound' && boundMaster) {
      starter.boundModel = boundMaster.model;
      starter.boundTableName = inferTableName(boundMaster.model);
      starter.boundValueField = boundMaster.valueField;
      starter.boundDisplayField = boundMaster.displayField;
      // Preset name to the master's label so the form is unambiguous
      if (!preset && !starter.name) {
        starter.name = boundMaster.label + ' (Custom UI)';
      }
    }
    createForm(starter);
    handleClose();
  };

  const showKindStep = step === 'kind';
  const showEntityModeStep = step === 'entity-mode';
  const showPickMasterStep = step === 'pick-master';
  const showTemplateStep = step === 'template';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a starter for your new form"
      onClick={handleClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {showKindStep ? 'What kind of form?' : 'Start a new ' + (kind === 'entity' ? 'master' : 'process form')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showKindStep
                ? 'Two-Track Form Builder — pick the right architecture for your data.'
                : `Storage: ${FORM_KIND_INFO[kind].storage}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Step 1 — Kind picker */}
        {showKindStep && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(['process', 'entity'] as const).map((k) => {
              const info = FORM_KIND_INFO[k];
              const isEntity = k === 'entity';
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k);
                    if (k === 'entity') setStep('entity-mode');
                    else setStep('template');
                  }}
                  className={`group flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition hover:border-blue-400 hover:shadow-md ${
                    isEntity
                      ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 dark:border-emerald-700 dark:from-emerald-900/15 dark:to-teal-900/10'
                      : 'border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 dark:border-blue-700 dark:from-blue-900/15 dark:to-indigo-900/10'
                  }`}
                >
                  <span className="text-3xl" aria-hidden="true">{info.icon}</span>
                  <div>
                    <p className={`text-base font-bold ${isEntity ? 'text-emerald-800 dark:text-emerald-300' : 'text-blue-800 dark:text-blue-300'}`}>
                      {info.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {info.description}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                      Storage: {info.storage}
                    </p>
                  </div>
                  <div className="mt-1 w-full">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Examples</p>
                    {isEntity ? (
                      <p className="text-[11px] text-gray-600 dark:text-gray-300">Buyer / Supplier / Material / Style / Size masters</p>
                    ) : (
                      <p className="text-[11px] text-gray-600 dark:text-gray-300">QC checklist, NCR, audit, survey, request flow</p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    Pick this <span aria-hidden="true">→</span>
                  </div>
                </button>
              );
            })}
            <div className="sm:col-span-2 mt-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <strong>Decision tip:</strong> if other ERP modules need to JOIN to this data, choose <strong>Entity</strong>. If only humans + other forms read it, choose <strong>Process</strong>. You can convert later but it requires a one-time migration.
            </div>
          </div>
        )}

        {/* Step 2A — Entity Mode picker (only when kind='entity') */}
        {showEntityModeStep && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Connect to existing — RECOMMENDED */}
              <button
                type="button"
                onClick={() => { setBindingMode('bound'); setStep('pick-master'); }}
                className="group relative flex flex-col items-start gap-3 rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 text-left ring-2 ring-emerald-200 transition hover:border-emerald-400 hover:shadow-lg dark:border-emerald-700 dark:from-emerald-900/20 dark:to-teal-900/15 dark:ring-emerald-900/40"
              >
                <span className="absolute right-3 top-3 rounded-full bg-emerald-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-900 dark:bg-emerald-700 dark:text-emerald-100">
                  recommended
                </span>
                <span className="text-3xl" aria-hidden="true">🔗</span>
                <div>
                  <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">Connect to existing master</p>
                  <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                    Build a custom UI on top of an ERP master that already exists (Buyer, Supplier, Material, Style, …).
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                    <li>✓ Records appear in the existing module too</li>
                    <li>✓ No duplicate tables, no data drift</li>
                    <li>✓ Existing FKs &amp; reports keep working</li>
                  </ul>
                </div>
              </button>

              {/* Create new — for genuinely new masters */}
              <button
                type="button"
                onClick={() => { setBindingMode('standalone'); setStep('template'); }}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-blue-200 bg-white p-5 text-left transition hover:border-blue-400 hover:shadow-md dark:border-blue-700 dark:bg-gray-700"
              >
                <span className="text-3xl" aria-hidden="true">🆕</span>
                <div>
                  <p className="text-base font-bold text-blue-800 dark:text-blue-300">Create a new master</p>
                  <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                    For a master that doesn't exist anywhere else. Generates a fresh DB table.
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                    <li>✓ Table: <code className="rounded bg-gray-100 px-1 font-mono dark:bg-gray-800">entity_&lt;slug&gt;</code></li>
                    <li>✓ Full schema control</li>
                    <li>⚠ Won't appear in existing modules unless they query it</li>
                  </ul>
                </div>
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <button type="button" onClick={() => setStep('kind')} className="text-blue-600 hover:underline dark:text-blue-400">
                ← Back
              </button>
              <p className="text-gray-500 dark:text-gray-400">
                <strong>Tip:</strong> If your data needs to be JOIN-able from Sales / Production / Reports, pick "Connect to existing".
              </p>
            </div>
          </div>
        )}

        {/* Step 2B — Master picker (after picking 'bound') */}
        {showPickMasterStep && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                value={erpSearch}
                onChange={(e) => setErpSearch(e.target.value)}
                placeholder="Search masters (buyer, material, color, …)"
                className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
              <button type="button" onClick={() => setStep('entity-mode')} className="rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                ← Back
              </button>
            </div>
            {erpLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : Object.keys(erpCatalog).length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">No masters found{erpSearch ? ' — try a different search' : ''}.</p>
            ) : (
              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                {Object.entries(erpCatalog).sort().map(([moduleName, masters]) => (
                  <div key={moduleName}>
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {moduleName}
                    </h3>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {masters.map((m) => (
                        <button
                          key={m.model}
                          type="button"
                          onClick={() => { setBoundMaster(m); setStep('template'); }}
                          className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/15"
                        >
                          <span className="mt-0.5 text-base" aria-hidden="true">🗂</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">{m.label}</p>
                            <p className="truncate font-mono text-[10px] text-gray-500 dark:text-gray-400">
                              {m.model} · {Object.keys(m.columns).length} columns
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Template picker (existing UI) */}
        {showTemplateStep && (
          <>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <button
            type="button"
            onClick={() => setStep(kind === 'entity' ? 'entity-mode' : 'kind')}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back
          </button>
          <span aria-hidden="true">·</span>
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {FORM_KIND_INFO[kind].icon} {FORM_KIND_INFO[kind].label}
          </span>
          {bindingMode === 'bound' && boundMaster && (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              🔗 bound to {boundMaster.label}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Blank */}
          <button
            type="button"
            onClick={() => handlePick(null)}
            onMouseEnter={() => setHoverId('blank')}
            onMouseLeave={() => setHoverId(null)}
            className={`group flex flex-col items-start gap-2 rounded-xl border-2 border-dashed p-4 text-left transition ${
              hoverId === 'blank'
                ? 'border-blue-400 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-600 dark:bg-gray-700'
            }`}
          >
            <span className="text-2xl" aria-hidden="true">📄</span>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">Blank form</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Start from scratch with one empty section.</p>
            </div>
          </button>

          {/* AI */}
          <button
            type="button"
            onClick={() => { onClose(); toggleAi(); }}
            className="group flex flex-col items-start gap-2 rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 text-left transition hover:border-violet-400 hover:shadow-md dark:border-violet-700 dark:from-violet-900/20 dark:to-fuchsia-900/20"
          >
            <span className="text-2xl" aria-hidden="true">✨</span>
            <div>
              <p className="font-semibold text-violet-800 dark:text-violet-200">Generate with AI</p>
              <p className="mt-0.5 text-xs text-violet-600 dark:text-violet-400">Describe what you need — I'll draft it.</p>
            </div>
          </button>

          {/* Presets */}
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePick(p)}
              onMouseEnter={() => setHoverId(p.id)}
              onMouseLeave={() => setHoverId(null)}
              className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
                hoverId === p.id
                  ? 'border-blue-400 bg-blue-50/40 shadow-md dark:border-blue-500 dark:bg-blue-900/20'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <span className="text-2xl" aria-hidden="true">{p.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{p.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
          </>
        )}

        <div className="mt-5 border-t border-gray-100 pt-3 text-center dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
