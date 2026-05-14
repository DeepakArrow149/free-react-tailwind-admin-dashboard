import api from './client';

// ── Types ──
export interface Machine {
  id: number;
  machineCode: string;
  machineName: string;
  machineType: string;
  machineTypeId?: number | null;
  brand?: string | null;
  modelNo?: string | null;
  serialNo?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  location?: string | null;
  lineNo?: string | null;
  status: 'ACTIVE' | 'UNDER_REPAIR' | 'IDLE' | 'DISPOSED';
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  qrCodeData?: string | null;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { repairs: number };
}

export interface MachineRepair {
  id: number;
  machineId: number;
  repairNo: string;
  repairDate: string;
  repairType: 'BREAKDOWN' | 'PREVENTIVE' | 'OVERHAUL';
  description?: string | null;
  sparesUsed?: { partCode: string; partName: string; qty: number; cost: number }[] | null;
  labourCost: number;
  sparesCost: number;
  totalCost: number;
  downtimeHours: number;
  completedDate?: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  repairedBy?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  machine?: { id: number; machineCode: string; machineName: string };
}

export interface MachineStats {
  machinesByStatus: { status: string; _count: { _all: number } }[];
  repairsThisMonth: number;
  totalDowntimeHours: number;
  machinesDueForService: number;
}

export interface CreateMachinePayload {
  machineCode: string;
  machineName: string;
  machineType: string;
  brand?: string;
  modelNo?: string;
  serialNo?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  location?: string;
  lineNo?: string;
  status?: string;
}

export interface CreateRepairPayload {
  machineId: number;
  repairDate?: string;
  repairType: 'BREAKDOWN' | 'PREVENTIVE' | 'OVERHAUL';
  description?: string;
  sparesUsed?: unknown;
  labourCost?: number;
  sparesCost?: number;
  downtimeHours?: number;
}

export interface CompleteRepairPayload {
  completedDate?: string;
  repairedBy?: string;
}

// ── Machine API ──
export const machineApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/machines/machines', { params }).then(r => r.data),
  getById: (id: number) =>
    api.get(`/machines/machines/${id}`).then(r => r.data),
  create: (data: CreateMachinePayload) =>
    api.post('/machines/machines', data).then(r => r.data),
  update: (id: number, data: Partial<CreateMachinePayload>) =>
    api.put(`/machines/machines/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/machines/machines/${id}`).then(r => r.data),
  stats: () =>
    api.get('/machines/machines/stats').then(r => r.data),
};

// ── Repair API ──
export const repairApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/machines/repairs', { params }).then(r => r.data),
  create: (data: CreateRepairPayload) =>
    api.post('/machines/repairs', data).then(r => r.data),
  complete: (id: number, data: CompleteRepairPayload) =>
    api.patch(`/machines/repairs/${id}/complete`, data).then(r => r.data),
};
