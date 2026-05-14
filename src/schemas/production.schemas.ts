/**
 * ── Production Module Zod Schemas ──
 * Form validation schemas for all Production forms.
 */
import { z } from 'zod';

// ── Helpers ──
const requiredStr = (field: string) => z.string().min(1, `${field} is required`);
const positiveNum = (field: string) => z.coerce.number().positive(`${field} must be positive`);
const optionalStr = z.string().optional().or(z.literal(''));
const optionalNum = z.coerce.number().optional();

// ── Cutting Entry ──
export const cuttingEntrySchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  cuttingDate: requiredStr('Cutting date'),
  tableNo: optionalStr,
  layers: z.coerce.number().int().min(1).optional(),
  fabricType: optionalStr,
  plannedQtyBySize: z.record(z.string(), z.coerce.number().int().min(0)).optional(),
  actualQtyBySize: z.record(z.string(), z.coerce.number().int().min(0)).optional(),
  wastageQty: z.coerce.number().int().min(0).default(0),
  cutBy: optionalStr,
  verifiedBy: optionalStr,
  remarks: optionalStr,
});
export type CuttingEntryFormData = z.infer<typeof cuttingEntrySchema>;

// ── Production Update ──
export const productionUpdateSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  lineNo: requiredStr('Line number'),
  productionDate: requiredStr('Production date'),
  process: z.enum(['CUTTING', 'SEWING', 'FINISHING', 'PACKING', 'WASHING', 'OTHER']),
  qtyInput: z.coerce.number().int().min(0),
  qtyOutput: z.coerce.number().int().min(0),
  qtyReject: z.coerce.number().int().min(0).default(0),
  qtyAlter: z.coerce.number().int().min(0).default(0),
  remarks: optionalStr,
});
export type ProductionUpdateFormData = z.infer<typeof productionUpdateSchema>;

// ── FG Transfer ──
export const fgTransferSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  transferDate: requiredStr('Transfer date'),
  fromWarehouseId: optionalNum,
  toWarehouseId: optionalNum,
  totalQty: positiveNum('Total quantity'),
  qtyBySize: z.record(z.string(), z.coerce.number().int().min(0)).optional(),
  qcSummary: optionalStr,
  transferredBy: optionalStr,
  remarks: optionalStr,
});
export type FgTransferFormData = z.infer<typeof fgTransferSchema>;

// ── Operation Master ──
export const operationSchema = z.object({
  code: requiredStr('Operation code'),
  name: requiredStr('Operation name'),
  department: requiredStr('Department'),
  machineTypeId: z.coerce.number().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type OperationFormData = z.infer<typeof operationSchema>;

// ── Bulletin ──
export const bulletinItemSchema = z.object({
  operationId: z.coerce.number().positive('Select an operation'),
  seqNo: z.coerce.number().int().min(1),
  machineType: optionalStr,
  machineTypeId: optionalNum,
  sam: z.coerce.number().positive('SAM must be positive'),
  attachments: optionalStr,
  remarks: optionalStr,
});

export const bulletinSchema = z.object({
  styleId: z.coerce.number().positive('Select a style'),
  orderId: optionalNum,
  manpower: z.coerce.number().int().min(1).optional(),
  machines: z.coerce.number().int().min(1).optional(),
  remarks: optionalStr,
  items: z.array(bulletinItemSchema).min(1, 'Add at least one operation'),
});
export type BulletinFormData = z.infer<typeof bulletinSchema>;

// ── Production Order ──
export const productionOrderSchema = z.object({
  orderId: z.coerce.number().positive('Select an order'),
  lineNo: optionalStr,
  lineId: optionalNum,
  bulletinId: optionalNum,
  lineBalancingId: optionalNum,
  startDate: requiredStr('Start date'),
  endDate: requiredStr('End date'),
  totalQty: positiveNum('Total quantity'),
  type: z.enum(['NORMAL', 'URGENT', 'SAMPLE']).default('NORMAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  remarks: optionalStr,
});
export type ProductionOrderFormData = z.infer<typeof productionOrderSchema>;

// ── Hourly Production ──
export const hourlyProductionSchema = z.object({
  productionOrderId: z.coerce.number().positive('Select a production order'),
  hour: z.coerce.number().int().min(1).max(24),
  date: requiredStr('Date'),
  output: z.coerce.number().int().min(0),
  defects: z.coerce.number().int().min(0).default(0),
  remarks: optionalStr,
});
export type HourlyProductionFormData = z.infer<typeof hourlyProductionSchema>;

// ── Bundle ──
export const bundleSchema = z.object({
  cuttingEntryId: z.coerce.number().positive('Select a cutting entry'),
  size: requiredStr('Size'),
  qty: positiveNum('Quantity'),
  serialStart: z.coerce.number().int().min(1).optional(),
  serialEnd: z.coerce.number().int().min(1).optional(),
});
export type BundleFormData = z.infer<typeof bundleSchema>;
