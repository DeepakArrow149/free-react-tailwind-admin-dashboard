import api from './client';

// ═══════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════

export interface FeatureFlag {
  id: number;
  moduleKey: string;
  label: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
}

export const featureFlagsApi = {
  list: () =>
    api.get('/feature-flags').then(r => r.data),
  getById: (id: number) =>
    api.get(`/feature-flags/${id}`).then(r => r.data),
  update: (id: number, data: { enabled: boolean }) =>
    api.put(`/feature-flags/${id}`, data).then(r => r.data),
  seedDefaults: () =>
    api.post('/feature-flags/seed').then(r => r.data),
  batchUpdate: (data: { flags: { id: number; enabled: boolean }[] }) =>
    api.patch('/feature-flags/batch', data).then(r => r.data),
};

// ═══════════════════════════════════════════
// GSD MOTIONS & TEMPLATES
// ═══════════════════════════════════════════

export interface GsdMotion {
  id: number;
  code: string;
  description: string;
  tmuValue: number;
  category: string;
  isDefault: boolean;
}

export interface GsdTemplateItem {
  motionId: number;
  motionCode: string;
  frequency: number;
  tmu: number;
}

export interface GsdTemplate {
  id: number;
  name: string;
  description: string | null;
  items: GsdTemplateItem[];
  totalTmu: number;
  calculatedSAM: number;
  allowancePct: number;
  createdAt: string;
}

export interface CalculateSamResult {
  totalTmu: number;
  sam: number;
  allowancePct: number;
}

export const gsdApi = {
  listMotions: (params?: { category?: string; search?: string }) =>
    api.get('/gsd/motions', { params }).then(r => r.data),
  createMotion: (data: { code: string; description: string; tmuValue: number; category: string }) =>
    api.post('/gsd/motions', data).then(r => r.data),
  updateMotion: (id: number, data: Partial<GsdMotion>) =>
    api.put(`/gsd/motions/${id}`, data).then(r => r.data),
  deleteMotion: (id: number) =>
    api.delete(`/gsd/motions/${id}`).then(r => r.data),
  seedMotions: () =>
    api.post('/gsd/motions/seed').then(r => r.data),
  listTemplates: (params?: { search?: string }) =>
    api.get('/gsd/templates', { params }).then(r => r.data),
  getTemplate: (id: number) =>
    api.get(`/gsd/templates/${id}`).then(r => r.data),
  createTemplate: (data: { name: string; description?: string; allowancePct?: number; items: { motionId: number; frequency: number }[] }) =>
    api.post('/gsd/templates', data).then(r => r.data),
  updateTemplate: (id: number, data: Partial<{ name: string; description: string; allowancePct: number; items: { motionId: number; frequency: number }[] }>) =>
    api.put(`/gsd/templates/${id}`, data).then(r => r.data),
  deleteTemplate: (id: number) =>
    api.delete(`/gsd/templates/${id}`).then(r => r.data),
  calculateSam: (data: { items: { motionId: number; frequency: number }[]; allowancePct?: number }) =>
    api.post('/gsd/calculate-sam', data).then(r => r.data),
};

// ═══════════════════════════════════════════
// MACHINE SPECS
// ═══════════════════════════════════════════

export interface MachineSpec {
  id: number;
  machineType: string;
  garmentType: string;
  specName: string;
  specValue: string;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  isActive: boolean;
}

export const machineSpecsApi = {
  list: (params?: { machineType?: string; garmentType?: string }) =>
    api.get('/machine-specs', { params }).then(r => r.data),
  getById: (id: number) =>
    api.get(`/machine-specs/${id}`).then(r => r.data),
  create: (data: { machineType: string; garmentType: string; specName: string; specValue: string; unit?: string; minValue?: number; maxValue?: number }) =>
    api.post('/machine-specs', data).then(r => r.data),
  update: (id: number, data: Partial<MachineSpec>) =>
    api.put(`/machine-specs/${id}`, data).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/machine-specs/${id}`).then(r => r.data),
  validate: (id: number, data: { value: string }) =>
    api.post(`/machine-specs/${id}/validate`, data).then(r => r.data),
};

// ═══════════════════════════════════════════
// OB VERSIONS
// ═══════════════════════════════════════════

export interface ObVersion {
  id: number;
  styleId: number;
  version: number;
  status: string;
  notes: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
  style?: { id: number; styleNo: string; styleName: string };
}

export const obVersionsApi = {
  list: (params?: { styleId?: number; status?: string }) =>
    api.get('/ob-versions', { params }).then(r => r.data),
  getById: (id: number) =>
    api.get(`/ob-versions/${id}`).then(r => r.data),
  create: (data: { styleId: number; notes?: string }) =>
    api.post('/ob-versions', data).then(r => r.data),
  update: (id: number, data: { notes?: string }) =>
    api.put(`/ob-versions/${id}`, data).then(r => r.data),
  approve: (id: number) =>
    api.patch(`/ob-versions/${id}/approve`).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/ob-versions/${id}`).then(r => r.data),
};

// ═══════════════════════════════════════════
// GARMENT ANALYSER
// ═══════════════════════════════════════════

export interface GarmentOperation {
  seqNo: number;
  operationName: string;
  machineType: string;
  estimatedSAM: number;
  isOptional: boolean;
}

export interface GarmentAnalysis {
  garmentType: string;
  complexity: string;
  operations: GarmentOperation[];
  totalSAM: number;
  estimatedPcsPerHour85: number;
  machineRequirements: Record<string, number>;
}

export interface GarmentTypeInfo {
  type: string;
  complexities: string[];
}

export const garmentAnalyserApi = {
  getTypes: () =>
    api.get('/garment-analyser/types').then(r => r.data),
  analyse: (data: { garmentType: string; complexity: string }) =>
    api.post('/garment-analyser/analyse', data).then(r => r.data),
};
