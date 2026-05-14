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
  /** @deprecated Legacy table — read via PO Matrix instead. Kept optional for backward compatibility. */
  details?: BuyerOrderDetail[];
  /** PO Lines + Matrix are the new source of truth (read via orderPoLineApi for the editable view). */
  poLines?: unknown[];
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
  sizeSet?: number;
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
  details?: OrderDetailInput[];
}

export interface UpdateBuyerOrderInput extends Partial<Omit<CreateBuyerOrderInput, 'details'>> {
  changeReason?: string;
  details?: OrderDetailInput[];
}

/** Payload for amending CONFIRMED / IN_PRODUCTION orders. Always requires a reason. */
export interface AmendBuyerOrderInput {
  changeReason: string;
  exFactoryDate?: string;
  planCutDate?: string | null;
  earliestShipDate?: string | null;
  latestShipDate?: string | null;
  orderPriority?: number;
  deliveryTolerancePlusPct?: number;
  deliveryToleranceMinusPct?: number;
  details?: OrderDetailInput[];
}

export async function amendBuyerOrder(id: number, input: AmendBuyerOrderInput) {
  const { data } = await api.patch<SingleResponse<BuyerOrderFull>>(`/merchandising/orders/${id}/amend`, input);
  return data;
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

// ── SHIPMENT SCHEDULE ──

export interface ShipmentSchedule {
  id: number;
  orderId: number;
  shipmentNo: number;
  plannedDate: string;
  actualDate: string | null;
  plannedQty: number;
  shippedQty: number;
  status: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShipmentInput {
  shipmentNo: number;
  plannedDate: string;
  plannedQty: number;
  remarks?: string | null;
}

export interface UpdateShipmentInput {
  plannedDate?: string;
  actualDate?: string | null;
  plannedQty?: number;
  shippedQty?: number;
  status?: string;
  remarks?: string | null;
}

export async function listShipments(orderId: number) {
  const { data } = await api.get<{ success: boolean; data: ShipmentSchedule[] }>(
    `/merchandising/orders/${orderId}/shipments`
  );
  return data;
}

export async function createShipment(orderId: number, input: CreateShipmentInput) {
  const { data } = await api.post<{ success: boolean; data: ShipmentSchedule }>(
    `/merchandising/orders/${orderId}/shipments`, input
  );
  return data;
}

export async function updateShipment(orderId: number, shipmentId: number, input: UpdateShipmentInput) {
  const { data } = await api.patch<{ success: boolean; data: ShipmentSchedule }>(
    `/merchandising/orders/${orderId}/shipments/${shipmentId}`, input
  );
  return data;
}

export async function deleteShipment(orderId: number, shipmentId: number) {
  await api.delete(`/merchandising/orders/${orderId}/shipments/${shipmentId}`);
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
  listShipments,
  createShipment,
  updateShipment,
  deleteShipment,
};

// ═══════════════════════════════════════════
// PO LINE / MATRIX (v2 Excel-style entry)
// ═══════════════════════════════════════════

export type AllowanceType = 'PERCENT' | 'QTY';

export interface PoMatrixRow {
  id?: number;
  colorId: number;
  color?: { id: number; colorCode: string; colorName: string; hexValue?: string | null };
  sizeId?: number | null;
  size?: { id: number; code: string; name: string; sortOrder: number } | null;
  sizeCode: string;
  orderQty: number;
  allowanceType: AllowanceType;
  allowancePct: number;
  allowanceQty: number;
  extra1: number;
  extra2: number;
  extra3: number;
  totalQty?: number;          // computed by server
  productionQty?: number;
  cutQty?: number;
  rate: number;
  amount?: number;            // computed by server
  remarks?: string | null;
}

export interface PoLineAttachment {
  id: number;
  poLineId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  contentType: string | null;
  uploadedBy: number;
  createdAt: string;
}

export interface PoLine {
  id: number;
  orderId: number;
  lineNo: number;
  buyerPoNo: string;
  poDate: string;
  shipDate: string;
  portId: number | null;
  port?: { id: number; code: string; name: string; portType: string } | null;
  destination: string | null;
  itemDescriptionId: number | null;
  itemDescription?: { id: number; code: string; description: string } | null;
  sizeGroupId: number | null;
  sizeGroup?: { id: number; groupName: string; sizes: unknown } | null;
  packCombo: string | null;
  uomId: number | null;
  uom?: { id: number; code: string; name: string } | null;
  packSet: string | null;
  noOfPieces: number;
  quantity: number;
  orderQty: number;
  productionQty: number;
  cutQty: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  matrix: PoMatrixRow[];
  attachments: PoLineAttachment[];
}

export interface PoLineInput {
  buyerPoNo: string;
  poDate: string;         // YYYY-MM-DD
  shipDate: string;       // YYYY-MM-DD
  portId?: number | null;
  destination?: string | null;
  itemDescriptionId?: number | null;
  sizeGroupId?: number | null;
  packCombo?: string | null;
  uomId?: number | null;
  packSet?: string | null;
  noOfPieces?: number;
  remarks?: string | null;
  matrix?: PoMatrixRowInput[];
}

export interface PoMatrixRowInput {
  colorId: number;
  sizeId?: number | null;
  sizeCode: string;
  orderQty?: number;
  allowanceType?: AllowanceType;
  allowancePct?: number;
  allowanceQty?: number;
  extra1?: number;
  extra2?: number;
  extra3?: number;
  productionQty?: number;
  cutQty?: number;
  rate?: number;
  remarks?: string | null;
}

interface ApiResp<T> { success: boolean; message: string; data: T }

export const orderPoLineApi = {
  list: (orderId: number) =>
    api.get<ApiResp<PoLine[]>>(`/merchandising/orders/${orderId}/po-lines`),
  get: (orderId: number, lineId: number) =>
    api.get<ApiResp<PoLine>>(`/merchandising/orders/${orderId}/po-lines/${lineId}`),
  create: (orderId: number, data: PoLineInput) =>
    api.post<ApiResp<PoLine>>(`/merchandising/orders/${orderId}/po-lines`, data),
  update: (orderId: number, lineId: number, data: Partial<PoLineInput>) =>
    api.patch<ApiResp<PoLine>>(`/merchandising/orders/${orderId}/po-lines/${lineId}`, data),
  delete: (orderId: number, lineId: number) =>
    api.delete(`/merchandising/orders/${orderId}/po-lines/${lineId}`),
  duplicate: (orderId: number, lineId: number, buyerPoNo: string) =>
    api.post<ApiResp<PoLine>>(`/merchandising/orders/${orderId}/po-lines/${lineId}/duplicate`, { buyerPoNo }),
  autoGenerate: (orderId: number, lineId: number, body: { colorIds: number[]; sizeIds?: number[]; defaultOrderQty?: number; defaultRate?: number }) =>
    api.post<ApiResp<PoLine>>(`/merchandising/orders/${orderId}/po-lines/${lineId}/auto-generate`, body),
  uploadAttachment: (orderId: number, lineId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<ApiResp<PoLineAttachment>>(`/merchandising/orders/${orderId}/po-lines/${lineId}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAttachment: (orderId: number, lineId: number, attachmentId: number) =>
    api.delete(`/merchandising/orders/${orderId}/po-lines/${lineId}/attachments/${attachmentId}`),
};

// ─── Fabric Consumption (engineering tab) ───
export interface FabricCadDetail {
  id?: number;
  sizeId?: number | null;
  sizeCode: string;
  orderQty: number;
  productionQty: number;
  planQty: number;
  gram: number;
  totalWeight: number;
  finishedDia?: number | null;
  knittingDia?: number | null;
  collarNotes?: string | null;
  size?: { id: number; code: string; name: string; sortOrder: number } | null;
}

export interface FabricYarnDetail {
  id?: number;
  countId?: number | null;
  yarnColor?: string | null;
  shadeNo?: string | null;
  compositionPercent: number;
  qty: number;
  isYarnDyed: boolean;
  isTwisted: boolean;
  remarks?: string | null;
  count?: { id: number; code: string; name: string } | null;
}

export interface FabricColorMap {
  id?: number;
  garmentColorId: number;
  fabricColorId?: number | null;
  aopColorId?: number | null;
  remarks?: string | null;
  garmentColor?: { id: number; colorCode: string; colorName: string; hexValue?: string | null };
  fabricColor?:  { id: number; colorCode: string; colorName: string; hexValue?: string | null } | null;
  aopColor?:     { id: number; colorCode: string; colorName: string; hexValue?: string | null } | null;
}

export interface FabricConsumption {
  id: number;
  orderId: number;
  rowNo: number;
  styleComponentId?: number | null;
  portionId?: number | null;
  collarTwill?: string | null;
  isMainPart: boolean;
  isFolding: boolean;
  isCollar: boolean;
  isHandCutting: boolean;
  fabricStructureId?: number | null;
  materialId?: number | null;
  buyGsm?: string | number | null;
  requiredGsm?: string | number | null;
  washTypeId?: number | null;
  knitTypeId?: number | null;
  designReference?: string | null;
  uomId?: number | null;
  cadReference?: string | null;
  cadEfficiency?: string | number | null;
  fabricQty: string | number;
  yarnQty: string | number;
  remarks?: string | null;
  styleComponent?: { id: number; code: string; name: string } | null;
  portion?: { id: number; code: string; name: string } | null;
  fabricStructure?: { id: number; code: string; name: string } | null;
  material?: { id: number; materialCode: string; materialName: string; materialType: string } | null;
  washType?: { id: number; code: string; name: string } | null;
  knitType?: { id: number; code: string; name: string } | null;
  uom?: { id: number; code: string; name: string } | null;
  cadDetails: FabricCadDetail[];
  yarnDetails: FabricYarnDetail[];
  colorMaps: FabricColorMap[];
}

export interface FabricConsumptionInput {
  styleComponentId?: number | null;
  portionId?: number | null;
  collarTwill?: string | null;
  isMainPart?: boolean;
  isFolding?: boolean;
  isCollar?: boolean;
  isHandCutting?: boolean;
  fabricStructureId?: number | null;
  materialId?: number | null;
  buyGsm?: number | null;
  requiredGsm?: number | null;
  washTypeId?: number | null;
  knitTypeId?: number | null;
  designReference?: string | null;
  uomId?: number | null;
  cadReference?: string | null;
  cadEfficiency?: number | null;
  fabricQty?: number;
  remarks?: string | null;
  cadDetails?: Array<Omit<FabricCadDetail, 'id' | 'totalWeight' | 'size'>>;
  yarnDetails?: Array<Omit<FabricYarnDetail, 'id' | 'count'>>;
  colorMaps?: Array<Omit<FabricColorMap, 'id' | 'garmentColor' | 'fabricColor' | 'aopColor'>>;
}

export const orderFabricConsumptionApi = {
  list: (orderId: number) =>
    api.get<ApiResp<FabricConsumption[]>>(`/merchandising/orders/${orderId}/fabric-consumptions`),
  get: (orderId: number, fcId: number) =>
    api.get<ApiResp<FabricConsumption>>(`/merchandising/orders/${orderId}/fabric-consumptions/${fcId}`),
  create: (orderId: number, data: FabricConsumptionInput) =>
    api.post<ApiResp<FabricConsumption>>(`/merchandising/orders/${orderId}/fabric-consumptions`, data),
  update: (orderId: number, fcId: number, data: Partial<FabricConsumptionInput>) =>
    api.patch<ApiResp<FabricConsumption>>(`/merchandising/orders/${orderId}/fabric-consumptions/${fcId}`, data),
  delete: (orderId: number, fcId: number) =>
    api.delete(`/merchandising/orders/${orderId}/fabric-consumptions/${fcId}`),
  duplicate: (orderId: number, fcId: number) =>
    api.post<ApiResp<FabricConsumption>>(`/merchandising/orders/${orderId}/fabric-consumptions/${fcId}/duplicate`, {}),
  autoGenerateCad: (orderId: number, fcId: number, body: { defaultGram?: number }) =>
    api.post<ApiResp<FabricConsumption>>(`/merchandising/orders/${orderId}/fabric-consumptions/${fcId}/auto-generate-cad`, body),
};

// ─── Process Sequence (engineering process flow tab) ───
export type LossType = 'PROCESS' | 'ITEM' | 'COLOR' | 'ITEM_COLOR';

export interface CandidateFabricCombination {
  fabricConsumptionId: number;
  fabricColorMapId:    number | null;
  fabricYarnDetailId:  number | null;
  rowNo:               number;
  portion:  { id: number; code: string; name: string } | null;
  fabric:   { id: number; materialCode: string; materialName: string } | null;
  dyeColor: { id: number; colorCode: string; colorName: string; hexValue?: string | null } | null;
  aopColor: { id: number; colorCode: string; colorName: string; hexValue?: string | null } | null;
  count:    { id: number; code: string; name: string } | null;
  yarnColor: string | null;
  defaultReqQty:  number;
  defaultReqGram: number;
}

export interface ProcessGroupSelection {
  id: number;
  fabricConsumptionId: number;
  fabricColorMapId:    number | null;
  fabricYarnDetailId:  number | null;
  reqQty:     string | number;
  reqGramQty: string | number;
  fabricConsumption?: {
    id: number; rowNo: number; portionId?: number | null;
    portion?:  { id: number; code: string; name: string } | null;
    material?: { id: number; materialCode: string; materialName: string } | null;
  };
  fabricColorMap?: {
    id: number;
    garmentColor?: { id: number; colorCode: string; colorName: string } | null;
    fabricColor?:  { id: number; colorCode: string; colorName: string } | null;
    aopColor?:     { id: number; colorCode: string; colorName: string } | null;
  } | null;
  fabricYarnDetail?: {
    id: number; yarnColor?: string | null;
    count?: { id: number; code: string; name: string } | null;
  } | null;
}

export interface ProcessLossDetail {
  id?: number;
  detailType:         'ITEM' | 'COLOR' | 'ITEM_COLOR';
  referencePortionId: number | null;
  referenceColorId:   number | null;
  lossPercent:        number;
  remarks?:           string | null;
  referencePortion?: { id: number; code: string; name: string } | null;
  referenceColor?:   { id: number; colorCode: string; colorName: string } | null;
}

export interface ProcessSequence {
  id: number;
  processGroupId: number;
  sequenceNo: number;
  processId: number;
  lossType: LossType;
  lossPercent: string | number;
  inputQty:  string | number;
  outputQty: string | number;
  inputGramQty:  string | number;
  outputGramQty: string | number;
  remarks?: string | null;
  process?: { id: number; processCode: string; processName: string; processType: string };
  lossDetails: ProcessLossDetail[];
}

export interface ProcessGroup {
  id: number;
  orderId: number;
  groupName: string;
  remarks?: string | null;
  totalReqQty:  string | number;
  totalReqGram: string | number;
  status: string;
  selections: ProcessGroupSelection[];
  sequences:  ProcessSequence[];
}

export interface ProcessGroupSelectionInput {
  fabricConsumptionId: number;
  fabricColorMapId?:   number | null;
  fabricYarnDetailId?: number | null;
  reqQty?:     number;
  reqGramQty?: number;
}

export interface ProcessGroupInput {
  groupName: string;
  remarks?:  string | null;
  selections?: ProcessGroupSelectionInput[];
}

export interface ProcessSequenceInput {
  processId:   number;
  lossType:    LossType;
  lossPercent: number;
  remarks?:    string | null;
  lossDetails?: Array<{
    detailType:         'ITEM' | 'COLOR' | 'ITEM_COLOR';
    referencePortionId: number | null;
    referenceColorId:   number | null;
    lossPercent:        number;
    remarks?:           string | null;
  }>;
}

export const orderProcessGroupApi = {
  list: (orderId: number) =>
    api.get<ApiResp<ProcessGroup[]>>(`/merchandising/orders/${orderId}/process-groups`),
  get: (orderId: number, pgId: number) =>
    api.get<ApiResp<ProcessGroup>>(`/merchandising/orders/${orderId}/process-groups/${pgId}`),
  candidateCombinations: (orderId: number) =>
    api.get<ApiResp<CandidateFabricCombination[]>>(`/merchandising/orders/${orderId}/process-groups/candidate-combinations`),
  create: (orderId: number, data: ProcessGroupInput) =>
    api.post<ApiResp<ProcessGroup>>(`/merchandising/orders/${orderId}/process-groups`, data),
  update: (orderId: number, pgId: number, data: Partial<ProcessGroupInput>) =>
    api.patch<ApiResp<ProcessGroup>>(`/merchandising/orders/${orderId}/process-groups/${pgId}`, data),
  delete: (orderId: number, pgId: number) =>
    api.delete(`/merchandising/orders/${orderId}/process-groups/${pgId}`),
};

export const orderProcessSequenceApi = {
  create: (orderId: number, pgId: number, data: ProcessSequenceInput) =>
    api.post<ApiResp<ProcessGroup>>(`/merchandising/orders/${orderId}/process-groups/${pgId}/sequences`, data),
  update: (orderId: number, pgId: number, seqId: number, data: ProcessSequenceInput) =>
    api.patch<ApiResp<ProcessGroup>>(`/merchandising/orders/${orderId}/process-groups/${pgId}/sequences/${seqId}`, data),
  delete: (orderId: number, pgId: number, seqId: number) =>
    api.delete(`/merchandising/orders/${orderId}/process-groups/${pgId}/sequences/${seqId}`),
  reorder: (orderId: number, pgId: number, orderedIds: number[]) =>
    api.post<ApiResp<ProcessGroup>>(`/merchandising/orders/${orderId}/process-groups/${pgId}/sequences/reorder`, { orderedIds }),
};
