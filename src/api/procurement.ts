import apiClient from "./client";

// ── Types ──
export interface RfqHeader {
  id: number;
  rfqNo: string;
  orderId?: number;
  materialType?: string;
  description?: string;
  requiredDate?: string;
  status: string;
  details: RfqDetail[];
  rfqSuppliers: RfqSupplierEntry[];
  quotations?: SupplierQuotation[];
  order?: { id: number; orderNo: string };
  createdAt: string;
}

export interface RfqDetail {
  id: number;
  rfqId: number;
  itemDescription: string;
  specification?: string;
  qty: number;
  unit: string;
  requiredDate?: string;
}

export interface RfqSupplierEntry {
  id: number;
  rfqId: number;
  supplierId: number;
  sentDate?: string;
  responseDate?: string;
  status: string;
  supplier?: { id: number; name: string };
}

export interface SupplierQuotation {
  id: number;
  rfqId: number;
  supplierId: number;
  quoteNo?: string;
  quoteDate?: string;
  validityDate?: string;
  currency: string;
  totalAmount: number;
  status: string;
  remarks?: string;
  details: QuotationDetail[];
  supplier?: { id: number; name: string };
}

export interface QuotationDetail {
  id: number;
  quotationId: number;
  rfqDetailId: number;
  unitPrice: number;
  leadTimeDays?: number;
  moq?: number;
  paymentTerms?: string;
  remarks?: string;
}

export interface PurchaseOrder {
  id: number;
  poNo: string;
  supplierId: number;
  orderId?: number;
  poType: string;
  poDate: string;
  expectedDate?: string;
  currency: string;
  exchangeRate: number;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentTerms?: string;
  deliveryAddress?: string;
  status: string;
  approvedBy?: number;
  approvedDate?: string;
  remarks?: string;
  details: PurchaseOrderDetail[];
  supplier?: { id: number; name: string };
  order?: { id: number; orderNo: string };
  grns?: { id: number; grnNo: string; grnDate: string; status: string }[];
  createdAt: string;
}

export interface PurchaseOrderDetail {
  id: number;
  poId: number;
  materialId?: number;
  itemDescription: string;
  specification?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  taxPct: number;
  totalAmount: number;
  receivedQty: number;
  pendingQty: number;
  material?: { id: number; name: string; materialCode: string };
}

export interface GoodsReceiptNote {
  id: number;
  grnNo: string;
  poId: number;
  supplierId: number;
  grnDate: string;
  warehouseId?: number;
  vehicleNo?: string;
  challanNo?: string;
  challanDate?: string;
  status: string;
  remarks?: string;
  details: GrnDetailEntry[];
  po?: { id: number; poNo: string };
  supplier?: { id: number; name: string };
  warehouse?: { id: number; name: string };
  createdAt: string;
}

export interface GrnDetailEntry {
  id: number;
  grnId: number;
  poDetailId: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  poDetail?: PurchaseOrderDetail;
}

export interface SubcontractOutward {
  id: number;
  challanNo: string;
  supplierId: number;
  orderId: number;
  processType: string;
  dispatchDate: string;
  expectedReturnDate: string;
  items: { sku: string; qty: number }[];
  ewayBillNo?: string;
  status: string;
  remarks?: string;
  supplier?: { id: number; name: string };
  order?: { id: number; orderNo: string };
  inwards?: SubcontractInward[];
}

export interface SubcontractInward {
  id: number;
  challanOutwardId: number;
  receivedDate: string;
  receivedQty: number;
  rejectedQty: number;
  excessQty: number;
  shortageQty: number;
  dcNo?: string;
}

// ── RFQ API ──
export const rfqApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => apiClient.get("/procurement/rfq", { params }),
  get: (id: number) => apiClient.get(`/procurement/rfq/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post("/procurement/rfq", data),
  update: (id: number, data: Record<string, unknown>) => apiClient.put(`/procurement/rfq/${id}`, data),
  delete: (id: number) => apiClient.delete(`/procurement/rfq/${id}`),
  send: (id: number, supplierIds: number[]) => apiClient.post(`/procurement/rfq/${id}/send`, { supplierIds }),
  addQuotation: (rfqId: number, data: Record<string, unknown>) => apiClient.post(`/procurement/rfq/${rfqId}/quotation`, data),
  comparison: (rfqId: number) => apiClient.get(`/procurement/rfq/${rfqId}/comparison`),
};

// ── Purchase Order API ──
export const purchaseOrderApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => apiClient.get("/procurement/purchase-orders", { params }),
  get: (id: number) => apiClient.get(`/procurement/purchase-orders/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post("/procurement/purchase-orders", data),
  update: (id: number, data: Record<string, unknown>) => apiClient.put(`/procurement/purchase-orders/${id}`, data),
  changeStatus: (id: number, status: string) => apiClient.patch(`/procurement/purchase-orders/${id}/status`, { status }),
  approve: (id: number) => apiClient.post(`/procurement/purchase-orders/${id}/approve`),
  delete: (id: number) => apiClient.delete(`/procurement/purchase-orders/${id}`),
};

// ── GRN API ──
export const grnApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => apiClient.get("/procurement/grn", { params }),
  get: (id: number) => apiClient.get(`/procurement/grn/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post("/procurement/grn", data),
  confirm: (id: number) => apiClient.patch(`/procurement/grn/${id}/confirm`),
};

// ── Subcontract API ──
export const subcontractApi = {
  createOutward: (data: Record<string, unknown>) => apiClient.post("/procurement/subcontract/outward", data),
  getOutward: (id: number) => apiClient.get(`/procurement/subcontract/outward/${id}`),
  createInward: (data: Record<string, unknown>) => apiClient.post("/procurement/subcontract/inward", data),
  listPending: () => apiClient.get("/procurement/subcontract/pending"),
};
