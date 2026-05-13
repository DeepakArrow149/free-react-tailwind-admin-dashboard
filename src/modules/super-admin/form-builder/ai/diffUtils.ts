/**
 * Form Diff Utilities
 * Computes a human-readable diff summary between two FormDefinition objects.
 * Used by FormPreview to highlight what the AI changed.
 */

import type { FormDefinition, FormField, FormSection } from '../types';

// ─── Types ───────────────────────────────────────────────────

export interface FieldDiff {
  name: string;
  label: string;
  type: 'added' | 'removed' | 'modified';
  changes?: string[]; // e.g. ["label: 'Name' → 'Full Name'", "validation.required: false → true"]
}

export interface SectionDiff {
  title: string;
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  fieldDiffs: FieldDiff[];
}

export interface FormDiffSummary {
  sections: SectionDiff[];
  totalAdded: number;
  totalRemoved: number;
  totalModified: number;
  hasChanges: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

/** Match sections between old and new by title (case-insensitive) or index */
function matchSections(
  oldSections: FormSection[],
  newSections: FormSection[],
): { matched: [FormSection, FormSection][]; added: FormSection[]; removed: FormSection[] } {
  const used = new Set<number>();
  const matched: [FormSection, FormSection][] = [];
  const removed: FormSection[] = [];

  for (const oldSec of oldSections) {
    const idx = newSections.findIndex(
      (ns, i) => !used.has(i) && ns.title.toLowerCase().trim() === oldSec.title.toLowerCase().trim(),
    );
    if (idx >= 0) {
      matched.push([oldSec, newSections[idx]]);
      used.add(idx);
    } else {
      removed.push(oldSec);
    }
  }

  const added = newSections.filter((_, i) => !used.has(i));
  return { matched, added, removed };
}

/** Match fields by name (primary) or label (fallback) */
function matchFields(
  oldFields: FormField[],
  newFields: FormField[],
): { matched: [FormField, FormField][]; added: FormField[]; removed: FormField[] } {
  const used = new Set<number>();
  const matched: [FormField, FormField][] = [];
  const removed: FormField[] = [];

  for (const oldF of oldFields) {
    // Try by name first, then by label
    let idx = newFields.findIndex(
      (nf, i) => !used.has(i) && nf.name === oldF.name,
    );
    if (idx < 0) {
      idx = newFields.findIndex(
        (nf, i) => !used.has(i) && nf.label.toLowerCase().trim() === oldF.label.toLowerCase().trim(),
      );
    }
    if (idx >= 0) {
      matched.push([oldF, newFields[idx]]);
      used.add(idx);
    } else {
      removed.push(oldF);
    }
  }

  const added = newFields.filter((_, i) => !used.has(i));
  return { matched, added, removed };
}

/** Describe what changed between two fields */
function describeFieldChanges(oldF: FormField, newF: FormField): string[] {
  const changes: string[] = [];

  if (oldF.label !== newF.label) changes.push(`label: '${oldF.label}' → '${newF.label}'`);
  if (oldF.type !== newF.type) changes.push(`type: ${oldF.type} → ${newF.type}`);
  if (oldF.width !== newF.width) changes.push(`width: ${oldF.width} → ${newF.width}`);
  if (oldF.placeholder !== newF.placeholder) changes.push('placeholder changed');
  if (oldF.readOnly !== newF.readOnly) changes.push(`readOnly: ${newF.readOnly}`);

  // Validation changes
  const ov = oldF.validation || {};
  const nv = newF.validation || {};
  if (JSON.stringify(ov) !== JSON.stringify(nv)) changes.push('validation updated');

  // Options changes
  const oo = JSON.stringify(oldF.options || []);
  const no = JSON.stringify(newF.options || []);
  if (oo !== no) changes.push('options changed');

  return changes;
}

// ─── Main Diff Function ─────────────────────────────────────

/**
 * Compute a diff summary between an existing (active) form and a new (AI-generated) form.
 * Returns null if there is no active form (first-time generation).
 */
export function computeFormDiff(
  activeForm: FormDefinition | null,
  newForm: FormDefinition,
): FormDiffSummary | null {
  if (!activeForm) return null;

  const { matched, added: addedSections, removed: removedSections } = matchSections(
    activeForm.sections,
    newForm.sections,
  );

  let totalAdded = 0;
  let totalRemoved = 0;
  let totalModified = 0;

  const sectionDiffs: SectionDiff[] = [];

  // Matched sections — diff their fields
  for (const [oldSec, newSec] of matched) {
    const { matched: mFields, added: aFields, removed: rFields } = matchFields(
      oldSec.fields,
      newSec.fields,
    );

    const fieldDiffs: FieldDiff[] = [];

    for (const af of aFields) {
      fieldDiffs.push({ name: af.name, label: af.label, type: 'added' });
      totalAdded++;
    }

    for (const rf of rFields) {
      fieldDiffs.push({ name: rf.name, label: rf.label, type: 'removed' });
      totalRemoved++;
    }

    for (const [oldF, newF] of mFields) {
      const changes = describeFieldChanges(oldF, newF);
      if (changes.length > 0) {
        fieldDiffs.push({ name: newF.name, label: newF.label, type: 'modified', changes });
        totalModified++;
      }
    }

    sectionDiffs.push({
      title: newSec.title,
      type: fieldDiffs.length > 0 ? 'modified' : 'unchanged',
      fieldDiffs,
    });
  }

  // Added sections
  for (const sec of addedSections) {
    const fieldDiffs = sec.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: 'added' as const,
    }));
    totalAdded += sec.fields.length;
    sectionDiffs.push({ title: sec.title, type: 'added', fieldDiffs });
  }

  // Removed sections
  for (const sec of removedSections) {
    const fieldDiffs = sec.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: 'removed' as const,
    }));
    totalRemoved += sec.fields.length;
    sectionDiffs.push({ title: sec.title, type: 'removed', fieldDiffs });
  }

  return {
    sections: sectionDiffs,
    totalAdded,
    totalRemoved,
    totalModified,
    hasChanges: totalAdded + totalRemoved + totalModified > 0,
  };
}
