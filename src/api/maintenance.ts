import api from './client';

// ═══════════════════════════════════
// TYPES
// ═══════════════════════════════════

export interface MaintenanceTicket {
  id: number;
  ticketNo: string;
  machineId: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'BREAKDOWN' | 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
  status: 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED';
  title: string;
  description: string;
  breakdownCategoryId?: number | null;
  stoppageReasonId?: number | null;
  reportedBy: number;
  assignedTo?: number | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  downtimeMinutes?: number | null;
  rootCause?: string | null;
  resolution?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  closedAt?: string | null;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  machine?: { id: number; machineCode: string; machineName: string; location?: string | null };
  reporter?: { id: number; fullName: string };
  assignee?: { id: number; fullName: string } | null;
  breakdownCategory?: { id: number; name: string } | null;
  stoppageReason?: { id: number; name: string } | null;
  sparePartUsages?: SparePartUsage[];
}

export interface TicketDashboard {
  byStatus: { status: string; _count: { _all: number } }[];
  byPriority: { priority: string; _count: { _all: number } }[];
  recentTickets: MaintenanceTicket[];
}

export interface CreateTicketPayload {
  machineId: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'BREAKDOWN' | 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
  title: string;
  description: string;
  breakdownCategoryId?: number;
  stoppageReasonId?: number;
  assignedTo?: number;
  estimatedMinutes?: number;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  priority?: string;
  category?: string;
  assignedTo?: number;
  estimatedMinutes?: number;
  rootCause?: string;
  resolution?: string;
}

export interface PmSchedule {
  id: number;
  machineId: number;
  taskName: string;
  description?: string | null;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'RUNTIME_HOURS';
  frequencyValue: number;
  nextDueDate: string;
  lastPerformedAt?: string | null;
  isActive: boolean;
  assignedToRole?: string | null;
  checklistId?: number | null;
  createdAt: string;
  machine?: { id: number; machineCode: string; machineName: string };
  checklist?: { id: number; name: string } | null;
  logs?: PmLog[];
}

export interface CreatePmSchedulePayload {
  machineId: number;
  taskName: string;
  description?: string;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'RUNTIME_HOURS';
  frequencyValue: number;
  nextDueDate: string;
  assignedToRole?: string;
  checklistId?: number;
}

export interface ExecutePmPayload {
  checklistResults?: unknown;
  status: 'COMPLETED' | 'SKIPPED' | 'PARTIAL';
  notes?: string;
  durationMinutes?: number;
}

export interface PmLog {
  id: number;
  scheduleId: number;
  machineId: number;
  performedBy: number;
  performedAt: string;
  checklistResults?: unknown;
  status: string;
  notes?: string | null;
  durationMinutes?: number | null;
  performer?: { fullName: string };
}

export interface SparePart {
  id: number;
  partCode: string;
  partName: string;
  machineTypeId?: number | null;
  category?: string | null;
  uom: string;
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
  unitCost: number;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSparePartPayload {
  partCode: string;
  partName: string;
  machineTypeId?: number;
  category?: string;
  uom?: string;
  currentStock?: number;
  reorderLevel?: number;
  reorderQty?: number;
  unitCost?: number;
  location?: string;
}

export interface SparePartUsage {
  id: number;
  ticketId: number;
  sparePartId: number;
  qty: number;
  unitCost: number;
  totalCost: number;
  sparePart?: { partCode: string; partName: string };
}

export interface BreakdownCategory {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface StoppageReason {
  id: number;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  isActive: boolean;
}

export interface MaintenanceChecklist {
  id: number;
  name: string;
  machineTypeId?: number | null;
  category?: string | null;
  checkItems: { label: string; required: boolean; type: 'boolean' | 'text' | 'number' }[];
  isActive: boolean;
  createdAt: string;
}

export interface CreateChecklistPayload {
  name: string;
  machineTypeId?: number;
  category?: string;
  checkItems: { label: string; required: boolean; type: 'boolean' | 'text' | 'number' }[];
}

// ═══════════════════════════════════
// API OBJECTS
// ═══════════════════════════════════

export const ticketApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/maintenance/tickets', { params }).then(r => r.data),
  get: (id: number) =>
    api.get(`/maintenance/tickets/${id}`).then(r => r.data),
  create: (data: CreateTicketPayload) =>
    api.post('/maintenance/tickets', data).then(r => r.data),
  update: (id: number, data: UpdateTicketPayload) =>
    api.patch(`/maintenance/tickets/${id}`, data).then(r => r.data),
  changeStatus: (id: number, status: string) =>
    api.patch(`/maintenance/tickets/${id}/status`, { status }).then(r => r.data),
  assign: (id: number, assignedTo: number) =>
    api.patch(`/maintenance/tickets/${id}/assign`, { assignedTo }).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/maintenance/tickets/${id}`).then(r => r.data),
  dashboard: () =>
    api.get('/maintenance/tickets/dashboard').then(r => r.data),
};

export const pmApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/maintenance/pm-schedules', { params }).then(r => r.data),
  get: (id: number) =>
    api.get(`/maintenance/pm-schedules/${id}`).then(r => r.data),
  create: (data: CreatePmSchedulePayload) =>
    api.post('/maintenance/pm-schedules', data).then(r => r.data),
  update: (id: number, data: Partial<CreatePmSchedulePayload>) =>
    api.patch(`/maintenance/pm-schedules/${id}`, data).then(r => r.data),
  execute: (id: number, data: ExecutePmPayload) =>
    api.post(`/maintenance/pm-schedules/${id}/execute`, data).then(r => r.data),
  logs: (params?: Record<string, string | number | undefined>) =>
    api.get('/maintenance/pm-logs', { params }).then(r => r.data),
  overdueCount: () =>
    api.get('/maintenance/pm-schedules/overdue-count').then(r => r.data),
};

export const sparePartApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/maintenance/spare-parts', { params }).then(r => r.data),
  get: (id: number) =>
    api.get(`/maintenance/spare-parts/${id}`).then(r => r.data),
  create: (data: CreateSparePartPayload) =>
    api.post('/maintenance/spare-parts', data).then(r => r.data),
  update: (id: number, data: Partial<CreateSparePartPayload>) =>
    api.patch(`/maintenance/spare-parts/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/maintenance/spare-parts/${id}`).then(r => r.data),
  use: (data: { ticketId: number; sparePartId: number; qty: number }) =>
    api.post('/maintenance/spare-parts/use', data).then(r => r.data),
  adjustStock: (id: number, data: { adjustment: number; reason: string }) =>
    api.patch(`/maintenance/spare-parts/${id}/adjust-stock`, data).then(r => r.data),
  lowStock: () =>
    api.get('/maintenance/spare-parts/low-stock').then(r => r.data),
};

export const lookupApi = {
  listCategories: () =>
    api.get('/maintenance/breakdown-categories').then(r => r.data),
  createCategory: (data: { code: string; name: string; description?: string }) =>
    api.post('/maintenance/breakdown-categories', data).then(r => r.data),
  updateCategory: (id: number, data: { name?: string; description?: string }) =>
    api.patch(`/maintenance/breakdown-categories/${id}`, data).then(r => r.data),
  deleteCategory: (id: number) =>
    api.delete(`/maintenance/breakdown-categories/${id}`).then(r => r.data),
  listStoppageReasons: () =>
    api.get('/maintenance/stoppage-reasons').then(r => r.data),
  createStoppageReason: (data: { code: string; name: string; category: string; description?: string }) =>
    api.post('/maintenance/stoppage-reasons', data).then(r => r.data),
  updateStoppageReason: (id: number, data: { name?: string; category?: string; description?: string }) =>
    api.patch(`/maintenance/stoppage-reasons/${id}`, data).then(r => r.data),
  deleteStoppageReason: (id: number) =>
    api.delete(`/maintenance/stoppage-reasons/${id}`).then(r => r.data),
};

export const checklistApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get('/maintenance/checklists', { params }).then(r => r.data),
  create: (data: CreateChecklistPayload) =>
    api.post('/maintenance/checklists', data).then(r => r.data),
  update: (id: number, data: Partial<CreateChecklistPayload>) =>
    api.patch(`/maintenance/checklists/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/maintenance/checklists/${id}`).then(r => r.data),
};
