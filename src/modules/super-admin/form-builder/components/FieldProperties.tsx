/**
 * FieldProperties – Property editor for selected field
 * Shows configuration options when a field is selected on the canvas.
 * Includes: label, name, type, placeholder, helpText, defaultValue,
 * width, options, validation (required, min/max, pattern), conditional visibility,
 * lookup config, readOnly.
 */

import { useFormBuilderStore } from '../store';
import type { FormField, SelectOption, FieldType, ConditionalVisibility, LookupConfig, CalculatedField, RepeaterConfig, LookupSourceKind } from '../types';
import { useEffect, useRef, useState } from 'react';
import { generateId } from '../types';
import { fetchForms, fetchErpMasters, type ErpMaster } from '../../api/formBuilderApi';

type PropTab = 'basic' | 'validation' | 'logic';

const WIDTH_OPTIONS: { value: FormField['width']; label: string }[] = [
  { value: 'full', label: 'Full Width' },
  { value: 'half', label: 'Half Width' },
  { value: 'third', label: 'One-Third' },
];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'password', label: 'Password' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi-select', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'switch', label: 'Switch' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'file', label: 'File Upload' },
  { value: 'image', label: 'Image Upload' },
  { value: 'rating', label: 'Rating' },
  { value: 'signature', label: 'Signature' },
  { value: 'heading', label: 'Heading' },
  { value: 'separator', label: 'Separator' },
  { value: 'lookup', label: 'Lookup' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'repeater', label: 'Repeater' },
];

const OPERATORS: { value: ConditionalVisibility['operator']; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_empty', label: 'Is Not Empty' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

export default function FieldProperties() {
  const { activeForm, selectedFieldId, selectedSectionId, updateField, removeField, duplicateField } =
    useFormBuilderStore();
  const [tab, setTab] = useState<PropTab>('basic');

  if (!activeForm || !selectedFieldId || !selectedSectionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-16 text-center text-gray-400 dark:text-gray-500">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl dark:from-blue-900/20 dark:to-indigo-900/20">
          🎯
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No field selected</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Click any field in the canvas to edit its properties.
        </p>
      </div>
    );
  }

  const section = activeForm.sections.find((s) => s.id === selectedSectionId);
  const field = section?.fields.find((f) => f.id === selectedFieldId);
  if (!field) return null;

  const handleChange = (updates: Partial<FormField>) => {
    updateField(selectedSectionId, selectedFieldId, updates);
  };

  const handleValidationChange = (key: string, value: string | number | boolean) => {
    handleChange({
      validation: { ...field.validation, [key]: value },
    });
  };

  const handleAddOption = () => {
    const options = field.options || [];
    const idx = options.length + 1;
    handleChange({
      options: [...options, { label: `Option ${idx}`, value: `option_${idx}` }],
    });
  };

  const handleUpdateOption = (index: number, updates: Partial<SelectOption>) => {
    const options = [...(field.options || [])];
    options[index] = { ...options[index], ...updates };
    handleChange({ options });
  };

  const handleRemoveOption = (index: number) => {
    const options = (field.options || []).filter((_, i) => i !== index);
    handleChange({ options });
  };

  const isLayoutField = field.type === 'heading' || field.type === 'separator' || field.type === 'columns';
  const hasOptions = field.type === 'select' || field.type === 'multi-select' || field.type === 'radio' || field.type === 'checkbox-group';
  const isLookup = field.type === 'lookup';
  const isCalculated = field.type === 'calculated';
  const isRating = field.type === 'rating';
  const isRepeater = field.type === 'repeater';

  // All sibling field names for conditional visibility
  const allFields = activeForm.sections.flatMap((s) => s.fields).filter((f) => f.id !== field.id);

  const showValidationTab = !isLayoutField;
  const showLogicTab = !isLayoutField;
  const tabs: { key: PropTab; label: string; icon: string; show: boolean }[] = [
    { key: 'basic', label: 'Basic', icon: '⚙', show: true },
    { key: 'validation', label: 'Validation', icon: '✓', show: showValidationTab },
    { key: 'logic', label: 'Logic', icon: '◆', show: showLogicTab },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const activeTab = visibleTabs.find((t) => t.key === tab) ? tab : 'basic';

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-3 dark:border-gray-700 dark:from-blue-900/10 dark:to-indigo-900/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200 dark:bg-gray-800 dark:text-blue-400 dark:ring-blue-900/40">
                {field.type}
              </span>
              {field.validation?.required && (
                <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900/40">
                  required
                </span>
              )}
              {field.conditionalVisibility && (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/40">
                  conditional
                </span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {field.label || 'Untitled field'}
            </p>
            <p className="truncate font-mono text-[10px] text-gray-500 dark:text-gray-400">
              {field.name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => duplicateField(selectedSectionId, selectedFieldId)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 dark:hover:bg-gray-700"
              title="Duplicate field (Ctrl+D)"
              aria-label="Duplicate field"
            >
              <span aria-hidden="true">⎘</span>
            </button>
            <button
              type="button"
              onClick={() => removeField(selectedSectionId, selectedFieldId)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-red-600 dark:hover:bg-gray-700"
              title="Delete field (Del)"
              aria-label="Delete field"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1 border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Field property sections">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex-1 rounded-t-md px-2 py-2 text-xs font-medium transition ${
              activeTab === t.key
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200'
            }`}
          >
            <span className="mr-1 text-[11px] opacity-60">{t.icon}</span>
            {t.label}
            {activeTab === t.key && (
              <span className="absolute inset-x-2 bottom-[-1px] h-0.5 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* ===================== BASIC TAB ===================== */}
      {activeTab === 'basic' && <>

      {/* Type */}
      {!isLayoutField && (
        <FieldGroup label="Field Type">
          <select
            value={field.type}
            onChange={(e) => handleChange({ type: e.target.value as FieldType })}
            className="input-field"
          >
            {FIELD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldGroup>
      )}

      {/* Label */}
      <FieldGroup label="Label">
        <input
          type="text"
          value={field.label}
          onChange={(e) => handleChange({ label: e.target.value })}
          className="input-field"
          placeholder="Field Label"
        />
        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
          Tip: Use <code className="bg-gray-100 px-0.5 rounded dark:bg-gray-700">{'{field_name}'}</code> for answer piping
        </p>
      </FieldGroup>

      {/* Field Name (machine) */}
      <FieldGroup label="Field Name">
        <input
          type="text"
          value={field.name}
          onChange={(e) => handleChange({ name: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase() })}
          className="input-field font-mono text-xs"
          placeholder="field_name"
        />
      </FieldGroup>

      {/* Placeholder */}
      {!isLayoutField && (
        <FieldGroup label="Placeholder">
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => handleChange({ placeholder: e.target.value })}
            className="input-field"
            placeholder="Enter placeholder text..."
          />
        </FieldGroup>
      )}

      {/* Help Text */}
      {!isLayoutField && (
        <FieldGroup label="Help Text">
          <input
            type="text"
            value={field.helpText || ''}
            onChange={(e) => handleChange({ helpText: e.target.value })}
            className="input-field"
            placeholder="Help text below field"
          />
          <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
            Supports piping: <code className="bg-gray-100 px-0.5 rounded dark:bg-gray-700">{'{other_field}'}</code> inserts its value
          </p>
        </FieldGroup>
      )}

      {/* Default Value */}
      {!isLayoutField && !isLookup && (
        <FieldGroup label="Default Value">
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={field.defaultValue !== undefined ? String(field.defaultValue) : ''}
            onChange={(e) => handleChange({ defaultValue: field.type === 'number' ? Number(e.target.value) : e.target.value })}
            className="input-field"
            placeholder="Default value"
          />
        </FieldGroup>
      )}

      {/* Width */}
      <FieldGroup label="Width">
        <div className="flex gap-1">
          {WIDTH_OPTIONS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => handleChange({ width: w.value })}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                field.width === w.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Options (select / multi-select) */}
      {hasOptions && (
        <FieldGroup label="Options">
          <div className="space-y-2">
            {(field.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => handleUpdateOption(i, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="input-field flex-1"
                  placeholder={`Option ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(i)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOption}
              className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400"
            >
              + Add Option
            </button>
          </div>
        </FieldGroup>
      )}

      {/* Lookup Config */}
      {isLookup && (
        <LookupConfigPanel
          config={field.lookupConfig || { formSlug: '', displayField: '', valueField: '' }}
          onChange={(cfg) => handleChange({ lookupConfig: cfg })}
        />
      )}

      {/* Calculated Field Config */}
      {isCalculated && (
        <CalculatedFieldPanel
          config={field.calculated || { formula: '', outputFormat: 'number', precision: 2 }}
          allFields={allFields}
          onChange={(cfg) => handleChange({ calculated: cfg })}
        />
      )}

      {/* Repeater Config */}
      {isRepeater && (
        <RepeaterConfigPanel
          config={field.repeaterConfig || { subFields: [], minRows: 1, maxRows: 0, addButtonLabel: '+ Add Row' }}
          onChange={(cfg) => handleChange({ repeaterConfig: cfg })}
        />
      )}

      {/* Rating Max Stars */}
      {isRating && (
        <FieldGroup label="Max Stars">
          <input
            type="number"
            value={field.validation?.max ?? 5}
            onChange={(e) => handleValidationChange('max', e.target.value ? Number(e.target.value) : 5)}
            className="input-field"
            min={3}
            max={10}
          />
        </FieldGroup>
      )}

      </>}

      {/* ===================== VALIDATION TAB ===================== */}
      {activeTab === 'validation' && !isLayoutField && (
        <div className="space-y-4">
          <h4 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Validation
          </h4>

          <label className="mb-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={field.validation?.required || false}
              onChange={(e) => handleValidationChange('required', e.target.checked)}
              className="rounded border-gray-300"
            />
            Required
          </label>

          {(field.type === 'text' || field.type === 'textarea' || field.type === 'email' || field.type === 'phone' || field.type === 'url' || field.type === 'password') && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <FieldGroup label="Min Length" compact>
                  <input
                    type="number"
                    value={field.validation?.minLength ?? ''}
                    onChange={(e) => handleValidationChange('minLength', e.target.value ? Number(e.target.value) : '')}
                    className="input-field"
                    min={0}
                  />
                </FieldGroup>
                <FieldGroup label="Max Length" compact>
                  <input
                    type="number"
                    value={field.validation?.maxLength ?? ''}
                    onChange={(e) => handleValidationChange('maxLength', e.target.value ? Number(e.target.value) : '')}
                    className="input-field"
                    min={0}
                  />
                </FieldGroup>
              </div>

              {/* Pattern Presets */}
              <FieldGroup label="Pattern Preset">
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const presets: Record<string, { pattern: string; message: string }> = {
                      'letters': { pattern: '^[A-Za-z\\s]+$', message: 'Only letters and spaces allowed' },
                      'alphanumeric': { pattern: '^[A-Za-z0-9]+$', message: 'Only letters and numbers allowed' },
                      'no-special': { pattern: '^[A-Za-z0-9\\s]+$', message: 'No special characters allowed' },
                      'zip-us': { pattern: '^\\d{5}(-\\d{4})?$', message: 'Enter a valid US ZIP code (e.g. 12345)' },
                      'phone-intl': { pattern: '^\\+?[\\d\\s\\-().]{7,20}$', message: 'Enter a valid phone number' },
                      'slug': { pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', message: 'Only lowercase letters, numbers, and hyphens' },
                      'hex-color': { pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$', message: 'Enter a valid hex color (e.g. #FF0000)' },
                      'ip-address': { pattern: '^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$', message: 'Enter a valid IP address' },
                      'no-spaces': { pattern: '^\\S+$', message: 'Spaces are not allowed' },
                    };
                    const preset = presets[e.target.value];
                    if (preset) {
                      handleValidationChange('pattern', preset.pattern);
                      handleValidationChange('patternMessage', preset.message);
                    }
                  }}
                  className="input-field"
                >
                  <option value="">Choose a preset…</option>
                  <option value="letters">Letters only</option>
                  <option value="alphanumeric">Alphanumeric</option>
                  <option value="no-special">No special chars</option>
                  <option value="zip-us">ZIP code (US)</option>
                  <option value="phone-intl">Phone (international)</option>
                  <option value="slug">URL slug</option>
                  <option value="hex-color">Hex color</option>
                  <option value="ip-address">IP address</option>
                  <option value="no-spaces">No spaces</option>
                </select>
              </FieldGroup>

              {/* Pattern (regex) */}
              <FieldGroup label="Pattern (Regex)">
                <input
                  type="text"
                  value={field.validation?.pattern || ''}
                  onChange={(e) => handleValidationChange('pattern', e.target.value)}
                  className="input-field font-mono text-xs"
                  placeholder="e.g. ^[A-Z]{2}\\d{4}$"
                />
              </FieldGroup>
              <FieldGroup label="Pattern Error Message">
                <input
                  type="text"
                  value={field.validation?.patternMessage || ''}
                  onChange={(e) => handleValidationChange('patternMessage', e.target.value)}
                  className="input-field"
                  placeholder="Custom error when pattern fails"
                />
              </FieldGroup>
            </>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <FieldGroup label="Min Value" compact>
                <input
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) => handleValidationChange('min', e.target.value ? Number(e.target.value) : '')}
                  className="input-field"
                />
              </FieldGroup>
              <FieldGroup label="Max Value" compact>
                <input
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) => handleValidationChange('max', e.target.value ? Number(e.target.value) : '')}
                  className="input-field"
                />
              </FieldGroup>
            </div>
          )}
        </div>
      )}

      {/* ===================== LOGIC TAB ===================== */}
      {activeTab === 'logic' && !isLayoutField && (<div className="space-y-4">
        <h4 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Conditional Visibility
        </h4>
        <div>
          <label className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={!!field.conditionalVisibility}
              onChange={(e) => {
                if (e.target.checked) {
                  handleChange({
                    conditionalVisibility: { dependsOn: allFields[0]?.name || '', operator: 'not_empty' },
                  });
                } else {
                  handleChange({ conditionalVisibility: undefined });
                }
              }}
              className="rounded border-gray-300"
            />
            Only show when condition is met
          </label>

          {field.conditionalVisibility && (
            <div className="space-y-2 ml-5">
              {/* Natural language preview */}
              <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                Show "<strong>{field.label}</strong>" when{' '}
                <em>{allFields.find((f) => f.name === field.conditionalVisibility!.dependsOn)?.label || field.conditionalVisibility.dependsOn || '…'}</em>
                {' '}{OPERATORS.find((o) => o.value === field.conditionalVisibility!.operator)?.label.toLowerCase() || field.conditionalVisibility.operator}
                {field.conditionalVisibility.value !== undefined && field.conditionalVisibility.value !== '' && !['is_empty', 'not_empty'].includes(field.conditionalVisibility.operator)
                  ? ` "${field.conditionalVisibility.value}"`
                  : ''}
              </div>

              <FieldGroup label="Depends on Field">
                <select
                  value={field.conditionalVisibility.dependsOn}
                  onChange={(e) =>
                    handleChange({
                      conditionalVisibility: { ...field.conditionalVisibility!, dependsOn: e.target.value },
                    })
                  }
                  className="input-field"
                >
                  <option value="">Select field…</option>
                  {allFields.map((f) => (
                    <option key={f.id} value={f.name}>{f.label} ({f.name})</option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup label="Operator">
                <select
                  value={field.conditionalVisibility.operator}
                  onChange={(e) =>
                    handleChange({
                      conditionalVisibility: {
                        ...field.conditionalVisibility!,
                        operator: e.target.value as ConditionalVisibility['operator'],
                      },
                    })
                  }
                  className="input-field"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </FieldGroup>
              {!['is_empty', 'not_empty'].includes(field.conditionalVisibility.operator) && (() => {
                // Smart value picker: if source field has options, show a dropdown
                const sourceField = allFields.find((f) => f.name === field.conditionalVisibility!.dependsOn);
                const sourceHasOptions = sourceField && ['select', 'multi-select', 'radio'].includes(sourceField.type) && sourceField.options?.length;

                return (
                  <FieldGroup label="Value">
                    {sourceHasOptions ? (
                      <select
                        value={field.conditionalVisibility.value !== undefined ? String(field.conditionalVisibility.value) : ''}
                        onChange={(e) =>
                          handleChange({
                            conditionalVisibility: { ...field.conditionalVisibility!, value: e.target.value },
                          })
                        }
                        className="input-field"
                        aria-label="Conditional visibility value"
                      >
                        <option value="">Select value…</option>
                        {sourceField!.options!.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : sourceField?.type === 'checkbox' || sourceField?.type === 'switch' ? (
                      <select
                        value={field.conditionalVisibility.value !== undefined ? String(field.conditionalVisibility.value) : ''}
                        onChange={(e) =>
                          handleChange({
                            conditionalVisibility: { ...field.conditionalVisibility!, value: e.target.value },
                          })
                        }
                        className="input-field"
                        aria-label="Conditional visibility value"
                      >
                        <option value="">Select…</option>
                        <option value="true">Yes / Checked</option>
                        <option value="false">No / Unchecked</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={field.conditionalVisibility.value !== undefined ? String(field.conditionalVisibility.value) : ''}
                        onChange={(e) =>
                          handleChange({
                            conditionalVisibility: { ...field.conditionalVisibility!, value: e.target.value },
                          })
                        }
                        className="input-field"
                        placeholder="Comparison value"
                        aria-label="Conditional visibility value"
                      />
                    )}
                  </FieldGroup>
                );
              })()}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={field.readOnly || false}
              onChange={(e) => handleChange({ readOnly: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="font-medium">Read Only</span>
            <span className="text-[10px] text-gray-400">(field is shown but cannot be edited)</span>
          </label>
        </div>
      </div>)}

      {/* CSS helper */}
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

// ─── Calculated Field Config Panel ───────────────────────────

const FORMULA_FUNCTIONS: { name: string; signature: string; description: string }[] = [
  { name: 'IF', signature: 'IF(condition, ifTrue, ifFalse)', description: 'Branch on a condition.' },
  { name: 'SUM', signature: 'SUM(...args)', description: 'Sum numbers (also: SUM({rep.field}) over a repeater).' },
  { name: 'AVG', signature: 'AVG(...args)', description: 'Arithmetic mean.' },
  { name: 'COUNT', signature: 'COUNT(...args)', description: 'Count non-empty values.' },
  { name: 'ROUND', signature: 'ROUND(n, decimals)', description: 'Round to N decimals.' },
  { name: 'MIN', signature: 'MIN(a, b, ...)', description: 'Smallest value.' },
  { name: 'MAX', signature: 'MAX(a, b, ...)', description: 'Largest value.' },
  { name: 'ABS', signature: 'ABS(n)', description: 'Absolute value.' },
  { name: 'CONCAT', signature: 'CONCAT(a, b, ...)', description: 'Join strings.' },
  { name: 'UPPER', signature: 'UPPER(text)', description: 'Uppercase a string.' },
  { name: 'LOWER', signature: 'LOWER(text)', description: 'Lowercase a string.' },
  { name: 'LEFT', signature: 'LEFT(s, n)', description: 'First N characters.' },
  { name: 'RIGHT', signature: 'RIGHT(s, n)', description: 'Last N characters.' },
  { name: 'LEN', signature: 'LEN(s)', description: 'String length.' },
  { name: 'TODAY', signature: 'TODAY()', description: "Today's date (yyyy-mm-dd)." },
  { name: 'DATEDIFF', signature: 'DATEDIFF(d1, d2)', description: 'Days between two dates.' },
  { name: 'DATEADD', signature: 'DATEADD(d, n, "days"|"months"|"years")', description: 'Shift a date.' },
  { name: 'COALESCE', signature: 'COALESCE(a, b, ...)', description: 'First non-empty value.' },
];

function CalculatedFieldPanel({
  config,
  allFields,
  onChange,
}: {
  config: CalculatedField;
  allFields: FormField[];
  onChange: (cfg: CalculatedField) => void;
}) {
  const formulaRef = useRef<HTMLTextAreaElement>(null);
  const insertAtCursor = (text: string) => {
    const ta = formulaRef.current;
    if (!ta) { onChange({ ...config, formula: config.formula + text }); return; }
    const start = ta.selectionStart ?? config.formula.length;
    const end = ta.selectionEnd ?? config.formula.length;
    const next = config.formula.slice(0, start) + text + config.formula.slice(end);
    onChange({ ...config, formula: next });
    setTimeout(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };
  return (
    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Calculated Field
      </h4>
      <div className="space-y-2">
        <FieldGroup label="Formula">
          <textarea
            ref={formulaRef}
            value={config.formula}
            onChange={(e) => onChange({ ...config, formula: e.target.value })}
            className="input-field font-mono text-xs"
            rows={3}
            placeholder="{qty} * {price}"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Reference fields with <code className="rounded bg-gray-100 px-0.5 dark:bg-gray-700">{'{field_name}'}</code>.
            Functions, comparisons, AND/OR/NOT all supported.
          </p>
        </FieldGroup>

        {/* Insert field-ref dropdown */}
        <div className="grid grid-cols-2 gap-2">
          <FieldGroup label="Insert field" compact>
            <select
              value=""
              onChange={(e) => { if (e.target.value) insertAtCursor(`{${e.target.value}}`); }}
              className="input-field text-xs"
              aria-label="Insert a field reference"
            >
              <option value="">Pick a field…</option>
              {allFields.map((f) => (
                <option key={f.id} value={f.name}>{f.label || f.name} ({f.type})</option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Insert function" compact>
            <select
              value=""
              onChange={(e) => {
                const fn = FORMULA_FUNCTIONS.find((f) => f.name === e.target.value);
                if (fn) insertAtCursor(fn.name === 'TODAY' ? 'TODAY()' : `${fn.name}(`);
              }}
              className="input-field text-xs"
              aria-label="Insert a function"
            >
              <option value="">Pick a function…</option>
              {FORMULA_FUNCTIONS.map((fn) => (
                <option key={fn.name} value={fn.name}>{fn.signature}</option>
              ))}
            </select>
          </FieldGroup>
        </div>

        {/* Function reference chips (collapsible) */}
        <details className="rounded-md border border-gray-200 bg-gray-50/60 p-2 dark:border-gray-700 dark:bg-gray-800/40">
          <summary className="cursor-pointer text-[11px] font-medium text-gray-600 dark:text-gray-300">
            Formula reference
          </summary>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
            {FORMULA_FUNCTIONS.map((fn) => (
              <div key={fn.name} className="text-[10px] text-gray-600 dark:text-gray-400">
                <code className="rounded bg-white px-1 py-0.5 font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">{fn.signature}</code>
                <span className="ml-1.5">{fn.description}</span>
              </div>
            ))}
          </div>
        </details>
        <FieldGroup label="Output Format">
          <select
            value={config.outputFormat || 'number'}
            onChange={(e) => onChange({ ...config, outputFormat: e.target.value as 'number' | 'text' | 'currency' })}
            className="input-field"
          >
            <option value="number">Number</option>
            <option value="currency">Currency</option>
            <option value="text">Text</option>
          </select>
        </FieldGroup>
        {config.outputFormat !== 'text' && (
          <FieldGroup label="Decimal Precision">
            <input
              type="number"
              value={config.precision ?? 2}
              onChange={(e) => onChange({ ...config, precision: Number(e.target.value) })}
              className="input-field"
              aria-label="Decimal precision"
              min={0}
              max={6}
            />
          </FieldGroup>
        )}
        {allFields.filter((f) => f.type === 'number' || f.type === 'calculated').length > 0 && (
          <div className="text-[10px] text-gray-400">
            <span className="font-medium">Available numeric fields:</span>{' '}
            {allFields
              .filter((f) => f.type === 'number' || f.type === 'calculated')
              .map((f) => `{${f.name}}`)
              .join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lookup Config Panel — 3-source picker ───────────────────

const LOOKUP_SOURCE_INFO: Record<LookupSourceKind, { label: string; icon: string; hint: string }> = {
  form:       { label: 'Form submissions', icon: '📝', hint: 'Pull from another form' },
  entity:     { label: 'Entity table',     icon: '🆕', hint: 'Pull from a custom entity master' },
  erp_master: { label: 'ERP master',       icon: '🔗', hint: 'Pull from an existing Prisma master (Buyer, Material, …)' },
};

function LookupConfigPanel({
  config,
  onChange,
}: {
  config: LookupConfig;
  onChange: (cfg: LookupConfig) => void;
}) {
  const sourceKind: LookupSourceKind = config.sourceKind || 'form';
  const [allForms, setAllForms] = useState<Array<{ slug: string; name: string; kind?: string }>>([]);
  const [erpMasters, setErpMasters] = useState<ErpMaster[]>([]);

  useEffect(() => {
    fetchForms()
      .then((list) => setAllForms(list.map((f) => ({ slug: f.slug, name: f.name, kind: (f as { kind?: string }).kind }))))
      .catch(() => setAllForms([]));
  }, []);

  useEffect(() => {
    if (sourceKind !== 'erp_master') return;
    fetchErpMasters()
      .then((c) => setErpMasters(c.flat))
      .catch(() => setErpMasters([]));
  }, [sourceKind]);

  // Filter forms by kind for source picker
  const processForms = allForms.filter((f) => (f.kind || 'process') === 'process');
  const entityForms = allForms.filter((f) => f.kind === 'entity');

  // Auto-fill display/value when ERP master selected
  const handlePickErpMaster = (modelName: string) => {
    const meta = erpMasters.find((m) => m.model === modelName);
    onChange({
      ...config,
      sourceKind: 'erp_master',
      erpModel: modelName,
      formSlug: '',
      entitySlug: '',
      displayField: meta?.displayField || 'name',
      valueField: meta?.valueField || 'id',
    });
  };

  const handleSourceKindChange = (kind: LookupSourceKind) => {
    // Reset all source-specific fields when switching kinds
    onChange({
      sourceKind: kind,
      formSlug: '',
      entitySlug: '',
      erpModel: '',
      displayField: '',
      valueField: '',
    });
  };

  return (
    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Lookup Configuration
      </h4>

      {/* Source kind picker — 3 distinct cards */}
      <FieldGroup label="What does this field look up?">
        <div className="grid grid-cols-3 gap-1.5">
          {(['form', 'entity', 'erp_master'] as const).map((k) => {
            const info = LOOKUP_SOURCE_INFO[k];
            const active = sourceKind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleSourceKindChange(k)}
                className={`flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-2 text-[10px] font-medium transition ${
                  active
                    ? k === 'erp_master'
                      ? 'border-teal-400 bg-teal-50 text-teal-800 ring-1 ring-teal-300 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-300'
                      : k === 'entity'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'border-blue-400 bg-blue-50 text-blue-800 ring-1 ring-blue-300 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                title={info.hint}
              >
                <span className="text-base" aria-hidden="true">{info.icon}</span>
                <span className="text-center leading-tight">{info.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{LOOKUP_SOURCE_INFO[sourceKind].hint}</p>
      </FieldGroup>

      {/* Source-specific picker */}
      {sourceKind === 'form' && (
        <FieldGroup label="Source Form">
          <select
            value={config.formSlug || ''}
            onChange={(e) => onChange({ ...config, formSlug: e.target.value })}
            className="input-field"
            aria-label="Source form"
          >
            <option value="">Select form…</option>
            {processForms.map((f) => (
              <option key={f.slug} value={f.slug}>{f.name}</option>
            ))}
          </select>
          {processForms.length === 0 && (
            <p className="mt-1 text-[10px] text-amber-600">No process forms found.</p>
          )}
        </FieldGroup>
      )}

      {sourceKind === 'entity' && (
        <FieldGroup label="Source Entity Form">
          <select
            value={config.entitySlug || ''}
            onChange={(e) => onChange({ ...config, entitySlug: e.target.value })}
            className="input-field"
            aria-label="Source entity"
          >
            <option value="">Select entity…</option>
            {entityForms.map((f) => (
              <option key={f.slug} value={f.slug}>{f.name}</option>
            ))}
          </select>
          {entityForms.length === 0 && (
            <p className="mt-1 text-[10px] text-amber-600">
              No entity forms yet. Create one with kind="entity" first.
            </p>
          )}
        </FieldGroup>
      )}

      {sourceKind === 'erp_master' && (
        <>
          <FieldGroup label="ERP Master">
            <select
              value={config.erpModel || ''}
              onChange={(e) => handlePickErpMaster(e.target.value)}
              className="input-field"
              aria-label="ERP master"
            >
              <option value="">Select master…</option>
              {erpMasters.map((m) => (
                <option key={m.model} value={m.model}>{m.label} ({m.module})</option>
              ))}
            </select>
            {erpMasters.length === 0 && (
              <p className="mt-1 text-[10px] text-gray-400">Loading catalog…</p>
            )}
          </FieldGroup>
          {config.erpModel && (
            <p className="rounded-md bg-teal-50 px-2 py-1 text-[10px] text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
              ✓ Display &amp; value fields auto-filled. You can override below if needed.
            </p>
          )}
        </>
      )}

      {/* Display & value field name (always shown) */}
      <FieldGroup label="Display Field">
        <input
          type="text"
          value={config.displayField || ''}
          onChange={(e) => onChange({ ...config, displayField: e.target.value })}
          className="input-field font-mono text-xs"
          aria-label="Display field"
          placeholder={sourceKind === 'erp_master' ? 'e.g. name' : 'e.g. customer_name'}
        />
      </FieldGroup>
      <FieldGroup label="Value Field (stored)">
        <input
          type="text"
          value={config.valueField || ''}
          onChange={(e) => onChange({ ...config, valueField: e.target.value })}
          className="input-field font-mono text-xs"
          aria-label="Value field"
          placeholder={sourceKind === 'erp_master' ? 'e.g. id' : 'e.g. customer_id'}
        />
      </FieldGroup>
    </div>
  );
}

function FieldGroup({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={compact ? '' : 'space-y-1'}>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Repeater Config Panel ───────────────────────────────────

const REPEATER_SUB_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
];

function RepeaterConfigPanel({
  config,
  onChange,
}: {
  config: RepeaterConfig;
  onChange: (cfg: RepeaterConfig) => void;
}) {
  const handleSubFieldChange = (index: number, updates: Partial<FormField>) => {
    const subFields = [...config.subFields];
    subFields[index] = { ...subFields[index], ...updates };
    onChange({ ...config, subFields });
  };

  const addSubField = () => {
    const id = generateId();
    const newField: FormField = {
      id,
      name: `sub_${id.slice(2, 8)}`,
      label: `Field ${config.subFields.length + 1}`,
      type: 'text',
      width: 'half',
      validation: {},
    };
    onChange({ ...config, subFields: [...config.subFields, newField] });
  };

  const removeSubField = (index: number) => {
    onChange({ ...config, subFields: config.subFields.filter((_, i) => i !== index) });
  };

  return (
    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Repeater Configuration
      </h4>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <FieldGroup label="Min Rows" compact>
            <input
              type="number"
              value={config.minRows ?? 1}
              onChange={(e) => onChange({ ...config, minRows: Number(e.target.value) || 0 })}
              className="input-field"
              min={0}
              max={50}
            />
          </FieldGroup>
          <FieldGroup label="Max Rows (0 = no limit)" compact>
            <input
              type="number"
              value={config.maxRows ?? 0}
              onChange={(e) => onChange({ ...config, maxRows: Number(e.target.value) || 0 })}
              className="input-field"
              min={0}
              max={100}
            />
          </FieldGroup>
        </div>
        <FieldGroup label="Add Button Label">
          <input
            type="text"
            value={config.addButtonLabel || '+ Add Row'}
            onChange={(e) => onChange({ ...config, addButtonLabel: e.target.value })}
            className="input-field"
          />
        </FieldGroup>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Sub-Fields ({config.subFields.length})
          </label>
          <div className="space-y-2">
            {config.subFields.map((sf, i) => (
              <div key={sf.id} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700/40">
                <input
                  type="text"
                  value={sf.label}
                  onChange={(e) => handleSubFieldChange(i, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                  className="input-field flex-1"
                  placeholder="Label"
                  aria-label={`Sub-field ${i + 1} label`}
                />
                <select
                  value={sf.type}
                  onChange={(e) => handleSubFieldChange(i, { type: e.target.value as FieldType })}
                  className="input-field w-24"
                  aria-label={`Sub-field ${i + 1} type`}
                >
                  {REPEATER_SUB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={sf.validation?.required || false}
                    onChange={(e) => handleSubFieldChange(i, { validation: { ...sf.validation, required: e.target.checked } })}
                    className="rounded border-gray-300"
                  />
                  Req
                </label>
                <button
                  type="button"
                  onClick={() => removeSubField(i)}
                  className="text-red-400 hover:text-red-600 text-xs"
                  aria-label={`Remove sub-field ${sf.label || i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSubField}
              className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400"
            >
              + Add Sub-Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
