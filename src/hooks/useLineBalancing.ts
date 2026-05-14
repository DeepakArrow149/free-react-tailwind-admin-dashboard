import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  machineTypeApi,
  layoutApi,
  workstationApi,
  skillApi,
  balancingApi,
  lineApi,
  simulationApi,
} from '@/api/lineBalancing';
import type {
  MachineType,
  LineLayout,
  Workstation,
  OperatorSkill,
  SkillMatrix,
  LineBalancing,
  CreateLayoutPayload,
  CreateSkillPayload,
  ManualAssignPayload,
  SimulatePayload,
  SimulationResult,
  BulletinForLayout,
} from '@/api/lineBalancing';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types';

interface ApiErr {
  response?: { data?: { message?: string } };
  message?: string;
}

const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// â”€â”€â”€â”€â”€ Query Keys â”€â”€â”€â”€â”€
type QParam = Record<string, string | number | boolean> | undefined;

const KEYS = {
  machineTypes: ['line-balancing', 'machine-types'] as const,
  layouts: ['line-balancing', 'layouts'] as const,
  layout: (id: number) => ['line-balancing', 'layout', id] as const,
  workstations: (lineId: number) => ['line-balancing', 'workstations', lineId] as const,
  skills: (p?: QParam) => ['line-balancing', 'skills', p] as const,
  skillMatrix: ['line-balancing', 'skill-matrix'] as const,
  balancings: (p?: QParam) => ['line-balancing', 'balancings', p] as const,
  balancing: (id: number) => ['line-balancing', 'balancing', id] as const,
  lines: ['line-balancing', 'lines'] as const,
  line: (id: number) => ['line-balancing', 'line', id] as const,
  simulation: ['line-balancing', 'simulation'] as const,
  bottleneck: (id: number) => ['line-balancing', 'bottleneck', id] as const,
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MACHINE TYPE HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useMachineTypes(params?: Record<string, string | number | boolean>) {
  return useQuery({
    queryKey: [...KEYS.machineTypes, params],
    queryFn: () => machineTypeApi.list(params),
    select: (r: ApiResponse<MachineType[]>) => (r.data ?? r) as MachineType[],
  });
}

export function useCreateMachineType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: machineTypeApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.machineTypes }); toast.success('Machine type created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateMachineType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MachineType> }) => machineTypeApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.machineTypes }); toast.success('Machine type updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useToggleMachineType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: machineTypeApi.toggleActive,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.machineTypes }); toast.success('Status toggled'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYOUT HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useLayouts() {
  return useQuery({
    queryKey: KEYS.layouts,
    queryFn: layoutApi.list,
    select: (r: ApiResponse<LineLayout[]>) => (r.data ?? r) as LineLayout[],
  });
}

export function useLayout(id: number) {
  return useQuery({
    queryKey: KEYS.layout(id),
    queryFn: () => layoutApi.getById(id),
    select: (r: ApiResponse<LineLayout>) => (r.data ?? r) as LineLayout,
    enabled: id > 0,
  });
}

export function useCreateLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: layoutApi.create,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: KEYS.layouts });
      const id = result?.data?.id ?? result?.id;
      if (id) qc.invalidateQueries({ queryKey: KEYS.layout(id) });
      toast.success('Layout created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateLayoutPayload> }) => layoutApi.update(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.layouts });
      qc.invalidateQueries({ queryKey: KEYS.layout(vars.id) });
      toast.success('Layout updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: layoutApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.layouts }); toast.success('Layout deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAddPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ layoutId, data }: { layoutId: number; data: Parameters<typeof layoutApi.addPosition>[1] }) =>
      layoutApi.addPosition(layoutId, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.layouts });
      qc.invalidateQueries({ queryKey: KEYS.layout(vars.layoutId) });
      toast.success('Position added');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ posId, data }: { posId: number; data: Record<string, unknown> }) =>
      layoutApi.updatePosition(posId, data),
    onSuccess: () => {
      // Invalidate all layout queries since we don't track layoutId on position updates
      qc.invalidateQueries({ queryKey: KEYS.layouts });
      qc.invalidateQueries({ queryKey: ['line-balancing', 'layout'] });
      toast.success('Position updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useRemovePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: layoutApi.removePosition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.layouts });
      qc.invalidateQueries({ queryKey: ['line-balancing', 'layout'] });
      toast.success('Position removed');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useReorderPositions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ layoutId, positions }: { layoutId: number; positions: { id: number; gridRow: number; gridCol: number }[] }) =>
      layoutApi.reorderPositions(layoutId, positions),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.layout(vars.layoutId) });
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useLayoutsByStyle(styleId: number) {
  return useQuery({
    queryKey: [...KEYS.layouts, 'by-style', styleId],
    queryFn: () => layoutApi.getByStyle(styleId),
    select: (r: ApiResponse<LineLayout[]>) => (r.data ?? r) as LineLayout[],
    enabled: styleId > 0,
  });
}

export function useBulletinsForLayout() {
  return useQuery({
    queryKey: [...KEYS.layouts, 'bulletins'],
    queryFn: layoutApi.getBulletins,
    select: (r: ApiResponse<BulletinForLayout[]>) => (r.data ?? r) as BulletinForLayout[],
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// WORKSTATION HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useWorkstations(lineId: number) {
  return useQuery({
    queryKey: KEYS.workstations(lineId),
    queryFn: () => workstationApi.list({ lineId }),
    select: (r: ApiResponse<Workstation[]>) => (r.data ?? r) as Workstation[],
    enabled: lineId > 0,
  });
}

export function useBulkAssignWorkstations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workstationApi.bulkAssign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['line-balancing', 'workstations'] }); toast.success('Workstations assigned'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SKILL HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useSkills(params?: Record<string, string | number | boolean>) {
  return useQuery({
    queryKey: KEYS.skills(params),
    queryFn: () => skillApi.list(params),
    select: (r: ApiResponse<OperatorSkill[]>) => (r.data ?? r) as OperatorSkill[],
  });
}

export function useSkillMatrix() {
  return useQuery({
    queryKey: KEYS.skillMatrix,
    queryFn: skillApi.getMatrix,
    select: (r: ApiResponse<SkillMatrix>) => (r.data ?? r) as SkillMatrix,
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: skillApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['line-balancing', 'skills'] }); toast.success('Skill added'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSkillPayload> }) => skillApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['line-balancing', 'skills'] }); toast.success('Skill updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => skillApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['line-balancing', 'skills'] }); toast.success('Skill removed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BALANCING HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useBalancings(params?: Record<string, string | number | boolean>) {
  return useQuery({
    queryKey: KEYS.balancings(params),
    queryFn: () => balancingApi.list(params),
    select: (r: ApiResponse<LineBalancing[]>) => (r.data ?? r) as LineBalancing[],
  });
}

export function useBalancing(id: number) {
  return useQuery({
    queryKey: KEYS.balancing(id),
    queryFn: () => balancingApi.getById(id),
    select: (r: ApiResponse<LineBalancing>) => (r.data ?? r) as LineBalancing,
    enabled: id > 0,
  });
}

export function useAutoBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: balancingApi.autoBalance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-balancing', 'balancings'] });
      toast.success('Auto-balance complete');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useManualAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ManualAssignPayload }) => balancingApi.manualAssign(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.balancing(vars.id) });
      toast.success('Operations reassigned');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApproveBalancing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: balancingApi.approve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-balancing', 'balancings'] });
      toast.success('Balancing approved');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteBalancing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: balancingApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['line-balancing', 'balancings'] }); toast.success('Balancing deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LINE OVERVIEW HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useLines() {
  return useQuery({
    queryKey: KEYS.lines,
    queryFn: () => lineApi.list(),
    select: (r: ApiResponse) => (r.data ?? r) as { id: number; lineName: string }[],
  });
}

export function useLine(id: number) {
  return useQuery({
    queryKey: KEYS.line(id),
    queryFn: () => lineApi.getById(id),
    select: (r: ApiResponse) => (r.data ?? r),
    enabled: id > 0,
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BOTTLENECK ANALYSIS HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useAnalyzeBottlenecks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (balancingId: number) => balancingApi.analyzeBottlenecks(balancingId),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: KEYS.bottleneck(id) });
      toast.success('Bottleneck analysis complete');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPLIT OPERATION HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useSplitOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ balancingId, stationOpId, splitRatio }: { balancingId: number; stationOpId: number; splitRatio?: number }) =>
      balancingApi.splitOperation(balancingId, { stationOpId, splitRatio }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-balancing', 'balancings'] });
      qc.invalidateQueries({ queryKey: ['line-balancing', 'balancing'] });
      toast.success('Operation split successfully');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SIMULATION HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useSimulation() {
  return useMutation<ApiResponse<SimulationResult>, ApiErr, SimulatePayload>({
    mutationFn: simulationApi.simulate,
    onError: (e) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTO-PLACE LAYOUT HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function useAutoPlaceLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ layoutId, data }: { layoutId: number; data: { bulletinId?: number; styleId?: number; cols?: number } }) =>
      layoutApi.autoPlace(layoutId, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.layouts });
      qc.invalidateQueries({ queryKey: KEYS.layout(vars.layoutId) });
      toast.success('Positions auto-placed');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
