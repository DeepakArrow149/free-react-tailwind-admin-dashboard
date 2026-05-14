import client from './client';

/* ─── Interfaces ─── */

export interface Department {
  id: number;
  code: string;
  name: string;
  _count?: { employees: number };
}

export interface Designation {
  id: number;
  name: string;
  level: number;
}

export interface Employee {
  id: number;
  empCode: string;
  firstName: string;
  lastName: string;
  departmentId: number;
  designationId: number;
  dateOfJoining: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  grossSalary: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  status: string;
  department?: { id: number; name: string };
  designation?: { id: number; name: string };
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  attendanceDate: string;
  status: string;
  inTime?: string;
  outTime?: string;
  overtimeHours: number;
  lateMinutes: number;
  employee?: { id: number; empCode: string; firstName: string; lastName: string };
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  holiday: number;
  weeklyOff: number;
  totalOtHours: number;
  totalLateMinutes: number;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  isPaid: boolean;
  maxDaysPerYear: number;
}

export interface LeaveApplication {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: string;
  employee?: { id: number; empCode: string; firstName: string; lastName: string };
  leaveType?: { id: number; name: string; code: string };
}

export interface SalarySlip {
  id: number;
  slipNo: string;
  employeeId: number;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  otherAllowance: number;
  overtimeAmount: number;
  grossSalary: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  loanDeduction: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  employee?: { id: number; empCode: string; firstName: string; lastName: string };
}

/* ─── APIs ─── */

export const departmentApi = {
  list: () => client.get('/hrm/departments').then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/departments', d).then(r => r.data),
};

export const designationApi = {
  list: () => client.get('/hrm/designations').then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/designations', d).then(r => r.data),
};

export const employeeApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/employees', { params }).then(r => r.data),
  getById: (id: number) => client.get(`/hrm/employees/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/employees', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/employees/${id}`, d).then(r => r.data),
  terminate: (id: number, data: Record<string, unknown>) => client.patch(`/hrm/employees/${id}/terminate`, data).then(r => r.data),
};

export const attendanceApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/attendance', { params }).then(r => r.data),
  mark: (d: Record<string, unknown>) => client.post('/hrm/attendance', d).then(r => r.data),
  bulkMark: (d: Record<string, unknown>) => client.post('/hrm/attendance/bulk', d).then(r => r.data),
  summary: (params: Record<string, string | number | boolean | undefined>) => client.get('/hrm/attendance/summary', { params }).then(r => r.data),
};

export const leaveApi = {
  types: () => client.get('/hrm/leave-types').then(r => r.data),
  createType: (d: Record<string, unknown>) => client.post('/hrm/leave-types', d).then(r => r.data),
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/leaves', { params }).then(r => r.data),
  apply: (d: Record<string, unknown>) => client.post('/hrm/leaves', d).then(r => r.data),
  approve: (id: number) => client.patch(`/hrm/leaves/${id}/approve`).then(r => r.data),
  reject: (id: number) => client.patch(`/hrm/leaves/${id}/reject`).then(r => r.data),
};

export const salaryApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/salary-slips', { params }).then(r => r.data),
  process: (month: number, year: number) => client.post('/hrm/salary/process', { month, year }).then(r => r.data),
  markPaid: (month: number, year: number) => client.post('/hrm/salary/mark-paid', { month, year }).then(r => r.data),
};

export const loanApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/loans', { params }).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/loans', d).then(r => r.data),
};

/* ─── Shift ─── */

export interface Shift {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift: boolean;
  isActive: boolean;
  _count?: { employees: number };
}

export const shiftApi = {
  list: () => client.get('/hrm/shifts').then(r => r.data),
  getById: (id: number) => client.get(`/hrm/shifts/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/shifts', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/shifts/${id}`, d).then(r => r.data),
  delete: (id: number) => client.delete(`/hrm/shifts/${id}`).then(r => r.data),
  assign: (d: { employeeId: number; shiftId: number | null }) => client.post('/hrm/shifts/assign', d).then(r => r.data),
};

/* ─── Leave Balance ─── */

export interface LeaveBalance {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  year: number;
  allocated: number;
  used: number;
  balance: number;
  carryForward: number;
  leaveType?: { id: number; name: string; code: string };
  employee?: { id: number; empCode: string; firstName: string; lastName: string };
}

export const leaveBalanceApi = {
  get: (params: { employeeId: number; year: number }) => client.get('/hrm/leave-balances', { params }).then(r => r.data),
  allocate: (d: { employeeId: number; year: number }) => client.post('/hrm/leave-balances/allocate', d).then(r => r.data),
  bulkAllocate: (d: { year: number }) => client.post('/hrm/leave-balances/bulk-allocate', d).then(r => r.data),
};

/* ─── FnF Settlement ─── */

export interface FnFSettlement {
  id: number;
  employeeId: number;
  settlementDate: string;
  lastWorkingDay: string;
  pendingSalary: number;
  leaveEncashment: number;
  bonus: number;
  gratuity: number;
  deductions: number;
  loanRecovery: number;
  netPayable: number;
  remarks?: string;
  status: string;
  createdBy: number;
  employee?: { id: number; empCode: string; firstName: string; lastName: string };
}

export const fnfApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/fnf', { params }).then(r => r.data),
  getByEmployee: (empId: number) => client.get(`/hrm/fnf/employee/${empId}`).then(r => r.data),
  generate: (d: { employeeId: number }) => client.post('/hrm/fnf/generate', d).then(r => r.data),
  approve: (id: number) => client.patch(`/hrm/fnf/${id}/approve`).then(r => r.data),
  markPaid: (id: number) => client.patch(`/hrm/fnf/${id}/mark-paid`).then(r => r.data),
};

/* ─── Statutory Exports ─── */

export const exportApi = {
  ecrUrl: (month: number, year: number) => `/hrm/export/ecr?month=${month}&year=${year}`,
  esiUrl: (month: number, year: number) => `/hrm/export/esi?month=${month}&year=${year}`,
  ecr: (params: { month: number; year: number }) => client.get('/hrm/export/ecr', { params, responseType: 'blob' }),
  esi: (params: { month: number; year: number }) => client.get('/hrm/export/esi', { params, responseType: 'blob' }),
};

/* ─── Holiday Calendar ─── */

export const holidayApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/holidays', { params }).then(r => r.data),
  get: (id: number) => client.get(`/hrm/holidays/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/holidays', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/holidays/${id}`, d).then(r => r.data),
  delete: (id: number) => client.delete(`/hrm/holidays/${id}`).then(r => r.data),
};

/* ─── Overtime ─── */

export const overtimeApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/overtime', { params }).then(r => r.data),
  get: (id: number) => client.get(`/hrm/overtime/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/overtime', d).then(r => r.data),
  bulkCreate: (d: Record<string, unknown>) => client.post('/hrm/overtime/bulk', d).then(r => r.data),
  approve: (id: number) => client.patch(`/hrm/overtime/${id}/approve`).then(r => r.data),
  reject: (id: number) => client.patch(`/hrm/overtime/${id}/reject`).then(r => r.data),
  summary: (params: Record<string, string | number | boolean | undefined>) => client.get('/hrm/overtime/summary', { params }).then(r => r.data),
};

/* ─── Overtime Rules ─── */

export const overtimeRuleApi = {
  list: () => client.get('/hrm/overtime-rules').then(r => r.data),
  get: (id: number) => client.get(`/hrm/overtime-rules/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/overtime-rules', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/overtime-rules/${id}`, d).then(r => r.data),
  delete: (id: number) => client.delete(`/hrm/overtime-rules/${id}`).then(r => r.data),
};

/* ─── Salary Components ─── */

export const salaryComponentApi = {
  list: () => client.get('/hrm/salary-components').then(r => r.data),
  get: (id: number) => client.get(`/hrm/salary-components/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/salary-components', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/salary-components/${id}`, d).then(r => r.data),
};

/* ─── Piece-Rate Cards ─── */

export const pieceRateApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/piece-rates', { params }).then(r => r.data),
  get: (id: number) => client.get(`/hrm/piece-rates/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/piece-rates', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.patch(`/hrm/piece-rates/${id}`, d).then(r => r.data),
};

/* ─── Operator Production ─── */

export const operatorProductionApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/operator-production', { params }).then(r => r.data),
  record: (d: Record<string, unknown>) => client.post('/hrm/operator-production', d).then(r => r.data),
  earnings: (params: Record<string, string | number | boolean | undefined>) => client.get('/hrm/operator-production/earnings', { params }).then(r => r.data),
};

/* ─── PT Slabs ─── */

export const ptSlabApi = {
  list: () => client.get('/hrm/pt-slabs').then(r => r.data),
  get: (id: number) => client.get(`/hrm/pt-slabs/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/pt-slabs', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/pt-slabs/${id}`, d).then(r => r.data),
};

/* ─── PF Returns ─── */

export const pfReturnApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/pf-returns', { params }).then(r => r.data),
  get: (id: number) => client.get(`/hrm/pf-returns/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/pf-returns', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/pf-returns/${id}`, d).then(r => r.data),
};

/* ─── ESI Returns ─── */

export const esiReturnApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/esi-returns', { params }).then(r => r.data),
  get: (id: number) => client.get(`/hrm/esi-returns/${id}`).then(r => r.data),
  create: (d: Record<string, unknown>) => client.post('/hrm/esi-returns', d).then(r => r.data),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/esi-returns/${id}`, d).then(r => r.data),
};

/* ─── HRM Reports ─── */

export const hrmReportApi = {
  wageRegister: (params: Record<string, string | number | boolean | undefined>) => client.get('/hrm/reports/wage-register', { params }).then(r => r.data),
  form16: (employeeId: number) => client.get(`/hrm/reports/form16/${employeeId}`).then(r => r.data),
};
