import client from './client';

/* ─── Interfaces ─── */

export interface FinancialYear {
  id: number;
  fyCode: string;
  fyName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
}

export interface ChartOfAccount {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountGroup: string;
  parentId: number | null;
  isGroup: boolean;
  normalBalance: string;
  isSystemAccount: boolean;
  openingBalance: number;
  children?: ChartOfAccount[];
  parent?: { accountCode: string; accountName: string };
}

export interface JournalEntryDetail {
  id?: number;
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  partyType?: string | null;
  partyId?: number | null;
  costCenter?: string | null;
  narration?: string | null;
  account?: ChartOfAccount;
}

export interface JournalEntry {
  id: number;
  jeNo: string;
  jeDate: string;
  jeType: string;
  referenceType?: string;
  referenceId?: number;
  narration?: string;
  totalDebit: number;
  totalCredit: number;
  isPosted: boolean;
  status: string;
  details: JournalEntryDetail[];
  financialYear?: FinancialYear;
}

export interface SalesInvoiceDetail {
  id?: number;
  skuCode: string;
  description: string;
  hsnCode?: string;
  qty: number;
  unitPrice: number;
  amount?: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
}

export interface SalesInvoice {
  id: number;
  invoiceNo: string;
  orderId: number;
  buyerId: number;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: number;
  subTotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  inrAmount: number;
  irnNumber?: string;
  status: string;
  buyer?: { id: number; name: string };
  order?: { id: number; orderNo: string };
  details?: SalesInvoiceDetail[];
}

export interface PaymentReceipt {
  id: number;
  receiptNo: string;
  buyerId: number;
  invoiceId: number;
  receiptDate: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  inrAmount: number;
  paymentMode: string;
  bankRef?: string;
  forexGainLoss: number;
  status: string;
  buyer?: { id: number; name: string };
  invoice?: { id: number; invoiceNo: string; totalAmount: number };
}

export interface PaymentOut {
  id: number;
  paymentNo: string;
  supplierId: number;
  purchaseInvoiceId: number;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  bankRef?: string;
  tdsAmount: number;
  netAmount: number;
  status: string;
  supplier?: { id: number; name: string };
  purchaseInvoice?: { id: number; invoiceNo: string; totalAmount: number };
}

export interface CreditNote {
  id: number;
  cnNo: string;
  buyerId: number;
  originalInvoiceId: number;
  amount: number;
  reason: string;
  status: string;
  buyer?: { id: number; name: string };
  originalInvoice?: { id: number; invoiceNo: string };
}

export interface DebitNote {
  id: number;
  dnNo: string;
  supplierId: number;
  purchaseInvoiceId: number;
  amount: number;
  reason: string;
  status: string;
  supplier?: { id: number; name: string };
  purchaseInvoice?: { id: number; invoiceNo: string };
}

export interface ArAgingRow {
  invoiceNo: string;
  buyer: { id: number; name: string };
  totalAmount: number;
  currency: string;
  outstanding: number;
  daysDue: number;
  bucket: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

/* ─── APIs ─── */

export const financialYearApi = {
  list: () => client.get('/finance/financial-years'),
  create: (d: Record<string, unknown>) => client.post('/finance/financial-years', d),
  close: (id: number) => client.patch(`/finance/financial-years/${id}/close`),
};

export const accountApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/finance/accounts', { params }),
  tree: () => client.get('/finance/accounts/tree'),
  create: (d: Record<string, unknown>) => client.post('/finance/accounts', d),
  update: (id: number, d: Record<string, unknown>) => client.put(`/finance/accounts/${id}`, d),
};

export const journalEntryApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/finance/journal-entries', { params }),
  getById: (id: number) => client.get(`/finance/journal-entries/${id}`),
  create: (d: Record<string, unknown>) => client.post('/finance/journal-entries', d),
  post: (id: number) => client.patch(`/finance/journal-entries/${id}/post`),
  reverse: (id: number) => client.patch(`/finance/journal-entries/${id}/reverse`),
};

export const salesInvoiceApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/finance/sales-invoices', { params }),
  getById: (id: number) => client.get(`/finance/sales-invoices/${id}`),
  create: (d: Record<string, unknown>) => client.post('/finance/sales-invoices', d),
  updateStatus: (id: number, status: string) => client.patch(`/finance/sales-invoices/${id}/status`, { status }),
};

export const paymentReceiptApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/finance/payment-receipts', { params }),
  create: (d: Record<string, unknown>) => client.post('/finance/payment-receipts', d),
};

export const paymentOutApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/finance/payment-outs', { params }),
  create: (d: Record<string, unknown>) => client.post('/finance/payment-outs', d),
};

export const creditNoteApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/finance/credit-notes', { params }),
  create: (d: Record<string, unknown>) => client.post('/finance/credit-notes', d),
  updateStatus: (id: number, status: string) => client.patch(`/finance/credit-notes/${id}/status`, { status }),
};

export const debitNoteApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/finance/debit-notes', { params }),
  create: (d: Record<string, unknown>) => client.post('/finance/debit-notes', d),
  updateStatus: (id: number, status: string) => client.patch(`/finance/debit-notes/${id}/status`, { status }),
};

export const financeReportApi = {
  arAging: () => client.get('/finance/reports/ar-aging'),
  trialBalance: () => client.get('/finance/reports/trial-balance'),
};

// ── Fixed Asset API ──
export const fixedAssetApi = {
  list: (params?: Record<string, unknown>) => client.get('/finance/fixed-assets', { params }).then(r => r.data),
  getById: (id: number) => client.get(`/finance/fixed-assets/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => client.post('/finance/fixed-assets', data).then(r => r.data),
  dispose: (id: number, data: Record<string, unknown>) => client.patch(`/finance/fixed-assets/${id}/dispose`, data).then(r => r.data),
  runDepreciation: (period: string) => client.post('/finance/fixed-assets/depreciation', { period }).then(r => r.data),
};

// ── GST API ──
export const gstApi = {
  list: (params?: Record<string, unknown>) => client.get('/finance/gst-returns', { params }).then(r => r.data),
  generateGstr1: (period: string) => client.post(`/finance/gst-returns/gstr1/${period}`).then(r => r.data),
  generateGstr3b: (period: string) => client.post(`/finance/gst-returns/gstr3b/${period}`).then(r => r.data),
  file: (id: number, arn: string) => client.patch(`/finance/gst-returns/${id}/file`, { arn }).then(r => r.data),
  reconcile2B: (period: string) => client.post(`/finance/gst-returns/reconcile-2b/${period}`).then(r => r.data),
};

// ── Bank Reconciliation API ──
export const bankReconApi = {
  list: (params?: Record<string, unknown>) => client.get('/finance/bank-reconciliation', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) => client.post('/finance/bank-reconciliation', data).then(r => r.data),
  addItems: (id: number, items: Record<string, unknown>[]) => client.post(`/finance/bank-reconciliation/${id}/items`, { items }).then(r => r.data),
  reconcile: (id: number, itemIds: number[]) => client.patch(`/finance/bank-reconciliation/${id}/reconcile`, { itemIds }).then(r => r.data),
  statement: (params: Record<string, unknown>) => client.get('/finance/bank-statement', { params }).then(r => r.data),
};

// ── Extended Report API ──
export const extendedReportApi = {
  apAging: () => client.get('/finance/reports/ap-aging').then(r => r.data),
  balanceSheet: (financialYearId: number) => client.get('/finance/reports/balance-sheet', { params: { financialYearId } }).then(r => r.data),
  profitLoss: (financialYearId: number, from?: string, to?: string) => client.get('/finance/reports/profit-loss', { params: { financialYearId, from, to } }).then(r => r.data),
  cashFlow: (from: string, to: string) => client.get('/finance/reports/cash-flow', { params: { from, to } }).then(r => r.data),
  fundFlow: (from: string, to: string) => client.get('/finance/reports/fund-flow', { params: { from, to } }).then(r => r.data),
};
