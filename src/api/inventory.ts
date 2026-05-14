import apiClient from "./client";

// ── Types ──
export interface Warehouse {
  id: number;
  code: string;
  name: string;
  type: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StockLedgerEntry {
  id: number;
  materialId: number;
  warehouseId: number;
  transactionType: string;
  referenceType?: string;
  referenceId?: number;
  qtyIn: number;
  qtyOut: number;
  balanceQty: number;
  rate?: number;
  remarks?: string;
  createdAt: string;
  material?: { id: number; name: string; code: string; unit: string };
  warehouse?: { id: number; name: string; code: string };
}

export interface StockSummaryRow {
  materialId: number;
  warehouseId: number;
  materialName: string;
  materialCode: string;
  unit: string;
  warehouseName: string;
  totalIn: number;
  totalOut: number;
  balance: number;
}

export interface MaterialIssueHeader {
  id: number;
  issueNo: string;
  orderId: number;
  warehouseId: number;
  issueDate: string;
  status: string;
  remarks?: string;
  createdBy: number;
  confirmedBy?: number;
  confirmedAt?: string;
  order?: { id: number; orderNo: string };
  warehouse?: { id: number; name: string };
  details: MaterialIssueDetail[];
  createdAt: string;
}

export interface MaterialIssueDetail {
  id: number;
  issueId: number;
  materialId: number;
  qty: number;
  material?: { id: number; name: string; code: string; unit: string };
}

export interface MaterialReturnHeader {
  id: number;
  returnNo: string;
  orderId: number;
  warehouseId: number;
  returnDate: string;
  status: string;
  reason?: string;
  remarks?: string;
  createdBy: number;
  confirmedBy?: number;
  confirmedAt?: string;
  order?: { id: number; orderNo: string };
  warehouse?: { id: number; name: string };
  details: MaterialReturnDetail[];
  createdAt: string;
}

export interface MaterialReturnDetail {
  id: number;
  returnId: number;
  materialId: number;
  qty: number;
  material?: { id: number; name: string; code: string; unit: string };
}

// ── Warehouse API ──
export const warehouseApi = {
  list: () => apiClient.get("/inventory/warehouses").then((r) => r.data.data),
  create: (data: Partial<Warehouse>) =>
    apiClient.post("/inventory/warehouses", data).then((r) => r.data.data),
  update: (id: number, data: Partial<Warehouse>) =>
    apiClient.put(`/inventory/warehouses/${id}`, data).then((r) => r.data.data),
  delete: (id: number) => apiClient.delete(`/inventory/warehouses/${id}`),
};

// ── Stock API ──
export const stockApi = {
  ledger: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get("/inventory/stock", { params }).then((r) => r.data),
  summary: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get("/inventory/stock/summary", { params }).then((r) => r.data.data),
};

// ── Material Issue API ──
export const issueApi = {
  list: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get("/inventory/issues", { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/inventory/issues", data).then((r) => r.data.data),
  confirm: (id: number) =>
    apiClient.post(`/inventory/issues/${id}/confirm`).then((r) => r.data.data),
};

// ── Material Return API ──
export const returnApi = {
  list: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get("/inventory/returns", { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/inventory/returns", data).then((r) => r.data.data),
  confirm: (id: number) =>
    apiClient.post(`/inventory/returns/${id}/confirm`).then((r) => r.data.data),
};

// ── Roll API ──
export const rollApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get("/inventory/rolls", { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get(`/inventory/rolls/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/inventory/rolls", data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/inventory/rolls/${id}`, data).then((r) => r.data),
  delete: (id: number) =>
    apiClient.delete(`/inventory/rolls/${id}`),
};

// ── Stock Count API ──
export const stockCountApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get("/inventory/stock-counts", { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get(`/inventory/stock-counts/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/inventory/stock-counts", data).then((r) => r.data),
  approve: (id: number) =>
    apiClient.post(`/inventory/stock-counts/${id}/approve`).then((r) => r.data),
  post: (id: number) =>
    apiClient.post(`/inventory/stock-counts/${id}/post`).then((r) => r.data),
};

// ── Stock Adjustment API ──
export const stockAdjustmentApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get("/inventory/adjustments", { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get(`/inventory/adjustments/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/inventory/adjustments", data).then((r) => r.data),
  approve: (id: number) =>
    apiClient.post(`/inventory/adjustments/${id}/approve`).then((r) => r.data),
  post: (id: number) =>
    apiClient.post(`/inventory/adjustments/${id}/post`).then((r) => r.data),
};

// ── Stock Transfer API ──
export const stockTransferApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get("/inventory/transfers", { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get(`/inventory/transfers/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/inventory/transfers", data).then((r) => r.data),
  confirm: (id: number) =>
    apiClient.post(`/inventory/transfers/${id}/confirm`).then((r) => r.data),
};
