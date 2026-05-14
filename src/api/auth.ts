import api from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  fullName?: string;
  username?: string;
  role: string;
  companyCode?: string;
  isSuperAdmin?: boolean;
  roleName?: string;
  permissions?: Record<string, string[]> | { all?: boolean; readOnly?: boolean; modules?: string[] };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ success: boolean; data: LoginResponse }>('/auth/login', payload),

  me: () =>
    api.get<{ success: boolean; data: AuthUser }>('/auth/me'),

  logout: () => api.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    api.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { refreshToken }
    ),
};
