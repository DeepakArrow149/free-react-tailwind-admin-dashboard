import client from './client';

export interface PackingListDetail {
  id?: number;
  skuCode: string;
  colorCode?: string;
  sizeCode?: string;
  packedQty: number;
}

export interface CartonDetail {
  id?: number;
  cartonNo: string;
  cartonFrom?: number;
  cartonTo?: number;
  sizeBreakdown?: Record<string, number>;
  qtyPerCarton: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  cbm?: number;
}

export interface PackingList {
  id: number;
  plNo: string;
  orderId: number;
  order?: { id: number; orderNo: string };
  buyerId: number;
  buyer?: { id: number; name: string };
  plDate: string;
  totalCartons: number;
  totalQty: number;
  totalGrossWeight?: number;
  totalNetWeight?: number;
  totalCbm?: number;
  status: string;
  remarks?: string;
  details: PackingListDetail[];
  cartons: CartonDetail[];
}

export interface ContainerStuffing {
  id: number;
  stuffingNo: string;
  orderIds?: number[];
  containerNo?: string;
  containerSize: string;
  sealNo?: string;
  stuffingDate?: string;
  vehicleNo?: string;
  totalCartons: number;
  totalCbm?: number;
  maxCbm?: number;
  utilizationPct?: number;
  status: string;
  remarks?: string;
}

export const packingListApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/packing/lists', { params }),
  get: (id: number) => client.get(`/packing/lists/${id}`),
  create: (data: Record<string, unknown>) => client.post('/packing/lists', data),
  updateStatus: (id: number, data: Record<string, unknown>) => client.put(`/packing/lists/${id}/status`, data),
  delete: (id: number) => client.delete(`/packing/lists/${id}`),
};

export const containerApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/packing/containers', { params }),
  create: (data: Record<string, unknown>) => client.post('/packing/containers', data),
  updateStatus: (id: number, data: Record<string, unknown>) => client.put(`/packing/containers/${id}/status`, data),
};

// ── Scan Pack API ──
export const scanPackApi = {
  scan: (data: Record<string, unknown>) => client.post('/packing/scan-pack', data).then(r => r.data),
  list: (params?: Record<string, unknown>) => client.get('/packing/scan-pack', { params }).then(r => r.data),
  summary: (orderId: number) => client.get(`/packing/scan-pack/summary/${orderId}`).then(r => r.data),
  cartons: (orderId: number) => client.get(`/packing/scan-pack/cartons/${orderId}`).then(r => r.data),
};
