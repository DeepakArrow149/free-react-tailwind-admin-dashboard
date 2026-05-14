import api from './client';

// ═══════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════

interface ApiResp<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// ═══════════════════════════════════════════
// MRP RUNS  (existing engine)
// ═══════════════════════════════════════════

export const mrpRunApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp', { params }),
  get: (id: number) =>
    api.get<ApiResp<unknown>>(`/mrp/${id}`),
  calculate: (data: { orderIds: number[]; includeBuffer?: boolean }) =>
    api.post<ApiResp<unknown>>('/mrp/calculate', data),
  updateStatus: (id: number, status: string) =>
    api.patch<ApiResp<unknown>>(`/mrp/${id}/status`, { status }),
  consolidate: (data: { mrpRunIds: number[] }) =>
    api.post<ApiResp<unknown>>('/mrp/consolidate', data),
  delete: (id: number) =>
    api.delete(`/mrp/${id}`),
};

// ═══════════════════════════════════════════
// PROCESS MASTER
// ═══════════════════════════════════════════

export const processApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/processes', { params }),
  get: (id: number) =>
    api.get<ApiResp<unknown>>(`/mrp/processes/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>('/mrp/processes', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/processes/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/processes/${id}`),
};

// ═══════════════════════════════════════════
// PROCESS MATERIAL
// ═══════════════════════════════════════════

export const processMaterialApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/process-materials', { params }),
  get: (id: number) =>
    api.get<ApiResp<unknown>>(`/mrp/process-materials/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>('/mrp/process-materials', data),
  bulkCreate: (items: Record<string, unknown>[]) =>
    api.post<ApiResp<unknown>>('/mrp/process-materials/bulk', { items }),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/process-materials/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/process-materials/${id}`),
};

// ═══════════════════════════════════════════
// PROCESS SELECTION  (order-scoped)
// ═══════════════════════════════════════════

export const processSelectionApi = {
  listForOrder: (orderId: number) =>
    api.get<ApiResp<unknown[]>>(`/mrp/process-selections/orders/${orderId}`),
  create: (orderId: number, data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>(`/mrp/process-selections/orders/${orderId}`, data),
  bulkSet: (orderId: number, selections: Record<string, unknown>[]) =>
    api.put<ApiResp<unknown[]>>(`/mrp/process-selections/orders/${orderId}/bulk`, { selections }),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/process-selections/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/process-selections/${id}`),
};

// ═══════════════════════════════════════════
// GARMENT SPECIFICATION  (order-scoped)
// ═══════════════════════════════════════════

export const specificationApi = {
  listForOrder: (orderId: number, params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>(`/mrp/specifications/orders/${orderId}`, { params }),
  create: (orderId: number, data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>(`/mrp/specifications/orders/${orderId}`, data),
  bulkCreate: (orderId: number, specs: Record<string, unknown>[]) =>
    api.post<ApiResp<unknown[]>>(`/mrp/specifications/orders/${orderId}/bulk`, { specs }),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/specifications/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/specifications/${id}`),
  incomplete: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/specifications/incomplete', { params }),
};

// ═══════════════════════════════════════════
// ALLOWANCE MASTER
// ═══════════════════════════════════════════

export const allowanceApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/allowances', { params }),
  get: (id: number) =>
    api.get<ApiResp<unknown>>(`/mrp/allowances/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>('/mrp/allowances', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/allowances/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/allowances/${id}`),
  defaults: () =>
    api.get<ApiResp<unknown[]>>('/mrp/allowances/defaults'),
};

// ═══════════════════════════════════════════
// TEMPLATE BOM
// ═══════════════════════════════════════════

export const templateBomApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/template-boms', { params }),
  get: (id: number) =>
    api.get<ApiResp<unknown>>(`/mrp/template-boms/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>('/mrp/template-boms', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/template-boms/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/template-boms/${id}`),
  applyToOrder: (id: number, data: { orderId: number; orderQty: number; revisionNo?: number }) =>
    api.post<ApiResp<unknown>>(`/mrp/template-boms/${id}/apply`, data),
};

// ═══════════════════════════════════════════
// MRP CONFIG
// ═══════════════════════════════════════════

export const mrpConfigApi = {
  getAll: () =>
    api.get<ApiResp<unknown[]>>('/mrp/config'),
  getByKey: (key: string) =>
    api.get<ApiResp<unknown>>(`/mrp/config/${key}`),
  upsert: (data: { configKey: string; configValue: string; description?: string }) =>
    api.put<ApiResp<unknown>>('/mrp/config', data),
  delete: (key: string) =>
    api.delete(`/mrp/config/${key}`),
};

// ═══════════════════════════════════════════
// SPL PROCESS BOM
// ═══════════════════════════════════════════

export const splBomApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/spl-bom', { params }),
  get: (id: number) =>
    api.get<ApiResp<unknown>>(`/mrp/spl-bom/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>('/mrp/spl-bom', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/spl-bom/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/spl-bom/${id}`),
};

// ═══════════════════════════════════════════
// FABRIC DESIGN SHEET
// ═══════════════════════════════════════════

export const fabricDesignApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/fabric-designs', { params }),
  get: (id: number) =>
    api.get<ApiResp<unknown>>(`/mrp/fabric-designs/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResp<unknown>>('/mrp/fabric-designs', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ApiResp<unknown>>(`/mrp/fabric-designs/${id}`, data),
  delete: (id: number) =>
    api.delete(`/mrp/fabric-designs/${id}`),
};

// ═══════════════════════════════════════════
// GARMENT BARCODE
// ═══════════════════════════════════════════

export const barcodeApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<unknown[]>>('/mrp/barcodes', { params }),
  generate: (data: { orderId: number; prefix?: string; startSerial?: number; quantity: number; size?: string; color?: string }) =>
    api.post<ApiResp<unknown>>('/mrp/barcodes/generate', data),
  scan: (data: { barcodeNo: string; status: string; stage?: string }) =>
    api.post<ApiResp<unknown>>('/mrp/barcodes/scan', data),
  lookup: (barcodeNo: string) =>
    api.get<ApiResp<unknown>>(`/mrp/barcodes/lookup/${barcodeNo}`),
  summary: (orderId: number) =>
    api.get<ApiResp<unknown>>(`/mrp/barcodes/summary/${orderId}`),
};

// ═══════════════════════════════════════════
// BOM ITEM APPROVAL
// ═══════════════════════════════════════════

export const bomApprovalApi = {
  getItems: (bomId: number) =>
    api.get<ApiResp<unknown[]>>(`/mrp/bom-approval/${bomId}/items`),
  approveItem: (bomId: number, itemId: number) =>
    api.patch<ApiResp<unknown>>(`/mrp/bom-approval/${bomId}/items/${itemId}`, { action: 'APPROVE' }),
  rejectItem: (bomId: number, itemId: number, rejectionRemarks: string) =>
    api.patch<ApiResp<unknown>>(`/mrp/bom-approval/${bomId}/items/${itemId}`, { action: 'REJECT', rejectionRemarks }),
  approveAll: (bomId: number) =>
    api.post<ApiResp<unknown>>(`/mrp/bom-approval/${bomId}/approve-all`),
};
