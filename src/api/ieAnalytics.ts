import api from './client';

// ═══════════════════════════════════════════
// INCENTIVE RULES
// ═══════════════════════════════════════════

export interface IncentiveRule {
  id: number;
  name: string;
  minEfficiency: number;
  maxEfficiency: number;
  incentivePercent: number;
  isActive: boolean;
  createdAt: string;
}

export const incentiveRulesApi = {
  list: () =>
    api.get('/incentive-rules').then(r => r.data),
  getById: (id: number) =>
    api.get(`/incentive-rules/${id}`).then(r => r.data),
  create: (data: { name: string; minEfficiency: number; maxEfficiency: number; incentivePercent: number }) =>
    api.post('/incentive-rules', data).then(r => r.data),
  update: (id: number, data: Partial<IncentiveRule>) =>
    api.put(`/incentive-rules/${id}`, data).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/incentive-rules/${id}`).then(r => r.data),
  toggleActive: (id: number) =>
    api.patch(`/incentive-rules/${id}/toggle`).then(r => r.data),
};

// ═══════════════════════════════════════════
// INCENTIVE CALCULATOR
// ═══════════════════════════════════════════

export interface IncentiveCalcResult {
  lineId: number;
  date: string;
  lineEfficiency: number;
  lineIncentivePercent: number;
  operators: {
    operatorId: number;
    operatorName: string;
    individualEfficiency: number;
    individualIncentivePercent: number;
    weightedIncentivePercent: number;
  }[];
}

export interface IncentiveRecord {
  id: number;
  employeeId: number;
  lineId: number;
  date: string;
  efficiency: number;
  incentivePercent: number;
  amount: number | null;
  employee?: { id: number; empCode: string; firstName: string; lastName: string };
}

export const incentiveCalcApi = {
  calculate: (lineId: number, params?: { date?: string }) =>
    api.get(`/incentive-calc/calculate/${lineId}`, { params }).then(r => r.data),
  save: (data: { lineId: number; date?: string; records: { employeeId: number; efficiency: number; incentivePercent: number; amount?: number }[] }) =>
    api.post('/incentive-calc/save', data).then(r => r.data),
  batchCalculate: (data: { lineIds: number[]; date?: string }) =>
    api.post('/incentive-calc/batch', data).then(r => r.data),
  getRecords: (params?: { lineId?: number; employeeId?: number; from?: string; to?: string }) =>
    api.get('/incentive-calc/records', { params }).then(r => r.data),
};

// ═══════════════════════════════════════════
// IE ANALYTICS
// ═══════════════════════════════════════════

export interface ProductionTrendPoint {
  date: string;
  output: number;
  target: number;
  efficiency: number;
  movingAvg7d: number | null;
}

export interface FatigueAnalysis {
  lineId: number;
  date: string;
  hourlyData: { hour: number; efficiency: number }[];
  peakEfficiency: number;
  endEfficiency: number;
  fatigueScore: number;
  trend: 'DECLINING' | 'MODERATE_DECLINE' | 'STABLE';
}

export interface SmvVarianceItem {
  operationId: number;
  operationName: string;
  standardSAM: number;
  actualSAM: number;
  variancePercent: number;
  flag: 'HIGH_VARIANCE' | 'MODERATE' | 'OK';
}

export interface HeadcountTrendPoint {
  date: string;
  operatorCount: number;
}

export const ieAnalyticsApi = {
  getProductionTrend: (lineId: number, params?: { days?: number }) =>
    api.get(`/ie-analytics/production-trend/${lineId}`, { params }).then(r => r.data),
  getFatigueAnalysis: (lineId: number, params?: { date?: string }) =>
    api.get(`/ie-analytics/fatigue/${lineId}`, { params }).then(r => r.data),
  getSmvVariance: (lineId: number) =>
    api.get(`/ie-analytics/smv-variance/${lineId}`).then(r => r.data),
  getHeadcountTrend: (lineId: number, params?: { days?: number }) =>
    api.get(`/ie-analytics/headcount-trend/${lineId}`, { params }).then(r => r.data),
};

// ═══════════════════════════════════════════
// OPERATOR ANALYTICS
// ═══════════════════════════════════════════

export interface OperatorPerformanceCard {
  operator: { id: number; empCode: string; firstName: string; lastName: string };
  skills: { machineType: string; skillLevel: number }[];
  incentiveHistory: { date: string; efficiency: number; incentivePercent: number }[];
  defects: { total: number; byType: Record<string, number> };
  currentAssignment: { lineId: number; lineName: string; operationName: string } | null;
}

export interface CoverageEntry {
  operationId: number;
  operationName: string;
  operatorCount: number;
  riskLevel: 'NO_COVERAGE' | 'CRITICAL' | 'LOW' | 'HEALTHY';
}

export interface SwingCandidate {
  operatorId: number;
  operatorName: string;
  skillCount: number;
  avgEfficiency: number;
  swingScore: number;
  skills: string[];
}

export const operatorAnalyticsApi = {
  getPerformanceCard: (operatorId: number) =>
    api.get(`/operator-analytics/performance/${operatorId}`).then(r => r.data),
  getCoverageReport: (params?: { lineId?: number }) =>
    api.get('/operator-analytics/coverage', { params }).then(r => r.data),
  getSwingCandidates: (params?: { minSkills?: number }) =>
    api.get('/operator-analytics/swing-candidates', { params }).then(r => r.data),
};

// ═══════════════════════════════════════════
// IE REPORTS (Excel downloads)
// ═══════════════════════════════════════════

export const ieReportsApi = {
  downloadDailyProduction: (params: { lineId: number; from: string; to: string }) =>
    api.get('/reports/daily-production', { params, responseType: 'blob' }).then(r => r.data),
  downloadDefectReport: (params: { lineId: number; from: string; to: string }) =>
    api.get('/reports/defect-report', { params, responseType: 'blob' }).then(r => r.data),
  downloadIncentiveReport: (params: { lineId: number; from: string; to: string }) =>
    api.get('/reports/incentive-report', { params, responseType: 'blob' }).then(r => r.data),
  downloadBreakdownReport: (params: { lineId: number; from: string; to: string }) =>
    api.get('/reports/breakdown-report', { params, responseType: 'blob' }).then(r => r.data),
  downloadSkillMatrix: () =>
    api.get('/reports/skill-matrix', { responseType: 'blob' }).then(r => r.data),
};
