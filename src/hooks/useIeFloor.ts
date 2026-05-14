import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  realtimeApi,
  supervisorApi,
  breakdownApi,
  changeoverApi,
  alertsApi,
  deploymentApi,
  multiLineDashboardApi,
} from '@/api/ieFloor';
import { toast } from 'sonner';

// ── helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  rtDashboard: (lineId: number) => ['realtime', 'dashboard', lineId] as const,
  rtHourly: (lineId: number) => ['realtime', 'hourly', lineId] as const,
  rtShiftCmp: (lineId: number) => ['realtime', 'shift-cmp', lineId] as const,
  rtWip: (lineId: number) => ['realtime', 'wip', lineId] as const,
  rtBreaks: (lineId: number) => ['realtime', 'breaks', lineId] as const,
  rtActions: (lineId: number) => ['realtime', 'actions', lineId] as const,
  rtAssigns: (lineId: number) => ['realtime', 'assigns', lineId] as const,
  supLogs: (lineId: number) => ['supervisor', 'logs', lineId] as const,
  supDefects: (lineId: number) => ['supervisor', 'defects', lineId] as const,
  supDhu: (lineId: number) => ['supervisor', 'dhu', lineId] as const,
  supOverride: (lineId: number) => ['supervisor', 'override', lineId] as const,
  breakdowns: (lineId: number) => ['breakdowns', lineId] as const,
  breakdownSum: (lineId: number) => ['breakdowns', 'summary', lineId] as const,
  changeovers: (lineId: number) => ['changeovers', lineId] as const,
  changeoverSum: (lineId: number) => ['changeovers', 'summary', lineId] as const,
  alerts: ['alerts'] as const,
  alertCount: ['alerts', 'count'] as const,
  deployment: (lineId: number) => ['deployment', lineId] as const,
  multiLine: ['multi-line-dashboard'] as const,
};

// ═══════ REALTIME ═══════

export function useRealtimeDashboard(lineId: number) {
  return useQuery({
    queryKey: K.rtDashboard(lineId),
    queryFn: () => realtimeApi.getDashboard(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
    refetchInterval: 30_000,
  });
}

export function useUpsertCount(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { operationId: number; actual: number; date?: string }) => realtimeApi.upsertCount(lineId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rtDashboard(lineId) }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useHourlyTrend(lineId: number, params?: { date?: string; operationId?: number }) {
  return useQuery({
    queryKey: [...K.rtHourly(lineId), params],
    queryFn: () => realtimeApi.getHourlyTrend(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useShiftComparison(lineId: number, params?: { operationId?: number }) {
  return useQuery({
    queryKey: [...K.rtShiftCmp(lineId), params],
    queryFn: () => realtimeApi.getShiftComparison(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useWip(lineId: number) {
  return useQuery({
    queryKey: K.rtWip(lineId),
    queryFn: () => realtimeApi.getWip(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useUpsertWip(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { operationId: number; wipQty: number }) => realtimeApi.upsertWip(lineId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rtWip(lineId) }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBreaks(lineId: number) {
  return useQuery({
    queryKey: K.rtBreaks(lineId),
    queryFn: () => realtimeApi.getBreaks(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useCreateBreak(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { breakType: string; startTime: string; endTime?: string; durationMinutes?: number }) =>
      realtimeApi.createBreak(lineId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rtBreaks(lineId) }); toast.success('Break recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useSupervisorActions(lineId: number) {
  return useQuery({
    queryKey: K.rtActions(lineId),
    queryFn: () => realtimeApi.getActions(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useCreateSupervisorAction(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { actionType: string; description: string }) => realtimeApi.createAction(lineId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rtActions(lineId) }); toast.success('Action logged'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAssignments(lineId: number) {
  return useQuery({
    queryKey: K.rtAssigns(lineId),
    queryFn: () => realtimeApi.getAssignments(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useCreateAssignment(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { operationId: number; operatorId: number }) => realtimeApi.createAssignment(lineId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rtAssigns(lineId) }); toast.success('Assigned'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteAssignment(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) => realtimeApi.deleteAssignment(assignmentId, lineId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rtAssigns(lineId) }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDragReassign(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { assignmentId: number; newOperationId: number }) => realtimeApi.dragReassign(lineId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.rtAssigns(lineId) });
      qc.invalidateQueries({ queryKey: K.rtDashboard(lineId) });
      toast.success('Operator reassigned');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SUPERVISOR ═══════

export function useSupervisorLogs(lineId: number) {
  return useQuery({
    queryKey: K.supLogs(lineId),
    queryFn: () => supervisorApi.getLogs(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useCreateSupervisorLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supervisorApi.createLog,
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: K.supLogs(v.lineId) }); toast.success('Log created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteSupervisorLog(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supervisorApi.deleteLog(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.supLogs(lineId) }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDefects(lineId: number, params?: { date?: string; operationId?: number }) {
  return useQuery({
    queryKey: [...K.supDefects(lineId), params],
    queryFn: () => supervisorApi.getDefects(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useCreateDefect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supervisorApi.createDefect,
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: K.supDefects(v.lineId) }); qc.invalidateQueries({ queryKey: K.supDhu(v.lineId) }); toast.success('Defect recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDhu(lineId: number, params?: { date?: string }) {
  return useQuery({
    queryKey: [...K.supDhu(lineId), params],
    queryFn: () => supervisorApi.getDhu(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useTargetOverride(lineId: number, params?: { date?: string }) {
  return useQuery({
    queryKey: [...K.supOverride(lineId), params],
    queryFn: () => supervisorApi.getTargetOverride(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useUpsertTargetOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supervisorApi.upsertTargetOverride,
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: K.supOverride(v.lineId) }); toast.success('Target override saved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ BREAKDOWNS ═══════

export function useBreakdowns(lineId: number, params?: { status?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: [...K.breakdowns(lineId), params],
    queryFn: () => breakdownApi.list(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useCreateBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: breakdownApi.create,
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: K.breakdowns(v.lineId) }); qc.invalidateQueries({ queryKey: K.breakdownSum(v.lineId) }); toast.success('Breakdown reported'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useResolveBreakdown(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, endTime, resolution, rootCause }: { id: number; endTime: string; resolution: string; rootCause?: string }) => breakdownApi.resolve(id, { endTime, resolution, rootCause }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.breakdowns(lineId) }); qc.invalidateQueries({ queryKey: K.breakdownSum(lineId) }); toast.success('Breakdown resolved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBreakdownSummary(lineId: number, params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [...K.breakdownSum(lineId), params],
    queryFn: () => breakdownApi.getSummary(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

// ═══════ CHANGEOVERS ═══════

export function useChangeovers(lineId: number, params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [...K.changeovers(lineId), params],
    queryFn: () => changeoverApi.list(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useCreateChangeover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: changeoverApi.create,
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: K.changeovers(v.lineId) }); toast.success('Changeover started'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCompleteChangeover(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => changeoverApi.complete(id, { notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.changeovers(lineId) }); qc.invalidateQueries({ queryKey: K.changeoverSum(lineId) }); toast.success('Changeover completed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useChangeoverSummary(lineId: number, params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [...K.changeoverSum(lineId), params],
    queryFn: () => changeoverApi.getSummary(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

// ═══════ ALERTS ═══════

export function useAlerts(params?: { lineId?: number; status?: string; alertType?: string }) {
  return useQuery({
    queryKey: [...K.alerts, params],
    queryFn: () => alertsApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => alertsApi.acknowledge(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.alerts }); qc.invalidateQueries({ queryKey: K.alertCount }); toast.success('Alert acknowledged'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: number; resolution: string }) => alertsApi.resolve(id, { resolution }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.alerts }); qc.invalidateQueries({ queryKey: K.alertCount }); toast.success('Alert resolved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAutoGenerateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineId: number) => alertsApi.autoGenerate(lineId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.alerts }); qc.invalidateQueries({ queryKey: K.alertCount }); toast.success('Alerts generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAlertActiveCount(lineId: number) {
  return useQuery({
    queryKey: [...K.alertCount, lineId],
    queryFn: () => alertsApi.getActiveCount(lineId),
    select: (d: ApiEnvelope) => d.data,
    refetchInterval: 60_000,
  });
}

// ═══════ DEPLOYMENT ═══════

export function useDeployment(lineId: number) {
  return useQuery({
    queryKey: K.deployment(lineId),
    queryFn: () => deploymentApi.getDeployment(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function usePreviewRebalance() {
  return useMutation({
    mutationFn: deploymentApi.previewRebalance,
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApplyRebalance(lineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deploymentApi.applyRebalance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.deployment(lineId) }); qc.invalidateQueries({ queryKey: K.rtAssigns(lineId) }); toast.success('Rebalance applied'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ MULTI-LINE DASHBOARD ═══════

export function useMultiLineDashboard(params?: { date?: string }) {
  return useQuery({
    queryKey: [...K.multiLine, params],
    queryFn: () => multiLineDashboardApi.getDashboard(params),
    select: (d: ApiEnvelope) => d.data,
    refetchInterval: 60_000,
  });
}
