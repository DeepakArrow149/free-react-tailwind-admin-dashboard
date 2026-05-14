import client from './client';

// ── Interfaces ──

export interface AqlDefectEntry {
  id?: number;
  defectCode: string;
  defectName: string;
  defectCategory: 'CRITICAL' | 'MAJOR' | 'MINOR';
  count: number;
  location?: string;
}

export interface AqlInspection {
  id: number;
  inspectionNo: string;
  orderId: number;
  order?: { id: number; orderNo: string };
  inspectionDate: string;
  inspectionType: string;
  lotQty: number;
  inspectionLevel: string;
  aqlMajor: number;
  aqlMinor: number;
  sampleCodeLetter?: string;
  sampleSize?: number;
  acceptMajor?: number;
  rejectMajor?: number;
  acceptMinor?: number;
  rejectMinor?: number;
  foundMajor?: number;
  foundMinor?: number;
  result?: string;
  inspectorName?: string;
  buyerQcName?: string;
  remarks?: string;
  defectEntries: AqlDefectEntry[];
}

export interface AqlCalculateResult {
  sampleCodeLetter: string;
  sampleSize: number;
  acceptMajor: number;
  rejectMajor: number;
  acceptMinor: number;
  rejectMinor: number;
}

export interface FabricInspection {
  id: number;
  inspectionNo: string;
  rollId?: string;
  grnId?: number;
  inspectionDate: string;
  inspectionType: string;
  totalDefectPoints: number;
  inspectedLength: number;
  inspectedWidth: number;
  penaltyPer100sqyd?: number;
  result?: string;
  inspectorName?: string;
  remarks?: string;
}

export interface LabTestResult {
  id?: number;
  parameter: string;
  standardValue: string;
  actualValue?: string;
  tolerance?: string;
  result?: string;
  testReportUrl?: string;
}

export interface LabTestRequest {
  id: number;
  requestNo: string;
  orderId: number;
  order?: { id: number; orderNo: string };
  styleId?: number;
  style?: { id: number; styleNo: string; styleName: string };
  testType: string;
  labName?: string;
  sentDate?: string;
  expectedDate?: string;
  status: string;
  remarks?: string;
  results: LabTestResult[];
}

export interface BuyerClaim {
  id: number;
  claimNo: string;
  orderId: number;
  order?: { id: number; orderNo: string };
  buyerId: number;
  buyer?: { id: number; name: string };
  invoiceId?: number;
  claimType: string;
  claimDate: string;
  claimedAmount: number;
  acceptedAmount?: number;
  currency: string;
  description: string;
  status: string;
  creditNoteNo?: string;
  settlementDate?: string;
  evidenceUrls?: string[];
  remarks?: string;
}

// ── AQL Inspection API ──

export const aqlApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/quality/aql', { params }),
  get: (id: number) => client.get(`/quality/aql/${id}`),
  calculate: (params: { lotQty: number; level?: string; aqlMajor?: number; aqlMinor?: number }) =>
    client.get('/quality/aql/calculate', { params }),
  create: (data: Record<string, unknown>) => client.post('/quality/aql', data),
  recordResult: (id: number, data: Record<string, unknown>) => client.put(`/quality/aql/${id}/result`, data),
};

// ── Fabric Inspection API ──

export const fabricApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/quality/fabric', { params }),
  create: (data: Record<string, unknown>) => client.post('/quality/fabric', data),
};

// ── Lab Test API ──

export const labTestApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/quality/lab', { params }),
  get: (id: number) => client.get(`/quality/lab/${id}`),
  create: (data: Record<string, unknown>) => client.post('/quality/lab', data),
  submitResult: (id: number, data: Record<string, unknown>) => client.put(`/quality/lab/${id}/result`, data),
};

// ── Buyer Claim API ──

export const claimApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => client.get('/quality/claims', { params }),
  create: (data: Record<string, unknown>) => client.post('/quality/claims', data),
  updateStatus: (id: number, data: Record<string, unknown>) => client.put(`/quality/claims/${id}/status`, data),
  settle: (id: number, data: Record<string, unknown>) => client.put(`/quality/claims/${id}/settle`, data),
};

// ── Endline QC API ──
export const endlineApi = {
  list: (params?: Record<string, unknown>) => client.get('/quality/endline', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) => client.post('/quality/endline', data).then(r => r.data),
  dhuSummary: (orderId: number, from: string, to: string) => client.get(`/quality/endline/dhu/${orderId}`, { params: { from, to } }).then(r => r.data),
  topDefects: (orderId: number, from?: string, to?: string) => client.get(`/quality/endline/top-defects/${orderId}`, { params: { from, to } }).then(r => r.data),
};

// ── Quality Reports API ──
export const qualityReportApi = {
  defectPareto: (params?: Record<string, unknown>) => client.get('/quality/reports/defect-pareto', { params }),
  fabricSummary: (params?: Record<string, unknown>) => client.get('/quality/reports/fabric-summary', { params }),
  claimAnalysis: (params?: Record<string, unknown>) => client.get('/quality/reports/claim-analysis', { params }),
  aqlSummary: (params?: Record<string, unknown>) => client.get('/quality/reports/aql-summary', { params }),
};
