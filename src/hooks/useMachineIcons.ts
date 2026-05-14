import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { machineIconApi } from '@/api/machineIcons';
import type { MachineIcon, CreateMachineIconPayload } from '@/api/machineIcons';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types';

interface ApiErr {
  response?: { data?: { message?: string } };
  message?: string;
}

const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query Keys ──
export const MACHINE_ICON_KEYS = {
  all: ['machine-icons'] as const,
  list: (params?: Record<string, string | number | boolean>) => ['machine-icons', 'list', params] as const,
  detail: (id: number) => ['machine-icons', 'detail', id] as const,
  byCode: (code: string) => ['machine-icons', 'code', code] as const,
  categories: ['machine-icons', 'categories'] as const,
};

// ── Queries ──

export function useMachineIcons(params?: Record<string, string | number | boolean>) {
  return useQuery({
    queryKey: MACHINE_ICON_KEYS.list(params),
    queryFn: () => machineIconApi.list(params),
    select: (r: ApiResponse<MachineIcon[]>) => (r.data ?? r) as MachineIcon[],
  });
}

export function useMachineIcon(id: number) {
  return useQuery({
    queryKey: MACHINE_ICON_KEYS.detail(id),
    queryFn: () => machineIconApi.getById(id),
    select: (r: ApiResponse<MachineIcon>) => (r.data ?? r) as MachineIcon,
    enabled: id > 0,
  });
}

export function useMachineIconByCode(code: string) {
  return useQuery({
    queryKey: MACHINE_ICON_KEYS.byCode(code),
    queryFn: () => machineIconApi.getByCode(code),
    select: (r: ApiResponse<MachineIcon>) => (r.data ?? r) as MachineIcon,
    enabled: !!code,
  });
}

export function useMachineIconCategories() {
  return useQuery({
    queryKey: MACHINE_ICON_KEYS.categories,
    queryFn: () => machineIconApi.categories(),
    select: (r: ApiResponse<string[]>) => (r.data ?? r) as string[],
  });
}

// ── Mutations ──

export function useCreateMachineIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMachineIconPayload) => machineIconApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MACHINE_ICON_KEYS.all });
      toast.success('Icon created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateMachineIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateMachineIconPayload> }) =>
      machineIconApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MACHINE_ICON_KEYS.all });
      toast.success('Icon updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteMachineIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => machineIconApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MACHINE_ICON_KEYS.all });
      toast.success('Icon deactivated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
