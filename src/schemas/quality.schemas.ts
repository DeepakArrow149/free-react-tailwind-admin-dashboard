/**
 * ── Quality Module Zod Schemas ──
 * Form validation schemas for all Quality forms.
 */
import { z } from 'zod';

// ── Helpers ──
const requiredStr = (field: string) => z.string().min(1, `${field} is required`);
const positiveNum = (field: string) => z.coerce.number().positive(`${field} must be positive`);
const optionalStr = z.string().optional().or(z.literal(''));
const optionalNum = z.coerce.number().optional();

// ── AQL Defect Entry ──
export const aqlDefectEntrySchema = z.object({
  defectCode: requiredStr('Defect code'),
  defectName: requiredStr('Defect name'),
  defectCategory: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
  count: z.coerce.number().int().min(0, 'Count must be ≥ 0'),
  location: optionalStr,
});

// ── AQL Inspection ──
export const aqlInspectionSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  inspectionDate: requiredStr('Inspection date'),
  inspectionType: z.enum(['INLINE', 'FINAL', 'PRE_SHIPMENT']),
  lotQty: positiveNum('Lot quantity'),
  inspectionLevel: z.string().default('II'),
  aqlMajor: z.coerce.number().min(0).default(2.5),
  aqlMinor: z.coerce.number().min(0).default(4.0),
  inspectorName: optionalStr,
  buyerQcName: optionalStr,
  remarks: optionalStr,
  defectEntries: z.array(aqlDefectEntrySchema).optional(),
});
export type AqlInspectionFormData = z.infer<typeof aqlInspectionSchema>;

// ── AQL Result Recording ──
export const aqlResultSchema = z.object({
  foundMajor: z.coerce.number().int().min(0).default(0),
  foundMinor: z.coerce.number().int().min(0).default(0),
  result: z.enum(['PASS', 'FAIL', 'CONDITIONAL']),
  remarks: optionalStr,
  defectEntries: z.array(aqlDefectEntrySchema).optional(),
});
export type AqlResultFormData = z.infer<typeof aqlResultSchema>;

// ── Fabric Inspection ──
export const fabricInspectionSchema = z.object({
  rollId: optionalStr,
  grnId: optionalNum,
  inspectionDate: requiredStr('Inspection date'),
  inspectionType: z.enum(['4_POINT', '10_POINT']).default('4_POINT'),
  totalDefectPoints: z.coerce.number().int().min(0).default(0),
  inspectedLength: positiveNum('Inspected length'),
  inspectedWidth: positiveNum('Inspected width'),
  inspectorName: optionalStr,
  remarks: optionalStr,
});
export type FabricInspectionFormData = z.infer<typeof fabricInspectionSchema>;

// ── Lab Test Request ──
export const labTestSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  styleId: optionalNum,
  testType: z.enum(['SHRINKAGE', 'COLOR_FASTNESS', 'TEAR_STRENGTH', 'PILLING', 'GSM', 'COMPOSITION', 'OTHER']),
  labName: optionalStr,
  sentDate: optionalStr,
  expectedDate: optionalStr,
  remarks: optionalStr,
});
export type LabTestFormData = z.infer<typeof labTestSchema>;

// ── Lab Test Result ──
export const labTestResultSchema = z.object({
  parameter: requiredStr('Parameter'),
  standardValue: requiredStr('Standard value'),
  actualValue: optionalStr,
  tolerance: optionalStr,
  result: z.enum(['PASS', 'FAIL', 'MARGINAL']).optional(),
  testReportUrl: optionalStr,
});
export type LabTestResultFormData = z.infer<typeof labTestResultSchema>;

// ── Buyer Claim ──
export const buyerClaimSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  buyerId: z.coerce.number().positive('Select a buyer'),
  invoiceId: optionalNum,
  claimType: z.enum(['QUALITY', 'SHORTAGE', 'LATE_DELIVERY', 'WRONG_SHIPMENT', 'OTHER']),
  claimDate: requiredStr('Claim date'),
  claimedAmount: positiveNum('Claimed amount'),
  currency: z.string().default('USD'),
  description: requiredStr('Description'),
  remarks: optionalStr,
});
export type BuyerClaimFormData = z.infer<typeof buyerClaimSchema>;

// ── Endline QC ──
export const endlineQcSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  lineNo: requiredStr('Line number'),
  inspectionDate: requiredStr('Inspection date'),
  checkedQty: positiveNum('Checked quantity'),
  passQty: z.coerce.number().int().min(0),
  defectQty: z.coerce.number().int().min(0).default(0),
  alterQty: z.coerce.number().int().min(0).default(0),
  rejectQty: z.coerce.number().int().min(0).default(0),
  defects: z.array(aqlDefectEntrySchema).optional(),
});
export type EndlineQcFormData = z.infer<typeof endlineQcSchema>;
