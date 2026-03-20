import api from './client';

export const samplingApi = {
  list: (params?: Record<string, unknown>) => api.get('/sampling', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/sampling/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/sampling', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/sampling/${id}`, data).then(r => r.data),
  submit: (id: number, data?: Record<string, unknown>) => api.patch(`/sampling/${id}/submit`, data).then(r => r.data),
  approve: (id: number) => api.patch(`/sampling/${id}/approve`).then(r => r.data),
  reject: (id: number, data: Record<string, unknown>) => api.patch(`/sampling/${id}/reject`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/sampling/${id}`).then(r => r.data),
};
