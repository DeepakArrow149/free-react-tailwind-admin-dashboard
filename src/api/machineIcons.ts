import api from './client';

// ═══════════════════════════════════════════
// MACHINE ICON LIBRARY — API Layer
// ═══════════════════════════════════════════

export interface MachineIcon {
  id: number;
  name: string;
  code: string;
  category: string;
  type: 'SVG' | 'IMAGE';
  svgContent: string | null;
  imageUrl: string | null;
  colorHex: string;
  tags: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMachineIconPayload {
  name: string;
  code: string;
  category?: string;
  type?: 'SVG' | 'IMAGE';
  svgContent?: string | null;
  imageUrl?: string | null;
  colorHex?: string;
  tags?: string | null;
  isSystem?: boolean;
}

export const machineIconApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    api.get('/machine-icons', { params }).then(r => r.data),

  getById: (id: number) =>
    api.get(`/machine-icons/${id}`).then(r => r.data),

  getByCode: (code: string) =>
    api.get(`/machine-icons/code/${code}`).then(r => r.data),

  categories: () =>
    api.get('/machine-icons/categories').then(r => r.data),

  create: (data: CreateMachineIconPayload) =>
    api.post('/machine-icons', data).then(r => r.data),

  update: (id: number, data: Partial<CreateMachineIconPayload>) =>
    api.put(`/machine-icons/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/machine-icons/${id}`).then(r => r.data),

  hardDelete: (id: number) =>
    api.delete(`/machine-icons/${id}/permanent`).then(r => r.data),
};
