/**
 * ── HRM Module Zod Schemas ──
 * Form validation schemas for all HRM forms.
 */
import { z } from 'zod';

// ── Helpers ──
const requiredStr = (field: string) => z.string().min(1, `${field} is required`);
const positiveNum = (field: string) => z.coerce.number().positive(`${field} must be positive`);
const optionalStr = z.string().optional().or(z.literal(''));
const optionalNum = z.coerce.number().optional();

// ── Department ──
export const departmentSchema = z.object({
  code: requiredStr('Department code'),
  name: requiredStr('Department name'),
});
export type DepartmentFormData = z.infer<typeof departmentSchema>;

// ── Designation ──
export const designationSchema = z.object({
  name: requiredStr('Designation name'),
  level: z.coerce.number().int().min(0, 'Level must be ≥ 0'),
});
export type DesignationFormData = z.infer<typeof designationSchema>;

// ── Employee ──
export const employeeSchema = z.object({
  empCode: requiredStr('Employee code'),
  firstName: requiredStr('First name'),
  lastName: requiredStr('Last name'),
  departmentId: z.coerce.number().positive('Select a department'),
  designationId: z.coerce.number().positive('Select a designation'),
  dateOfJoining: requiredStr('Date of joining'),
  dateOfBirth: optionalStr,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: optionalStr,
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  grossSalary: positiveNum('Gross salary'),
  pfApplicable: z.boolean().default(false),
  esiApplicable: z.boolean().default(false),
});
export type EmployeeFormData = z.infer<typeof employeeSchema>;

// ── Attendance ──
export const attendanceSchema = z.object({
  employeeId: z.coerce.number().positive('Select an employee'),
  attendanceDate: requiredStr('Attendance date'),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKLY_OFF']),
  inTime: optionalStr,
  outTime: optionalStr,
  overtimeHours: z.coerce.number().min(0).default(0),
  lateMinutes: z.coerce.number().min(0).default(0),
});
export type AttendanceFormData = z.infer<typeof attendanceSchema>;

// ── Leave Type ──
export const leaveTypeSchema = z.object({
  name: requiredStr('Leave type name'),
  code: requiredStr('Leave type code'),
  isPaid: z.boolean().default(true),
  maxDaysPerYear: z.coerce.number().int().positive('Max days must be positive'),
});
export type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>;

// ── Leave Application ──
export const leaveApplicationSchema = z.object({
  employeeId: z.coerce.number().positive('Select an employee'),
  leaveTypeId: z.coerce.number().positive('Select a leave type'),
  fromDate: requiredStr('From date'),
  toDate: requiredStr('To date'),
  reason: requiredStr('Reason'),
});
export type LeaveApplicationFormData = z.infer<typeof leaveApplicationSchema>;

// ── Loan ──
export const loanSchema = z.object({
  employeeId: z.coerce.number().positive('Select an employee'),
  loanType: requiredStr('Loan type'),
  amount: positiveNum('Loan amount'),
  emiAmount: positiveNum('EMI amount'),
  startMonth: z.coerce.number().int().min(1).max(12),
  startYear: z.coerce.number().int().min(2020).max(2100),
  remarks: optionalStr,
});
export type LoanFormData = z.infer<typeof loanSchema>;

// ── Shift ──
export const shiftSchema = z.object({
  code: requiredStr('Shift code'),
  name: requiredStr('Shift name'),
  startTime: requiredStr('Start time'),
  endTime: requiredStr('End time'),
  breakMinutes: z.coerce.number().int().min(0).default(0),
  isNightShift: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type ShiftFormData = z.infer<typeof shiftSchema>;

// ── Holiday ──
export const holidaySchema = z.object({
  name: requiredStr('Holiday name'),
  date: requiredStr('Holiday date'),
  type: z.enum(['NATIONAL', 'RESTRICTED', 'COMPANY']).default('NATIONAL'),
  isOptional: z.boolean().default(false),
});
export type HolidayFormData = z.infer<typeof holidaySchema>;

// ── Overtime ──
export const overtimeSchema = z.object({
  employeeId: z.coerce.number().positive('Select an employee'),
  date: requiredStr('Overtime date'),
  hours: z.coerce.number().positive('Hours must be positive'),
  reason: optionalStr,
});
export type OvertimeFormData = z.infer<typeof overtimeSchema>;

// ── Overtime Rule ──
export const overtimeRuleSchema = z.object({
  name: requiredStr('Rule name'),
  multiplier: z.coerce.number().min(1, 'Multiplier must be ≥ 1'),
  thresholdHours: z.coerce.number().min(0).default(0),
  applicableDays: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});
export type OvertimeRuleFormData = z.infer<typeof overtimeRuleSchema>;

// ── Salary Component ──
export const salaryComponentSchema = z.object({
  name: requiredStr('Component name'),
  code: requiredStr('Component code'),
  type: z.enum(['EARNING', 'DEDUCTION']),
  isPercentage: z.boolean().default(false),
  percentageOf: optionalStr,
  amount: optionalNum,
  isTaxable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type SalaryComponentFormData = z.infer<typeof salaryComponentSchema>;

// ── Piece Rate ──
export const pieceRateSchema = z.object({
  operationId: z.coerce.number().positive('Select an operation'),
  styleId: z.coerce.number().positive('Select a style').optional(),
  ratePerPiece: positiveNum('Rate per piece'),
  effectiveFrom: requiredStr('Effective from date'),
  effectiveTo: optionalStr,
});
export type PieceRateFormData = z.infer<typeof pieceRateSchema>;

// ── PT Slab ──
export const ptSlabSchema = z.object({
  state: requiredStr('State'),
  fromAmount: z.coerce.number().min(0),
  toAmount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
  gender: z.enum(['MALE', 'FEMALE', 'ALL']).default('ALL'),
});
export type PtSlabFormData = z.infer<typeof ptSlabSchema>;

// ── PF Return ──
export const pfReturnSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  dueDate: requiredStr('Due date'),
  totalEpf: optionalNum,
  totalEps: optionalNum,
  totalEdli: optionalNum,
  adminCharges: optionalNum,
  challanNo: optionalStr,
  depositDate: optionalStr,
});
export type PfReturnFormData = z.infer<typeof pfReturnSchema>;

// ── ESI Return ──
export const esiReturnSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  totalEmployeeContribution: optionalNum,
  totalEmployerContribution: optionalNum,
  challanNo: optionalStr,
  depositDate: optionalStr,
});
export type EsiReturnFormData = z.infer<typeof esiReturnSchema>;
