/**
 * ── Frontend Zod Validation Schemas ──
 *
 * Reusable Zod v4 schemas for key ERP forms.
 * Used with react-hook-form + @hookform/resolvers/zod.
 */
import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────
const requiredStr = (field: string) => z.string().min(1, `${field} is required`);
const positiveNum = (field: string) => z.coerce.number().positive(`${field} must be positive`);
const optionalStr = z.string().optional().or(z.literal(''));
const optionalNum = z.coerce.number().optional();

// ── Purchase Order ───────────────────────────────────
export const purchaseOrderLineSchema = z.object({
  materialId: z.coerce.number().positive('Select a material'),
  description: optionalStr,
  uom: requiredStr('UOM'),
  quantity: positiveNum('Quantity'),
  unitPrice: positiveNum('Unit price'),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  deliveryDate: optionalStr,
});

export const purchaseOrderSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  poDate: requiredStr('PO date'),
  deliveryDate: optionalStr,
  currency: z.string().default('INR'),
  paymentTerms: optionalStr,
  remarks: optionalStr,
  details: z.array(purchaseOrderLineSchema).min(1, 'Add at least one line item'),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

// ── Sales / Buyer Order ──────────────────────────────
export const buyerOrderLineSchema = z.object({
  styleId: z.coerce.number().positive('Select a style'),
  color: requiredStr('Color'),
  quantity: positiveNum('Quantity'),
  unitPrice: positiveNum('Unit price'),
  deliveryDate: optionalStr,
});

export const buyerOrderSchema = z.object({
  buyerId: z.coerce.number().positive('Select a buyer'),
  orderDate: requiredStr('Order date'),
  orderType: z.enum(['CONFIRMED', 'PROJECT', 'SAMPLE', 'CMT', 'FOB']),
  season: optionalStr,
  shipMode: z.enum(['SEA', 'AIR', 'ROAD']).optional(),
  currency: z.string().default('INR'),
  remarks: optionalStr,
  details: z.array(buyerOrderLineSchema).min(1, 'Add at least one style'),
});

export type BuyerOrderFormData = z.infer<typeof buyerOrderSchema>;

// ── Sales Invoice ────────────────────────────────────
export const salesInvoiceLineSchema = z.object({
  description: requiredStr('Description'),
  hsnCode: optionalStr,
  quantity: positiveNum('Quantity'),
  unitPrice: positiveNum('Unit price'),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
});

export const salesInvoiceSchema = z.object({
  buyerId: z.coerce.number().positive('Select a buyer'),
  invoiceDate: requiredStr('Invoice date'),
  placeOfSupply: requiredStr('Place of supply'),
  currency: z.string().default('INR'),
  salesOrderId: optionalNum,
  details: z.array(salesInvoiceLineSchema).min(1, 'Add at least one line item'),
});

export type SalesInvoiceFormData = z.infer<typeof salesInvoiceSchema>;

// ── GRN ──────────────────────────────────────────────
export const grnLineSchema = z.object({
  materialId: z.coerce.number().positive(),
  receivedQty: positiveNum('Received qty'),
  acceptedQty: z.coerce.number().min(0, 'Cannot be negative'),
  rejectedQty: z.coerce.number().min(0).optional(),
  remarks: optionalStr,
});

export const grnSchema = z.object({
  purchaseOrderId: z.coerce.number().positive('Select a PO'),
  grnDate: requiredStr('GRN date'),
  challanNo: optionalStr,
  warehouseId: z.coerce.number().positive('Select a warehouse').optional(),
  details: z.array(grnLineSchema).min(1, 'Add at least one line'),
});

export type GrnFormData = z.infer<typeof grnSchema>;

// ── E-Invoice ────────────────────────────────────────
export const eInvoiceSchema = z.object({
  salesInvoiceId: z.coerce.number().positive('Select a sales invoice'),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'),
});

export type EInvoiceFormData = z.infer<typeof eInvoiceSchema>;

// ── Fixed Asset ──────────────────────────────────────
export const fixedAssetSchema = z.object({
  assetCode: requiredStr('Asset code'),
  assetName: requiredStr('Asset name'),
  category: requiredStr('Category'),
  purchaseDate: requiredStr('Purchase date'),
  purchaseCost: positiveNum('Purchase cost'),
  depreciationMethod: z.enum(['SLM', 'WDV']).default('SLM'),
  depreciationRate: z.coerce.number().min(0).max(100).optional(),
  usefulLifeYears: z.coerce.number().int().min(1).optional(),
  location: optionalStr,
});

export type FixedAssetFormData = z.infer<typeof fixedAssetSchema>;

// ── User Management ──────────────────────────────────
export const createUserSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(50),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  name: requiredStr('Name'),
  roleId: z.coerce.number().positive('Select a role').optional(),
  branchId: z.coerce.number().positive('Select a branch').optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

// ── Email Template ───────────────────────────────────
export const emailTemplateSchema = z.object({
  templateCode: z.string().min(1, 'Code is required').max(50).regex(/^[A-Z_]+$/, 'UPPER_SNAKE_CASE only'),
  templateName: requiredStr('Template name'),
  subject: requiredStr('Subject'),
  bodyHtml: z.string().min(10, 'Body must be at least 10 characters'),
  bodyText: optionalStr,
  variables: optionalStr,
  eventTrigger: optionalStr,
  isActive: z.boolean().default(true),
});

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
