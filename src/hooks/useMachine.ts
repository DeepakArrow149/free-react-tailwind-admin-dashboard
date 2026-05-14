import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  machineApi,
  repairApi,
  type CreateMachinePayload,
  type CreateRepairPayload,
  type CompleteRepairPayload,
} from '@/api/machine';
import { toast } from 'sonner';

// ── helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  machines:     ['machines', 'list'] as const,
  machine:      (id: number) => ['machines', 'detail', id] as const,
  machineStats: ['machines', 'stats'] as const,
  repairs:      ['machines', 'repairs'] as const,
};

// ═══════ MACHINE CRUD ═══════

export function useMachines(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.machines, params],
    queryFn: () => machineApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useMachine(id: number) {
  return useQuery({
    queryKey: K.machine(id),
    queryFn: () => machineApi.getById(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useMachineStats() {
  return useQuery({
    queryKey: K.machineStats,
    queryFn: () => machineApi.stats(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMachinePayload) => machineApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.machines });
      qc.invalidateQueries({ queryKey: K.machineStats });
      toast.success('Machine created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateMachinePayload> }) =>
      machineApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.machines });
      toast.success('Machine updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => machineApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.machines });
      qc.invalidateQueries({ queryKey: K.machineStats });
      toast.success('Machine deleted');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ REPAIRS ═══════

export function useRepairs(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.repairs, params],
    queryFn: () => repairApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRepairPayload) => repairApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.repairs });
      qc.invalidateQueries({ queryKey: K.machineStats });
      toast.success('Repair logged');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCompleteRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompleteRepairPayload }) =>
      repairApi.complete(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.repairs });
      qc.invalidateQueries({ queryKey: K.machines });
      qc.invalidateQueries({ queryKey: K.machineStats });
      toast.success('Repair completed');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
