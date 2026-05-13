/**
 * No-Code Form Builder – Type Definitions
 * Inspired by Odoo Studio's form builder architecture.
 *
 * JSON-based form schema that defines field layout, validation,
 * and rendering configuration for dynamic form generation.
 */

// ─── Module Bridge ─ Assign forms to ERP modules ───────────

export interface ModuleAssignment {
  /** Target ERP module: 'master', 'quality', etc. or 'custom' */
  targetModule: string | null;
  /** Parent menu item id from menuConfig, e.g. 'master', 'quality' */
  menuParentId: string | null;
  /** Display label in the sidebar */
  menuLabel: string;
  /** Emoji icon */
  menuIcon: string;
  /** Sort order within the parent menu */
  menuSortOrder: number;
  /** Roles allowed to see this form (empty = all roles) */
  allowedRoles: string[];
  /** Custom module group name (when targetModule = 'custom') */
  customModuleName?: string;
}

/** Pre-defined ERP modules a form can be assigned to */
export const MODULE_TARGETS = [
  { id: 'master', label: 'Master Data', icon: '📊' },
  { id: 'merchandising', label: 'Merchandising', icon: '👔' },
  { id: 'costing', label: 'Costing', icon: '💰' },
  { id: 'planning', label: 'Planning', icon: '📅' },
  { id: 'procurement', label: 'Procurement', icon: '🛒' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'production', label: 'Production', icon: '⚙️' },
  { id: 'quality', label: 'Quality', icon: '✅' },
  { id: 'packing-export', label: 'Packing & Export', icon: '�' },
  { id: 'finance', label: 'Finance', icon: '💵' },
  { id: 'hrm', label: 'HRM', icon: '👥' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'custom', label: 'Custom Module', icon: '✨' },
] as const;

// ─── Field Types ─────────────────────────────────────────────
// Import & re-export from shared-types for single source of truth
import type { FieldType, FormKind, FormBindingMode, LookupSourceKind } from '@erp/shared-types';
export type { FieldType, FormKind, FormBindingMode, LookupSourceKind };

/**
 * Two-Track Form Builder kind:
 *   • 'process' — schemaless JSON storage (audit forms, NCRs, surveys)
 *   • 'entity'  — first-class master with a real per-form table
 */
export const FORM_KIND_INFO: Record<FormKind, { label: string; icon: string; description: string; storage: string }> = {
  process: {
    label: 'Process Form',
    icon: '📝',
    description: 'For workflows, audits, NCRs, surveys — fields evolve fast, no migrations.',
    storage: 'JSON (form_submissions)',
  },
  entity: {
    label: 'Entity / Master',
    icon: '🗂️',
    description: 'For Buyer / Material / Style masters — real DB table, FKs, fast queries.',
    storage: 'Real table (entity_<slug>)',
  },
};

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

// ─── Conditional Visibility ──────────────────────────────────

export interface ConditionalVisibility {
  /** Field name to watch */
  dependsOn: string;
  /** Operator for comparison */
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty' | 'greater_than' | 'less_than';
  /** Value to compare against (not used for is_empty / not_empty) */
  value?: string | number | boolean;
}

// ─── Conditional Section Visibility ──────────────────────────

export interface SectionVisibility {
  /** Field name to watch (from any section) */
  dependsOn: string;
  /** Operator for comparison */
  operator: ConditionalVisibility['operator'];
  /** Value to compare against */
  value?: string | number | boolean;
}

// ─── Calculated / Computed Fields ────────────────────────────

export interface CalculatedField {
  /** Formula expression, e.g. '{qty} * {price}' */
  formula: string;
  /** Output format: 'number' | 'text' | 'currency' */
  outputFormat?: 'number' | 'text' | 'currency' | 'percentage';
  /** Decimal precision for number/currency */
  precision?: number;
}

// ─── Cross-Field Validation Rules ────────────────────────────

export interface CrossFieldRule {
  /** Unique rule ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Left-hand field name */
  fieldA: string;
  /** Operator */
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal';
  /** Right-hand field name */
  fieldB: string;
  /** Error message shown when rule fails */
  errorMessage: string;
}

// ─── Wizard Page Skip Rules ──────────────────────────────────

export interface PageSkipRule {
  /** Unique rule ID */
  id: string;
  /** Source section index (the page where the condition is evaluated) */
  fromPage: number;
  /** Field name to check */
  fieldName: string;
  /** Comparison operator */
  operator: ConditionalVisibility['operator'];
  /** Value to compare */
  value?: string | number | boolean;
  /** Target section index to jump to (skips intermediate pages) */
  toPage: number;
}

// ─── Email / Webhook Notification Config ─────────────────────

export interface NotificationConfig {
  /** Send email on submission? */
  emailEnabled: boolean;
  /** Email recipients (comma-separated) */
  emailTo?: string;
  /** Email subject template */
  emailSubject?: string;
  /** Include submitted data in email? */
  emailIncludeData?: boolean;
  /** Fire webhook on submission? */
  webhookEnabled: boolean;
  /** Webhook URL */
  webhookUrl?: string;
  /** Webhook HTTP method */
  webhookMethod?: 'POST' | 'PUT';
  /** Webhook headers (JSON string) */
  webhookHeaders?: string;
}

// ─── Lookup Field Config ─────────────────────────────────────

export interface LookupConfig {
  /** Source kind: 'form' (other form's submissions) | 'entity' (entity_<slug> table) | 'erp_master' (existing Prisma model) */
  sourceKind?: LookupSourceKind;
  /** When sourceKind='form': slug of the form to look up */
  formSlug?: string;
  /** When sourceKind='entity': slug of the entity form */
  entitySlug?: string;
  /** When sourceKind='erp_master': Prisma model name (e.g. 'Buyer') */
  erpModel?: string;
  /** Field name to display in the dropdown */
  displayField: string;
  /** Field name to store as value */
  valueField: string;
}

// ─── Repeater / Field Group Config ───────────────────────────

export interface RepeaterConfig {
  /** Sub-fields within each repeater row */
  subFields: FormField[];
  /** Minimum rows required */
  minRows?: number;
  /** Maximum rows allowed (0 = unlimited) */
  maxRows?: number;
  /** Label for the "Add Row" button */
  addButtonLabel?: string;
}

// ─── Collaboration Notes ─────────────────────────────────────

export interface FormNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

// ─── Field Definition ────────────────────────────────────────

export interface FormField {
  /** Unique field ID (uuid) */
  id: string;
  /** Machine name for the field (snake_case) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Field type */
  type: FieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Help text shown below the field */
  helpText?: string;
  /** Default value */
  defaultValue?: string | number | boolean;
  /** Options for select / multi-select */
  options?: SelectOption[];
  /** Validation rules */
  validation?: FieldValidation;
  /** Width: 'full' | 'half' | 'third' */
  width?: 'full' | 'half' | 'third';
  /** For 'columns' layout: child fields in each column */
  columns?: FormField[][];
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** CSS class overrides */
  className?: string;
  /** Conditional visibility – show/hide based on another field */
  conditionalVisibility?: ConditionalVisibility;
  /** Lookup field configuration */
  lookupConfig?: LookupConfig;
  /** Calculated / computed field config */
  calculated?: CalculatedField;
  /** Repeater / field group config */
  repeaterConfig?: RepeaterConfig;
}

// ─── Form Section (Tab/Group) ────────────────────────────────

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  /** Collapsed by default? */
  collapsed?: boolean;
  /** Conditional section visibility – show/hide entire section based on field value */
  visibility?: SectionVisibility;
}

// ─── Form Definition ─────────────────────────────────────────

export interface FormDefinition {
  /** Unique form ID */
  id: string;
  /** Form name / title */
  name: string;
  /** Description */
  description?: string;
  /** Slug for URL (auto-generated from name) */
  slug: string;
  /** Two-Track marker — defaults to 'process' for legacy forms */
  kind?: FormKind;
  /** When kind='entity' and form is published, the real table name (e.g. 'entity_buyer_master') */
  entityTableName?: string | null;
  /** For kind='entity': 'standalone' (creates entity_<slug>) or 'bound' (UI over existing Prisma model) */
  bindingMode?: FormBindingMode;
  /** When bindingMode='bound': Prisma model name (e.g. 'Buyer') */
  boundModel?: string | null;
  /** When bindingMode='bound': underlying SQL table name (e.g. 'buyer') */
  boundTableName?: string | null;
  /** When bindingMode='bound': PK field name (default 'id') */
  boundValueField?: string | null;
  /** When bindingMode='bound': label field for dropdowns (e.g. 'name') */
  boundDisplayField?: string | null;
  /** Form sections (visual groups of fields) */
  sections: FormSection[];
  /** Form-level settings */
  settings: FormSettings;
  /** Creation / update timestamps */
  createdAt: string;
  updatedAt: string;
  /** Creator */
  createdBy?: string;
  /** Published status */
  status: 'draft' | 'published' | 'archived';
  /** Module bridge assignment (optional — when form is integrated into ERP navigation) */
  moduleAssignment?: ModuleAssignment;
}

export interface FormTheme {
  /** Primary accent color (hex) */
  primaryColor: string;
  /** Font family */
  fontFamily: 'default' | 'sans' | 'serif' | 'mono';
  /** Border radius for inputs */
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Custom CSS (injected into form) */
  customCss?: string;
}

export interface FormSettings {
  /** Submit button text */
  submitButtonText: string;
  /** Success message after submission */
  successMessage: string;
  /** Submit action: 'store' | 'email' | 'webhook' */
  submitAction: 'store' | 'email' | 'webhook';
  /** Email to send submissions to */
  notifyEmail?: string;
  /** Webhook URL */
  webhookUrl?: string;
  /** Allow multiple submissions from same user? */
  allowMultiple: boolean;
  /** Require authentication? */
  requireAuth: boolean;
  /** Form layout: 'single-column' | 'two-column' */
  layout: 'single-column' | 'two-column';
  /** Enable multi-page wizard mode (sections = pages) */
  wizardMode?: boolean;
  /** Show progress bar in wizard mode */
  showProgressBar?: boolean;
  /** Theme / branding */
  theme?: FormTheme;
  /** Cross-field validation rules */
  crossFieldRules?: CrossFieldRule[];
  /** Notification / integration config */
  notifications?: NotificationConfig;
  /** Form open date (ISO string) — form not available before this */
  openDate?: string;
  /** Form close date (ISO string) — form not available after this */
  closeDate?: string;
  /** Maximum total submissions allowed (0 = unlimited) */
  maxSubmissions?: number;
  /** Password protection for published form (empty = no password) */
  accessPassword?: string;
  /** Redirect URL after successful submission (instead of success message) */
  redirectUrl?: string;
  /** Custom message when form is closed/unavailable */
  closedMessage?: string;
  /** Wizard page skip rules – conditional page navigation */
  pageSkipRules?: PageSkipRule[];
  /** Module assignment – integrate this form into an ERP module’s sidebar */
  moduleAssignment?: ModuleAssignment;
  /**
   * Action chain — Appsmith-style workflow steps that run on submission
   * events (on_submit / on_approve / on_reject / on_review). See
   * apps/api-server/src/modules/saas/actionChain.ts for runtime behaviour.
   */
  actions?: FormAction[];
  /**
   * CAPTCHA configuration for public form submissions (recaptcha-v3 or
   * Cloudflare Turnstile).
   */
  captcha?: {
    provider?: 'recaptcha-v3' | 'turnstile';
    secret?: string;
    minScore?: number;
    siteKey?: string;
  };
  /** Smart prefill — include even volatile (date/file/signature) field types */
  prefillIncludeAll?: boolean;
  /** Reject submission if values are posted for fields hidden by visibility rules */
  strictVisibility?: boolean;
}

// ─── Action Chain ────────────────────────────────────────────

export type ActionEvent = 'on_submit' | 'on_approve' | 'on_reject' | 'on_review';
export type ActionType =
  | 'email'
  | 'webhook'
  | 'notify'
  | 'set_status'
  | 'set_field';

export interface FormAction {
  /** Stable id for React keys + reorder */
  id: string;
  event: ActionEvent;
  type: ActionType;
  name?: string;
  /** Optional `{{cost}} > 1000`-style condition (template-expanded then compared) */
  if?: string;
  config: Record<string, unknown>;
}

// ─── Field Palette (drag source) ─────────────────────────────

export interface PaletteItem {
  type: FieldType;
  label: string;
  icon: string; // Emoji or icon identifier
  description: string;
  category: 'basic' | 'advanced' | 'layout';
}

export const FIELD_PALETTE: PaletteItem[] = [
  // Basic Fields
  { type: 'text', label: 'Text Input', icon: '📝', description: 'Single-line text field', category: 'basic' },
  { type: 'number', label: 'Number', icon: '🔢', description: 'Numeric input', category: 'basic' },
  { type: 'email', label: 'Email', icon: '📧', description: 'Email address field', category: 'basic' },
  { type: 'phone', label: 'Phone', icon: '📱', description: 'Phone number field', category: 'basic' },
  { type: 'textarea', label: 'Text Area', icon: '📄', description: 'Multi-line text', category: 'basic' },
  { type: 'select', label: 'Dropdown', icon: '📋', description: 'Select from options', category: 'basic' },
  { type: 'multi-select', label: 'Multi Select', icon: '☑️', description: 'Select multiple options', category: 'basic' },
  { type: 'checkbox', label: 'Checkbox', icon: '✅', description: 'True/false toggle', category: 'basic' },
  { type: 'switch', label: 'Switch', icon: '🔘', description: 'On/off toggle switch', category: 'basic' },

  // Advanced Fields
  { type: 'url', label: 'URL', icon: '🌐', description: 'Web URL field', category: 'basic' },
  { type: 'password', label: 'Password', icon: '🔒', description: 'Password input', category: 'basic' },

  // Choice variants
  { type: 'radio', label: 'Radio Group', icon: '🔘', description: 'Choose one option', category: 'basic' },
  { type: 'checkbox-group', label: 'Checkbox Group', icon: '☐', description: 'Select multiple options', category: 'basic' },

  // Advanced Fields
  { type: 'date', label: 'Date', icon: '📅', description: 'Date picker', category: 'advanced' },
  { type: 'time', label: 'Time', icon: '⏰', description: 'Time picker', category: 'advanced' },
  { type: 'datetime', label: 'Date & Time', icon: '🕐', description: 'Date and time picker', category: 'advanced' },
  { type: 'file', label: 'File Upload', icon: '📎', description: 'Upload files', category: 'advanced' },
  { type: 'image', label: 'Image Upload', icon: '🖼️', description: 'Upload images', category: 'advanced' },
  { type: 'rating', label: 'Rating', icon: '⭐', description: 'Star rating', category: 'advanced' },
  { type: 'slider', label: 'Slider', icon: '🎚️', description: 'Numeric range slider', category: 'advanced' },
  { type: 'currency', label: 'Currency', icon: '💵', description: 'Money amount with symbol', category: 'advanced' },
  { type: 'color', label: 'Color', icon: '🎨', description: 'Color picker', category: 'advanced' },
  { type: 'signature', label: 'Signature', icon: '✍️', description: 'Signature pad', category: 'advanced' },
  { type: 'richtext', label: 'Rich Text', icon: '📝', description: 'Rich text editor', category: 'advanced' },

  // Layout Elements
  { type: 'heading', label: 'Heading', icon: '🏷️', description: 'Section heading text', category: 'layout' },
  { type: 'separator', label: 'Separator', icon: '➖', description: 'Horizontal divider', category: 'layout' },
  { type: 'columns', label: '2-Column', icon: '▥', description: 'Side-by-side layout', category: 'layout' },

  // Relational
  { type: 'lookup', label: 'Lookup', icon: '🔗', description: 'Link to another form\'s data', category: 'advanced' },
  { type: 'calculated', label: 'Calculated', icon: '🧮', description: 'Auto-computed from other fields', category: 'advanced' },
  { type: 'repeater', label: 'Repeater', icon: '🔁', description: 'Repeatable group of fields', category: 'advanced' },
];

// ─── Helpers ─────────────────────────────────────────────────

export function generateId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function createDefaultField(type: FieldType): FormField {
  const id = generateId();
  const base: FormField = {
    id,
    name: `field_${id.slice(2, 10)}`,
    label: FIELD_PALETTE.find((p) => p.type === type)?.label || 'Field',
    type,
    width: 'full',
    validation: {},
  };

  switch (type) {
    case 'select':
    case 'multi-select':
    case 'radio':
    case 'checkbox-group':
      base.options = [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' },
      ];
      break;
    case 'slider':
      base.validation = { min: 0, max: 100 };
      base.defaultValue = 50;
      break;
    case 'rating':
      base.validation = { max: 5 };
      break;
    case 'currency':
      base.placeholder = '0.00';
      break;
    case 'color':
      base.defaultValue = '#3b82f6';
      break;
    case 'heading':
      base.label = 'Section Title';
      break;
    case 'columns':
      base.columns = [[], []];
      break;
    case 'lookup':
      base.lookupConfig = { formSlug: '', displayField: '', valueField: '' };
      break;
    case 'calculated':
      base.calculated = { formula: '', outputFormat: 'number', precision: 2 };
      base.readOnly = true;
      break;
    case 'repeater':
      base.repeaterConfig = {
        subFields: [
          { id: generateId(), name: 'item', label: 'Item', type: 'text', width: 'half', validation: {} },
          { id: generateId(), name: 'quantity', label: 'Quantity', type: 'number', width: 'half', validation: {} },
        ],
        minRows: 1,
        maxRows: 0,
        addButtonLabel: '+ Add Row',
      };
      break;
    default:
      break;
  }

  return base;
}

export function createDefaultSection(): FormSection {
  return {
    id: generateId(),
    title: 'New Section',
    fields: [],
    collapsed: false,
  };
}

export function createEmptyForm(): FormDefinition {
  return {
    id: generateId(),
    name: 'Untitled Form',
    description: '',
    slug: 'untitled-form',
    sections: [
      {
        id: generateId(),
        title: 'General Information',
        fields: [],
        collapsed: false,
      },
    ],
    settings: {
      submitButtonText: 'Submit',
      successMessage: 'Thank you! Your response has been recorded.',
      submitAction: 'store',
      allowMultiple: true,
      requireAuth: false,
      layout: 'single-column',
      wizardMode: false,
      showProgressBar: true,
      theme: {
        primaryColor: '#3b82f6',
        fontFamily: 'default',
        borderRadius: 'md',
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
  };
}
