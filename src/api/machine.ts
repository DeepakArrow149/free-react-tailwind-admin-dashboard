import api from './client';

export const machineApi = {
  list: (params?: any) => api.get('/machines/machines', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/machines/machines/${id}`).then(r => r.data),
  create: (data: any) => api.post('/machines/machines', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/machines/machines/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/machines/machines/${id}`).then(r => r.data),
  stats: () => api.get('/machines/machines/stats').then(r => r.data),
};

export const repairApi = {
  list: (params?: any) => api.get('/machines/repairs', { params }).then(r => r.data),
  create: (data: any) => api.post('/machines/repairs', data).then(r => r.data),
  complete: (id: number, data: any) => api.patch(`/machines/repairs/${id}/complete`, data).then(r => r.data),
};
