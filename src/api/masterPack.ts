/**
 * Typed API wrappers for the Master Modules Pack (Phase 1 + 2).
 * Each master uses the same 5-endpoint shape so we expose a tiny factory.
 */

import api from './client';

interface ApiResp<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isActive?: boolean;
  [key: string]: unknown;
}

/** Factory returning the standard 5 master endpoints. */
export function masterResource<T = unknown, TCreate = Partial<T>, TUpdate = Partial<T>>(path: string) {
  const base = `/master/${path}`;
  return {
    list:   (params?: ListParams)        => api.get<ApiResp<T[]>>(base, { params }),
    get:    (id: number)                 => api.get<ApiResp<T>>(`${base}/${id}`),
    create: (data: TCreate)              => api.post<ApiResp<T>>(base, data),
    update: (id: number, data: TUpdate)  => api.patch<ApiResp<T>>(`${base}/${id}`, data),
    delete: (id: number)                 => api.delete(`${base}/${id}`),
  };
}

// ─── Phase 1 ───
export const locationApi      = masterResource<{ id: number; code: string; name: string }>('locations');
export const rackApi          = masterResource('racks');
export const binApi           = masterResource('bins');
export const sizeApi          = masterResource('sizes');
export const diaApi           = masterResource('dias');
export const itemDescriptionApi = masterResource('item-descriptions');
export const buyerCodeApi     = masterResource('buyer-codes');
export const paymentTermApi   = masterResource('payment-terms');
export const taxTypeApi       = masterResource('tax-types');
export const taxGroupApi      = masterResource('tax-groups');
export const taxDeductionApi  = masterResource('tax-deductions');
export const voucherGroupApi  = masterResource('voucher-groups');
export const voucherTypeApi   = masterResource('voucher-types');
export const portApi          = masterResource('ports');
export const documentTypeApi  = masterResource('document-types');
export const numberSeriesApi  = masterResource('number-series');

// ─── Phase 2 ───
export const countryApi       = masterResource('countries');
export const cityApi          = masterResource('cities');
export const partyTypeApi     = masterResource('party-types');
export const partyApi         = masterResource('parties');
export const yarnTypeApi      = masterResource('yarn-types');
export const compositionApi   = masterResource('compositions');
export const yarnApi          = masterResource('yarns');
export const fabricStructureApi = masterResource('fabric-structures');
export const fabricApi        = masterResource('fabrics');
export const attributeApi     = masterResource('attributes');
export const processGroupApi  = masterResource('process-groups');
export const processApi       = masterResource('processes');

// ─── Fabric Consumption Masters ───
export const portionApi        = masterResource('portions');
export const styleComponentApi = masterResource('style-components');
export const knitTypeApi       = masterResource('knit-types');
export const washTypeApi       = masterResource('wash-types');

// ─── Special endpoints ───
export const taxGroupMappingApi = {
  setMembers: (taxGroupId: number, taxTypeIds: number[]) =>
    api.put<ApiResp<unknown>>(`/master/tax-groups/${taxGroupId}/tax-types`, { taxTypeIds }),
};

export const attributeValueApi = {
  list:   (attributeId: number)                                       => api.get<ApiResp<unknown[]>>(`/master/attributes/${attributeId}/values`),
  create: (attributeId: number, data: { code: string; name: string; sortOrder?: number; description?: string; isActive?: boolean }) =>
    api.post<ApiResp<unknown>>(`/master/attributes/${attributeId}/values`, data),
  update: (attributeId: number, id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/master/attributes/${attributeId}/values/${id}`, data),
  delete: (attributeId: number, id: number)                              =>
    api.delete(`/master/attributes/${attributeId}/values/${id}`),
};

export const compositionDetailApi = {
  list: (id: number)         => api.get<ApiResp<{ items: unknown[] } & Record<string, unknown>>>(`/master/compositions/${id}`),
  update: (id: number, data: { name?: string; description?: string; isActive?: boolean; items?: { fiberName: string; percentage: number }[] }) =>
    api.patch<ApiResp<unknown>>(`/master/compositions/${id}`, data),
};
