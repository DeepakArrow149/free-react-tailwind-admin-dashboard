import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  departmentApi,
  designationApi,
  employeeApi,
  attendanceApi,
  leaveApi,
  salaryApi,
  loanApi,
  shiftApi,
  leaveBalanceApi,
  fnfApi,
  exportApi,
  holidayApi,
  overtimeApi,
  overtimeRuleApi,
  salaryComponentApi,
  pieceRateApi,
  operatorProductionApi,
  ptSlabApi,
  pfReturnApi,
  esiReturnApi,
  hrmReportApi,
} from '@/api/hrm';
import { toast } from 'sonner';

// ── helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  // Department
  departments:      ['hrm', 'departments'] as const,
  // Designation
  designations:     ['hrm', 'designations'] as const,
  // Employee
  employees:        ['hrm', 'employees'] as const,
  employee:         (id: number) => ['hrm', 'employees', id] as const,
  // Attendance
  attendance:       ['hrm', 'attendance'] as const,
  attendanceSummary:['hrm', 'attendance', 'summary'] as const,
  // Leave
  leaveTypes:       ['hrm', 'leave-types'] as const,
  leaves:           ['hrm', 'leaves'] as const,
  // Salary
  salarySlips:      ['hrm', 'salary-slips'] as const,
  // Loans
  loans:            ['hrm', 'loans'] as const,
  // Shifts
  shifts:           ['hrm', 'shifts'] as const,
  shift:            (id: number) => ['hrm', 'shifts', id] as const,
  // Leave Balance
  leaveBalances:    ['hrm', 'leave-balances'] as const,
  // FnF
  fnf:              ['hrm', 'fnf'] as const,
  fnfByEmployee:    (empId: number) => ['hrm', 'fnf', 'employee', empId] as const,
  // Holidays
  holidays:         ['hrm', 'holidays'] as const,
  holiday:          (id: number) => ['hrm', 'holidays', id] as const,
  // Overtime
  overtime:         ['hrm', 'overtime'] as const,
  overtimeSingle:   (id: number) => ['hrm', 'overtime', id] as const,
  overtimeSummary:  ['hrm', 'overtime', 'summary'] as const,
  // Overtime Rules
  overtimeRules:    ['hrm', 'overtime-rules'] as const,
  overtimeRule:     (id: number) => ['hrm', 'overtime-rules', id] as const,
  // Salary Components
  salaryComponents: ['hrm', 'salary-components'] as const,
  salaryComponent:  (id: number) => ['hrm', 'salary-components', id] as const,
  // Piece Rates
  pieceRates:       ['hrm', 'piece-rates'] as const,
  pieceRate:        (id: number) => ['hrm', 'piece-rates', id] as const,
  // Operator Production
  operatorProduction:         ['hrm', 'operator-production'] as const,
  operatorProductionEarnings: ['hrm', 'operator-production', 'earnings'] as const,
  // PT Slabs
  ptSlabs:          ['hrm', 'pt-slabs'] as const,
  ptSlab:           (id: number) => ['hrm', 'pt-slabs', id] as const,
  // PF Returns
  pfReturns:        ['hrm', 'pf-returns'] as const,
  pfReturn:         (id: number) => ['hrm', 'pf-returns', id] as const,
  // ESI Returns
  esiReturns:       ['hrm', 'esi-returns'] as const,
  esiReturn:        (id: number) => ['hrm', 'esi-returns', id] as const,
  // Reports
  wageRegister:     ['hrm', 'reports', 'wage-register'] as const,
  form16:           (empId: number) => ['hrm', 'reports', 'form16', empId] as const,
};

// ═══════ DEPARTMENTS ═══════

export function useDepartments() {
  return useQuery({
    queryKey: K.departments,
    queryFn: () => departmentApi.list(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => departmentApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.departments }); toast.success('Department created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ DESIGNATIONS ═══════

export function useDesignations() {
  return useQuery({
    queryKey: K.designations,
    queryFn: () => designationApi.list(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => designationApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.designations }); toast.success('Designation created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ EMPLOYEES ═══════

export function useEmployees(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.employees, params],
    queryFn: () => employeeApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: K.employee(id),
    queryFn: () => employeeApi.getById(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => employeeApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.employees }); toast.success('Employee created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => employeeApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.employees }); toast.success('Employee updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useTerminateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => employeeApi.terminate(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.employees }); toast.success('Employee terminated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ ATTENDANCE ═══════

export function useAttendance(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.attendance, params],
    queryFn: () => attendanceApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useAttendanceSummary(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.attendanceSummary, params],
    queryFn: () => attendanceApi.summary(params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!params.employeeId || !!params.month,
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => attendanceApi.mark(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.attendance }); toast.success('Attendance marked'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBulkMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => attendanceApi.bulkMark(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.attendance }); toast.success('Bulk attendance marked'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ LEAVE ═══════

export function useLeaveTypes() {
  return useQuery({
    queryKey: K.leaveTypes,
    queryFn: () => leaveApi.types(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leaveApi.createType(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.leaveTypes }); toast.success('Leave type created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useLeaves(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.leaves, params],
    queryFn: () => leaveApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leaveApi.apply(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.leaves }); toast.success('Leave applied'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leaveApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.leaves }); toast.success('Leave approved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leaveApi.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.leaves }); toast.success('Leave rejected'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SALARY ═══════

export function useSalarySlips(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.salarySlips, params],
    queryFn: () => salaryApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useProcessSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => salaryApi.process(month, year),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.salarySlips }); toast.success('Salary processed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useMarkSalaryPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => salaryApi.markPaid(month, year),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.salarySlips }); toast.success('Salary marked as paid'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ LOANS ═══════

export function useLoans(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.loans, params],
    queryFn: () => loanApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => loanApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.loans }); toast.success('Loan created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SHIFTS ═══════

export function useShifts() {
  return useQuery({
    queryKey: K.shifts,
    queryFn: () => shiftApi.list(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useShift(id: number) {
  return useQuery({
    queryKey: K.shift(id),
    queryFn: () => shiftApi.getById(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => shiftApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.shifts }); toast.success('Shift created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => shiftApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.shifts }); toast.success('Shift updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => shiftApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.shifts }); toast.success('Shift deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAssignShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: number; shiftId: number | null }) => shiftApi.assign(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.employees }); toast.success('Shift assigned'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ LEAVE BALANCES ═══════

export function useLeaveBalances(params: { employeeId: number; year: number }) {
  return useQuery({
    queryKey: [...K.leaveBalances, params],
    queryFn: () => leaveBalanceApi.get(params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!params.employeeId && !!params.year,
  });
}

export function useAllocateLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: number; year: number }) => leaveBalanceApi.allocate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.leaveBalances }); toast.success('Leave balance allocated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBulkAllocateLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { year: number }) => leaveBalanceApi.bulkAllocate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.leaveBalances }); toast.success('Bulk leave allocation done'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ FNF SETTLEMENT ═══════

export function useFnfSettlements(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.fnf, params],
    queryFn: () => fnfApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useFnfByEmployee(empId: number) {
  return useQuery({
    queryKey: K.fnfByEmployee(empId),
    queryFn: () => fnfApi.getByEmployee(empId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!empId,
  });
}

export function useGenerateFnf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: number }) => fnfApi.generate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fnf }); toast.success('FnF settlement generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApproveFnf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fnfApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fnf }); toast.success('FnF approved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useMarkFnfPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fnfApi.markPaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fnf }); toast.success('FnF marked as paid'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ STATUTORY EXPORTS (ECR / ESI) ═══════

export function useDownloadEcr() {
  return useMutation({
    mutationFn: (params: { month: number; year: number }) => exportApi.ecr(params),
    onSuccess: () => toast.success('ECR file downloaded'),
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDownloadEsi() {
  return useMutation({
    mutationFn: (params: { month: number; year: number }) => exportApi.esi(params),
    onSuccess: () => toast.success('ESI file downloaded'),
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ HOLIDAYS ═══════

export function useHolidays(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.holidays, params],
    queryFn: () => holidayApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useHoliday(id: number) {
  return useQuery({
    queryKey: K.holiday(id),
    queryFn: () => holidayApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => holidayApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.holidays }); toast.success('Holiday created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => holidayApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.holidays }); toast.success('Holiday updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => holidayApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.holidays }); toast.success('Holiday deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ OVERTIME ═══════

export function useOvertimeRecords(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.overtime, params],
    queryFn: () => overtimeApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useOvertimeRecord(id: number) {
  return useQuery({
    queryKey: K.overtimeSingle(id),
    queryFn: () => overtimeApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useOvertimeSummary(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.overtimeSummary, params],
    queryFn: () => overtimeApi.summary(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => overtimeApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.overtime }); toast.success('Overtime record created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBulkCreateOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => overtimeApi.bulkCreate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.overtime }); toast.success('Bulk overtime created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApproveOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => overtimeApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.overtime }); toast.success('Overtime approved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useRejectOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => overtimeApi.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.overtime }); toast.success('Overtime rejected'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ OVERTIME RULES ═══════

export function useOvertimeRules() {
  return useQuery({
    queryKey: K.overtimeRules,
    queryFn: () => overtimeRuleApi.list(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useOvertimeRule(id: number) {
  return useQuery({
    queryKey: K.overtimeRule(id),
    queryFn: () => overtimeRuleApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateOvertimeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => overtimeRuleApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.overtimeRules }); toast.success('Overtime rule created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateOvertimeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => overtimeRuleApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.overtimeRules }); toast.success('Overtime rule updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteOvertimeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => overtimeRuleApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.overtimeRules }); toast.success('Overtime rule deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SALARY COMPONENTS ═══════

export function useSalaryComponents() {
  return useQuery({
    queryKey: K.salaryComponents,
    queryFn: () => salaryComponentApi.list(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useSalaryComponent(id: number) {
  return useQuery({
    queryKey: K.salaryComponent(id),
    queryFn: () => salaryComponentApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateSalaryComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => salaryComponentApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.salaryComponents }); toast.success('Salary component created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateSalaryComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => salaryComponentApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.salaryComponents }); toast.success('Salary component updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PIECE RATES ═══════

export function usePieceRates(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.pieceRates, params],
    queryFn: () => pieceRateApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function usePieceRate(id: number) {
  return useQuery({
    queryKey: K.pieceRate(id),
    queryFn: () => pieceRateApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreatePieceRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pieceRateApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.pieceRates }); toast.success('Piece rate created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdatePieceRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => pieceRateApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.pieceRates }); toast.success('Piece rate updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ OPERATOR PRODUCTION ═══════

export function useOperatorProduction(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.operatorProduction, params],
    queryFn: () => operatorProductionApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useRecordOperatorProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => operatorProductionApi.record(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.operatorProduction }); toast.success('Production recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useOperatorEarnings(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.operatorProductionEarnings, params],
    queryFn: () => operatorProductionApi.earnings(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

// ═══════ PT SLABS ═══════

export function usePtSlabs() {
  return useQuery({
    queryKey: K.ptSlabs,
    queryFn: () => ptSlabApi.list(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function usePtSlab(id: number) {
  return useQuery({
    queryKey: K.ptSlab(id),
    queryFn: () => ptSlabApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreatePtSlab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => ptSlabApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.ptSlabs }); toast.success('PT slab created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdatePtSlab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => ptSlabApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.ptSlabs }); toast.success('PT slab updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PF RETURNS ═══════

export function usePfReturns(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.pfReturns, params],
    queryFn: () => pfReturnApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function usePfReturn(id: number) {
  return useQuery({
    queryKey: K.pfReturn(id),
    queryFn: () => pfReturnApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreatePfReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pfReturnApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.pfReturns }); toast.success('PF return created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdatePfReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => pfReturnApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.pfReturns }); toast.success('PF return updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ ESI RETURNS ═══════

export function useEsiReturns(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.esiReturns, params],
    queryFn: () => esiReturnApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useEsiReturn(id: number) {
  return useQuery({
    queryKey: K.esiReturn(id),
    queryFn: () => esiReturnApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateEsiReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => esiReturnApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.esiReturns }); toast.success('ESI return created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateEsiReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => esiReturnApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.esiReturns }); toast.success('ESI return updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ HRM REPORTS ═══════

export function useWageRegister(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.wageRegister, params],
    queryFn: () => hrmReportApi.wageRegister(params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!params.month && !!params.year,
  });
}

export function useForm16(employeeId: number) {
  return useQuery({
    queryKey: K.form16(employeeId),
    queryFn: () => hrmReportApi.form16(employeeId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!employeeId,
  });
}
