/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FormPreview – Live preview & public renderer for forms.
 * Supports conditional visibility, validation, lookup fields, API submission,
 * multi-page wizard mode, form theming, and new field types (rating, signature,
 * rich text, URL, password).
 */

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import type { FormDefinition, FormField, FormSection, FormTheme, ConditionalVisibility } from '../types';
import { submitFormData, fetchLookupOptions, uploadFormFile, fetchErpMasterOptions, listEntityRecords } from '../../api/formBuilderApi';
import { sanitizeHtml, sanitizeCss } from '../../../../utils/sanitize';
import { evaluateFormula } from '../safeEvaluator';

interface FormPreviewProps {
  form: FormDefinition;
  onClose?: () => void;
  /** When true, submits data to the API instead of console.log */
  live?: boolean;
  /** Pre-populate field values (from URL query params, etc.) */
  prefill?: Record<string, string>;
}

// ─── Theme helpers ───────────────────────────────────────────

const FONT_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  roboto: "'Roboto', sans-serif",
  poppins: "'Poppins', sans-serif",
  'open-sans': "'Open Sans', sans-serif",
  lato: "'Lato', sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const RADIUS_MAP: Record<string, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};

function buildThemeVars(theme?: FormTheme): CSSProperties {
  if (!theme) return {};
  return {
    '--fb-primary': theme.primaryColor || '#2563eb',
    '--fb-font': FONT_MAP[theme.fontFamily || 'inter'] || FONT_MAP.inter,
    '--fb-radius': RADIUS_MAP[theme.borderRadius || 'md'] || RADIUS_MAP.md,
  } as CSSProperties;
}

// ─── Component ───────────────────────────────────────────────

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export default function FormPreview({ form, onClose, live = false, prefill }: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const [wizardStep, setWizardStep] = useState(0);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');

  const theme = form.settings.theme;
  const themeVars = useMemo(() => buildThemeVars(theme), [theme]);

  // Initialize default values + prefill from URL params
  useEffect(() => {
    const defaults: Record<string, any> = {};
    for (const section of form.sections) {
      for (const field of section.fields) {
        if (field.defaultValue !== undefined && field.defaultValue !== '') {
          defaults[field.name] = field.defaultValue;
        }
      }
    }
    // Prefill values override defaults
    if (prefill) {
      for (const [key, val] of Object.entries(prefill)) {
        if (val) defaults[key] = val;
      }
    }
    if (Object.keys(defaults).length) setFormData((prev) => ({ ...defaults, ...prev }));
  }, [form, prefill]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) setErrors((prev) => { const n = { ...prev }; delete n[fieldName]; return n; });
  };

  // ─── Calculated field auto-compute ──────────────────────────
  useEffect(() => {
    const calcFields = form.sections.flatMap((s) => s.fields).filter((f) => f.calculated?.formula);
    if (calcFields.length === 0) return;
    const updates: Record<string, any> = {};
    for (const cf of calcFields) {
      const result = evaluateFormula(cf.calculated!.formula, formData, cf.calculated!.precision);
      if (result !== formData[cf.name]) updates[cf.name] = result;
    }
    if (Object.keys(updates).length) setFormData((prev) => ({ ...prev, ...updates }));
  }, [form, formData]);

  // ─── Section visibility evaluator ───────────────────────────
  const visibleSections = useMemo(() => {
    return form.sections.filter((sec) => {
      if (!sec.visibility || !sec.visibility.dependsOn) return true;
      return evaluateCondition(sec.visibility, formData);
    });
  }, [form.sections, formData]);

  // Wizard state (determined after visibleSections)
  const isWizard = form.settings.wizardMode === true && visibleSections.length > 1;

  // ─── Scheduling gate ───────────────────────────────────────
  const now = new Date();
  const isBeforeOpen = form.settings.openDate && new Date(form.settings.openDate) > now;
  const isAfterClose = form.settings.closeDate && new Date(form.settings.closeDate) < now;
  const isScheduleClosed = isBeforeOpen || isAfterClose;

  // Validate specific section fields (for wizard) or all fields
  const validateSection = useCallback((sectionIdx?: number): boolean => {
    const newErrors: Record<string, string> = {};
    const fields =
      sectionIdx !== undefined
        ? visibleSections[sectionIdx]?.fields ?? []
        : visibleSections.flatMap((s) => s.fields);
    for (const field of fields) {
      if (!isFieldVisible(field, formData)) continue;
      const val = formData[field.name];
      const v = field.validation;
      if (v?.required && (val === undefined || val === null || val === '')) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (v?.pattern && typeof val === 'string' && val) {
        try {
          if (!new RegExp(v.pattern).test(val)) {
            newErrors[field.name] = v.patternMessage || `${field.label} format is invalid`;
          }
        } catch { /* ignore bad regex */ }
      }
      if (v?.minLength && typeof val === 'string' && val.length < v.minLength) {
        newErrors[field.name] = `${field.label} must be at least ${v.minLength} characters`;
      }
      if (v?.maxLength && typeof val === 'string' && val.length > v.maxLength) {
        newErrors[field.name] = `${field.label} must be at most ${v.maxLength} characters`;
      }
      if (v?.min !== undefined && typeof val === 'number' && val < v.min) {
        newErrors[field.name] = `${field.label} must be at least ${v.min}`;
      }
      if (v?.max !== undefined && typeof val === 'number' && val > v.max) {
        newErrors[field.name] = `${field.label} must be at most ${v.max}`;
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [visibleSections, formData]);

  if (isScheduleClosed && live) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800" style={themeVars}>
        <span className="mb-4 block text-4xl">🔒</span>
        <h2 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
          {isBeforeOpen ? 'This form is not yet open' : 'This form is now closed'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isBeforeOpen
            ? `Opens on ${new Date(form.settings.openDate!).toLocaleString()}`
            : `Closed on ${new Date(form.settings.closeDate!).toLocaleString()}`}
        </p>
      </div>
    );
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSection()) return;

    // Cross-field validation rules
    const crossRules = form.settings.crossFieldRules || [];
    if (crossRules.length > 0) {
      const ruleErrors: Record<string, string> = {};
      for (const rule of crossRules) {
        if (!rule.fieldA || !rule.fieldB) continue;
        const a = Number(formData[rule.fieldA]);
        const b = Number(formData[rule.fieldB]);
        let passed = true;
        switch (rule.operator) {
          case 'greater_than': passed = a > b; break;
          case 'less_than': passed = a < b; break;
          case 'greater_or_equal': passed = a >= b; break;
          case 'less_or_equal': passed = a <= b; break;
          case 'equals': passed = formData[rule.fieldA] == formData[rule.fieldB]; break;
          case 'not_equals': passed = formData[rule.fieldA] != formData[rule.fieldB]; break;
        }
        if (!passed) {
          ruleErrors[rule.fieldA] = rule.errorMessage || `${rule.name} validation failed`;
        }
      }
      if (Object.keys(ruleErrors).length) {
        setErrors((prev) => ({ ...prev, ...ruleErrors }));
        return;
      }
    }

    if (live) {
      setSubmitting(true);
      try {
        const result = await submitFormData(form.id, formData);
        setSuccessMessage(result.message || form.settings.successMessage);
        setSubmitted(true);
      } catch (err: any) {
        setErrors({ _form: err?.response?.data?.message || 'Submission failed. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    } else {
      setSuccessMessage(form.settings.successMessage);
      setSubmitted(true);
    }
  };

  const handleWizardNext = () => {
    if (!validateSection(wizardStep) || wizardStep >= visibleSections.length - 1) return;

    // Check page skip rules
    const skipRules = form.settings.pageSkipRules || [];
    const currentSectionIndex = form.sections.indexOf(visibleSections[wizardStep]);
    for (const rule of skipRules) {
      if (rule.fromPage !== currentSectionIndex) continue;
      const match = evaluateCondition(
        { dependsOn: rule.fieldName, operator: rule.operator, value: rule.value },
        formData,
      );
      if (match) {
        // Find the target section in visible sections
        const targetSection = form.sections[rule.toPage];
        if (targetSection) {
          const targetIdx = visibleSections.indexOf(targetSection);
          if (targetIdx > wizardStep) {
            setWizardStep(targetIdx);
            return;
          }
        }
      }
    }

    setWizardStep((s) => s + 1);
  };

  const handleWizardPrev = () => {
    if (wizardStep > 0) setWizardStep((s) => s - 1);
  };

  // ─── Rendered output ────────────────────────────────────────

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800"
        style={themeVars}
      >
        <span className="mb-4 block text-4xl" aria-hidden="true">✅</span>
        <h2 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
          {successMessage || form.settings.successMessage}
        </h2>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setFormData({}); setErrors({}); setWizardStep(0); }}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: 'var(--fb-primary, #2563eb)', borderRadius: 'var(--fb-radius, 0.5rem)' }}
        >
          Submit Another
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-3 mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
          >
            Back to Editor
          </button>
        )}
      </div>
    );
  }

  const totalSteps = visibleSections.length;

  return (
    <div
      className="mx-auto transition-all duration-300"
      style={{
        ...themeVars,
        fontFamily: 'var(--fb-font)',
        maxWidth: VIEWPORT_WIDTHS[viewport],
      }}
    >
      {/* Inject sanitized custom CSS */}
      {theme?.customCss && <style>{sanitizeCss(theme.customCss)}</style>}

      {/* Preview Banner */}
      {onClose && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <span>👁️ Preview Mode</span>
          <div className="flex items-center gap-2">
            {/* Fill sample data — for testing conditional / cross-field logic */}
            <button
              type="button"
              onClick={() => {
                const sample: Record<string, unknown> = {};
                for (const sec of form.sections) {
                  for (const f of sec.fields) {
                    if (sample[f.name] !== undefined) continue;
                    switch (f.type) {
                      case 'text': sample[f.name] = 'Sample ' + (f.label || 'text'); break;
                      case 'textarea': sample[f.name] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'; break;
                      case 'email': sample[f.name] = 'sample@example.com'; break;
                      case 'phone': sample[f.name] = '+1 555 0100'; break;
                      case 'url': sample[f.name] = 'https://example.com'; break;
                      case 'password': sample[f.name] = 'P@ssw0rd!'; break;
                      case 'number': case 'currency': sample[f.name] = 42; break;
                      case 'slider': sample[f.name] = (f.validation?.min ?? 0) + Math.floor(((f.validation?.max ?? 100) - (f.validation?.min ?? 0)) / 2); break;
                      case 'rating': sample[f.name] = Math.min(4, f.validation?.max ?? 5); break;
                      case 'date': sample[f.name] = new Date().toISOString().slice(0, 10); break;
                      case 'datetime': sample[f.name] = new Date().toISOString().slice(0, 16); break;
                      case 'time': sample[f.name] = '09:30'; break;
                      case 'checkbox': case 'switch': sample[f.name] = true; break;
                      case 'select': case 'radio': sample[f.name] = f.options?.[0]?.value || ''; break;
                      case 'multi-select': case 'checkbox-group': sample[f.name] = f.options?.length ? [f.options[0].value] : []; break;
                      case 'color': sample[f.name] = '#3b82f6'; break;
                      case 'richtext': sample[f.name] = '<p>Sample <strong>rich</strong> text.</p>'; break;
                      default: /* skip layout / advanced fields */ break;
                    }
                  }
                }
                setFormData((prev) => ({ ...prev, ...sample }));
              }}
              className="rounded-md bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100"
              title="Auto-fill with realistic sample data"
            >
              ✨ Fill sample
            </button>
            <button
              type="button"
              onClick={() => setFormData({})}
              className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300"
              title="Clear all field values"
            >
              Reset
            </button>
            <div className="mx-1 h-4 w-px bg-amber-300 dark:bg-amber-600" />
            {/* Responsive viewport toggle */}
            {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((vp) => (
              <button
                key={vp}
                type="button"
                onClick={() => setViewport(vp)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewport === vp
                    ? 'bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-100'
                    : 'text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-800/50'
                }`}
                title={`${vp.charAt(0).toUpperCase() + vp.slice(1)} preview`}
              >
                {vp === 'desktop' ? '🖥️' : vp === 'tablet' ? '📱' : '📲'}
                <span className="ml-1">{vp.charAt(0).toUpperCase() + vp.slice(1)}</span>
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-amber-300 dark:bg-amber-600" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-amber-200 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-200"
            >
              Back to Editor
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        style={{ borderRadius: 'var(--fb-radius, 0.75rem)' }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{form.name}</h1>
          {form.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{form.description}</p>
          )}
        </div>

        {/* Wizard progress bar */}
        {isWizard && form.settings.showProgressBar !== false && (
          <div className="px-6 pt-4">
            <div className="flex items-center gap-1 mb-1">
              {visibleSections.map((sec, i) => (
                <div key={sec.id} className="flex-1 flex flex-col items-center">
                  <div
                    className={`h-1.5 w-full rounded-full transition ${
                      i <= wizardStep ? '' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    style={i <= wizardStep ? { backgroundColor: 'var(--fb-primary, #2563eb)' } : undefined}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
              Step {wizardStep + 1} of {totalSteps}
              {visibleSections[wizardStep]?.title ? ` — ${visibleSections[wizardStep].title}` : ''}
            </p>
          </div>
        )}

        {/* Form error */}
        {errors._form && (
          <div role="alert" aria-live="assertive" className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {errors._form}
          </div>
        )}

        {/* Sections */}
        <div className="p-6 space-y-6">
          {isWizard ? (
            /* Wizard: show only one section at a time */
            <SectionRenderer
              key={visibleSections[wizardStep]?.id}
              section={visibleSections[wizardStep]}
              layout={form.settings.layout}
              formData={formData}
              errors={errors}
              onFieldChange={handleFieldChange}
            />
          ) : (
            /* Normal: show all visible sections */
            visibleSections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                layout={form.settings.layout}
                formData={formData}
                errors={errors}
                onFieldChange={handleFieldChange}
              />
            ))
          )}
        </div>

        {/* Footer — wizard navigation or submit */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700 flex items-center gap-3">
          {isWizard && wizardStep > 0 && (
            <button
              type="button"
              onClick={handleWizardPrev}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              style={{ borderRadius: 'var(--fb-radius, 0.5rem)' }}
            >
              ← Previous
            </button>
          )}
          {isWizard && wizardStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleWizardNext}
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 transition"
              style={{ backgroundColor: 'var(--fb-primary, #2563eb)', borderRadius: 'var(--fb-radius, 0.5rem)' }}
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--fb-primary, #2563eb)', borderRadius: 'var(--fb-radius, 0.5rem)' }}
            >
              {submitting ? 'Submitting…' : form.settings.submitButtonText}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Answer Piping ───────────────────────────────────────────

function pipeValues(text: string, formData: Record<string, any>): string {
  if (!text || !text.includes('{')) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    const val = formData[name];
    if (val === undefined || val === null || val === '') return match;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  });
}

// ─── Formula Evaluator ───────────────────────────────────────
// Formula evaluation now uses the safe recursive-descent parser
// imported from '../safeEvaluator' — no more eval() or Function().

// ─── Conditional Visibility Evaluator ────────────────────────

function evaluateCondition(
  cv: ConditionalVisibility,
  formData: Record<string, any>,
): boolean {
  const val = formData[cv.dependsOn];
  switch (cv.operator) {
    case 'equals': return val == cv.value; // loose comparison for string/number
    case 'not_equals': return val != cv.value;
    case 'contains': return typeof val === 'string' && val.includes(String(cv.value));
    case 'not_empty': return val !== undefined && val !== null && val !== '';
    case 'is_empty': return val === undefined || val === null || val === '';
    case 'greater_than': return Number(val) > Number(cv.value);
    case 'less_than': return Number(val) < Number(cv.value);
    default: return true;
  }
}

function isFieldVisible(
  field: FormField,
  formData: Record<string, any>,
): boolean {
  if (!field.conditionalVisibility) return true;
  return evaluateCondition(field.conditionalVisibility, formData);
}

// ─── Section Renderer ────────────────────────────────────────

function SectionRenderer({
  section,
  layout,
  formData,
  errors,
  onFieldChange,
}: {
  section: FormSection;
  layout: string;
  formData: Record<string, any>;
  errors: Record<string, string>;
  onFieldChange: (name: string, value: any) => void;
}) {
  return (
    <div>
      {section.title && (
        <h2 className="mb-3 text-base font-semibold text-gray-700 dark:text-gray-200">
          {pipeValues(section.title, formData)}
        </h2>
      )}
      {section.description && (
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{pipeValues(section.description, formData)}</p>
      )}
      <div className={`${layout === 'two-column' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
        {section.fields.map((field) => {
          if (!isFieldVisible(field, formData)) return null;
          return (
            <div
              key={field.id}
              className={
                field.width === 'half'
                  ? 'col-span-1'
                  : field.width === 'third'
                    ? 'col-span-1'
                    : 'col-span-2'
              }
            >
              <FieldRenderer
                field={field}
                value={formData[field.name]}
                error={errors[field.name]}
                onChange={(val) => onFieldChange(field.name, val)}
                formData={formData}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Field Renderer ──────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  error,
  onChange,
  formData = {},
}: {
  field: FormField;
  value: any;
  error?: string;
  onChange: (val: any) => void;
  formData?: Record<string, any>;
}) {
  const inputClass =
    `w-full rounded-lg border px-3 py-2 text-sm transition focus:ring-1 focus:outline-none dark:bg-gray-700 dark:text-gray-200 ${
      error
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
    }`;

  switch (field.type) {
    case 'heading':
      return <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">{field.label}</h3>;

    case 'separator':
      return <hr className="border-gray-200 dark:border-gray-600" />;

    case 'text':
    case 'email':
    case 'phone':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <input
            id={`field-${field.name}`}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.validation?.required}
            readOnly={field.readOnly}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            className={inputClass}
          />
        </FieldWrapper>
      );

    case 'number':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <input
            id={`field-${field.name}`}
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            required={field.validation?.required}
            readOnly={field.readOnly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={inputClass}
          />
        </FieldWrapper>
      );

    case 'textarea':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <textarea
            id={`field-${field.name}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.validation?.required}
            readOnly={field.readOnly}
            rows={4}
            className={inputClass}
          />
        </FieldWrapper>
      );

    case 'select':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <select
            id={`field-${field.name}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.validation?.required}
            className={inputClass}
          >
            <option value="">{field.placeholder || 'Select...'}</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FieldWrapper>
      );

    case 'multi-select':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <fieldset className="space-y-1">
            <legend className="sr-only">{field.label}</legend>
            {(field.options || []).map((opt) => {
              const checked = Array.isArray(value) && value.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const prev = Array.isArray(value) ? value : [];
                      onChange(
                        e.target.checked
                          ? [...prev, opt.value]
                          : prev.filter((v: string) => v !== opt.value),
                      );
                    }}
                    className="rounded border-gray-300"
                  />
                  {opt.label}
                </label>
              );
            })}
          </fieldset>
        </FieldWrapper>
      );

    case 'checkbox':
      return (
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              id={`field-${field.name}`}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              aria-describedby={error ? `field-${field.name}-error` : undefined}
              aria-invalid={error ? true : undefined}
              className="rounded border-gray-300"
            />
            {field.label}
            {field.validation?.required && <span className="text-red-500" aria-hidden="true">*</span>}
          </label>
          {error && <p id={`field-${field.name}-error`} role="alert" aria-live="polite" className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'switch':
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
          <button
            type="button"
            onClick={() => onChange(!value)}
            aria-label={`Toggle ${field.label}`}
            aria-pressed={value ? 'true' : 'false'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      );

    case 'date':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <input
            id={`field-${field.name}`}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.validation?.required}
            aria-label={field.label}
            className={inputClass}
          />
        </FieldWrapper>
      );

    case 'datetime':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <input
            id={`field-${field.name}`}
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.validation?.required}
            aria-label={field.label}
            className={inputClass}
          />
        </FieldWrapper>
      );

    case 'time':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <input
            id={`field-${field.name}`}
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.validation?.required}
            aria-label={field.label}
            className={inputClass}
          />
        </FieldWrapper>
      );

    case 'currency':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-medium" aria-hidden="true">$</span>
            <input
              id={`field-${field.name}`}
              type="number"
              step="0.01"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={field.placeholder || '0.00'}
              required={field.validation?.required}
              readOnly={field.readOnly}
              min={field.validation?.min}
              max={field.validation?.max}
              aria-label={field.label}
              className={`${inputClass} pl-7`}
            />
          </div>
        </FieldWrapper>
      );

    case 'slider': {
      const min = field.validation?.min ?? 0;
      const max = field.validation?.max ?? 100;
      const v = typeof value === 'number' ? value : Number(field.defaultValue ?? min);
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <div className="space-y-1">
            <input
              id={`field-${field.name}`}
              type="range"
              min={min}
              max={max}
              value={v}
              onChange={(e) => onChange(Number(e.target.value))}
              disabled={field.readOnly}
              aria-label={field.label}
              className="w-full accent-[var(--fb-primary,#2563eb)]"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{min}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{v}</span>
              <span>{max}</span>
            </div>
          </div>
        </FieldWrapper>
      );
    }

    case 'color':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <div className="flex items-center gap-3">
            <input
              id={`field-${field.name}`}
              type="color"
              value={(value as string) || (field.defaultValue as string) || '#3b82f6'}
              onChange={(e) => onChange(e.target.value)}
              disabled={field.readOnly}
              aria-label={field.label}
              className="h-10 w-14 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              readOnly={field.readOnly}
              className={`${inputClass} font-mono text-xs flex-1`}
              aria-label={`${field.label} hex value`}
            />
          </div>
        </FieldWrapper>
      );

    case 'radio': {
      const opts = field.options || [];
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <fieldset>
            <legend className="sr-only">{field.label}</legend>
            <div className="space-y-2">
              {opts.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name={`field-${field.name}`}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={() => onChange(opt.value)}
                    disabled={field.readOnly}
                    className="text-blue-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
        </FieldWrapper>
      );
    }

    case 'checkbox-group': {
      const selected: string[] = Array.isArray(value) ? value : [];
      const toggle = (v: string) => {
        const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
        onChange(next);
      };
      const opts = field.options || [];
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <fieldset>
            <legend className="sr-only">{field.label}</legend>
            <div className="space-y-2">
              {opts.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    disabled={field.readOnly}
                    className="rounded border-gray-300"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
        </FieldWrapper>
      );
    }

    case 'file':
    case 'image':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <FileUploadField field={field} value={value} onChange={onChange} />
        </FieldWrapper>
      );

    case 'lookup':
      return (
        <LookupField field={field} value={value} error={error} onChange={onChange} />
      );

    case 'url':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-xs">🌐</span>
            <input
              id={`field-${field.name}`}
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || 'https://example.com'}
              required={field.validation?.required}
              readOnly={field.readOnly}
              className={`${inputClass} pl-8`}
            />
          </div>
        </FieldWrapper>
      );

    case 'password':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <input
            id={`field-${field.name}`}
            type="password"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || '••••••••'}
            required={field.validation?.required}
            readOnly={field.readOnly}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            className={inputClass}
          />
        </FieldWrapper>
      );

    case 'richtext':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <div className="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <div className="flex flex-wrap gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-600 dark:bg-gray-700">
              <button type="button" className="rounded px-2 py-0.5 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('bold')} title="Bold">B</button>
              <button type="button" className="rounded px-2 py-0.5 text-xs italic text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('italic')} title="Italic">I</button>
              <button type="button" className="rounded px-2 py-0.5 text-xs underline text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('underline')} title="Underline">U</button>
              <button type="button" className="rounded px-2 py-0.5 text-xs line-through text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('strikeThrough')} title="Strikethrough">S</button>
              <span className="mx-1 border-l border-gray-300 dark:border-gray-500" />
              <button type="button" className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('formatBlock', false, 'h2')} title="Heading">H</button>
              <button type="button" className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('formatBlock', false, 'h3')} title="Subheading">H₂</button>
              <button type="button" className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('formatBlock', false, 'p')} title="Paragraph">¶</button>
              <span className="mx-1 border-l border-gray-300 dark:border-gray-500" />
              <button type="button" className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('insertUnorderedList')} title="Bullet List">• List</button>
              <button type="button" className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('insertOrderedList')} title="Numbered List">1. List</button>
              <span className="mx-1 border-l border-gray-300 dark:border-gray-500" />
              <button type="button" className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => { const url = prompt('Enter URL:'); if (url) document.execCommand('createLink', false, url); }} title="Insert Link">🔗</button>
              <button type="button" className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300" onClick={() => document.execCommand('removeFormat')} title="Clear Formatting">⊘</button>
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label={field.label}
              aria-multiline="true"
              onBlur={(e) => onChange(e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || '') }}
              className="min-h-25 px-3 py-2 text-sm text-gray-700 focus:outline-none dark:bg-gray-700 dark:text-gray-200 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
            />
          </div>
        </FieldWrapper>
      );

    case 'rating':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <RatingInput value={value} onChange={onChange} max={field.validation?.max || 5} />
        </FieldWrapper>
      );

    case 'signature':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <SignaturePad value={value} onChange={onChange} />
        </FieldWrapper>
      );

    case 'calculated':
      return (
        <FieldWrapper field={field} error={error} formData={formData}>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-gray-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            {value !== undefined && value !== '' ? (
              <span>
                {field.calculated?.outputFormat === 'currency' && '$'}
                {value}
                {field.calculated?.outputFormat === 'percentage' && '%'}
              </span>
            ) : (
              <span className="text-gray-400 italic">Computed value</span>
            )}
          </div>
        </FieldWrapper>
      );

    case 'repeater':
      return (
        <RepeaterField field={field} value={value} error={error} onChange={onChange} formData={formData} />
      );

    default:
      return null;
  }
}

// ─── Repeater Field ──────────────────────────────────────────

function RepeaterField({
  field,
  value,
  error,
  onChange,
  formData = {},
}: {
  field: FormField;
  value: any;
  error?: string;
  onChange: (val: any) => void;
  formData?: Record<string, any>;
}) {
  const cfg = field.repeaterConfig;
  const subFields = cfg?.subFields || [];
  const rows: Record<string, any>[] = Array.isArray(value) ? value : [];
  const minRows = cfg?.minRows || 0;
  const maxRows = cfg?.maxRows || 0;
  const canAdd = maxRows === 0 || rows.length < maxRows;
  const canRemove = rows.length > minRows;

  const addRow = () => {
    if (!canAdd) return;
    const emptyRow: Record<string, any> = {};
    subFields.forEach((sf) => { emptyRow[sf.name] = ''; });
    onChange([...rows, emptyRow]);
  };

  const removeRow = (idx: number) => {
    if (!canRemove) return;
    onChange(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (rowIdx: number, fieldName: string, val: any) => {
    const updated = rows.map((row, i) =>
      i === rowIdx ? { ...row, [fieldName]: val } : row,
    );
    onChange(updated);
  };

  // Initialize with minimum rows on mount
  useEffect(() => {
    if (rows.length < minRows) {
      const empty: Record<string, any> = {};
      subFields.forEach((sf) => { empty[sf.name] = ''; });
      const needed = Array.from({ length: minRows - rows.length }, () => ({ ...empty }));
      onChange([...rows, ...needed]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subInputClass =
    'w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs transition focus:ring-1 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-700';

  return (
    <FieldWrapper field={field} error={error} formData={formData}>
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 dark:border-indigo-700 dark:bg-indigo-900/10">
        {/* Header row */}
        {subFields.length > 0 && rows.length > 0 && (
          <div className="flex items-center gap-2 border-b border-indigo-100 px-3 py-1.5 dark:border-indigo-800">
            <span className="w-6 text-center text-[10px] text-gray-400">#</span>
            {subFields.map((sf) => (
              <span key={sf.id} className="flex-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {sf.label}{sf.validation?.required ? ' *' : ''}
              </span>
            ))}
            <span className="w-7" />
          </div>
        )}

        {/* Data rows */}
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-2 border-b border-indigo-100/50 px-3 py-2 dark:border-indigo-800/50 last:border-b-0">
            <span className="w-6 text-center text-[10px] text-gray-400">{rowIdx + 1}</span>
            {subFields.map((sf) => (
              <div key={sf.id} className="flex-1">
                {sf.type === 'select' ? (
                  <select
                    value={row[sf.name] || ''}
                    onChange={(e) => updateRow(rowIdx, sf.name, e.target.value)}
                    aria-label={sf.label}
                    className={subInputClass}
                  >
                    <option value="">Select…</option>
                    {(sf.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : sf.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(row[sf.name])}
                    onChange={(e) => updateRow(rowIdx, sf.name, e.target.checked)}
                    aria-label={sf.label}
                    className="rounded border-gray-300"
                  />
                ) : sf.type === 'date' ? (
                  <input
                    type="date"
                    value={row[sf.name] || ''}
                    onChange={(e) => updateRow(rowIdx, sf.name, e.target.value)}
                    aria-label={sf.label}
                    className={subInputClass}
                  />
                ) : (
                  <input
                    type={sf.type === 'number' ? 'number' : sf.type === 'email' ? 'email' : 'text'}
                    value={row[sf.name] ?? ''}
                    onChange={(e) => updateRow(rowIdx, sf.name, sf.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
                    placeholder={sf.placeholder || sf.label}
                    aria-label={sf.label}
                    className={subInputClass}
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={!canRemove}
              onClick={() => removeRow(rowIdx)}
              className="w-7 rounded-md px-1 py-0.5 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-20 dark:hover:bg-red-900/20"
              title="Remove row"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add row button */}
        {canAdd && (
          <div className="px-3 py-2">
            <button
              type="button"
              onClick={addRow}
              className="w-full rounded-md border border-dashed border-indigo-300 py-1.5 text-xs font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              {cfg?.addButtonLabel || '+ Add Row'}
            </button>
          </div>
        )}

        {rows.length === 0 && !canAdd && (
          <div className="px-3 py-4 text-center text-xs text-gray-400">No rows</div>
        )}
      </div>
    </FieldWrapper>
  );
}


// ─── File Upload Field ──────────────────────────────────────

function FileUploadField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isImage = field.type === 'image';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be under 10 MB');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadFormFile(file);
      onChange({ url: result.url, originalName: result.originalName, size: result.size, mimeType: result.mimeType });
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadError(null);
  };

  const fileData = typeof value === 'object' && value?.url ? value : null;

  return (
    <div className="space-y-2">
      {fileData ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          {isImage && fileData.mimeType?.startsWith('image/') ? (
            <div className="mb-2">
              <img
                src={fileData.url}
                alt={fileData.originalName || 'Uploaded image'}
                className="max-h-48 rounded-md object-contain"
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                {fileData.originalName || 'Uploaded file'}
              </p>
              {fileData.size && (
                <p className="text-xs text-gray-500">
                  {(fileData.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            accept={isImage ? 'image/*' : undefined}
            required={field.validation?.required}
            onChange={handleFileChange}
            disabled={uploading}
            aria-label={field.label}
            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 dark:text-gray-400 dark:file:bg-blue-900/30 dark:file:text-blue-400"
          />
          {uploading && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
              Uploading...
            </div>
          )}
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}
    </div>
  );
}

// ─── Lookup Field ────────────────────────────────────────────

function LookupField({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: any;
  error?: string;
  onChange: (val: any) => void;
}) {
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const cfg = field.lookupConfig as (typeof field.lookupConfig & { sourceKind?: 'form' | 'entity' | 'erp_master'; entitySlug?: string; erpModel?: string }) | undefined;
  const sourceKind: 'form' | 'entity' | 'erp_master' = cfg?.sourceKind || 'form';

  useEffect(() => {
    if (!cfg) return;
    setLoading(true);
    if (sourceKind === 'erp_master') {
      if (!cfg.erpModel) { setOptions([]); setLoading(false); return; }
      fetchErpMasterOptions(cfg.erpModel)
        .then((r) => setOptions(r.options.map((o) => ({ label: o.label, value: o.value }))))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    } else if (sourceKind === 'entity') {
      const slug = cfg.entitySlug || cfg.formSlug;
      if (!slug || !cfg.displayField || !cfg.valueField) { setOptions([]); setLoading(false); return; }
      listEntityRecords(slug, { limit: 200 })
        .then((r) => setOptions(r.data.map((row) => ({
          label: String(row[cfg.displayField] ?? row.id),
          value: String(row[cfg.valueField] ?? row.id),
        }))))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    } else {
      // 'form' source — original behaviour
      if (!cfg.formSlug || !cfg.displayField || !cfg.valueField) { setOptions([]); setLoading(false); return; }
      fetchLookupOptions(cfg.formSlug, cfg.displayField, cfg.valueField)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }
  }, [sourceKind, cfg, cfg?.formSlug, cfg?.entitySlug, cfg?.erpModel, cfg?.displayField, cfg?.valueField]);

  const inputClass =
    `w-full rounded-lg border px-3 py-2 text-sm transition focus:ring-1 focus:outline-none dark:bg-gray-700 dark:text-gray-200 ${
      error
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
    }`;

  return (
    <FieldWrapper field={field} error={error}>
      {loading ? (
        <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-400 dark:border-gray-600">
          Loading options…
        </div>
      ) : (
        <select
          id={`field-${field.name}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.validation?.required}
          className={inputClass}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </FieldWrapper>
  );
}

function FieldWrapper({ field, error, children, formData = {} }: { field: FormField; error?: string; children: React.ReactNode; formData?: Record<string, any> }) {
  const errorId = `field-${field.name}-error`;
  const helpId = `field-${field.name}-help`;
  return (
    <div>
      <label htmlFor={`field-${field.name}`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {pipeValues(field.label, formData)}
        {field.validation?.required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        {field.validation?.required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {error && <p id={errorId} role="alert" aria-live="polite" className="mt-1 text-xs text-red-500">{error}</p>}
      {!error && field.helpText && (
        <p id={helpId} className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pipeValues(field.helpText, formData)}</p>
      )}
    </div>
  );
}

// ─── Rating Input ────────────────────────────────────────────

function RatingInput({ value, onChange, max = 5 }: { value: any; onChange: (v: number) => void; max?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const current = typeof value === 'number' ? value : 0;
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(star === current ? 0 : star)}
          aria-label={`Rate ${star} of ${max} star${star !== 1 ? 's' : ''}`}
          className="text-2xl transition-transform hover:scale-110"
        >
          <span className={star <= (hovered ?? current) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-500'}>
            ★
          </span>
        </button>
      ))}
      {current > 0 && (
        <span className="ml-2 self-center text-xs text-gray-500 dark:text-gray-400">{current}/{max}</span>
      )}
    </div>
  );
}

// ─── Signature Pad (simple canvas) ───────────────────────────

function SignaturePad({ value, onChange }: { value: any; onChange: (v: string) => void }) {
  const [drawing, setDrawing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(false);
    onChange(e.currentTarget.toDataURL());
  };

  const handleClear = () => {
    const canvas = document.getElementById('fb-sig-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange('');
  };

  return (
    <div>
      {value ? (
        <div className="relative">
          <img src={value} alt="Signature" className="rounded-lg border border-gray-300 dark:border-gray-600" style={{ maxHeight: 120 }} />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-600 hover:bg-red-200"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="relative">
          <canvas
            id="fb-sig-canvas"
            width={400}
            height={120}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={(e) => { if (drawing) handleMouseUp(e); }}
            className="w-full cursor-crosshair rounded-lg border-2 border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
            style={{ touchAction: 'none' }}
          />
          <span className="pointer-events-none absolute bottom-2 left-3 text-xs text-gray-400">✍️ Draw your signature</span>
        </div>
      )}
    </div>
  );
}
