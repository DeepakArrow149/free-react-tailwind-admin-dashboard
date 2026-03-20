import api from './client';

// ═══════════════════════════════════════════
// BOM TYPES
// ═══════════════════════════════════════════

export interface BomItemInput {
  materialType: string;
  itemDescription: string;
  materialId?: number | null;
  supplierId?: number | null;
  unit: string;
  consumptionPerPiece: number;
  wastagePct: number;
  unitPrice: number;
  colorScope: string;
  sizeScope: string;
  applicableColors?: string[] | null;
  applicableSizes?: string[] | null;
  remarks?: string | null;
}

export interface BomItem extends BomItemInput {
  id: number;
  bomId: number;
  totalConsumption: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  material?: { id: number; materialCode: string; materialName: string } | null;
  supplier?: { id: number; code: string; name: string } | null;
}

export interface BomSummary {
  id: number;
  bomNo: string;
  styleId: number;
  version: number;
  description: string | null;
  totalCost: number;
  status: string;
  approvedBy: number | null;
  approvedDate: string | null;
  createdAt: string;
  updatedAt: string;
  style: {
    id: number;
    styleNo: string;
    styleName: string;
    buyer: { id: number; name: string; code: string };
  };
  _count: { items: number };
}

export interface BomFull extends BomSummary {
  items: BomItem[];
}

export interface CreateBomInput {
  styleId: number;
  description?: string;
  items: BomItemInput[];
}

export interface UpdateBomInput {
  description?: string;
  items: BomItemInput[];
}

// ═══════════════════════════════════════════
// COSTING SHEET TYPES
// ═══════════════════════════════════════════

export interface CostingSheetSummary {
  id: number;
  costingNo: string;
  orderId: number | null;
  styleId: number;
  stage: string;
  orderQty: number;
  fabricCost: number;
  trimCost: number;
  cmtCost: number;
  washCost: number;
  embellishmentCost: number;
  testingCost: number;
  overheadCost: number;
  freightCost: number;
  commissionPct: number;
  commissionAmount: number;
  totalCostPerPc: number;
  sellingPricePerPc: number;
  totalSellingPrice: number;
  marginAmount: number;
  marginPct: number;
  currency: string;
  exchangeRate: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  style: {
    id: number;
    styleNo: string;
    styleName: string;
    buyer: { id: number; name: string; code: string };
  };
  order: { id: number; orderNo: string; totalQty: number } | null;
}

export interface CostingSheetFull extends CostingSheetSummary {
  order: { id: number; orderNo: string; totalQty: number; totalValue: number; exFactoryDate: string } | null;
}

export interface CreateCostingSheetInput {
  orderId?: number | null;
  styleId: number;
  stage: string;
  orderQty: number;
  fabricCost: number;
  trimCost: number;
  cmtCost: number;
  washCost: number;
  embellishmentCost: number;
  testingCost: number;
  overheadCost: number;
  freightCost: number;
  commissionPct: number;
  sellingPricePerPc: number;
  currency: string;
  exchangeRate: number;
  remarks?: string | null;
}

export type UpdateCostingSheetInput = CreateCostingSheetInput;

export interface CostComparison {
  INITIAL: CostingSheetSummary | null;
  BUDGETED: CostingSheetSummary | null;
  ACTUAL: CostingSheetSummary | null;
}

// ═══════════════════════════════════════════
// API RESPONSE WRAPPER
// ═══════════════════════════════════════════

interface ApiResp<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// ═══════════════════════════════════════════
// BOM API
// ═══════════════════════════════════════════

export const bomApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<BomSummary[]>>('/costing/bom', { params }),

  get: (id: number) =>
    api.get<ApiResp<BomFull>>(`/costing/bom/${id}`),

  create: (data: CreateBomInput) =>
    api.post<ApiResp<BomFull>>('/costing/bom', data),

  update: (id: number, data: UpdateBomInput) =>
    api.patch<ApiResp<BomFull>>(`/costing/bom/${id}`, data),

  updateStatus: (id: number, status: string) =>
    api.patch<ApiResp<BomSummary>>(`/costing/bom/${id}/status`, { status }),

  clone: (id: number) =>
    api.post<ApiResp<BomFull>>(`/costing/bom/${id}/clone`),

  delete: (id: number) =>
    api.delete(`/costing/bom/${id}`),
};

// ═══════════════════════════════════════════
// COSTING SHEET API
// ═══════════════════════════════════════════

export const costingApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResp<CostingSheetSummary[]>>('/costing/sheets', { params }),

  get: (id: number) =>
    api.get<ApiResp<CostingSheetFull>>(`/costing/sheets/${id}`),

  create: (data: CreateCostingSheetInput) =>
    api.post<ApiResp<CostingSheetFull>>('/costing/sheets', data),

  update: (id: number, data: UpdateCostingSheetInput) =>
    api.patch<ApiResp<CostingSheetFull>>(`/costing/sheets/${id}`, data),

  delete: (id: number) =>
    api.delete(`/costing/sheets/${id}`),

  comparison: (orderId: number) =>
    api.get<ApiResp<CostComparison>>('/costing/sheets/comparison', { params: { orderId } }),
};
