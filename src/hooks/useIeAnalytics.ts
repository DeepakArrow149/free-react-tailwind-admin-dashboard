import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  incentiveRulesApi,
  incentiveCalcApi,
  ieAnalyticsApi,
  operatorAnalyticsApi,
  ieReportsApi,
} from '@/api/ieAnalytics';
import { toast } from 'sonner';

interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

const K = {
  incentiveRules: ['incentive-rules'] as const,
  incentiveCalc: (lineId: number) => ['incentive-calc', lineId] as const,
  incentiveRecords: ['incentive-records'] as const,
  prodTrend: (lineId: number) => ['ie-analytics', 'prod-trend', lineId] as const,
  fatigue: (lineId: number) => ['ie-analytics', 'fatigue', lineId] as const,
  smvVariance: (lineId: number) => ['ie-analytics', 'smv-variance', lineId] as const,
  headcount: (lineId: number) => ['ie-analytics', 'headcount', lineId] as const,
  operatorPerf: (id: number) => ['operator-analytics', 'perf', id] as const,
  coverage: ['operator-analytics', 'coverage'] as const,
  swing: ['operator-analytics', 'swing'] as const,
};

// ═══════ INCENTIVE RULES ═══════

export function useIncentiveRules() {
  return useQuery({
    queryKey: K.incentiveRules,
    queryFn: incentiveRulesApi.list,
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateIncentiveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: incentiveRulesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentiveRules }); toast.success('Rule created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateIncentiveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; minEfficiency?: number; maxEfficiency?: number; incentivePercent?: number }) =>
      incentiveRulesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentiveRules }); toast.success('Rule updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteIncentiveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => incentiveRulesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentiveRules }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ INCENTIVE CALCULATOR ═══════

export function useIncentiveCalc(lineId: number, params?: { date?: string }) {
  return useQuery({
    queryKey: [...K.incentiveCalc(lineId), params],
    queryFn: () => incentiveCalcApi.calculate(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useSaveIncentives() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: incentiveCalcApi.save,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentiveRecords }); toast.success('Incentives saved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBatchCalculateIncentives() {
  return useMutation({
    mutationFn: incentiveCalcApi.batchCalculate,
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useIncentiveRecords(params?: { lineId?: number; employeeId?: number; from?: string; to?: string }) {
  return useQuery({
    queryKey: [...K.incentiveRecords, params],
    queryFn: () => incentiveCalcApi.getRecords(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

// ═══════ IE ANALYTICS ═══════

export function useProductionTrend(lineId: number, params?: { days?: number }) {
  return useQuery({
    queryKey: [...K.prodTrend(lineId), params],
    queryFn: () => ieAnalyticsApi.getProductionTrend(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useFatigueAnalysis(lineId: number, params?: { date?: string }) {
  return useQuery({
    queryKey: [...K.fatigue(lineId), params],
    queryFn: () => ieAnalyticsApi.getFatigueAnalysis(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useSmvVariance(lineId: number) {
  return useQuery({
    queryKey: K.smvVariance(lineId),
    queryFn: () => ieAnalyticsApi.getSmvVariance(lineId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

export function useHeadcountTrend(lineId: number, params?: { days?: number }) {
  return useQuery({
    queryKey: [...K.headcount(lineId), params],
    queryFn: () => ieAnalyticsApi.getHeadcountTrend(lineId, params),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!lineId,
  });
}

// ═══════ OPERATOR ANALYTICS ═══════

export function useOperatorPerformanceCard(operatorId: number) {
  return useQuery({
    queryKey: K.operatorPerf(operatorId),
    queryFn: () => operatorAnalyticsApi.getPerformanceCard(operatorId),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!operatorId,
  });
}

export function useCoverageReport(params?: { lineId?: number }) {
  return useQuery({
    queryKey: [...K.coverage, params],
    queryFn: () => operatorAnalyticsApi.getCoverageReport(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useSwingCandidates(params?: { minSkills?: number }) {
  return useQuery({
    queryKey: [...K.swing, params],
    queryFn: () => operatorAnalyticsApi.getSwingCandidates(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

// ═══════ IE REPORTS (Downloads) ═══════

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useDownloadDailyProduction() {
  return useMutation({
    mutationFn: (params: { lineId: number; from: string; to: string }) => ieReportsApi.downloadDailyProduction(params),
    onSuccess: (blob) => { downloadBlob(blob, 'daily-production.xlsx'); toast.success('Report downloaded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDownloadDefectReport() {
  return useMutation({
    mutationFn: (params: { lineId: number; from: string; to: string }) => ieReportsApi.downloadDefectReport(params),
    onSuccess: (blob) => { downloadBlob(blob, 'defect-report.xlsx'); toast.success('Report downloaded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDownloadIncentiveReport() {
  return useMutation({
    mutationFn: (params: { lineId: number; from: string; to: string }) => ieReportsApi.downloadIncentiveReport(params),
    onSuccess: (blob) => { downloadBlob(blob, 'incentive-report.xlsx'); toast.success('Report downloaded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDownloadBreakdownReport() {
  return useMutation({
    mutationFn: (params: { lineId: number; from: string; to: string }) => ieReportsApi.downloadBreakdownReport(params),
    onSuccess: (blob) => { downloadBlob(blob, 'breakdown-report.xlsx'); toast.success('Report downloaded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDownloadSkillMatrix() {
  return useMutation({
    mutationFn: () => ieReportsApi.downloadSkillMatrix(),
    onSuccess: (blob) => { downloadBlob(blob, 'skill-matrix.xlsx'); toast.success('Report downloaded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
