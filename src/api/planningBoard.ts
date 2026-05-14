import api from './client';

// ═══════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════

export interface PlanningScenario {
  id: number;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPublished: boolean;
  factoryCode: string | null;
  timeFenceDate: string | null;
  description: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  _count?: { jobs: number };
}

export interface PlanningJob {
  id: number;
  scenarioId: number;
  orderId: number;
  lineId: number;
  startDate: string;
  endDate: string;
  allocatedQty: number;
  completedQty: number;
  sequence: number;
  splitIndex: number;
  totalSplits: number;
  samPerPiece: number;
  plannedEfficiency: number;
  absenteeismPct: number;
  plannedOperators: number;
  dailyTargetQty: number;
  totalPlannedMins: number;
  status: 'PLANNED' | 'SETUP' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  setupDays: number;
  brandGroup: string | null;
  colorHex: string | null;
  priority: number;
  remarks: string | null;
  // Convenience fields derived from joins
  orderNo?: string;
  buyerName?: string;
  styleNo?: string;
  sam?: number | null;
  efficiency?: number | null;
  dailyTarget?: number | null;
  exFactoryDate?: string | null;
  garmentImages?: string | null;
  order?: {
    id: number;
    orderNo: string;
    soNo?: string;
    totalQty: number;
    exFactoryDate: string;
    status: string;
    garmentImages?: string | null;
    buyer?: { id: number; name: string };
    style?: { id: number; styleNo: string; styleName: string; category?: string };
  };
  line?: BoardLine;
  progress?: JobProgress[];
}

export interface BoardLine {
  id: number;
  lineName: string;
  department: string;
  totalOperators: number | null;
  totalMachines?: number;
  samCapacity?: number;
  dailyCapacity?: number;
  efficiency?: number;
  shiftHours: number | null;
  isActive: boolean;
  jobs?: PlanningJob[];
}

export interface BoardData {
  scenario?: { id: number; name: string; status: string };
  lines: (BoardLine & { jobs: PlanningJob[] })[];
  alerts: PlanningAlert[];
  summary: { totalLines: number; totalJobs: number; alertCount: number };
}

export interface PlanningAlert {
  type: 'OVERLAP' | 'DELIVERY_RISK' | 'OVER_ALLOCATION' | 'CAPACITY_OVERFLOW' | 'NO_SAM' | 'LOW_EFFICIENCY';
  severity: 'error' | 'warning' | 'info';
  jobId?: number;
  lineId?: number;
  orderId?: number;
  message: string;
}

export interface JobProgress {
  id: number;
  jobId: number;
  progressDate: string;
  cuttingQty: number;
  sewingInputQty: number;
  sewingOutputQty: number;
  qcPassQty: number;
  finishingQty: number;
  packedQty: number;
  operatorCount: number;
  workedHours: number;
  efficiencyPct: number;
  remarks: string | null;
}

export interface JobDetail extends PlanningJob {
  logs: JobLog[];
  metrics: {
    completionPct: number;
    totalSewingOutput: number;
    actualEfficiency: number;
    plannedVsActual: { planned: number; actual: number };
  };
}

export interface JobLog {
  id: number;
  jobId: number;
  action: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedBy: number;
  changedAt: string;
}

export interface UnplannedOrder {
  id: number;
  orderNo: string;
  soNo: string | null;
  totalQty: number;
  exFactoryDate: string;
  status: string;
  garmentImages: string | null;
  orderType?: string;
  orderPriority?: number;
  buyer: { id: number; name: string };
  style: { id: number; styleNo: string; styleName: string; category?: string };
  allocatedQty: number;
  remainingQty: number;
  isFullyPlanned: boolean;
  sam: number | null;
  costingSheets?: Array<{ id: number; totalCostPerPc?: number; sellingPricePerPc?: number }>;
}

export interface BrandColor {
  id: number;
  factoryCode: string | null;
  brandName: string;
  colorHex: string;
}

export interface CalendarDay {
  id?: number;
  calendarDate: string;
  dayType: 'WORKING' | 'WEEKEND' | 'HOLIDAY' | 'HALF_DAY';
  workingMinutes: number;
  remarks: string | null;
  isDefault?: boolean;
}

export interface LineSummary {
  lineId: number;
  lineName: string;
  department: string;
  totalOperators: number | null;
  jobCount: number;
  totalAllocated: number;
  totalCompleted: number;
  completionPct: number;
  utilizationPct: number;
  totalDays: number;
  bookedDays: number;
  freeDays: number;
  jobs: Array<{
    id: number;
    orderNo: string;
    buyerName: string;
    startDate: string;
    endDate: string;
    allocatedQty: number;
    completedQty: number;
    status: string;
    brandGroup: string | null;
    colorHex: string | null;
  }>;
}

export interface AutoAllocateResult {
  allocatedCount: number;
  jobs: PlanningJob[];
  warnings: string[];
}

export interface BackwardScheduleResult {
  requiredStartDate: string;
  estimatedEndDate: string;
  exFactoryDate: string;
  productionDays: number;
  setupDays: number;
  totalWorkingDays: number;
  dailyTarget: number;
  isOnTime: boolean;
  daysLate: number;
}

export interface PlanningKPIs {
  scenarioName?: string;
  lineUtilization: number;
  deliveryRiskCount: number;
  activeJobs: number;
  completedJobs: number;
  totalAllocated: number;
  totalCompleted: number;
  alertCount: number;
  onTimeDeliveryPct: number;
}

export interface StageSummaryStage {
  key: string;
  label: string;
  order: number;
  totalQty: number;
  pct: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  wipFromPrevious: number;
  dailyRate: number;
}

export interface StageSummaryTrend {
  date: string;
  cutting: number;
  sewingInput: number;
  sewingOutput: number;
  qcPass: number;
  finishing: number;
  packed: number;
  efficiencyPct: number | null;
}

export interface StageSummary {
  jobId: number;
  allocatedQty: number;
  stages: StageSummaryStage[];
  bottleneck: string | null;
  overallPct: number;
  estimatedCompletion: string | null;
  estimatedDaysRemaining: number | null;
  dailyTrend: StageSummaryTrend[];
}

// ── Operation Progress Types ──

export interface OperationProgressRow {
  bulletinItemId: number;
  seqNo: number;
  operationName: string;
  operationCode: string;
  department: string | null;
  sam: number;
  machineType: string | null;
  totalOutput: number;
  totalDefects: number;
  totalRework: number;
  defectRate: number;
  avgEfficiency: number | null;
  entriesCount: number;
}

export interface OperationProgressEntry {
  id: number;
  progressDate: string;
  bulletinItemId: number;
  outputQty: number;
  defectQty: number;
  reworkQty: number;
  operatorId: number | null;
  operatorName: string | null;
  workstationId: number | null;
  cycleTimeSec: number | null;
  efficiencyPct: number | null;
  remarks: string | null;
}

export interface OperationProgressSummary {
  jobId: number;
  allocatedQty: number;
  dailyTargetQty: number;
  bulletinItemCount: number;
  rows: OperationProgressRow[];
  totals: {
    totalOutput: number;
    totalDefects: number;
    totalRework: number;
    overallDefectRate: number;
    overallAvgEfficiency: number | null;
  };
  progressEntries: OperationProgressEntry[];
}

export interface JobLayoutPosition {
  positionNo: number;
  label: string | null;
  positionType: string;
  gridRow: number;
  gridCol: number;
  sortOrder: number;
  operationName: string | null;
  operationCode: string | null;
  machineType: string | null;
  bulletinItemId: number | null;
  latestOutput: number;
  latestDefects: number;
}

export interface JobLayout {
  jobId: number;
  lineName: string;
  dailyTargetQty: number;
  layout: {
    id: number;
    name: string;
    rowCount: number;
    hasConveyor: boolean;
    flowDirection: string;
    totalStations: number;
    positions: JobLayoutPosition[];
  } | null;
  message?: string;
}

// ── T&A Summary Types ──

export interface TnaSummaryMilestone {
  id: number;
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
}

export interface TnaSummary {
  jobId: number;
  orderId: number;
  totalMilestones: number;
  completed: number;
  onTrack: number;
  delayed: number;
  overdue: number;
  critical: number;
  completionPct: number;
  healthLevel: 'GREEN' | 'AMBER' | 'RED';
  nextMilestone: {
    id: number;
    milestoneName: string;
    plannedDate: string;
    daysUntil: number;
    isCritical: boolean;
  } | null;
  milestones: TnaSummaryMilestone[];
}

// ═══════════════════════════════════════════
//  DROP 4 TYPES: ALERTS / QUALITY / REPORT
// ═══════════════════════════════════════════

export interface AlertItem {
  id: number;
  alertType: string;
  severity: string;
  message: string;
  status: string;
  currentValue: number | null;
  threshold: number | null;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface JobAlertsSummary {
  jobId: number;
  lineId: number | null;
  totalAlerts: number;
  activeCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  alerts: AlertItem[];
}

export interface QualityDefect {
  name: string;
  category: string | null;
  count: number;
}

export interface JobQualitySummary {
  jobId: number;
  orderId: number;
  lineId: number | null;
  endlineEntries: number;
  totalChecked: number;
  totalDefects: number;
  totalPass: number;
  totalFail: number;
  dhuPct: number;
  topDefects: QualityDefect[];
  defectsByCategory: Record<string, number>;
  ieDefectCount: number;
  ieReworkCount: number;
}

export interface JobReport {
  jobId: number;
  orderId: number;
  orderNo: string;
  lineId: number | null;
  lineName: string | null;
  status: string;
  allocatedQty: number;
  completedQty: number;
  completionPct: number;
  efficiency: {
    planned: number;
    actual: number;
    delta: number;
  };
  quality: {
    dhuPct: number;
    totalChecked: number;
    totalDefects: number;
    topDefects: QualityDefect[];
  };
  alerts: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  tna: {
    totalMilestones: number;
    completed: number;
    overdue: number;
    healthLevel: string;
    completionPct: number;
  };
}

// ═══════════════════════════════════════════
//  API SERVICE
// ═══════════════════════════════════════════

const BASE = '/planning/board';

export const planningBoardApi = {
  // ── Scenarios ──
  listScenarios: (factoryCode?: string) =>
    api.get(`${BASE}/scenarios`, { params: { factoryCode } }).then(r => r.data),
  getScenario: (id: number) =>
    api.get(`${BASE}/scenarios/${id}`).then(r => r.data),
  createScenario: (data: { name: string; factoryCode?: string | null; timeFenceDate?: string | null; description?: string | null }) =>
    api.post(`${BASE}/scenarios`, data).then(r => r.data),
  updateScenario: (id: number, data: Partial<PlanningScenario>) =>
    api.patch(`${BASE}/scenarios/${id}`, data).then(r => r.data),
  deleteScenario: (id: number) =>
    api.delete(`${BASE}/scenarios/${id}`).then(r => r.data),
  publishScenario: (id: number) =>
    api.post(`${BASE}/scenarios/${id}/publish`).then(r => r.data),

  // ── Board Data ──
  getBoardData: (params: {
    scenarioId: number; fromDate: string; toDate: string;
    department?: string; lineId?: number; brandGroup?: string;
  }) => api.get(`${BASE}/data`, { params }).then(r => r.data),

  getAlerts: (params: { scenarioId: number; fromDate: string; toDate: string }) =>
    api.get(`${BASE}/alerts`, { params }).then(r => r.data),

  // ── Jobs ──
  createJob: (data: {
    scenarioId: number; orderId: number; lineId: number; startDate: string;
    allocatedQty?: number; samPerPiece?: number; plannedEfficiency?: number;
    absenteeismPct?: number; plannedOperators?: number; setupDays?: number;
    brandGroup?: string | null; colorHex?: string | null; priority?: number; remarks?: string | null;
  }) => api.post(`${BASE}/jobs`, data).then(r => r.data),

  getJobDetail: (id: number) =>
    api.get(`${BASE}/jobs/${id}`).then(r => r.data),

  updateJob: (id: number, data: Record<string, unknown>) =>
    api.patch(`${BASE}/jobs/${id}`, data).then(r => r.data),

  deleteJob: (id: number) =>
    api.delete(`${BASE}/jobs/${id}`).then(r => r.data),

  splitJob: (id: number, data: { splitCount: number; lineIds?: number[]; quantities?: number[] }) =>
    api.post(`${BASE}/jobs/${id}/split`, data).then(r => r.data),

  bulkMove: (data: { jobIds: number[]; daysDelta?: number; targetLineId?: number }) =>
    api.post(`${BASE}/jobs/bulk-move`, data).then(r => r.data),

  // ── Auto Allocate ──
  autoAllocate: (data: {
    scenarioId: number; orderIds?: number[]; department?: string;
    maxDaysPerLine?: number; allowSplit?: boolean; startFromDate?: string;
  }) => api.post(`${BASE}/auto-allocate`, data).then(r => r.data),

  // ── Unplanned Orders ──
  getUnplannedOrders: (params: {
    scenarioId: number; buyerId?: number; search?: string; page?: number; limit?: number;
  }) => api.get(`${BASE}/unplanned-orders`, { params }).then(r => r.data),

  // ── Progress ──
  recordProgress: (jobId: number, data: {
    progressDate: string; cuttingQty?: number; sewingInputQty?: number;
    sewingOutputQty?: number; qcPassQty?: number; finishingQty?: number;
    packedQty?: number; operatorCount?: number; workedHours?: number; remarks?: string | null;
  }) => api.post(`${BASE}/jobs/${jobId}/progress`, data).then(r => r.data),

  getJobProgress: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/progress`).then(r => r.data),

  // ── Audit Log ──
  getJobLogs: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/logs`).then(r => r.data),

  // ── Brand Colors ──
  getBrandColors: (factoryCode?: string) =>
    api.get(`${BASE}/brand-colors`, { params: { factoryCode } }).then(r => r.data),
  setBrandColors: (colors: Array<{ brandName: string; colorHex: string; factoryCode?: string | null }>) =>
    api.post(`${BASE}/brand-colors`, { colors }).then(r => r.data),

  // ── Calendar ──
  getCalendarDays: (params: { fromDate: string; toDate: string; factoryCode?: string }) =>
    api.get(`${BASE}/calendar`, { params }).then(r => r.data),
  setCalendarDays: (data: {
    days: Array<{ calendarDate: string; dayType: string; workingMinutes?: number; remarks?: string | null }>;
    factoryCode?: string | null;
  }) => api.post(`${BASE}/calendar`, data).then(r => r.data),

  // ── Line Summary ──
  getLineSummary: (params: { scenarioId: number; fromDate: string; toDate: string; department?: string }) =>
    api.get(`${BASE}/line-summary`, { params }).then(r => r.data),

  // ── Merge Jobs ──
  mergeJobs: (data: { jobIds: number[]; targetLineId?: number; startDate?: string }) =>
    api.post(`${BASE}/jobs/merge`, data).then(r => r.data),

  // ── Recalculate Scenario ──
  recalculateScenario: (data: { scenarioId: number; cascadeEndDates?: boolean }) =>
    api.post(`${BASE}/recalculate`, data).then(r => r.data),

  // ── Backward Scheduling ──
  backwardSchedule: (data: {
    orderId: number; exFactoryDate: string; allocatedQty: number; samPerPiece: number;
    operators?: number; efficiencyPct?: number; absenteeismPct?: number; setupDays?: number; factoryCode?: string;
  }) => api.post(`${BASE}/backward-schedule`, data).then(r => r.data),

  // ── Planning KPIs ──
  getPlanningKPIs: () =>
    api.get(`${BASE}/kpis`).then(r => r.data),

  // ── Stage Summary (Production Flow) ──
  getStageSummary: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/stage-summary`).then(r => r.data),

  // ── Operation Progress ──
  getOperationProgress: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/operation-progress`).then(r => r.data),

  recordOperationProgress: (jobId: number, data: {
    progressDate: string;
    entries: Array<{
      bulletinItemId: number;
      outputQty: number;
      defectQty?: number;
      reworkQty?: number;
      operatorId?: number | null;
      workstationId?: number | null;
      cycleTimeSec?: number | null;
      remarks?: string | null;
    }>;
  }) => api.post(`${BASE}/jobs/${jobId}/operation-progress`, data).then(r => r.data),

  // ── Job Layout ──
  getJobLayout: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/layout`).then(r => r.data),

  // ── T&A Summary ──
  getTnaSummary: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/tna-summary`).then(r => r.data),

  // ── Job Alerts (Drop 4) ──
  getJobAlerts: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/alerts`).then(r => r.data),

  // ── Job Quality Summary (Drop 4) ──
  getJobQualitySummary: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/quality-summary`).then(r => r.data),

  // ── Job Report (Drop 4) ──
  getJobReport: (jobId: number) =>
    api.get(`${BASE}/jobs/${jobId}/report`).then(r => r.data),
};
