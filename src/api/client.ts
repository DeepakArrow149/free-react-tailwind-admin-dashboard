/**
 * Unified Axios HTTP Client
 * Single API client for the entire application — replaces both legacy client.ts and core axiosClient.ts.
 *
 * Features:
 *  - tokenService-based auth (no raw localStorage)
 *  - Token refresh queue (prevents concurrent refreshes)
 *  - Fatal tenant error codes (COMPANY_DEACTIVATED, SUBSCRIPTION_EXPIRED, etc.)
 *  - apiErrorHandler for structured errors
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { tokenService } from '@/core/services/tokenService';
import { apiErrorHandler, type ApiError } from '@/core/api/apiErrorHandler';
import { env } from '@/core/config/env';

const API_BASE = env.API_BASE_URL;
const TIMEOUT = 30_000;
const LOGIN_PATH = '/auth/signin';

const FATAL_TENANT_CODES = [
  'COMPANY_DEACTIVATED',
  'COMPANY_NOT_FOUND',
  'SUBSCRIPTION_EXPIRED',
  'BRANCH_NOT_FOUND',
  'BRANCH_INACTIVE',
  'USER_INACTIVE',
] as const;

/** Public auth endpoints that should NOT trigger token refresh on 401 */
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

// ── Create instance ──

const client: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ── Request interceptor ──

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenService.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor with refresh queue ──

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

/**
 * Clear auth state via Zustand store (dynamic import to avoid circular deps).
 * Falls back to tokenService.clearTokens() if the store isn't loaded yet.
 */
async function clearAuthState() {
  tokenService.clearTokens();
  try {
    const { useAuthStore } = await import('../store/authStore');
    useAuthStore.getState().clearAuth();
  } catch {
    // Store not available yet (during bootstrap) — token clear is sufficient
  }
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorCode: string | undefined = error.response?.data?.code;

    // ── Fatal tenant errors — clear session, redirect via React Router ──
    if (status === 401 && errorCode && (FATAL_TENANT_CODES as readonly string[]).includes(errorCode)) {
      clearAuthState();
      try {
        sessionStorage.setItem('auth_error', error.response?.data?.message || 'Session expired');
      } catch { /* SSR safe */ }
      // Use soft redirect — React Router's ProtectedRoute will redirect to signin
      // Only hard redirect as an absolute fallback
      window.location.href = LOGIN_PATH;
      return Promise.reject(error);
    }

    // ── 401 — attempt token refresh (but NOT for public auth endpoints) ──
    const requestPath = originalRequest?.url || '';
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((p) => requestPath.endsWith(p));

    if (status === 401 && !originalRequest._retry && !isPublicAuth) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        clearAuthState();
        // Don't hard redirect — let ProtectedRoute handle it
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const newAccess: string = data.data?.accessToken ?? data.accessToken;
        const newRefresh: string = data.data?.refreshToken ?? data.refreshToken;
        tokenService.setTokens(newAccess, newRefresh);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return client(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthState();
        // Don't hard redirect — let ProtectedRoute handle it
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ── All other errors ──
    const apiError = apiErrorHandler.handle(error);
    return Promise.reject(apiError);
  },
);

export default client;

/**
 * Typed request helpers (mirrors the old `api` export from axiosClient)
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    client.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    client.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    client.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    client.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    client.delete<T>(url, config).then((res) => res.data),
};

export type { ApiError };
