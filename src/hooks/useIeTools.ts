import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  featureFlagsApi,
  gsdApi,
  machineSpecsApi,
  obVersionsApi,
  garmentAnalyserApi,
} from '@/api/ieTools';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types';

interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

const K = {
  flags: ['feature-flags'] as const,
  gsdMotions: ['gsd', 'motions'] as const,
  gsdTemplates: ['gsd', 'templates'] as const,
  gsdTemplate: (id: number) => ['gsd', 'template', id] as const,
  machineSpecs: ['machine-specs'] as const,
  obVersions: ['ob-versions'] as const,
  garmentTypes: ['garment-analyser', 'types'] as const,
};

// â•â•â•â•â•â•â• FEATURE FLAGS â•â•â•â•â•â•â•

export function useFeatureFlags() {
  return useQuery({
    queryKey: K.flags,
    queryFn: featureFlagsApi.list,
    select: (d: ApiResponse) => d.data,
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => featureFlagsApi.update(id, { enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.flags }); toast.success('Flag updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useSeedFeatureFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: featureFlagsApi.seedDefaults,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.flags }); toast.success('Defaults seeded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBatchUpdateFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: featureFlagsApi.batchUpdate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.flags }); toast.success('Flags updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â• GSD MOTIONS â•â•â•â•â•â•â•

export function useGsdMotions(params?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: [...K.gsdMotions, params],
    queryFn: () => gsdApi.listMotions(params),
    select: (d: ApiResponse) => d.data,
  });
}

export function useCreateGsdMotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: gsdApi.createMotion,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gsdMotions }); toast.success('Motion created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateGsdMotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => gsdApi.updateMotion(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gsdMotions }); toast.success('Motion updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteGsdMotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gsdApi.deleteMotion(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gsdMotions }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useSeedGsdMotions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: gsdApi.seedMotions,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gsdMotions }); toast.success('Default motions seeded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â• GSD TEMPLATES â•â•â•â•â•â•â•

export function useGsdTemplates(params?: { search?: string }) {
  return useQuery({
    queryKey: [...K.gsdTemplates, params],
    queryFn: () => gsdApi.listTemplates(params),
    select: (d: ApiResponse) => d.data,
  });
}

export function useGsdTemplate(id: number) {
  return useQuery({
    queryKey: K.gsdTemplate(id),
    queryFn: () => gsdApi.getTemplate(id),
    select: (d: ApiResponse) => d.data,
    enabled: !!id,
  });
}

export function useCreateGsdTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: gsdApi.createTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gsdTemplates }); toast.success('Template created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateGsdTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => gsdApi.updateTemplate(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gsdTemplates }); toast.success('Template updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteGsdTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gsdApi.deleteTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gsdTemplates }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCalculateSam() {
  return useMutation({
    mutationFn: gsdApi.calculateSam,
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â• MACHINE SPECS â•â•â•â•â•â•â•

export function useMachineSpecs(params?: { machineType?: string; garmentType?: string }) {
  return useQuery({
    queryKey: [...K.machineSpecs, params],
    queryFn: () => machineSpecsApi.list(params),
    select: (d: ApiResponse) => d.data,
  });
}

export function useCreateMachineSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: machineSpecsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.machineSpecs }); toast.success('Spec created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateMachineSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => machineSpecsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.machineSpecs }); toast.success('Spec updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteMachineSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => machineSpecsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.machineSpecs }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â• OB VERSIONS â•â•â•â•â•â•â•

export function useObVersions(params?: { styleId?: number; status?: string }) {
  return useQuery({
    queryKey: [...K.obVersions, params],
    queryFn: () => obVersionsApi.list(params),
    select: (d: ApiResponse) => d.data,
  });
}

export function useCreateObVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: obVersionsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.obVersions }); toast.success('OB version created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApproveObVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => obVersionsApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.obVersions }); toast.success('Version approved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteObVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => obVersionsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.obVersions }); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// â•â•â•â•â•â•â• GARMENT ANALYSER â•â•â•â•â•â•â•

export function useGarmentTypes() {
  return useQuery({
    queryKey: K.garmentTypes,
    queryFn: garmentAnalyserApi.getTypes,
    select: (d: ApiResponse) => d.data,
  });
}

export function useAnalyseGarment() {
  return useMutation({
    mutationFn: garmentAnalyserApi.analyse,
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
