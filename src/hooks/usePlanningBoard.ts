import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningBoardApi } from '@/api/planningBoard';
import type {
  BoardData, PlanningScenario, JobDetail,
  UnplannedOrder, BrandColor, CalendarDay, LineSummary,
  PlanningKPIs, StageSummary, OperationProgressSummary, JobLayout,
  TnaSummary, JobAlertsSummary, JobQualitySummary, JobReport,
} from '@/api/planningBoard';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types';

/** Axios error shape */
interface ApiErrorResponse {
  response?: { data?: { message?: string } };
  message?: string;
}

const KEYS = {
  scenarios: ['planning-board', 'scenarios'] as const,
  boardData: (scenarioId: number, from: string, to: string) =>
    ['planning-board', 'data', scenarioId, from, to] as const,
  jobDetail: (id: number) => ['planning-board', 'job', id] as const,
  stageSummary: (id: number) => ['planning-board', 'stage-summary', id] as const,
  operationProgress: (id: number) => ['planning-board', 'operation-progress', id] as const,
  jobLayout: (id: number) => ['planning-board', 'job-layout', id] as const,
  tnaSummary: (id: number) => ['planning-board', 'tna-summary', id] as const,
  jobAlerts: (id: number) => ['planning-board', 'job-alerts', id] as const,
  jobQuality: (id: number) => ['planning-board', 'job-quality', id] as const,
  jobReport: (id: number) => ['planning-board', 'job-report', id] as const,
  unplanned: (scenarioId: number) => ['planning-board', 'unplanned', scenarioId] as const,
  brandColors: ['planning-board', 'brand-colors'] as const,
  calendar: (from: string, to: string) => ['planning-board', 'calendar', from, to] as const,
  lineSummary: (scenarioId: number, from: string, to: string) =>
    ['planning-board', 'line-summary', scenarioId, from, to] as const,
  alerts: (scenarioId: number) => ['planning-board', 'alerts', scenarioId] as const,
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SCENARIOS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useScenarios(factoryCode?: string) {
  return useQuery({
    queryKey: [...KEYS.scenarios, factoryCode],
    queryFn: () => planningBoardApi.listScenarios(factoryCode),
    select: (res: ApiResponse<PlanningScenario[]>) => (res.data ?? res) as PlanningScenario[],
  });
}

export function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.createScenario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scenarios });
      toast.success('Scenario created');
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Failed to create scenario'),
  });
}

export function useUpdateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PlanningScenario> }) =>
      planningBoardApi.updateScenario(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scenarios });
      toast.success('Scenario updated');
    },
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.deleteScenario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scenarios });
      toast.success('Scenario deleted');
    },
  });
}

export function usePublishScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.publishScenario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scenarios });
      toast.success('Scenario published');
    },
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  BOARD DATA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useBoardData(
  scenarioId: number | null,
  fromDate: string,
  toDate: string,
  filters?: { department?: string; lineId?: number; brandGroup?: string }
) {
  return useQuery({
    queryKey: [...KEYS.boardData(scenarioId ?? 0, fromDate, toDate), filters],
    queryFn: () =>
      planningBoardApi.getBoardData({
        scenarioId: scenarioId!,
        fromDate,
        toDate,
        ...filters,
      }),
    select: (res: ApiResponse<BoardData>) => (res.data ?? res) as BoardData,
    enabled: !!scenarioId && !!fromDate && !!toDate,
    refetchInterval: 30_000, // Real-time refresh every 30s
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  JOBS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.createJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      toast.success('Job created');
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Failed to create job'),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      planningBoardApi.updateJob(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.deleteJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      toast.success('Job deleted');
    },
  });
}

export function useSplitJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { splitCount: number; lineIds?: number[]; quantities?: number[] } }) =>
      planningBoardApi.splitJob(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      toast.success('Job split successfully');
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Failed to split job'),
  });
}

export function useBulkMove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.bulkMove,
    onSuccess: (res: ApiResponse<{ movedCount: number }>) => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      const data = (res.data ?? res) as { movedCount: number };
      toast.success(`${data.movedCount} job(s) moved`);
    },
  });
}

export function useAutoAllocate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.autoAllocate,
    onSuccess: (res: ApiResponse<{ allocatedCount: number; warnings?: string[] }>) => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      const data = (res.data ?? res) as { allocatedCount: number; warnings?: string[] };
      toast.success(`${data.allocatedCount} job(s) auto-allocated`);
      if (data.warnings?.length) {
        data.warnings.forEach((w: string) => toast.warning(w));
      }
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Auto-allocate failed'),
  });
}

export function useJobDetail(id: number | null) {
  return useQuery({
    queryKey: KEYS.jobDetail(id ?? 0),
    queryFn: () => planningBoardApi.getJobDetail(id!),
    select: (res: ApiResponse<JobDetail>) => (res.data ?? res) as JobDetail,
    enabled: !!id,
  });
}

export function useStageSummary(id: number | null) {
  return useQuery({
    queryKey: KEYS.stageSummary(id ?? 0),
    queryFn: () => planningBoardApi.getStageSummary(id!),
    select: (res: ApiResponse<StageSummary>) => (res.data ?? res) as StageSummary,
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

export function useOperationProgress(id: number | null) {
  return useQuery({
    queryKey: KEYS.operationProgress(id ?? 0),
    queryFn: () => planningBoardApi.getOperationProgress(id!),
    select: (res: ApiResponse<OperationProgressSummary>) => (res.data ?? res) as OperationProgressSummary,
    enabled: !!id,
  });
}

export function useRecordOperationProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      jobId: number;
      data: {
        progressDate: string;
        entries: Array<{
          bulletinItemId: number;
          outputQty: number;
          defectQty?: number;
          reworkQty?: number;
          operatorId?: number | null;
          workstationId?: number | null;
          cycleTimeSec?: number | null;
          remarks?: string | null;
        }>;
      };
    }) => planningBoardApi.recordOperationProgress(params.jobId, params.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.operationProgress(vars.jobId) });
      qc.invalidateQueries({ queryKey: KEYS.jobLayout(vars.jobId) });
      toast.success('Operation progress saved');
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Failed to save operation progress'),
  });
}

export function useJobLayout(id: number | null) {
  return useQuery({
    queryKey: KEYS.jobLayout(id ?? 0),
    queryFn: () => planningBoardApi.getJobLayout(id!),
    select: (res: ApiResponse<JobLayout>) => (res.data ?? res) as JobLayout,
    enabled: !!id,
  });
}

export function useTnaSummary(id: number | null) {
  return useQuery({
    queryKey: KEYS.tnaSummary(id ?? 0),
    queryFn: () => planningBoardApi.getTnaSummary(id!),
    select: (res: ApiResponse<TnaSummary>) => (res.data ?? res) as TnaSummary,
    enabled: !!id,
    refetchInterval: 60_000,
  });
}

// ═══════════════════════════════════════════
//  DROP 4: ALERTS / QUALITY / REPORT HOOKS
// ═══════════════════════════════════════════

export function useJobAlerts(id: number | null) {
  return useQuery({
    queryKey: KEYS.jobAlerts(id ?? 0),
    queryFn: () => planningBoardApi.getJobAlerts(id!),
    select: (res: ApiResponse<JobAlertsSummary>) => (res.data ?? res) as JobAlertsSummary,
    enabled: !!id,
    refetchInterval: 60_000,
  });
}

export function useJobQualitySummary(id: number | null) {
  return useQuery({
    queryKey: KEYS.jobQuality(id ?? 0),
    queryFn: () => planningBoardApi.getJobQualitySummary(id!),
    select: (res: ApiResponse<JobQualitySummary>) => (res.data ?? res) as JobQualitySummary,
    enabled: !!id,
    refetchInterval: 60_000,
  });
}

export function useJobReport(id: number | null) {
  return useQuery({
    queryKey: KEYS.jobReport(id ?? 0),
    queryFn: () => planningBoardApi.getJobReport(id!),
    select: (res: ApiResponse<JobReport>) => (res.data ?? res) as JobReport,
    enabled: !!id,
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  UNPLANNED ORDERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useUnplannedOrders(
  scenarioId: number | null,
  params?: { buyerId?: number; search?: string; page?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...KEYS.unplanned(scenarioId ?? 0), params],
    queryFn: () =>
      planningBoardApi.getUnplannedOrders({
        scenarioId: scenarioId!,
        ...params,
      }),
    select: (res: ApiResponse<UnplannedOrder[]>) => ({
      orders: (res.data ?? []) as UnplannedOrder[],
      meta: res.meta ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
    }),
    enabled: !!scenarioId,
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PROGRESS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useRecordProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: number; data: {
      progressDate: string; cuttingQty?: number; sewingInputQty?: number;
      sewingOutputQty?: number; qcPassQty?: number; finishingQty?: number;
      packedQty?: number; operatorCount?: number; workedHours?: number; remarks?: string | null;
    } }) =>
      planningBoardApi.recordProgress(jobId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      toast.success('Progress recorded');
    },
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  BRAND COLORS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useBrandColors(factoryCode?: string) {
  return useQuery({
    queryKey: [...KEYS.brandColors, factoryCode],
    queryFn: () => planningBoardApi.getBrandColors(factoryCode),
    select: (res: ApiResponse<BrandColor[]>) => (res.data ?? res) as BrandColor[],
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CALENDAR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useCalendarDays(fromDate: string, toDate: string, factoryCode?: string) {
  return useQuery({
    queryKey: [...KEYS.calendar(fromDate, toDate), factoryCode],
    queryFn: () => planningBoardApi.getCalendarDays({ fromDate, toDate, factoryCode }),
    select: (res: ApiResponse<CalendarDay[]>) => (res.data ?? res) as CalendarDay[],
    enabled: !!fromDate && !!toDate,
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  LINE SUMMARY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useLineSummary(
  scenarioId: number | null,
  fromDate: string,
  toDate: string,
  department?: string
) {
  return useQuery({
    queryKey: [...KEYS.lineSummary(scenarioId ?? 0, fromDate, toDate), department],
    queryFn: () =>
      planningBoardApi.getLineSummary({
        scenarioId: scenarioId!,
        fromDate,
        toDate,
        department,
      }),
    select: (res: ApiResponse<LineSummary[]>) => (res.data ?? res) as LineSummary[],
    enabled: !!scenarioId && !!fromDate && !!toDate,
  });
}

// ═══════════════════════════════════════════
//  MERGE JOBS
// ═══════════════════════════════════════════

export function useMergeJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.mergeJobs,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      toast.success('Jobs merged successfully');
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Failed to merge jobs'),
  });
}

// ═══════════════════════════════════════════
//  RECALCULATE
// ═══════════════════════════════════════════

export function useRecalculateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: planningBoardApi.recalculateScenario,
    onSuccess: (res: ApiResponse<{ recalculatedCount: number }>) => {
      qc.invalidateQueries({ queryKey: ['planning-board'] });
      const data = (res.data ?? res) as { recalculatedCount: number };
      toast.success(`${data.recalculatedCount} job(s) recalculated`);
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Recalculation failed'),
  });
}

// ═══════════════════════════════════════════
//  BACKWARD SCHEDULING
// ═══════════════════════════════════════════

export function useBackwardSchedule() {
  return useMutation({
    mutationFn: planningBoardApi.backwardSchedule,
    onSuccess: () => {
      toast.success('Backward schedule calculated');
    },
    onError: (err: ApiErrorResponse) => toast.error(err?.response?.data?.message || 'Backward scheduling failed'),
  });
}

// ═══════════════════════════════════════════
//  PLANNING KPIs
// ═══════════════════════════════════════════

export function usePlanningKPIs() {
  return useQuery({
    queryKey: ['planning-board', 'kpis'],
    queryFn: planningBoardApi.getPlanningKPIs,
    select: (res: ApiResponse<PlanningKPIs>) => (res.data ?? res) as PlanningKPIs,
    refetchInterval: 60_000, // Refresh every 60s
  });
}
