/**
 * ── Procurement Module Zod Schemas ──
 * Form validation schemas for all Procurement forms.
 */
import { z } from 'zod';

// ── Helpers ──
const requiredStr = (field: string) => z.string().min(1, `${field} is required`);
const positiveNum = (field: string) => z.coerce.number().positive(`${field} must be positive`);
const optionalStr = z.string().optional().or(z.literal(''));
const optionalNum = z.coerce.number().optional();

// ── RFQ Detail Line ──
export const rfqDetailSchema = z.object({
  itemDescription: requiredStr('Item description'),
  specification: optionalStr,
  qty: positiveNum('Quantity'),
  unit: requiredStr('Unit'),
  requiredDate: optionalStr,
});

// ── RFQ ──
export const rfqSchema = z.object({
  orderId: optionalNum,
  materialType: optionalStr,
  description: optionalStr,
  requiredDate: optionalStr,
  details: z.array(rfqDetailSchema).min(1, 'Add at least one item'),
});
export type RfqFormData = z.infer<typeof rfqSchema>;

// ── Supplier Quotation ──
export const quotationDetailSchema = z.object({
  rfqDetailId: z.coerce.number().positive(),
  unitPrice: positiveNum('Unit price'),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  moq: z.coerce.number().int().min(0).optional(),
  paymentTerms: optionalStr,
  remarks: optionalStr,
});

export const quotationSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  quoteNo: optionalStr,
  quoteDate: optionalStr,
  validityDate: optionalStr,
  currency: z.string().default('INR'),
  remarks: optionalStr,
  details: z.array(quotationDetailSchema).min(1, 'Add at least one line'),
});
export type QuotationFormData = z.infer<typeof quotationSchema>;

// ── GRN Detail Line ──
export const grnDetailSchema = z.object({
  poDetailId: z.coerce.number().positive(),
  receivedQty: positiveNum('Received qty'),
  acceptedQty: z.coerce.number().min(0, 'Cannot be negative'),
  rejectedQty: z.coerce.number().min(0).default(0),
  rejectionReason: optionalStr,
});

// ── GRN ──
export const procurementGrnSchema = z.object({
  poId: z.coerce.number().positive('Select a purchase order'),
  grnDate: requiredStr('GRN date'),
  warehouseId: optionalNum,
  vehicleNo: optionalStr,
  challanNo: optionalStr,
  challanDate: optionalStr,
  remarks: optionalStr,
  details: z.array(grnDetailSchema).min(1, 'Add at least one line'),
});
export type ProcurementGrnFormData = z.infer<typeof procurementGrnSchema>;

// ── Subcontract Outward ──
export const subcontractOutwardSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  orderId: z.coerce.number().positive('Select an order'),
  processType: z.enum(['EMBROIDERY', 'PRINTING', 'WASHING', 'DYEING', 'OTHER']),
  dispatchDate: requiredStr('Dispatch date'),
  expectedReturnDate: requiredStr('Expected return date'),
  items: z.array(z.object({
    sku: requiredStr('SKU'),
    qty: positiveNum('Quantity'),
  })).min(1, 'Add at least one item'),
  ewayBillNo: optionalStr,
  remarks: optionalStr,
});
export type SubcontractOutwardFormData = z.infer<typeof subcontractOutwardSchema>;

// ── Subcontract Inward ──
export const subcontractInwardSchema = z.object({
  challanOutwardId: z.coerce.number().positive('Select an outward challan'),
  receivedDate: requiredStr('Received date'),
  receivedQty: z.coerce.number().int().min(0),
  rejectedQty: z.coerce.number().int().min(0).default(0),
  excessQty: z.coerce.number().int().min(0).default(0),
  shortageQty: z.coerce.number().int().min(0).default(0),
  dcNo: optionalStr,
});
export type SubcontractInwardFormData = z.infer<typeof subcontractInwardSchema>;

// ── Vendor Rating ──
export const vendorRatingGenerateSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  periodFrom: requiredStr('Period from'),
  periodTo: requiredStr('Period to'),
});
export type VendorRatingGenerateFormData = z.infer<typeof vendorRatingGenerateSchema>;

// ── Supplier Return ──
export const supplierReturnSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  grnId: z.coerce.number().positive('Select a GRN'),
  returnDate: requiredStr('Return date'),
  returnQty: positiveNum('Return quantity'),
  reason: requiredStr('Reason'),
  remarks: optionalStr,
});
export type SupplierReturnFormData = z.infer<typeof supplierReturnSchema>;

// ── Purchase Invoice ──
export const purchaseInvoiceSchema = z.object({
  supplierId: z.coerce.number().positive('Select a supplier'),
  poId: z.coerce.number().positive('Select a purchase order'),
  invoiceNo: requiredStr('Invoice number'),
  invoiceDate: requiredStr('Invoice date'),
  dueDate: optionalStr,
  totalAmount: positiveNum('Total amount'),
  taxAmount: z.coerce.number().min(0).default(0),
  remarks: optionalStr,
});
export type PurchaseInvoiceFormData = z.infer<typeof purchaseInvoiceSchema>;
