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
  list: () => client.get('/hrm/departments'),
  create: (d: Record<string, unknown>) => client.post('/hrm/departments', d),
};

export const designationApi = {
  list: () => client.get('/hrm/designations'),
  create: (d: Record<string, unknown>) => client.post('/hrm/designations', d),
};

export const employeeApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/employees', { params }),
  getById: (id: number) => client.get(`/hrm/employees/${id}`),
  create: (d: Record<string, unknown>) => client.post('/hrm/employees', d),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/employees/${id}`, d),
  terminate: (id: number, data: Record<string, unknown>) => client.patch(`/hrm/employees/${id}/terminate`, data),
};

export const attendanceApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/attendance', { params }),
  mark: (d: Record<string, unknown>) => client.post('/hrm/attendance', d),
  bulkMark: (d: Record<string, unknown>) => client.post('/hrm/attendance/bulk', d),
  summary: (params: Record<string, string | number | boolean | undefined>) => client.get('/hrm/attendance/summary', { params }),
};

export const leaveApi = {
  types: () => client.get('/hrm/leave-types'),
  createType: (d: Record<string, unknown>) => client.post('/hrm/leave-types', d),
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/leaves', { params }),
  apply: (d: Record<string, unknown>) => client.post('/hrm/leaves', d),
  approve: (id: number) => client.patch(`/hrm/leaves/${id}/approve`),
  reject: (id: number) => client.patch(`/hrm/leaves/${id}/reject`),
};

export const salaryApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/salary-slips', { params }),
  process: (month: number, year: number) => client.post('/hrm/salary/process', { month, year }),
  markPaid: (month: number, year: number) => client.post('/hrm/salary/mark-paid', { month, year }),
};

export const loanApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/loans', { params }),
  create: (d: Record<string, unknown>) => client.post('/hrm/loans', d),
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
  list: () => client.get('/hrm/shifts'),
  getById: (id: number) => client.get(`/hrm/shifts/${id}`),
  create: (d: Record<string, unknown>) => client.post('/hrm/shifts', d),
  update: (id: number, d: Record<string, unknown>) => client.put(`/hrm/shifts/${id}`, d),
  delete: (id: number) => client.delete(`/hrm/shifts/${id}`),
  assign: (d: { employeeId: number; shiftId: number | null }) => client.post('/hrm/shifts/assign', d),
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
  get: (params: { employeeId: number; year: number }) => client.get('/hrm/leave-balances', { params }),
  allocate: (d: { employeeId: number; year: number }) => client.post('/hrm/leave-balances/allocate', d),
  bulkAllocate: (d: { year: number }) => client.post('/hrm/leave-balances/bulk-allocate', d),
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
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/hrm/fnf', { params }),
  getByEmployee: (empId: number) => client.get(`/hrm/fnf/employee/${empId}`),
  generate: (d: { employeeId: number }) => client.post('/hrm/fnf/generate', d),
  approve: (id: number) => client.patch(`/hrm/fnf/${id}/approve`),
  markPaid: (id: number) => client.patch(`/hrm/fnf/${id}/mark-paid`),
};

/* ─── Statutory Exports ─── */

export const exportApi = {
  ecrUrl: (month: number, year: number) => `/hrm/export/ecr?month=${month}&year=${year}`,
  esiUrl: (month: number, year: number) => `/hrm/export/esi?month=${month}&year=${year}`,
  ecr: (params: { month: number; year: number }) => client.get('/hrm/export/ecr', { params, responseType: 'blob' }),
  esi: (params: { month: number; year: number }) => client.get('/hrm/export/esi', { params, responseType: 'blob' }),
};
