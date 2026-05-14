/**
 * ── Export / Shipping Module Zod Schemas ──
 * Form validation schemas for all Export forms.
 */
import { z } from 'zod';

// ── Helpers ──
const requiredStr = (field: string) => z.string().min(1, `${field} is required`);
const positiveNum = (field: string) => z.coerce.number().positive(`${field} must be positive`);
const optionalStr = z.string().optional().or(z.literal(''));
const optionalNum = z.coerce.number().optional();

// ── Shipping Bill ──
export const shippingBillSchema = z.object({
  sbNumber: requiredStr('SB number'),
  sbDate: requiredStr('SB date'),
  portOfLoading: requiredStr('Port of loading'),
  portOfDischarge: requiredStr('Port of discharge'),
  buyerOrderId: z.coerce.number().positive('Select an order'),
  exporterId: optionalNum,
  fobValueInr: positiveNum('FOB value (INR)'),
  fobValueUsd: optionalNum,
  exchangeRate: optionalNum,
  currency: z.string().default('USD'),
  drawbackAmount: optionalNum,
  igstAmount: optionalNum,
  customsDuty: optionalNum,
  shippingLine: optionalStr,
  vesselName: optionalStr,
  leoDate: optionalStr,
  remarks: optionalStr,
});
export type ShippingBillFormData = z.infer<typeof shippingBillSchema>;

// ── Bill of Lading ──
export const billOfLadingSchema = z.object({
  blNumber: requiredStr('B/L number'),
  blDate: requiredStr('B/L date'),
  shippingBillId: z.coerce.number().positive('Select a shipping bill'),
  vesselName: requiredStr('Vessel name'),
  voyageNo: optionalStr,
  portOfLoading: requiredStr('Port of loading'),
  portOfDischarge: requiredStr('Port of discharge'),
  containerCount: z.coerce.number().int().min(0).default(0),
  containerNumbers: optionalStr,
  grossWeight: optionalNum,
  netWeight: optionalNum,
  measurementCbm: optionalNum,
  freightAmount: optionalNum,
  onBoardDate: optionalStr,
  consigneeName: optionalStr,
  notifyParty: optionalStr,
  remarks: optionalStr,
});
export type BillOfLadingFormData = z.infer<typeof billOfLadingSchema>;

// ── Certificate of Origin ──
export const cooSchema = z.object({
  cooNumber: requiredStr('COO number'),
  cooDate: requiredStr('COO date'),
  issuingAuthority: requiredStr('Issuing authority'),
  shippingBillId: z.coerce.number().positive('Select a shipping bill'),
  destinationCountry: requiredStr('Destination country'),
  originCountry: z.string().default('India'),
  exporterName: optionalStr,
  importerName: optionalStr,
  hsCode: optionalStr,
  remarks: optionalStr,
});
export type CooFormData = z.infer<typeof cooSchema>;

// ── Letter of Credit ──
export const letterOfCreditSchema = z.object({
  lcNumber: requiredStr('LC number'),
  lcDate: requiredStr('LC date'),
  issuingBank: requiredStr('Issuing bank'),
  advisingBank: optionalStr,
  applicant: requiredStr('Applicant'),
  beneficiary: requiredStr('Beneficiary'),
  buyerOrderId: optionalNum,
  amount: positiveNum('Amount'),
  currency: z.string().default('USD'),
  expiryDate: requiredStr('Expiry date'),
  latestShipmentDate: optionalStr,
  paymentTerms: optionalStr,
  transhipmentAllowed: z.boolean().default(false),
  partialShipmentAllowed: z.boolean().default(false),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'AMENDED']).default('DRAFT'),
  remarks: optionalStr,
});
export type LetterOfCreditFormData = z.infer<typeof letterOfCreditSchema>;

// ── Export Incentive ──
export const exportIncentiveSchema = z.object({
  shippingBillId: z.coerce.number().positive('Select a shipping bill'),
  incentiveType: z.enum([
    'DRAWBACK',
    'MEIS',
    'RODTEP',
    'ROSCTL',
    'IGST_REFUND',
    'ADVANCE_AUTH',
    'OTHER',
  ]),
  amount: positiveNum('Amount'),
  currency: z.string().default('INR'),
  claimDate: optionalStr,
  sanctionDate: optionalStr,
  scrip: optionalStr,
  status: z.enum(['PENDING', 'CLAIMED', 'SANCTIONED', 'RECEIVED', 'REJECTED']).default('PENDING'),
  remarks: optionalStr,
});
export type ExportIncentiveFormData = z.infer<typeof exportIncentiveSchema>;

// ── Commercial Invoice ──
export const commercialInvoiceSchema = z.object({
  invoiceNumber: requiredStr('Invoice number'),
  invoiceDate: requiredStr('Invoice date'),
  buyerOrderId: z.coerce.number().positive('Select an order'),
  buyerName: requiredStr('Buyer name'),
  currency: z.string().default('USD'),
  exchangeRate: optionalNum,
  totalFobValue: positiveNum('Total FOB value'),
  freightCharge: optionalNum,
  insuranceCharge: optionalNum,
  cifValue: optionalNum,
  paymentTerms: optionalStr,
  hsCode: optionalStr,
  countryOfOrigin: z.string().default('India'),
  remarks: optionalStr,
});
export type CommercialInvoiceFormData = z.infer<typeof commercialInvoiceSchema>;

// ── Shipping Instruction ──
export const shippingInstructionSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  shipper: requiredStr('Shipper'),
  consignee: requiredStr('Consignee'),
  forwardingAgent: optionalStr,
  portOfLoading: requiredStr('Port of loading'),
  portOfDischarge: requiredStr('Port of discharge'),
  finalDestination: optionalStr,
  deliveryTerms: optionalStr,
  method: z.enum(['SEA', 'AIR', 'ROAD', 'RAIL', 'MULTIMODAL']).default('SEA'),
  cartons: z.coerce.number().int().min(0).optional(),
  grossWeight: optionalNum,
  netWeight: optionalNum,
  measurementCbm: optionalNum,
  specialInstructions: optionalStr,
  remarks: optionalStr,
});
export type ShippingInstructionFormData = z.infer<typeof shippingInstructionSchema>;

// ── Doc Checklist ──
export const docChecklistSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  shippingBillId: optionalNum,
  commercialInvoice: z.boolean().default(false),
  packingList: z.boolean().default(false),
  billOfLading: z.boolean().default(false),
  certificateOfOrigin: z.boolean().default(false),
  bankRealizationCert: z.boolean().default(false),
  gspForm: z.boolean().default(false),
  insuranceCert: z.boolean().default(false),
  fumigationCert: z.boolean().default(false),
  inspectionCert: z.boolean().default(false),
  courierTrackingNo: optionalStr,
  submittedOn: optionalStr,
  remarks: optionalStr,
});
export type DocChecklistFormData = z.infer<typeof docChecklistSchema>;

// ── Incentive Rate ──
export const incentiveRateSchema = z.object({
  hsCode: requiredStr('HS code'),
  description: optionalStr,
  schemeType: z.enum(['DRAWBACK', 'RODTEP', 'ROSCTL', 'MEIS', 'OTHER']),
  ratePercent: z.coerce.number().min(0).max(100, 'Rate cannot exceed 100%'),
  capPerUnit: optionalNum,
  effectiveFrom: requiredStr('Effective from'),
  effectiveTo: optionalStr,
  remarks: optionalStr,
});
export type IncentiveRateFormData = z.infer<typeof incentiveRateSchema>;
