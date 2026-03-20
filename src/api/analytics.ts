import api from './client';

// ── Analytics API types ──

export interface ProductionEfficiencyRow {
  poNo: string;
  orderNo: string;
  buyer: string;
  style: string;
  status: string;
  targetQty: number;
  outputQty: number;
  rejectQty: number;
  efficiency: number;
  rejectRate: number;
  lines: number;
}

export interface ProductionEfficiencySummary {
  totalOrders: number;
  totalTarget: number;
  totalOutput: number;
  totalReject: number;
  avgEfficiency: number;
}

export interface TnaDelayRow {
  id: number;
  orderNo: string;
  buyer: string;
  style: string;
  activity: string;
  template: string;
  plannedDate: string;
  actualDate: string | null;
  status: string;
  delayDays: number;
  isOverdue: boolean;
}

export interface TnaDelaySummary {
  totalActivities: number;
  completed: number;
  pending: number;
  overdue: number;
  avgDelayDays: number;
  maxDelay: number;
}

export interface InventoryAgingRow {
  materialCode: string;
  materialName: string;
  materialType: string;
  warehouse: string;
  qty: number;
  value: number;
  lastInwardDate: string | null;
  agingDays: number;
  agingBucket: string;
}

export interface InventoryAgingSummary {
  [bucket: string]: { count: number; totalQty: number; totalValue: number };
}

export interface SupplierScorecardRow {
  id: number;
  code: string;
  name: string;
  type: string;
  country: string;
  totalPOs: number;
  totalValue: number;
  quotations: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  avgDelay: number;
  otdPercentage: number;
  avgDefectScore: number;
  qualityScore: number;
  overallScore: number;
  rating: string;
}

export interface BuyerAnalysisRow {
  id: number;
  code: string;
  name: string;
  country: string;
  currency: string;
  totalOrders: number;
  totalQty: number;
  totalValue: number;
  byStatus: Record<string, { count: number; qty: number; value: number }>;
}

export interface BuyerAnalysisSummary {
  totalBuyers: number;
  totalOrders: number;
  totalQty: number;
  totalValue: number;
}

export interface StylePnlRow {
  orderNo: string;
  buyer: string;
  style: string;
  styleName: string;
  status: string;
  qty: number;
  revenue: number;
  costPerPiece: number;
  totalCost: number;
  fabricCost: number;
  trimCost: number;
  cmtCost: number;
  grossProfit: number;
  marginPct: number;
  costingStage: string;
}

export interface StylePnlSummary {
  totalOrders: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
}

// ── API Methods ──

export const analyticsApi = {
  productionEfficiency: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return api.get<{ data: { summary: ProductionEfficiencySummary; rows: ProductionEfficiencyRow[] } }>(
      `/reports/analytics/production-efficiency${params.toString() ? '?' + params : ''}`,
    );
  },

  tnaDelays: () =>
    api.get<{ data: { summary: TnaDelaySummary; rows: TnaDelayRow[] } }>('/reports/analytics/tna-delays'),

  inventoryAging: () =>
    api.get<{ data: { summary: InventoryAgingSummary; rows: InventoryAgingRow[] } }>('/reports/analytics/inventory-aging'),

  supplierScorecard: () =>
    api.get<{ data: SupplierScorecardRow[] }>('/reports/analytics/supplier-scorecard'),

  buyerAnalysis: () =>
    api.get<{ data: { summary: BuyerAnalysisSummary; rows: BuyerAnalysisRow[] } }>('/reports/analytics/buyer-analysis'),

  stylePnl: () =>
    api.get<{ data: { summary: StylePnlSummary; rows: StylePnlRow[] } }>('/reports/analytics/style-pnl'),
};
