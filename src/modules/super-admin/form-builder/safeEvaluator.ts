/**
 * Client-side Safe Formula Evaluator
 *
 * Mirrors a subset of the server-side `formulaEngine.ts` so that calculated
 * fields render the same value in the live preview as they do on submit.
 *
 * Pure recursive-descent parser — no eval(), no new Function(), no template
 * strings interpolated into eval contexts. Everything is dispatched through
 * a small AST.
 *
 * Supported:
 *   - Literals: numbers, double/single-quoted strings, booleans (true/false)
 *   - Arithmetic: + - * / %
 *   - Comparison: > < >= <= == !=
 *   - Logical: AND, OR, NOT
 *   - Field refs: {field_name}
 *   - Functions:
 *       Math:    ROUND(n,d), FLOOR(n), CEIL(n), ABS(n), MIN(...), MAX(...)
 *       Aggreg.: SUM(...), COUNT(...), AVG(...)
 *       String:  CONCAT(...), UPPER(s), LOWER(s), LEFT(s,n), RIGHT(s,n), LEN(s)
 *       Date:    TODAY(), DATEDIFF(d1,d2), DATEADD(d,n,unit)
 *       Logic:   IF(cond,a,b), COALESCE(...), ISNULL(v,fb)
 *
 * Returns NaN / '—' on any malformed input. Never throws on syntax errors.
 */

// ── Tokens ───────────────────────────────────────────────

type TokenType =
  | 'NUMBER' | 'STRING' | 'BOOLEAN'
  | 'FIELD_REF' | 'IDENT'
  | 'OP' | 'CMP' | 'LOGIC' | 'NOT'
  | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token { type: TokenType; value: string | number | boolean }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }

    // Field reference: {name}
    if (ch === '{') {
      const end = expr.indexOf('}', i);
      if (end === -1) return [];
      tokens.push({ type: 'FIELD_REF', value: expr.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    // Number
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let s = '';
      while (i < n && /[0-9.]/.test(expr[i])) s += expr[i++];
      tokens.push({ type: 'NUMBER', value: Number(s) });
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let s = '';
      while (i < n && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < n) { s += expr[i + 1]; i += 2; continue; }
        s += expr[i++];
      }
      i++; // closing quote
      tokens.push({ type: 'STRING', value: s });
      continue;
    }

    // Identifier / keyword (functions, AND/OR/NOT, true/false)
    if (/[A-Za-z_]/.test(ch)) {
      let s = '';
      while (i < n && /[A-Za-z0-9_]/.test(expr[i])) s += expr[i++];
      const upper = s.toUpperCase();
      if (upper === 'TRUE') { tokens.push({ type: 'BOOLEAN', value: true }); continue; }
      if (upper === 'FALSE') { tokens.push({ type: 'BOOLEAN', value: false }); continue; }
      if (upper === 'AND' || upper === 'OR') { tokens.push({ type: 'LOGIC', value: upper }); continue; }
      if (upper === 'NOT') { tokens.push({ type: 'NOT', value: 'NOT' }); continue; }
      tokens.push({ type: 'IDENT', value: upper });
      continue;
    }

    // Comparison / operators
    if (ch === '>' || ch === '<' || ch === '=' || ch === '!') {
      const next = expr[i + 1];
      if ((ch === '=' || ch === '!') && next === '=') { tokens.push({ type: 'CMP', value: ch + next }); i += 2; continue; }
      if ((ch === '>' || ch === '<') && next === '=') { tokens.push({ type: 'CMP', value: ch + next }); i += 2; continue; }
      if (ch === '>' || ch === '<') { tokens.push({ type: 'CMP', value: ch }); i++; continue; }
      // bare '=' and '!' aren't valid
      return [];
    }
    if ('+-*/%'.includes(ch)) { tokens.push({ type: 'OP', value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',' }); i++; continue; }

    // Unknown char — bail
    return [];
  }
  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

// ── AST ──────────────────────────────────────────────────

type ExprNode =
  | { kind: 'lit'; value: number | string | boolean }
  | { kind: 'field'; name: string }
  | { kind: 'unary'; op: '-' | 'NOT'; arg: ExprNode }
  | { kind: 'bin'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] };

class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}
  private peek() { return this.tokens[this.i]; }
  private eat(type?: TokenType) {
    const t = this.tokens[this.i++];
    if (type && t.type !== type) throw new Error('expected ' + type);
    return t;
  }

  parse(): ExprNode { return this.expr(); }

  // expr → orExpr
  private expr(): ExprNode { return this.orExpr(); }

  // orExpr → andExpr (OR andExpr)*
  private orExpr(): ExprNode {
    let left = this.andExpr();
    while (this.peek().type === 'LOGIC' && this.peek().value === 'OR') {
      this.eat();
      const right = this.andExpr();
      left = { kind: 'bin', op: 'OR', left, right };
    }
    return left;
  }
  // andExpr → notExpr (AND notExpr)*
  private andExpr(): ExprNode {
    let left = this.notExpr();
    while (this.peek().type === 'LOGIC' && this.peek().value === 'AND') {
      this.eat();
      const right = this.notExpr();
      left = { kind: 'bin', op: 'AND', left, right };
    }
    return left;
  }
  // notExpr → NOT notExpr | cmpExpr
  private notExpr(): ExprNode {
    if (this.peek().type === 'NOT') {
      this.eat();
      return { kind: 'unary', op: 'NOT', arg: this.notExpr() };
    }
    return this.cmpExpr();
  }
  // cmpExpr → addExpr (CMP addExpr)?
  private cmpExpr(): ExprNode {
    let left = this.addExpr();
    if (this.peek().type === 'CMP') {
      const op = String(this.eat().value);
      const right = this.addExpr();
      left = { kind: 'bin', op, left, right };
    }
    return left;
  }
  // addExpr → mulExpr ((+/-) mulExpr)*
  private addExpr(): ExprNode {
    let left = this.mulExpr();
    while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = String(this.eat().value);
      const right = this.mulExpr();
      left = { kind: 'bin', op, left, right };
    }
    return left;
  }
  // mulExpr → unary ((*/ /%) unary)*
  private mulExpr(): ExprNode {
    let left = this.unary();
    while (this.peek().type === 'OP' && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
      const op = String(this.eat().value);
      const right = this.unary();
      left = { kind: 'bin', op, left, right };
    }
    return left;
  }
  // unary → -unary | primary
  private unary(): ExprNode {
    if (this.peek().type === 'OP' && this.peek().value === '-') {
      this.eat();
      return { kind: 'unary', op: '-', arg: this.unary() };
    }
    return this.primary();
  }
  // primary → NUMBER | STRING | BOOLEAN | FIELD_REF | IDENT '(' args ')' | '(' expr ')'
  private primary(): ExprNode {
    const t = this.peek();
    if (t.type === 'NUMBER' || t.type === 'STRING' || t.type === 'BOOLEAN') {
      this.eat();
      return { kind: 'lit', value: t.value as number | string | boolean };
    }
    if (t.type === 'FIELD_REF') {
      this.eat();
      return { kind: 'field', name: String(t.value) };
    }
    if (t.type === 'IDENT') {
      const name = String(t.value);
      this.eat();
      this.eat('LPAREN');
      const args: ExprNode[] = [];
      if (this.peek().type !== 'RPAREN') {
        args.push(this.expr());
        while (this.peek().type === 'COMMA') { this.eat(); args.push(this.expr()); }
      }
      this.eat('RPAREN');
      return { kind: 'call', name, args };
    }
    if (t.type === 'LPAREN') {
      this.eat();
      const e = this.expr();
      this.eat('RPAREN');
      return e;
    }
    throw new Error('unexpected token: ' + t.type);
  }
}

// ── Evaluator ────────────────────────────────────────────

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return !(s === '' || s === '0' || s === 'false' || s === 'no');
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function evalNode(node: ExprNode, formData: Record<string, unknown>): number | string | boolean {
  switch (node.kind) {
    case 'lit': return node.value;
    case 'field': return (formData[node.name] as number | string | boolean | undefined) ?? '';
    case 'unary': {
      const v = evalNode(node.arg, formData);
      if (node.op === '-') return -toNumber(v);
      if (node.op === 'NOT') return !toBool(v);
      return v;
    }
    case 'bin': {
      const op = node.op;
      // Short-circuit logical ops
      if (op === 'AND') return toBool(evalNode(node.left, formData)) && toBool(evalNode(node.right, formData));
      if (op === 'OR') return toBool(evalNode(node.left, formData)) || toBool(evalNode(node.right, formData));
      const l = evalNode(node.left, formData);
      const r = evalNode(node.right, formData);
      switch (op) {
        case '+': {
          if (typeof l === 'string' || typeof r === 'string') return toString(l) + toString(r);
          return toNumber(l) + toNumber(r);
        }
        case '-': return toNumber(l) - toNumber(r);
        case '*': return toNumber(l) * toNumber(r);
        case '/': { const d = toNumber(r); return d === 0 ? NaN : toNumber(l) / d; }
        case '%': { const d = toNumber(r); return d === 0 ? NaN : toNumber(l) % d; }
        case '>': return toNumber(l) > toNumber(r);
        case '<': return toNumber(l) < toNumber(r);
        case '>=': return toNumber(l) >= toNumber(r);
        case '<=': return toNumber(l) <= toNumber(r);
        case '==': return l == r; // loose
        case '!=': return l != r; // loose
      }
      return NaN;
    }
    case 'call': {
      const args = node.args.map((a) => evalNode(a, formData));
      switch (node.name) {
        // Math
        case 'ROUND': {
          const n = toNumber(args[0]);
          const d = args[1] !== undefined ? toNumber(args[1]) : 0;
          const f = Math.pow(10, d);
          return Math.round(n * f) / f;
        }
        case 'FLOOR': return Math.floor(toNumber(args[0]));
        case 'CEIL':  return Math.ceil(toNumber(args[0]));
        case 'ABS':   return Math.abs(toNumber(args[0]));
        case 'MIN':   return args.length ? Math.min(...args.map(toNumber)) : 0;
        case 'MAX':   return args.length ? Math.max(...args.map(toNumber)) : 0;
        case 'SUM':   return args.reduce<number>((a, b) => a + toNumber(b), 0);
        case 'COUNT': return args.filter((v) => v !== '' && v !== null && v !== undefined).length;
        case 'AVG':   {
          const ns = args.filter((v) => v !== '' && v !== null && v !== undefined).map(toNumber);
          return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
        }
        // String
        case 'CONCAT': return args.map(toString).join('');
        case 'UPPER':  return toString(args[0]).toUpperCase();
        case 'LOWER':  return toString(args[0]).toLowerCase();
        case 'LEN':    return toString(args[0]).length;
        case 'LEFT':   return toString(args[0]).slice(0, toNumber(args[1] ?? 0));
        case 'RIGHT':  { const s = toString(args[0]); const n = toNumber(args[1] ?? 0); return n <= 0 ? '' : s.slice(-n); }
        // Date
        case 'TODAY': {
          const d = new Date();
          return d.toISOString().slice(0, 10);
        }
        case 'DATEDIFF': {
          const a = parseDate(args[0]);
          const b = parseDate(args[1]);
          if (!a || !b) return NaN;
          return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
        }
        case 'DATEADD': {
          const d = parseDate(args[0]);
          if (!d) return NaN;
          const n = toNumber(args[1]);
          const unit = toString(args[2] ?? 'days').toLowerCase();
          const out = new Date(d);
          if (unit.startsWith('day')) out.setDate(out.getDate() + n);
          else if (unit.startsWith('week')) out.setDate(out.getDate() + n * 7);
          else if (unit.startsWith('month')) out.setMonth(out.getMonth() + n);
          else if (unit.startsWith('year')) out.setFullYear(out.getFullYear() + n);
          return out.toISOString().slice(0, 10);
        }
        // Logic / null
        case 'IF':       return toBool(args[0]) ? (args[1] ?? '') : (args[2] ?? '');
        case 'COALESCE': return args.find((v) => v !== '' && v !== null && v !== undefined) ?? '';
        case 'ISNULL':   return (args[0] === '' || args[0] === null || args[0] === undefined) ? (args[1] ?? '') : args[0];
      }
      return NaN;
    }
  }
}

// ── Public API ───────────────────────────────────────────

/**
 * Pure arithmetic-only evaluator (kept for backwards compat with callers
 * that import this directly). Accepts +-*\/%, parens, unary minus.
 *
 * Returns NaN when:
 *  - expression is malformed
 *  - division/modulo by zero
 *  - the result is not a number (e.g. AND/OR/strings without surrounding fns)
 */
export function safeEvaluateArithmetic(expr: string): number {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return NaN;
  try {
    const ast = new Parser(tokens).parse();
    const v = evalNode(ast, {});
    return typeof v === 'number' ? v : NaN;
  } catch {
    return NaN;
  }
}

/**
 * Evaluate a formula string with `{field_name}` references against form data.
 *
 * Returns:
 *   - a number for arithmetic results (rounded to `precision` if provided)
 *   - a string for string-producing functions (CONCAT, UPPER, etc.)
 *   - a boolean for predicate results (IF predicate, AND/OR, comparisons)
 *   - '—' for malformed input or NaN
 */
export function evaluateFormula(
  formula: string,
  formData: Record<string, unknown>,
  precision?: number,
): string | number | boolean {
  if (!formula) return '';
  const tokens = tokenize(formula);
  if (tokens.length === 0) return '—';
  try {
    const ast = new Parser(tokens).parse();
    const result = evalNode(ast, formData);
    if (typeof result === 'number') {
      if (isNaN(result) || !isFinite(result)) return '—';
      return precision !== undefined ? Number(result.toFixed(precision)) : result;
    }
    return result;
  } catch {
    return '—';
  }
}
