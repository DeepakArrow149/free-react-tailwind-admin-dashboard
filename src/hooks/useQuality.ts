import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aqlApi,
  fabricApi,
  labTestApi,
  claimApi,
  endlineApi,
  qualityReportApi,
} from '@/api/quality';
import { toast } from 'sonner';

// ── helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  // AQL
  aqlInspections:   ['quality', 'aql'] as const,
  aqlInspection:    (id: number) => ['quality', 'aql', id] as const,
  aqlCalculate:     ['quality', 'aql', 'calculate'] as const,
  // Fabric
  fabricInspections:['quality', 'fabric'] as const,
  // Lab Test
  labTests:         ['quality', 'lab'] as const,
  labTest:          (id: number) => ['quality', 'lab', id] as const,
  // Claims
  claims:           ['quality', 'claims'] as const,
  // Endline
  endline:          ['quality', 'endline'] as const,
  endlineDhu:       (orderId: number) => ['quality', 'endline', 'dhu', orderId] as const,
  endlineTopDefects:(orderId: number) => ['quality', 'endline', 'top-defects', orderId] as const,
  // Reports
  defectPareto:     ['quality', 'reports', 'defect-pareto'] as const,
  fabricSummary:    ['quality', 'reports', 'fabric-summary'] as const,
  claimAnalysis:    ['quality', 'reports', 'claim-analysis'] as const,
  aqlSummary:       ['quality', 'reports', 'aql-summary'] as const,
};

// ═══════ AQL INSPECTIONS ═══════

export function useAqlInspections(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.aqlInspections, params],
    queryFn: () => aqlApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useAqlInspection(id: number) {
  return useQuery({
    queryKey: K.aqlInspection(id),
    queryFn: () => aqlApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useAqlCalculate(params: { lotQty: number; level?: string; aqlMajor?: number; aqlMinor?: number }) {
  return useQuery({
    queryKey: [...K.aqlCalculate, params],
    queryFn: () => aqlApi.calculate(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!params.lotQty,
  });
}

export function useCreateAqlInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => aqlApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.aqlInspections }); toast.success('AQL inspection created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useRecordAqlResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => aqlApi.recordResult(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.aqlInspections }); toast.success('AQL result recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ FABRIC INSPECTION ═══════

export function useFabricInspections(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.fabricInspections, params],
    queryFn: () => fabricApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateFabricInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => fabricApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fabricInspections }); toast.success('Fabric inspection created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ LAB TESTS ═══════

export function useLabTests(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.labTests, params],
    queryFn: () => labTestApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useLabTest(id: number) {
  return useQuery({
    queryKey: K.labTest(id),
    queryFn: () => labTestApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateLabTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => labTestApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.labTests }); toast.success('Lab test request created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useSubmitLabResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => labTestApi.submitResult(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.labTests }); toast.success('Lab test result submitted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ BUYER CLAIMS ═══════

export function useBuyerClaims(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.claims, params],
    queryFn: () => claimApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateBuyerClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => claimApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.claims }); toast.success('Buyer claim created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateClaimStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => claimApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.claims }); toast.success('Claim status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useSettleClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => claimApi.settle(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.claims }); toast.success('Claim settled'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ ENDLINE QC ═══════

export function useEndlineInspections(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.endline, params],
    queryFn: () => endlineApi.list(params),
  });
}

export function useCreateEndlineInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => endlineApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.endline }); toast.success('Endline inspection recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useEndlineDhu(orderId: number, from: string, to: string) {
  return useQuery({
    queryKey: [...K.endlineDhu(orderId), from, to],
    queryFn: () => endlineApi.dhuSummary(orderId, from, to),
    enabled: !!orderId && !!from && !!to,
  });
}

export function useEndlineTopDefects(orderId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: [...K.endlineTopDefects(orderId), from, to],
    queryFn: () => endlineApi.topDefects(orderId, from, to),
    enabled: !!orderId,
  });
}

// ═══════ QUALITY REPORTS ═══════

export function useDefectPareto(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.defectPareto, params],
    queryFn: () => qualityReportApi.defectPareto(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useFabricSummaryReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.fabricSummary, params],
    queryFn: () => qualityReportApi.fabricSummary(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useClaimAnalysis(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.claimAnalysis, params],
    queryFn: () => qualityReportApi.claimAnalysis(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useAqlSummaryReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.aqlSummary, params],
    queryFn: () => qualityReportApi.aqlSummary(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}
