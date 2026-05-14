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

export type CostSheetApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'IE_APPROVED' | 'AUDIT_APPROVED' | 'CEO_APPROVED' | 'REJECTED';

export interface CostingSheetSummary {
  id: number;
  costingNo: string;
  orderId: number | null;
  styleId: number;
  stage: string;
  approvalStatus: CostSheetApprovalStatus;
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

  // v2 header fields
  revenuePerMc?: number | null;
  epm?: number | null;
  cogsAmount?: number | null;
  cogsPct?: number | null;
  salesContractNumber?: string | null;
  salesContractFileUrl?: string | null;
  commercialFinancePct?: number | null;
  commercialFinanceAmount?: number | null;
  buyingCommissionPct?: number | null;
  buyingCommissionAmount?: number | null;
  cmAmount?: number | null;
  paymentTerm?: string | null;
  fobPrice?: number | null;
  colorCount?: number | null;
  plannedLine?: number | null;
  packSize?: number | null;
  seasonStart?: string | null;
  seasonEnd?: string | null;
  productImageUrl?: string | null;

  lines?: CostSheetLineInput[];
}

export type UpdateCostingSheetInput = CreateCostingSheetInput;

// ═══════════════════════════════════════════
// COST SHEET v2 — LINES, DETAIL, PHASES, SUPPLY CHAIN, APPROVALS
// ═══════════════════════════════════════════

export type CostSheetSection = 'FABRIC' | 'STITCHING_TRIM' | 'SUPPLEMENTARY' | 'OPERATIONAL';
export type CostSheetSource = 'NOMINATED' | 'NON_NOMINATED';
export type CostSheetLineStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SupplementaryReason = 'OVER_CONSUMPTION' | 'PRICE_INCREASE' | 'FACTORY_LOST' | 'OTHER';

export interface CostSheetLineInput {
  section: CostSheetSection;
  sequence?: number;
  usnCode?: string | null;
  itemName: string;
  materialId?: number | null;
  supplierId?: number | null;
  imageUrl?: string | null;
  source?: CostSheetSource | null;
  status?: CostSheetLineStatus;
  wastagePct?: number;
  totalQty?: number;
  unit?: string;
  unitPrice?: number;
  totalValue?: number;
  supplementaryReason?: SupplementaryReason | null;
  fileUrl?: string | null;
  smv?: number | null;
  mcPerLine?: number | null;
  efficiencyPct?: number | null;
  requiredDays?: number | null;
  avgProductionPerLine?: number | null;
  detailMeta?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface CostSheetLine extends CostSheetLineInput {
  id: number;
  sheetId: number;
  totalValue: number;
  wastagePct: number;
  totalQty: number;
  unit: string;
  unitPrice: number;
  status: CostSheetLineStatus;
  createdAt: string;
  updatedAt: string;
  material?: { id: number; materialCode: string; materialName: string; images?: unknown } | null;
  supplier?: { id: number; code: string; name: string } | null;
}

export interface SectionSummary {
  singleUnitPrice: number;
  avgMatPrice: number;
  totalQty: number;
  totalCost: number;
  costPct: number;
}

export interface PhaseRow {
  phase: 1 | 2 | 3 | 4;
  label: string;
  totalOrderValue: number | null;
  cogs: number | null;
  commercialInterest: number | null;
  buyingCommission: number | null;
  cm: number | null;
  perPcsCm: number | null;
  mcEarningPerDay: number | null;
}

export interface ApprovalEntry {
  id: number;
  sheetId: number;
  action: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: number;
  actorRole: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface SupplyChainView {
  order: {
    id: number; orderNo: string; buyerPoNo: string | null;
    piNo: string | null; lcNo: string | null;
    totalQty: number; totalValue: number;
    currency: string; paymentTerms: string | null;
  } | null;
  purchaseOrders: Array<{
    id: number; poNo: string; poDate: string;
    totalAmount: number; subTotal: number;
    currency: string; status: string;
    supplier: { id: number; code: string; name: string } | null;
    details: Array<{ qty: number; unitPrice: number; totalAmount: number }>;
  }>;
  lettersOfCredit: Array<{
    id: number; lcNo: string; lcAmount: number; currency: string;
    status: string; issueDate: string | null; expiryDate: string | null;
    latestShipmentDate: string | null; bankName: string | null;
  }>;
  salesInvoices: Array<{
    id: number; invoiceNo: string; invoiceDate: string;
    totalAmount: number; inrAmount: number; currency: string; status: string;
  }>;
}

export interface CostSheetDetail extends CostingSheetSummary {
  // extra v2 header fields (nullable for legacy rows)
  revenuePerMc: number | null;
  epm: number | null;
  cogsAmount: number | null;
  cogsPct: number | null;
  salesContractNumber: string | null;
  salesContractFileUrl: string | null;
  commercialFinancePct: number | null;
  commercialFinanceAmount: number | null;
  buyingCommissionPct: number | null;
  buyingCommissionAmount: number | null;
  cmAmount: number | null;
  paymentTerm: string | null;
  fobPrice: number | null;
  colorCount: number | null;
  plannedLine: number | null;
  packSize: number | null;
  seasonStart: string | null;
  seasonEnd: string | null;
  productImageUrl: string | null;
  submittedAt: string | null; submittedBy: number | null;
  ieApprovedAt: string | null; ieApprovedBy: number | null;
  auditApprovedAt: string | null; auditApprovedBy: number | null;
  ceoApprovedAt: string | null; ceoApprovedBy: number | null;
  rejectedAt: string | null; rejectedBy: number | null;
  rejectionRemarks: string | null;

  approvals: ApprovalEntry[];
  attachments: Array<{
    id: number; sheetId: number; kind: string; fileName: string;
    fileUrl: string; fileSize: number | null; contentType: string | null;
    uploadedBy: number; createdAt: string;
  }>;
  sections: {
    fabric: CostSheetLine[];
    stitchingTrim: CostSheetLine[];
    supplementary: CostSheetLine[];
    operational: CostSheetLine[];
  };
  summary: {
    fabric: SectionSummary;
    stitchingTrim: SectionSummary;
    supplementary: SectionSummary;
  };
  phaseComparison: PhaseRow[];
  supplyChain: SupplyChainView | null;
}

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

  detail: (id: number) =>
    api.get<ApiResp<CostSheetDetail>>(`/costing/sheets/${id}/detail`),

  phases: (id: number) =>
    api.get<ApiResp<PhaseRow[]>>(`/costing/sheets/${id}/phases`),

  supplyChain: (id: number) =>
    api.get<ApiResp<SupplyChainView>>(`/costing/sheets/${id}/supply-chain`),

  approvals: (id: number) =>
    api.get<ApiResp<ApprovalEntry[]>>(`/costing/sheets/${id}/approvals`),

  create: (data: CreateCostingSheetInput) =>
    api.post<ApiResp<CostSheetDetail>>('/costing/sheets', data),

  update: (id: number, data: UpdateCostingSheetInput) =>
    api.patch<ApiResp<CostSheetDetail>>(`/costing/sheets/${id}`, data),

  delete: (id: number) =>
    api.delete(`/costing/sheets/${id}`),

  comparison: (orderId: number) =>
    api.get<ApiResp<CostComparison>>('/costing/sheets/comparison', { params: { orderId } }),

  // line items
  addLine: (id: number, data: CostSheetLineInput) =>
    api.post<ApiResp<CostSheetLine>>(`/costing/sheets/${id}/lines`, data),

  updateLine: (id: number, lineId: number, data: Partial<CostSheetLineInput>) =>
    api.patch<ApiResp<CostSheetLine>>(`/costing/sheets/${id}/lines/${lineId}`, data),

  deleteLine: (id: number, lineId: number) =>
    api.delete(`/costing/sheets/${id}/lines/${lineId}`),

  // approval transitions
  submit:        (id: number, remarks?: string | null) => api.post<ApiResp<CostSheetDetail>>(`/costing/sheets/${id}/submit`,         { remarks }),
  ieApprove:     (id: number, remarks?: string | null) => api.post<ApiResp<CostSheetDetail>>(`/costing/sheets/${id}/approve/ie`,     { remarks }),
  auditApprove:  (id: number, remarks?: string | null) => api.post<ApiResp<CostSheetDetail>>(`/costing/sheets/${id}/approve/audit`,  { remarks }),
  ceoApprove:    (id: number, remarks?: string | null) => api.post<ApiResp<CostSheetDetail>>(`/costing/sheets/${id}/approve/ceo`,    { remarks }),
  reject:        (id: number, remarks: string)         => api.post<ApiResp<CostSheetDetail>>(`/costing/sheets/${id}/reject`,         { remarks }),

  // attachments
  listAttachments: (id: number) =>
    api.get<ApiResp<CostSheetDetail['attachments']>>(`/costing/sheets/${id}/attachments`),

  uploadAttachment: (id: number, file: File, kind: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    return api.post<ApiResp<{ id: number; fileUrl: string }>>(`/costing/sheets/${id}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAttachment: (id: number, attachmentId: number) =>
    api.delete(`/costing/sheets/${id}/attachments/${attachmentId}`),

  // export
  exportExcelUrl: (id: number) => `/api/v1/costing/sheets/${id}/export.xlsx`,
  exportPdfUrl:   (id: number) => `/api/v1/costing/sheets/${id}/export.pdf`,
};
