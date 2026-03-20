import api from './client';

// ═══════════════════════════════════════════
// T&A TEMPLATE TYPES
// ═══════════════════════════════════════════

export interface TnaTemplateItemInput {
  sequence: number;
  milestoneCode: string;
  milestoneName: string;
  daysBeforeShipment: number;
  responsibleRole?: string | null;
  isCritical?: boolean;
}

export interface TnaTemplateItem extends TnaTemplateItemInput {
  id: number;
  templateId: number;
  createdAt: string;
}

export interface TnaTemplate {
  id: number;
  templateName: string;
  buyerId: number | null;
  description: string | null;
  totalMilestones: number;
  isActive: boolean;
  items: TnaTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  templateName: string;
  buyerId?: number | null;
  description?: string | null;
  items: TnaTemplateItemInput[];
}

// ═══════════════════════════════════════════
// T&A CALENDAR TYPES
// ═══════════════════════════════════════════

export interface TnaMilestone {
  id: number;
  orderId: number;
  milestoneCode: string;
  milestoneName: string;
  sequence: number;
  responsibleRole: string | null;
  isCritical: boolean;
  originalPlannedDate: string;
  plannedDate: string;
  actualDate: string | null;
  delayDays: number;
  status: string;
  remarks: string | null;
  order?: {
    orderNo: string;
    exFactoryDate: string;
    buyer: { name: string };
    style: { styleNo: string };
  };
}

export interface GanttOrder {
  order: {
    id: number;
    orderNo: string;
    buyer: { name: string };
    style: { styleNo: string };
    exFactoryDate: string;
  };
  milestones: TnaMilestone[];
}

// ═══════════════════════════════════════════
// PRODUCTION TARGET TYPES
// ═══════════════════════════════════════════

export interface ProductionTarget {
  id: number;
  orderId: number;
  lineNo: string;
  targetDate: string;
  targetQty: number;
  actualQty: number;
  efficiencyPct: number;
  remarks: string | null;
  order?: {
    orderNo: string;
    buyer: { name: string };
    style: { styleNo: string };
  };
}

export interface TargetInput {
  orderId: number;
  lineNo: string;
  targetDate: string;
  targetQty: number;
  remarks?: string | null;
}

// ═══════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════

export const tnaTemplateApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/planning/tna-templates', { params }).then(r => r.data),

  get: (id: number) =>
    api.get(`/planning/tna-templates/${id}`).then(r => r.data),

  create: (data: CreateTemplateInput) =>
    api.post('/planning/tna-templates', data).then(r => r.data),

  update: (id: number, data: Partial<CreateTemplateInput>) =>
    api.patch(`/planning/tna-templates/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/planning/tna-templates/${id}`).then(r => r.data),
};

export const tnaCalendarApi = {
  generate: (orderId: number, templateId: number) =>
    api.post('/planning/tna/generate', { orderId, templateId }).then(r => r.data),

  list: (params?: { orderId?: number; status?: string }) =>
    api.get('/planning/tna', { params }).then(r => r.data),

  complete: (id: number, data: { actualDate: string; remarks?: string }) =>
    api.patch(`/planning/tna/${id}/complete`, data).then(r => r.data),

  reschedule: (id: number, data: { newPlannedDate: string; cascadeToSubsequent?: boolean; remarks?: string }) =>
    api.patch(`/planning/tna/${id}/reschedule`, data).then(r => r.data),

  alerts: () =>
    api.get('/planning/tna/alerts').then(r => r.data),

  gantt: (params?: { buyerId?: number }) =>
    api.get('/planning/tna/gantt', { params }).then(r => r.data),
};

export const productionTargetApi = {
  list: (params?: { orderId?: number; lineNo?: string; fromDate?: string; toDate?: string }) =>
    api.get('/planning/targets', { params }).then(r => r.data),

  bulkCreate: (targets: TargetInput[]) =>
    api.post('/planning/targets/bulk', { targets }).then(r => r.data),

  update: (id: number, data: { targetQty?: number; actualQty?: number; remarks?: string }) =>
    api.patch(`/planning/targets/${id}`, data).then(r => r.data),
};

// ═══════════════════════════════════════════
// CAPACITY TYPES
// ═══════════════════════════════════════════

export interface CapacityLine {
  id: number;
  lineName: string;
  department: string;
  totalMachines: number;
  totalOperators: number;
  samCapacity: number;
  dailyCapacity: number;
  efficiency: number;
  shiftHours: number;
  isActive: boolean;
  remarks: string | null;
  _count?: { bookings: number };
}

export interface CapacityBooking {
  id: number;
  lineId: number;
  orderId: number;
  startDate: string;
  endDate: string;
  dailyAllocQty: number;
  totalAllocQty: number;
  samPerPiece: number | null;
  status: string;
  remarks: string | null;
  line?: { id: number; lineName: string; department: string; dailyCapacity: number; efficiency: number };
  order?: { id: number; orderNo: string; totalQty: number; exFactoryDate: string; buyer: { name: string }; style: { styleNo: string } };
}

export interface CapacityUtilization {
  lineId: number;
  lineName: string;
  department: string;
  totalMachines: number;
  totalOperators: number;
  efficiency: number;
  dailyCapacity: number;
  totalCapacity: number;
  bookedQty: number;
  availableQty: number;
  utilizationPct: number;
  bookings: Array<{
    id: number;
    orderId: number;
    orderNo: string;
    buyerName: string;
    startDate: string;
    endDate: string;
    dailyAllocQty: number;
    status: string;
  }>;
}

export interface CreateCapacityLineInput {
  lineName: string;
  department: string;
  totalMachines?: number;
  totalOperators?: number;
  samCapacity?: number;
  dailyCapacity?: number;
  efficiency?: number;
  shiftHours?: number;
  remarks?: string | null;
}

export interface CreateCapacityBookingInput {
  lineId: number;
  orderId: number;
  startDate: string;
  endDate: string;
  dailyAllocQty: number;
  samPerPiece?: number | null;
  remarks?: string | null;
}

// ═══════════════════════════════════════════
// CAPACITY API
// ═══════════════════════════════════════════

export const capacityLineApi = {
  list: (params?: { department?: string; isActive?: boolean }) =>
    api.get('/planning/capacity/lines', { params }).then(r => r.data),

  get: (id: number) =>
    api.get(`/planning/capacity/lines/${id}`).then(r => r.data),

  create: (data: CreateCapacityLineInput) =>
    api.post('/planning/capacity/lines', data).then(r => r.data),

  update: (id: number, data: Partial<CreateCapacityLineInput>) =>
    api.patch(`/planning/capacity/lines/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/planning/capacity/lines/${id}`).then(r => r.data),
};

export const capacityBookingApi = {
  list: (params?: { lineId?: number; orderId?: number; status?: string; fromDate?: string; toDate?: string }) =>
    api.get('/planning/capacity/bookings', { params }).then(r => r.data),

  create: (data: CreateCapacityBookingInput) =>
    api.post('/planning/capacity/bookings', data).then(r => r.data),

  update: (id: number, data: Partial<CreateCapacityBookingInput> & { status?: string }) =>
    api.patch(`/planning/capacity/bookings/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/planning/capacity/bookings/${id}`).then(r => r.data),
};

export const capacityUtilApi = {
  get: (params: { fromDate: string; toDate: string; department?: string }) =>
    api.get('/planning/capacity/utilization', { params }).then(r => r.data),
};
