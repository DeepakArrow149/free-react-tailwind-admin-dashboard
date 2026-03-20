import api from './client';

// ── Types ──

export interface BuyerOrderSummary {
  id: number;
  orderNo: string;
  soNo: string | null;
  buyerPoNo: string | null;
  buyerPoDate: string | null;
  buyerId: number;
  styleId: number;
  seasonId: number | null;
  companyId: number | null;
  buyingAgentId: number | null;
  merchantId: number | null;
  partyGroupId: number | null;
  threadQualityId: number | null;
  orderDate: string;
  exFactoryDate: string;
  shipMode: string;
  incoterm: string;
  currency: string;
  totalQty: number;
  totalValue: number;
  status: string;
  revisionNo: number;
  lcNo: string | null;
  lcDate: string | null;
  fileNo: string | null;
  piNo: string | null;
  deliveryAddress: string | null;
  deliveryBranchId: number | null;
  referenceNo: string | null;
  createdAt: string;
  buyer: { id: number; name: string; code: string };
  style: { id: number; styleNo: string; styleName: string };
  season: { id: number; name: string; code: string } | null;
  company: { id: number; name: string; code: string } | null;
  buyingAgent: { id: number; name: string; code: string } | null;
  merchant: { id: number; fullName: string; username: string } | null;
  partyGroup: { id: number; name: string; code: string } | null;
  threadQuality: { id: number; name: string; code: string } | null;
  deliveryBranch: { id: number; name: string; code: string } | null;
  _count: { details: number };
}

export interface BuyerOrderDetail {
  id: number;
  orderId: number;
  colorId: number;
  colorName: string;
  sizeCode: string;
  skuCode: string;
  orderedQty: number;
  unitPrice: number;
  totalAmount: number;
  materialCategoryId: number | null;
  materialId: number | null;
  countId: number | null;
  poNo: string | null;
  meterQty: number | null;
  sectionId: number | null;
  unit: string | null;
  lineRemarks: string | null;
  color: { id: number; colorCode: string; colorName: string };
  materialCategory: { id: number; name: string } | null;
  material: { id: number; materialCode: string; materialName: string } | null;
  count: { id: number; code: string; name: string } | null;
  section: { id: number; code: string; name: string } | null;
}

export interface BuyerOrderRevision {
  id: number;
  orderId: number;
  revisionNo: number;
  changedBy: number;
  changeDate: string;
  changeReason: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

export interface BuyerOrderFull extends BuyerOrderSummary {
  destinationPort: string | null;
  exchangeRate: number | null;
  paymentTerms: string | null;
  garmentImages: string[] | null;
  remarks: string | null;
  details: BuyerOrderDetail[];
  revisions: BuyerOrderRevision[];
}

export interface OrderDetailInput {
  colorId: number;
  colorName: string;
  sizeCode: string;
  skuCode: string;
  orderedQty: number;
  unitPrice: number;
  totalAmount: number;
  materialCategoryId?: number | null;
  materialId?: number | null;
  countId?: number | null;
  poNo?: string | null;
  meterQty?: number | null;
  sectionId?: number | null;
  unit?: string | null;
  lineRemarks?: string | null;
}

export interface CreateBuyerOrderInput {
  buyerId: number;
  styleId: number;
  seasonId?: number | null;
  companyId?: number | null;
  buyingAgentId?: number | null;
  merchantId?: number | null;
  partyGroupId?: number | null;
  threadQualityId?: number | null;
  buyerPoNo?: string | null;
  buyerPoDate?: string | null;
  orderDate: string;
  exFactoryDate: string;
  shipMode?: string;
  destinationPort?: string | null;
  incoterm?: string;
  currency?: string;
  exchangeRate?: number | null;
  paymentTerms?: string | null;
  lcNo?: string | null;
  lcDate?: string | null;
  fileNo?: string | null;
  piNo?: string | null;
  deliveryAddress?: string | null;
  deliveryBranchId?: number | null;
  referenceNo?: string | null;
  remarks?: string | null;
  details: OrderDetailInput[];
}

export interface UpdateBuyerOrderInput extends Partial<Omit<CreateBuyerOrderInput, 'details'>> {
  changeReason?: string;
  details?: OrderDetailInput[];
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: string;
  buyerId?: number;
  styleId?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// ── API Functions ──

export async function listBuyerOrders(params: OrderListParams = {}) {
  const { data } = await api.get<PaginatedResponse<BuyerOrderSummary>>('/merchandising/orders', { params });
  return data;
}

export async function getBuyerOrder(id: number) {
  const { data } = await api.get<SingleResponse<BuyerOrderFull>>(`/merchandising/orders/${id}`);
  return data;
}

export async function createBuyerOrder(input: CreateBuyerOrderInput) {
  const { data } = await api.post<SingleResponse<BuyerOrderFull>>('/merchandising/orders', input);
  return data;
}

export async function updateBuyerOrder(id: number, input: UpdateBuyerOrderInput) {
  const { data } = await api.patch<SingleResponse<BuyerOrderFull>>(`/merchandising/orders/${id}`, input);
  return data;
}

export async function updateOrderStatus(id: number, status: string, remarks?: string) {
  const { data } = await api.patch<SingleResponse<BuyerOrderFull>>(`/merchandising/orders/${id}/status`, { status, remarks });
  return data;
}

export async function deleteBuyerOrder(id: number) {
  await api.delete(`/merchandising/orders/${id}`);
}

export async function getOrderRevisions(id: number) {
  const { data } = await api.get<{ success: boolean; data: BuyerOrderRevision[] }>(`/merchandising/orders/${id}/revisions`);
  return data;
}

export async function getOrderStats() {
  const { data } = await api.get<{ success: boolean; data: Record<string, unknown> }>('/merchandising/orders/stats');
  return data;
}

export const merchandisingApi = {
  listBuyerOrders,
  getBuyerOrder,
  createBuyerOrder,
  updateBuyerOrder,
  updateOrderStatus,
  deleteBuyerOrder,
  getOrderRevisions,
  getOrderStats,
};
