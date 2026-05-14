import api from './client';

// ═══════════════════════════════════════════
// REALTIME DASHBOARD
// ═══════════════════════════════════════════

export interface RealtimeOperation {
  operationId: number;
  operationName: string;
  target: number;
  actual: number;
  efficiency: number;
  isBottleneck: boolean;
  operators: { id: number; empCode: string; firstName: string; lastName: string }[];
}

export interface RealtimeDashboard {
  lineId: number;
  lineName: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  elapsedMinutes: number;
  totalTarget: number;
  totalActual: number;
  proratedTarget: number;
  overallEfficiency: number;
  operations: RealtimeOperation[];
}

export interface HourlySnapshot {
  id: number;
  lineId: number;
  operationId: number;
  date: string;
  hour: number;
  target: number;
  actual: number;
  efficiency: number;
}

export interface ShiftComparison {
  today: HourlySnapshot[];
  yesterday: HourlySnapshot[];
  sevenDayAvg: HourlySnapshot[];
}

export interface WipEntry {
  id: number;
  lineId: number;
  operationId: number;
  wipQty: number;
  updatedAt: string;
}

export interface ShiftBreak {
  id: number;
  lineId: number;
  breakType: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
}

export interface SupervisorActionEntry {
  id: number;
  lineId: number;
  actionType: string;
  description: string;
  createdBy: number;
  createdAt: string;
}

export interface OperationAssignmentEntry {
  id: number;
  lineId: number;
  operationId: number;
  operatorId: number;
  operator?: { id: number; empCode: string; firstName: string; lastName: string };
  operation?: { id: number; operationName: string };
}

export const realtimeApi = {
  getDashboard: (lineId: number) =>
    api.get(`/realtime/${lineId}`).then(r => r.data),
  upsertCount: (lineId: number, data: { operationId: number; actual: number; date?: string }) =>
    api.post(`/realtime/${lineId}/count`, data).then(r => r.data),
  saveSnapshot: (lineId: number, data: { operationId: number; hour: number; target: number; actual: number; date?: string }) =>
    api.post(`/realtime/${lineId}/hourly-snapshot`, data).then(r => r.data),
  getHourlyTrend: (lineId: number, params?: { date?: string; operationId?: number }) =>
    api.get(`/realtime/${lineId}/hourly-trend`, { params }).then(r => r.data),
  getShiftComparison: (lineId: number, params?: { operationId?: number }) =>
    api.get(`/realtime/${lineId}/shift-comparison`, { params }).then(r => r.data),
  getWip: (lineId: number) =>
    api.get(`/realtime/${lineId}/wip`).then(r => r.data),
  upsertWip: (lineId: number, data: { operationId: number; wipQty: number }) =>
    api.post(`/realtime/${lineId}/wip`, data).then(r => r.data),
  getBreaks: (lineId: number) =>
    api.get(`/realtime/${lineId}/breaks`).then(r => r.data),
  createBreak: (lineId: number, data: { breakType: string; startTime: string; endTime?: string; durationMinutes?: number }) =>
    api.post(`/realtime/${lineId}/breaks`, data).then(r => r.data),
  deleteBreak: (breakId: number, lineId: number) =>
    api.delete(`/realtime/${lineId}/breaks/${breakId}`).then(r => r.data),
  getActions: (lineId: number) =>
    api.get(`/realtime/${lineId}/actions`).then(r => r.data),
  createAction: (lineId: number, data: { actionType: string; description: string }) =>
    api.post(`/realtime/${lineId}/actions`, data).then(r => r.data),
  getAssignments: (lineId: number) =>
    api.get(`/realtime/${lineId}/assignments`).then(r => r.data),
  createAssignment: (lineId: number, data: { operationId: number; operatorId: number }) =>
    api.post(`/realtime/${lineId}/assignments`, data).then(r => r.data),
  deleteAssignment: (assignmentId: number, lineId: number) =>
    api.delete(`/realtime/${lineId}/assignments/${assignmentId}`).then(r => r.data),
  dragReassign: (lineId: number, data: { assignmentId: number; newOperationId: number }) =>
    api.post(`/realtime/${lineId}/assignments/drag`, data).then(r => r.data),
  getMobileCount: (lineId: number, operationId: number) =>
    api.get(`/realtime/${lineId}/mobile-count/${operationId}`).then(r => r.data),
};

// ═══════════════════════════════════════════
// SUPERVISOR
// ═══════════════════════════════════════════

export interface SupervisorLog {
  id: number;
  lineId: number;
  logType: string;
  priority: string;
  description: string;
  resolution: string | null;
  createdBy: number;
  createdAt: string;
}

export interface DefectEntry {
  id: number;
  lineId: number;
  operationId: number;
  operatorId: number | null;
  defectType: string;
  defectCode: string;
  quantity: number;
  severity: string;
  remarks: string | null;
  createdAt: string;
}

export interface DhuResult {
  lineId: number;
  date: string;
  totalOutput: number;
  totalDefects: number;
  dhu: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byOperation: { operationId: number; operationName: string; defects: number; dhu: number }[];
}

export interface TargetOverride {
  id: number;
  lineId: number;
  date: string;
  overrideTarget: number;
  reason: string | null;
}

export const supervisorApi = {
  getLogs: (lineId: number) =>
    api.get(`/supervisor/logs/${lineId}`).then(r => r.data),
  createLog: (data: { lineId: number; logType: string; priority: string; description: string; resolution?: string }) =>
    api.post('/supervisor/logs', data).then(r => r.data),
  deleteLog: (id: number) =>
    api.delete(`/supervisor/logs/${id}`).then(r => r.data),
  getDefects: (lineId: number, params?: { date?: string; operationId?: number }) =>
    api.get(`/supervisor/defects/${lineId}`, { params }).then(r => r.data),
  createDefect: (data: { lineId: number; operationId: number; operatorId?: number; defectType: string; defectCode: string; quantity: number; severity: string; remarks?: string }) =>
    api.post('/supervisor/defects', data).then(r => r.data),
  getDhu: (lineId: number, params?: { date?: string }) =>
    api.get(`/supervisor/dhu/${lineId}`, { params }).then(r => r.data),
  getTargetOverride: (lineId: number, params?: { date?: string }) =>
    api.get(`/supervisor/target-override/${lineId}`, { params }).then(r => r.data),
  upsertTargetOverride: (data: { lineId: number; date?: string; overrideTarget: number; reason?: string }) =>
    api.post('/supervisor/target-override', data).then(r => r.data),
};

// ═══════════════════════════════════════════
// BREAKDOWNS
// ═══════════════════════════════════════════

export interface BreakdownLog {
  id: number;
  lineId: number;
  machineId: number | null;
  operationId: number | null;
  breakdownType: string;
  description: string;
  reportedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
  resolvedBy: number | null;
  status: string;
}

export interface BreakdownSummary {
  totalBreakdowns: number;
  openBreakdowns: number;
  resolvedBreakdowns: number;
  totalDowntimeMinutes: number;
  avgRepairMinutes: number;
  byType: Record<string, number>;
}

export const breakdownApi = {
  list: (lineId: number, params?: { status?: string; from?: string; to?: string }) =>
    api.get(`/breakdowns/${lineId}`, { params }).then(r => r.data),
  getById: (id: number) =>
    api.get(`/breakdowns/detail/${id}`).then(r => r.data),
  create: (data: { lineId: number; machineId?: number; machineCode?: string; operationId?: number; breakdownType: string; description: string; startTime: string }) =>
    api.post('/breakdowns', data).then(r => r.data),
  resolve: (id: number, data: { endTime: string; resolution: string; rootCause?: string }) =>
    api.patch(`/breakdowns/${id}/resolve`, data).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/breakdowns/${id}`).then(r => r.data),
  getSummary: (lineId: number, params?: { from?: string; to?: string }) =>
    api.get(`/breakdowns/${lineId}/summary`, { params }).then(r => r.data),
};

// ═══════════════════════════════════════════
// CHANGEOVERS
// ═══════════════════════════════════════════

export interface ChangeoverLog {
  id: number;
  lineId: number;
  changeoverType: string;
  fromStyleId: number | null;
  toStyleId: number | null;
  plannedMinutes: number;
  actualMinutes: number | null;
  startedAt: string;
  completedAt: string | null;
  status: string;
  fromStyle?: { id: number; styleNo: string; styleName: string };
  toStyle?: { id: number; styleNo: string; styleName: string };
}

export interface ChangeoverSummary {
  totalChangeovers: number;
  avgPlannedMinutes: number;
  avgActualMinutes: number;
  onTimePercent: number;
  byType: Record<string, { count: number; avgPlanned: number; avgActual: number }>;
}

export const changeoverApi = {
  list: (lineId: number, params?: { from?: string; to?: string }) =>
    api.get(`/changeovers/${lineId}`, { params }).then(r => r.data),
  getById: (id: number) =>
    api.get(`/changeovers/detail/${id}`).then(r => r.data),
  create: (data: { lineId: number; changeoverType: string; fromStyleId?: number; toStyleId?: number; plannedMinutes: number }) =>
    api.post('/changeovers', data).then(r => r.data),
  complete: (id: number, data: { notes?: string }) =>
    api.patch(`/changeovers/${id}/complete`, data).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/changeovers/${id}`).then(r => r.data),
  getSummary: (lineId: number, params?: { from?: string; to?: string }) =>
    api.get(`/changeovers/${lineId}/summary`, { params }).then(r => r.data),
};

// ═══════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════

export interface Alert {
  id: number;
  lineId: number;
  alertType: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  acknowledgedBy: number | null;
  resolvedBy: number | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export const alertsApi = {
  list: (params?: { lineId?: number; status?: string; alertType?: string }) =>
    api.get('/alerts', { params }).then(r => r.data),
  getById: (id: number) =>
    api.get(`/alerts/${id}`).then(r => r.data),
  create: (data: { lineId: number; alertType: string; severity: string; title: string; description?: string }) =>
    api.post('/alerts', data).then(r => r.data),
  acknowledge: (id: number) =>
    api.patch(`/alerts/${id}/acknowledge`).then(r => r.data),
  resolve: (id: number, data: { resolution: string }) =>
    api.patch(`/alerts/${id}/resolve`, data).then(r => r.data),
  autoGenerate: (lineId: number) =>
    api.post(`/alerts/auto-generate/${lineId}`).then(r => r.data),
  getActiveCount: (lineId: number) =>
    api.get(`/alerts/active-count/${lineId}`).then(r => r.data),
};

// ═══════════════════════════════════════════
// DEPLOYMENT / REBALANCING
// ═══════════════════════════════════════════

export interface DeploymentEntry {
  operationId: number;
  operationName: string;
  operators: { id: number; empCode: string; firstName: string; lastName: string }[];
}

export interface RebalancePreview {
  reassignments: { operatorId: number; operatorName: string; fromOperationId: number; toOperationId: number; reason: string }[];
  unassigned: number[];
}

export const deploymentApi = {
  getDeployment: (lineId: number) =>
    api.get(`/deployment/${lineId}`).then(r => r.data),
  previewRebalance: (data: { lineId: number; absentOperatorIds: number[] }) =>
    api.post('/deployment/rebalance/preview', data).then(r => r.data),
  applyRebalance: (data: { lineId: number; absentOperatorIds: number[] }) =>
    api.post('/deployment/rebalance/apply', data).then(r => r.data),
};

// ═══════════════════════════════════════════
// MULTI-LINE DASHBOARD
// ═══════════════════════════════════════════

export interface MultiLineSummary {
  totalLines: number;
  avgEfficiency: number;
  totalOutput: number;
  totalTarget: number;
  totalAlerts: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
}

export interface MultiLineEntry {
  lineId: number;
  lineName: string;
  efficiency: number;
  output: number;
  target: number;
  dhu: number;
  alertCount: number;
  openBreakdowns: number;
  operatorCount: number;
  changeoverActive: boolean;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

export interface MultiLineDashboard {
  summary: MultiLineSummary;
  lines: MultiLineEntry[];
}

export const multiLineDashboardApi = {
  getDashboard: (params?: { date?: string }) =>
    api.get('/multi-line-dashboard', { params }).then(r => r.data),
};
