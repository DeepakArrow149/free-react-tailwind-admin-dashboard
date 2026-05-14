import api from './client';
import type { MachineIcon } from './machineIcons';

// ═══════════════════════════════════════════
// MACHINE-TYPE MASTER
// ═══════════════════════════════════════════

export interface MachineType {
  id: number;
  code: string;
  name: string;
  category: string | null;
  icon?: MachineIcon | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const machineTypeApi = {
  list: (params?: Record<string, string | number | boolean>) => api.get('/machine-types', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/machine-types/${id}`).then(r => r.data),
  create: (data: Partial<MachineType>) => api.post('/machine-types', data).then(r => r.data),
  update: (id: number, data: Partial<MachineType>) => api.put(`/machine-types/${id}`, data).then(r => r.data),
  toggleActive: (id: number) => api.patch(`/machine-types/${id}/toggle`).then(r => r.data),
};

// ═══════════════════════════════════════════
// LINE LAYOUTS
// ═══════════════════════════════════════════

export interface LayoutPosition {
  id: number;
  layoutId: number;
  positionNo: number;
  label: string | null;
  positionType: string;
  gridRow: number;
  gridCol: number;
  sortOrder: number;
  operationId: number | null;
  machineTypeId: number | null;
  bulletinItem?: {
    id: number;
    seqNo: number;
    sam: number;
    machineType: string | null;
    operation?: { id: number; code: string; name: string };
  } | null;
  machineType?: { id: number; code: string; name: string; icon?: MachineIcon | null } | null;
}

export interface LineLayout {
  id: number;
  name: string;
  description: string | null;
  totalStations: number;
  rowCount: number;
  hasConveyor: boolean;
  flowDirection: string;
  isActive: boolean;
  styleId: number | null;
  bulletinId: number | null;
  style?: { id: number; styleNo: string; styleName: string } | null;
  bulletin?: { id: number; bulletinNo: string; totalSam: number } | null;
  positions: LayoutPosition[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLayoutPayload {
  name: string;
  description?: string;
  rowCount: number;
  totalStations?: number;
  hasConveyor?: boolean;
  flowDirection?: string;
  styleId?: number | null;
  bulletinId?: number | null;
  positions?: Omit<LayoutPosition, 'id' | 'layoutId' | 'bulletinItem' | 'machineType'>[];
}

export interface BulletinForLayout {
  id: number;
  bulletinNo: string;
  totalSam: number;
  status: string;
  style: { id: number; styleNo: string; styleName: string };
  _count: { items: number };
}

export const layoutApi = {
  list: () => api.get('/line-planning/layouts').then(r => r.data),
  getById: (id: number) => api.get(`/line-planning/layouts/${id}`).then(r => r.data),
  getByStyle: (styleId: number) => api.get(`/line-planning/layouts/by-style/${styleId}`).then(r => r.data),
  getBulletins: () => api.get('/line-planning/layouts/bulletins').then(r => r.data),
  create: (data: CreateLayoutPayload) => api.post('/line-planning/layouts', data).then(r => r.data),
  update: (id: number, data: Partial<CreateLayoutPayload>) => api.put(`/line-planning/layouts/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/line-planning/layouts/${id}`).then(r => r.data),
  addPosition: (layoutId: number, data: Omit<LayoutPosition, 'id' | 'layoutId' | 'bulletinItem' | 'machineType'>) => api.post(`/line-planning/layouts/${layoutId}/positions`, data).then(r => r.data),
  updatePosition: (posId: number, data: Partial<LayoutPosition>) => api.put(`/line-planning/layouts/positions/${posId}`, data).then(r => r.data),
  removePosition: (posId: number) => api.delete(`/line-planning/layouts/positions/${posId}`).then(r => r.data),
  reorderPositions: (layoutId: number, positions: { id: number; gridRow: number; gridCol: number }[]) => api.put(`/line-planning/layouts/${layoutId}/positions/reorder`, { positions }).then(r => r.data),
  autoPlace: (layoutId: number, data: { bulletinId?: number; styleId?: number; cols?: number }) => api.post(`/line-planning/layouts/${layoutId}/auto-place`, data).then(r => r.data),
};

// ═══════════════════════════════════════════
// WORKSTATIONS
// ═══════════════════════════════════════════

export interface Workstation {
  id: number;
  lineId: number;
  positionId: number;
  machineId: number | null;
  defaultOperatorId: number | null;
  isActive: boolean;
  position: LayoutPosition;
  machine: { id: number; machineCode: string; machineName: string; machineType: string } | null;
  defaultOperator: { id: number; empCode: string; firstName: string; lastName: string } | null;
}

export interface CreateWorkstationPayload {
  lineId: number;
  positionId: number;
  machineId?: number | null;
  defaultOperatorId?: number | null;
}

export interface BulkAssignPayload {
  lineId: number;
  workstations: { positionId: number; machineId?: number | null; defaultOperatorId?: number | null }[];
}

export const workstationApi = {
  list: (params?: { lineId: number }) => api.get('/line-planning/workstations', { params }).then(r => r.data),
  create: (data: CreateWorkstationPayload) => api.post('/line-planning/workstations', data).then(r => r.data),
  update: (id: number, data: Partial<CreateWorkstationPayload>) => api.put(`/line-planning/workstations/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/line-planning/workstations/${id}`).then(r => r.data),
  bulkAssign: (data: BulkAssignPayload) => api.post('/line-planning/workstations/bulk', data).then(r => r.data),
};

// ═══════════════════════════════════════════
// OPERATOR SKILLS
// ═══════════════════════════════════════════

export interface OperatorSkill {
  id: number;
  employeeId: number;
  machineTypeId: number;
  skillLevel: number;
  certifiedDate: string | null;
  remarks: string | null;
  employee: { id: number; empCode: string; firstName: string; lastName: string };
  machineType: { id: number; code: string; name: string };
}

export interface SkillMatrix {
  machineTypes: { id: number; code: string; name: string }[];
  rows: Array<{
    employee: { id: number; empCode: string; firstName: string; lastName: string };
    skills: Record<string, number>;
  }>;
}

export interface CreateSkillPayload {
  employeeId: number;
  machineTypeId: number;
  skillLevel: number;
  certifiedDate?: string | null;
  remarks?: string | null;
}

export const skillApi = {
  list: (params?: Record<string, string | number | boolean>) => api.get('/line-planning/skills', { params }).then(r => r.data),
  create: (data: CreateSkillPayload) => api.post('/line-planning/skills', data).then(r => r.data),
  update: (id: number, data: Partial<CreateSkillPayload>) => api.put(`/line-planning/skills/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/line-planning/skills/${id}`).then(r => r.data),
  getMatrix: () => api.get('/line-planning/skills/matrix').then(r => r.data),
};

// ═══════════════════════════════════════════
// LINE BALANCING
// ═══════════════════════════════════════════

export interface LineBalancingStation {
  id: number;
  balancingId: number;
  workstationId: number;
  stationNo: number;
  totalSam: number;
  cycleTimeSec: number;
  idleTimeSec: number;
  utilizationPct: number;
  workstation: Workstation;
  operations: LineBalancingStationOp[];
}

export interface BulletinItemRef {
  id: number;
  seqNo: number;
  sam: number;
  machineType: string | null;
  operation?: { id: number; code: string; name: string };
}

export interface LineBalancingStationOp {
  id: number;
  stationId: number;
  bulletinItemId: number;
  machineTypeId: number | null;
  sam: number;
  sequence: number;
  bulletinItem: BulletinItemRef;
  machineType: { id: number; code: string; name: string } | null;
}

export interface LineBalancing {
  id: number;
  lineId: number;
  bulletinId: number;
  name: string;
  taktTimeSec: number;
  targetOutput: number;
  availableMinutes: number;
  totalStations: number;
  balanceEfficiency: number;
  smoothnessIndex: number;
  bottleneckStationId: number | null;
  status: string;
  line: {
    id: number; lineName: string; department: string;
    totalOperators?: number; totalMachines?: number;
    samCapacity?: number | null; dailyCapacity?: number | null;
    efficiency?: number | null; shiftHours?: number | null;
    shift?: { id: number; name: string } | null;
  };
  bulletin: {
    id: number; bulletinNo: string; totalSam: number;
    manpower?: number; machines?: number;
    style: { id?: number; styleNo: string; styleName?: string; buyer?: { id: number; name: string } | null };
    order?: { id: number; orderNo: string; totalQty: number; exFactoryDate: string | null } | null;
  };
  productionOrders?: Array<{ id: number; poNumber: string; status: string; totalQty: number }>;
  stations: LineBalancingStation[];
  createdAt: string;
  updatedAt: string;
}

export interface AutoBalancePayload {
  lineId: number;
  bulletinId: number;
  targetOutput: number;
  name?: string;
}

export interface ManualAssignPayload {
  stationId: number;
  bulletinItemIds: number[];
}

export const balancingApi = {
  list: (params?: Record<string, string | number | boolean>) => api.get('/line-planning/balancing', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/line-planning/balancing/${id}`).then(r => r.data),
  create: (data: AutoBalancePayload) => api.post('/line-planning/balancing', data).then(r => r.data),
  autoBalance: (data: AutoBalancePayload) => api.post('/line-planning/balancing/auto', data).then(r => r.data),
  manualAssign: (id: number, data: ManualAssignPayload) => api.put(`/line-planning/balancing/${id}/assign`, data).then(r => r.data),
  approve: (id: number) => api.patch(`/line-planning/balancing/${id}/approve`).then(r => r.data),
  delete: (id: number) => api.delete(`/line-planning/balancing/${id}`).then(r => r.data),
  splitOperation: (id: number, data: { stationOpId: number; splitRatio?: number }) => api.post(`/line-planning/balancing/${id}/split-operation`, data).then(r => r.data),
  analyzeBottlenecks: (id: number) => api.post(`/line-planning/balancing/${id}/analyze-bottlenecks`).then(r => r.data),
};

// ═══════════════════════════════════════════
// LINES (Overview)
// ═══════════════════════════════════════════

export interface CapacityLineRow {
  id: number;
  lineName: string;
  department: string;
  totalMachines: number;
  totalOperators: number;
  samCapacity: number | null;
  dailyCapacity: number | null;
  efficiency: number | null;
  shiftHours: number | null;
  isActive: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export const lineApi = {
  list: (params?: Record<string, string | number | boolean>) => api.get('/line-planning/lines', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/line-planning/lines/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/line-planning/lines', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/line-planning/lines/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/line-planning/lines/${id}`).then(r => r.data),
};

// ═══════════════════════════════════════════
// SIMULATION
// ═══════════════════════════════════════════

export interface SimulatePayload {
  bulletinId: number;
  manpowerMin: number;
  manpowerMax: number;
  manpowerStep?: number;
  workingMinutes?: number;
}

export interface SimulationScenario {
  manpower: number;
  pitchTime: number;
  targetPerHour: number;
  targetPerDay: number;
  operations: Array<{
    operationId: number;
    operationName: string;
    operationCode: string;
    seqNo: number;
    sam: number;
    machineType: string | null;
    theoreticalMp: number;
    assignedMp: number;
    utilization: number;
    isBottleneck: boolean;
  }>;
}

export interface SimulationResult {
  bulletin: { id: number; bulletinNo: string; totalSam: number; styleName: string };
  operations: Array<{ id: number; operationName: string; operationCode: string; seqNo: number; sam: number; machineType: string | null; grade: string }>;
  scenarios: SimulationScenario[];
}

export const simulationApi = {
  simulate: (data: SimulatePayload) => api.post('/line-planning/simulate', data).then(r => r.data),
};

// ═══════════════════════════════════════════
// BOTTLENECK ANALYSIS
// ═══════════════════════════════════════════

export interface BottleneckResult {
  balancingId: number;
  taktTimeSec: number;
  bottlenecks: Array<{
    stationId: number;
    stationNo: number;
    totalSam: number;
    cycleTimeSec: number;
    utilizationPct: number;
    severity: 'critical' | 'high' | 'medium';
    suggestions: Array<{
      type: string;
      message: string;
      data?: Record<string, unknown>;
    }>;
  }>;
  summary: {
    totalBottlenecks: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    overallEfficiency: number;
  };
}
