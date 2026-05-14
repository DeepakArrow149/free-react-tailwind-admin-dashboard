import apiClient from "./client";

// ── Types ──
export interface CuttingEntry {
  id: number;
  cuttingNo: string;
  orderId: number;
  cuttingDate: string;
  tableNo?: string;
  layers?: number;
  fabricType?: string;
  plannedQtyBySize?: Record<string, number>;
  actualQtyBySize?: Record<string, number>;
  fabricRollsUsed?: { rollId: number; consumedLength: number }[];
  wastageQty: number;
  wastagePct: number;
  cutBy?: string;
  verifiedBy?: string;
  status: string;
  remarks?: string;
  order?: { id: number; orderNo: string; orderQty?: number };
  createdAt: string;
}

export interface ProductionUpdateEntry {
  id: number;
  orderId: number;
  lineNo: string;
  productionDate: string;
  process: string;
  qtyInput: number;
  qtyOutput: number;
  qtyReject: number;
  qtyAlter: number;
  efficiencyPct: number;
  remarks?: string;
  order?: { id: number; orderNo: string };
  createdAt: string;
}

export interface ProductionSummaryRow {
  process: string;
  totalInput: number;
  totalOutput: number;
  totalReject: number;
  totalAlter: number;
  avgEfficiency: number;
  entryCount: number;
}

export interface DashboardRow {
  orderId: number;
  orderNo: string;
  orderQty: number;
  totalOutput: number;
  totalReject: number;
  completionPct: number;
  lastActivity: string;
}

export interface FgTransfer {
  id: number;
  transferNo: string;
  orderId: number;
  transferDate: string;
  fromWarehouseId?: number;
  toWarehouseId?: number;
  totalQty: number;
  qtyBySize?: Record<string, number>;
  qcSummary?: string;
  transferredBy?: string;
  status: string;
  remarks?: string;
  order?: { id: number; orderNo: string };
  createdAt: string;
}

// ── Cutting API ──
export const cuttingApi = {
  list: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get("/production/cutting", { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get(`/production/cutting/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/production/cutting", data).then((r) => r.data.data),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/production/cutting/${id}`, data).then((r) => r.data.data),
  confirm: (id: number) =>
    apiClient.post(`/production/cutting/${id}/confirm`).then((r) => r.data.data),
  delete: (id: number) => apiClient.delete(`/production/cutting/${id}`),
};

// ── Production Update API ──
export const productionUpdateApi = {
  list: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get("/production/updates", { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/production/updates", data).then((r) => r.data.data),
  summary: (orderId: number) =>
    apiClient.get(`/production/updates/summary/${orderId}`).then((r) => r.data.data as ProductionSummaryRow[]),
  dashboard: () =>
    apiClient.get("/production/updates/dashboard").then((r) => r.data.data as DashboardRow[]),
};

// ── FG Transfer API ──
export const fgTransferApi = {
  list: (params: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.get("/production/fg-transfer", { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/production/fg-transfer", data).then((r) => r.data.data),
  confirm: (id: number) =>
    apiClient.post(`/production/fg-transfer/${id}/confirm`).then((r) => r.data.data),
  delete: (id: number) => apiClient.delete(`/production/fg-transfer/${id}`),
};

// ── Operation API ──
export interface OperationMaster {
  id: number;
  code: string;
  name: string;
  department: string;
  machineTypeId: number | null;
  machineType: { id: number; code: string; name: string; category: string | null } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const operationApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/production/operations', { params }).then(r => r.data),
  getById: (id: number) => apiClient.get(`/production/operations/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/production/operations', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) => apiClient.put(`/production/operations/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/production/operations/${id}`).then(r => r.data),
};

// ── Bulletin API ──
export interface BulletinDetail {
  id: number;
  bulletinNo: string;
  styleId: number;
  orderId?: number;
  totalSam: number;
  targetPcsPerHour: number;
  manpower: number;
  machines: number;
  status: string;
  remarks?: string;
  style?: { id: number; styleNo: string; styleName: string };
  items?: Array<{
    id: number;
    operationId: number;
    seqNo: number;
    machineType?: string;
    machineTypeId?: number;
    sam: number;
    attachments?: string;
    remarks?: string;
    operation?: { id: number; code: string; name: string };
  }>;
  createdAt: string;
}

export interface BulletinSummary {
  id: number;
  bulletinNo: string;
  status: string;
  orderId?: number;
  totalSam: number;
  targetPcsPerHour: number;
  createdAt: string;
}

export interface GenerateBulletinInput {
  styleId: number;
  orderId?: number;
  manpower?: number;
  machines?: number;
  targetEfficiency?: number;
  remarks?: string;
}

export const bulletinApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/production/bulletins', { params }).then(r => r.data),
  getById: (id: number) => apiClient.get(`/production/bulletins/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/production/bulletins', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) => apiClient.put(`/production/bulletins/${id}`, data).then(r => r.data),
  approve: (id: number) => apiClient.patch(`/production/bulletins/${id}/approve`).then(r => r.data),
  generateFromStyle: (data: GenerateBulletinInput) =>
    apiClient.post<{ data: BulletinDetail }>('/production/bulletins/generate-from-style', data).then(r => r.data),
  getByStyle: (styleId: number) =>
    apiClient.get<{ data: BulletinSummary[] }>(`/production/bulletins/by-style/${styleId}`).then(r => r.data),
};

// ── Production Order API ──
export interface ProductionOrderDetail {
  id: number;
  poNo: string;
  orderId: number;
  order?: { id: number; orderNo: string; totalQty?: number };
  lineNo?: string;
  lineId?: number;
  bulletinId?: number;
  lineBalancingId?: number;
  capacityLine?: { id: number; lineName: string; department: string };
  bulletin?: { id: number; bulletinNo: string; totalSam: number; style?: { styleNo: string } };
  balancing?: { id: number; name: string; balanceEfficiency: number; status: string };
  samPerPiece?: number;
  targetEfficiency?: number;
  plannedOperators?: number;
  taktTimeSec?: number;
  startDate?: string;
  endDate?: string;
  totalQty?: number;
  completedQty?: number;
  type?: string;
  status: string;
  remarks?: string;
}

export interface CreatePOFromBalancingInput {
  lineBalancingId: number;
  startDate: string;
  endDate: string;
  totalQty?: number;
  priority?: string;
  remarks?: string;
}

export const productionOrderApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/production/orders', { params }).then(r => r.data),
  getById: (id: number) => apiClient.get(`/production/orders/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/production/orders', data).then(r => r.data),
  createFromBalancing: (data: CreatePOFromBalancingInput) =>
    apiClient.post<{ data: ProductionOrderDetail }>('/production/orders/from-balancing', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) => apiClient.put(`/production/orders/${id}`, data).then(r => r.data),
  start: (id: number) => apiClient.patch(`/production/orders/${id}/start`).then(r => r.data),
  complete: (id: number) => apiClient.patch(`/production/orders/${id}/complete`).then(r => r.data),
  cancel: (id: number) => apiClient.patch(`/production/orders/${id}/cancel`).then(r => r.data),
};

// ── Hourly Production API ──
export const hourlyApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/production/hourly', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/production/hourly', data).then(r => r.data),
  summary: (poId: number, date: string) => apiClient.get(`/production/hourly/summary/${poId}`, { params: { date } }).then(r => r.data),
  dhu: (orderId: number, from: string, to: string) => apiClient.get(`/production/hourly/dhu/${orderId}`, { params: { from, to } }).then(r => r.data),
  topDefects: (orderId: number, from?: string, to?: string) => apiClient.get(`/production/hourly/top-defects/${orderId}`, { params: { from, to } }).then(r => r.data),
};

// ── Bundle API ──
export const bundleApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/production/bundles', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/production/bundles', data).then(r => r.data),
  generateFromCutting: (cuttingEntryId: number) => apiClient.post(`/production/bundles/generate/${cuttingEntryId}`).then(r => r.data),
  issueToLine: (id: number, lineNo: string) => apiClient.patch(`/production/bundles/${id}/issue`, { lineNo }).then(r => r.data),
  complete: (id: number) => apiClient.patch(`/production/bundles/${id}/complete`).then(r => r.data),
  scanBarcode: (barcode: string) => apiClient.get(`/production/bundles/scan/${barcode}`).then(r => r.data),
};
