/**
 * TanStack React Query hooks for server-driven lookup data.
 * Replaces hardcoded dropdown arrays with dynamic data from the LookupCategory API.
 *
 * Usage:
 *   const { data: types } = useLookupOptions('MATERIAL_TYPE');
 *   // types = ['SHELL_FABRIC', 'LINING', ...]
 */
import { useQuery } from '@tanstack/react-query';
import { lookupApi, defectCodeApi, masterApi, type LookupItem, type DefectCode } from '@/api/master';

// ── Query-key registry ──
const K = {
  lookupByCategory: (cat: string) => ['lookups', 'by-category', cat] as const,
  lookupCategories: ['lookups', 'categories'] as const,
  defectCodes: (params?: Record<string, unknown>) => ['defect-codes', params] as const,
  sizeGroups: ['master', 'size-groups'] as const,
};

/**
 * Fetch all lookup items for a given category.
 * Returns the raw LookupItem[] array.
 */
export function useLookups(category: string, enabled = true) {
  return useQuery({
    queryKey: K.lookupByCategory(category),
    queryFn: () => lookupApi.listByCategory(category),
    select: (r) => (r as any).data as LookupItem[],
    enabled: !!category && enabled,
    staleTime: 5 * 60 * 1000, // lookups rarely change — cache 5 min
  });
}

/**
 * Convenience hook: returns just the `code` values as a string[].
 * Perfect for replacing hardcoded arrays like `const MATERIAL_TYPES = [...]`.
 */
export function useLookupOptions(category: string, enabled = true) {
  return useQuery({
    queryKey: K.lookupByCategory(category),
    queryFn: () => lookupApi.listByCategory(category),
    select: (r) => ((r as any).data as LookupItem[]).map((i) => i.code),
    enabled: !!category && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns `{ value, label }` pairs for use in select/dropdown components.
 */
export function useLookupSelectOptions(category: string, enabled = true) {
  return useQuery({
    queryKey: K.lookupByCategory(category),
    queryFn: () => lookupApi.listByCategory(category),
    select: (r) =>
      ((r as any).data as LookupItem[]).map((i) => ({
        value: i.code,
        label: i.name,
      })),
    enabled: !!category && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all available lookup category names.
 */
export function useLookupCategories() {
  return useQuery({
    queryKey: K.lookupCategories,
    queryFn: () => lookupApi.listCategories(),
    select: (r) => (r as any).data as string[],
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch defect codes with optional filtering.
 */
export function useDefectCodes(params?: { category?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: K.defectCodes(params as Record<string, unknown>),
    queryFn: () => defectCodeApi.list(params),
    select: (r) => (r as any).data as DefectCode[],
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch size groups.
 */
export function useSizeGroups() {
  return useQuery({
    queryKey: K.sizeGroups,
    queryFn: () => masterApi.listSizeGroups(),
    select: (r) => (r as any).data,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Convenience aliases for common categories ──
export const useMaterialTypes = () => useLookupOptions('MATERIAL_TYPE');
export const useSupplierTypes = () => useLookupOptions('SUPPLIER_TYPE');
export const useProcessTypes = () => useLookupOptions('PROCESS_TYPE');
export const useMachineCategories = () => useLookupOptions('MACHINE_CATEGORY');
export const useSampleTypes = () => useLookupOptions('SAMPLE_TYPE');
export const useShipModes = () => useLookupOptions('SHIP_MODE');
export const useIncoterms = () => useLookupOptions('INCOTERM');
export const useLogTypes = () => useLookupOptions('LOG_TYPE');
export const useBreakdownTypes = () => useLookupOptions('BREAKDOWN_TYPE');
export const useChangeoverTypes = () => useLookupOptions('CHANGEOVER_TYPE');
export const useAlertTypes = () => useLookupOptions('ALERT_TYPE');
export const useAllowanceTypes = () => useLookupOptions('ALLOWANCE_TYPE');
export const useSpecTypes = () => useLookupOptions('SPEC_TYPE');
export const useTestTypes = () => useLookupOptions('TEST_TYPE');
export const usePositionTypes = () => useLookupOptions('POSITION_TYPE');
export const useHourSlots = () => useLookupOptions('HOUR_SLOT');
