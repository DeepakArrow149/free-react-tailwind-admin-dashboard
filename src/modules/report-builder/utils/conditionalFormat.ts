/**
 * Conditional formatting — rule evaluation + style derivation.
 *
 * Rules live on `ReportColumn.conditionalFormats[]` and are evaluated
 * top-to-bottom; the first match wins (Excel "stop if true" semantics).
 *
 * The same matcher runs in:
 *   • TableWidget cell rendering (live preview + run page + public viewer)
 *   • PdfReportRenderer (so exported PDFs match what the user sees)
 *
 * Operators support strings AND numbers — string columns can use eq/ne/contains
 * while measure columns use gt/lt/between, etc.
 */

import type { ConditionalFormatRule, ReportColumn } from '../types';

/** Coerce a value to a number for comparison. NaN/non-numeric → null. */
function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
}

/**
 * Returns true when `cellValue` satisfies the rule. Numeric operators
 * (gt/lt/between) try to coerce both sides to numbers — this lets a rule
 * "amount > 1000" match even when the row stores amount as a string.
 */
export function evaluateRule(rule: ConditionalFormatRule, cellValue: unknown): boolean {
  switch (rule.operator) {
    case 'is_null':
      return cellValue === null || cellValue === undefined || cellValue === '';
    case 'is_not_null':
      return cellValue !== null && cellValue !== undefined && cellValue !== '';
    case 'eq':
      // Loose equality intentionally — "5" == 5 should match a numeric rule.
      // eslint-disable-next-line eqeqeq
      return cellValue == rule.value;
    case 'ne':
      // eslint-disable-next-line eqeqeq
      return cellValue != rule.value;
    case 'contains': {
      const hay = cellValue == null ? '' : String(cellValue).toLowerCase();
      const needle = rule.value == null ? '' : String(rule.value).toLowerCase();
      return needle !== '' && hay.includes(needle);
    }
    case 'gt': {
      const a = toNumber(cellValue); const b = toNumber(rule.value);
      return a !== null && b !== null && a > b;
    }
    case 'gte': {
      const a = toNumber(cellValue); const b = toNumber(rule.value);
      return a !== null && b !== null && a >= b;
    }
    case 'lt': {
      const a = toNumber(cellValue); const b = toNumber(rule.value);
      return a !== null && b !== null && a < b;
    }
    case 'lte': {
      const a = toNumber(cellValue); const b = toNumber(rule.value);
      return a !== null && b !== null && a <= b;
    }
    case 'between': {
      const a = toNumber(cellValue);
      const lo = toNumber(rule.value);
      const hi = toNumber(rule.value2);
      return a !== null && lo !== null && hi !== null && a >= lo && a <= hi;
    }
    default:
      return false;
  }
}

export interface ConditionalStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: 'bold';
  fontStyle?: 'italic';
  /** When set, the rule was row-scoped — caller should paint the whole row. */
  rowScope?: boolean;
  /** Cell tooltip (the rule's `label`). */
  title?: string;
}

/**
 * Find the first matching rule for a cell value and return its visual style.
 * Returns undefined when no rule matches or when the column has no rules.
 */
export function matchRule(
  rules: ConditionalFormatRule[] | undefined,
  cellValue: unknown
): ConditionalStyle | undefined {
  if (!rules || rules.length === 0) return undefined;
  for (const r of rules) {
    if (evaluateRule(r, cellValue)) return ruleToStyle(r);
  }
  return undefined;
}

function ruleToStyle(rule: ConditionalFormatRule): ConditionalStyle {
  const out: ConditionalStyle = {};
  if (rule.bgColor) out.backgroundColor = rule.bgColor;
  if (rule.textColor) out.color = rule.textColor;
  if (rule.bold) out.fontWeight = 'bold';
  if (rule.italic) out.fontStyle = 'italic';
  if (rule.rowScope) out.rowScope = true;
  if (rule.label) out.title = rule.label;
  return out;
}

/**
 * For a given row, walk every column once and pick the FIRST rule that is
 * row-scoped AND matches its column's value. Used by TableWidget to paint the
 * row's <tr>. Cell-scoped rules are handled separately in the cell renderer.
 */
export function findRowScopedStyle(
  columns: ReportColumn[],
  row: Record<string, unknown>
): ConditionalStyle | undefined {
  for (const col of columns) {
    const rules = col.conditionalFormats;
    if (!rules || rules.length === 0) continue;
    for (const r of rules) {
      if (!r.rowScope) continue;
      if (evaluateRule(r, row[col.field])) return ruleToStyle(r);
    }
  }
  return undefined;
}
