/**
 * ── Finance Module Zod Schemas ──
 * Form validation schemas for all Finance forms.
 */
import { z } from 'zod';

// ── Helpers ──
const requiredStr = (field: string) => z.string().min(1, `${field} is required`);
const positiveNum = (field: string) => z.coerce.number().positive(`${field} must be positive`);
const optionalStr = z.string().optional().or(z.literal(''));
const optionalNum = z.coerce.number().optional();

// ── Financial Year ──
export const financialYearSchema = z.object({
  fyCode: requiredStr('FY code'),
  fyName: requiredStr('FY name'),
  startDate: requiredStr('Start date'),
  endDate: requiredStr('End date'),
});
export type FinancialYearFormData = z.infer<typeof financialYearSchema>;

// ── Chart of Account ──
export const accountSchema = z.object({
  accountCode: requiredStr('Account code'),
  accountName: requiredStr('Account name'),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  accountGroup: requiredStr('Account group'),
  parentId: z.coerce.number().positive().nullable().optional(),
  isGroup: z.boolean().default(false),
  normalBalance: z.enum(['DEBIT', 'CREDIT']),
  openingBalance: z.coerce.number().default(0),
});
export type AccountFormData = z.infer<typeof accountSchema>;

// ── Journal Entry ──
export const journalEntryDetailSchema = z.object({
  accountId: z.coerce.number().positive('Select an account'),
  debitAmount: z.coerce.number().min(0).default(0),
  creditAmount: z.coerce.number().min(0).default(0),
  partyType: optionalStr,
  partyId: optionalNum,
  costCenter: optionalStr,
  narration: optionalStr,
});

export const journalEntrySchema = z.object({
  jeDate: requiredStr('Journal entry date'),
  jeType: z.enum(['GENERAL', 'ADJUSTING', 'CLOSING', 'OPENING']).default('GENERAL'),
  narration: optionalStr,
  details: z.array(journalEntryDetailSchema).min(2, 'At least 2 lines required'),
});
export type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

// ── Payment Receipt ──
export const paymentReceiptSchema = z.object({
  buyerId: z.coerce.number().positive('Select a buyer'),
  invoiceId: z.coerce.number().positive('Select an invoice'),
  receiptDate: requiredStr('Receipt date'),
  amount: positiveNum('Amount'),
  currency: z.string().default('INR'),
  exchangeRate: z.coerce.number().positive().default(1),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'LC', 'TT', 'RTGS', 'NEFT']),
  bankRef: optionalStr,
});
export type PaymentReceiptFormData = z.infer<typeof paymentReceiptSchema>;

// ── Payment Out ──
export const paymentOutSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  purchaseInvoiceId: z.coerce.number().positive('Select a purchase invoice'),
  paymentDate: requiredStr('Payment date'),
  amount: positiveNum('Amount'),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'RTGS', 'NEFT']),
  bankRef: optionalStr,
  tdsAmount: z.coerce.number().min(0).default(0),
});
export type PaymentOutFormData = z.infer<typeof paymentOutSchema>;

// ── Credit Note ──
export const creditNoteSchema = z.object({
  buyerId: z.coerce.number().positive('Select a buyer'),
  originalInvoiceId: z.coerce.number().positive('Select the original invoice'),
  amount: positiveNum('Amount'),
  reason: requiredStr('Reason'),
});
export type CreditNoteFormData = z.infer<typeof creditNoteSchema>;

// ── Debit Note ──
export const debitNoteSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  purchaseInvoiceId: z.coerce.number().positive('Select a purchase invoice'),
  amount: positiveNum('Amount'),
  reason: requiredStr('Reason'),
});
export type DebitNoteFormData = z.infer<typeof debitNoteSchema>;

// ── E-Way Bill ──
export const ewayBillSchema = z.object({
  salesInvoiceId: z.coerce.number().positive('Select a sales invoice'),
  transportMode: z.enum(['ROAD', 'RAIL', 'AIR', 'SHIP']),
  vehicleNo: optionalStr,
  transporterId: optionalStr,
  fromPlace: requiredStr('From place'),
  toPlace: requiredStr('To place'),
  fromPincode: requiredStr('From pincode'),
  toPincode: requiredStr('To pincode'),
  transDistance: z.coerce.number().min(0, 'Distance must be ≥ 0'),
});
export type EwayBillFormData = z.infer<typeof ewayBillSchema>;

// ── Bank Reconciliation ──
export const bankReconSchema = z.object({
  bankAccountId: z.coerce.number().positive('Select a bank account'),
  statementDate: requiredStr('Statement date'),
  statementBalance: z.coerce.number(),
  remarks: optionalStr,
});
export type BankReconFormData = z.infer<typeof bankReconSchema>;

// ── GST Filing ──
export const gstFileSchema = z.object({
  arn: z.string().min(1, 'ARN is required').regex(/^[A-Z0-9]+$/, 'Invalid ARN format'),
});
export type GstFileFormData = z.infer<typeof gstFileSchema>;

// ── Fixed Asset Disposal ──
export const fixedAssetDisposalSchema = z.object({
  disposalDate: requiredStr('Disposal date'),
  disposalMethod: z.enum(['SOLD', 'SCRAPPED', 'DONATED', 'WRITTEN_OFF']),
  saleAmount: z.coerce.number().min(0).default(0),
  remarks: optionalStr,
});
export type FixedAssetDisposalFormData = z.infer<typeof fixedAssetDisposalSchema>;
