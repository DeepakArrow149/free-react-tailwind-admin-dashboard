/**
 * HTML Sanitization utility using DOMPurify.
 * Use this whenever rendering user-supplied or AI-generated HTML.
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string — strips dangerous tags/attributes (script, onerror, etc.)
 * while preserving safe formatting (strong, em, p, ul, ol, li, a, h2, h3, etc.)
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'span', 'div', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sub', 'sup',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'title'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize for inline markdown rendering (bold, italic only).
 * More restrictive — used for AI chat messages.
 */
export function sanitizeInline(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['strong', 'b', 'em', 'i', 'code', 'br'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize CSS string — strips dangerous patterns that could execute JS or
 * exfiltrate data (expression(), url(), @import, behavior, -moz-binding, etc.)
 * while preserving safe visual-only CSS properties.
 */
export function sanitizeCss(dirty: string): string {
  if (!dirty) return '';

  let css = dirty;

  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Strip @import and @charset directives (can load external resources)
  css = css.replace(/@import\b[^;]*/gi, '/* blocked @import */');
  css = css.replace(/@charset\b[^;]*/gi, '');

  // Strip url() values (can exfiltrate data or load external resources)
  css = css.replace(/url\s*\([^)]*\)/gi, 'none');

  // Strip IE expression() and legacy behavior/binding properties
  css = css.replace(/expression\s*\([^)]*\)/gi, 'none');
  css = css.replace(/behavior\s*:\s*[^;]*/gi, '/* blocked */');
  css = css.replace(/-moz-binding\s*:\s*[^;]*/gi, '/* blocked */');

  // Strip javascript: protocol in any property value
  css = css.replace(/javascript\s*:/gi, '');

  return css.trim();
}
