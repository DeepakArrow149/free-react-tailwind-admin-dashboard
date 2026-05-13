/**
 * Axios HTTP Client
 * Centralized API client with interceptors, retry logic, and error handling.
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { appConfig } from '@/core/config';
import { apiErrorHandler, type ApiError } from './apiErrorHandler';
import { tokenService } from '@/core/services/tokenService';

/**
 * Create and configure the Axios instance
 */
const createAxiosClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: appConfig.api.baseUrl,
    timeout: appConfig.api.timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // ─── Request Interceptor ──────────────────────────────────
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenService.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ─── Response Interceptor ─────────────────────────────────
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error.config;
      const errorCode = error.response?.data?.code;

      // Handle tenant-specific deactivation errors — no retry, redirect immediately
      const fatalCodes = ['COMPANY_DEACTIVATED', 'COMPANY_NOT_FOUND', 'SUBSCRIPTION_EXPIRED', 'BRANCH_NOT_FOUND', 'BRANCH_INACTIVE', 'USER_INACTIVE'];
      if (error.response?.status === 401 && errorCode && fatalCodes.includes(errorCode)) {
        tokenService.clearTokens();
        // Store the reason so the login page can display it
        try {
          sessionStorage.setItem('auth_error', error.response?.data?.message || 'Session expired');
        } catch { /* ignore */ }
        window.location.href = appConfig.auth.loginPath;
        return Promise.reject(error);
      }

      // Handle 401 — attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = tokenService.getRefreshToken();
          if (refreshToken) {
            const { data } = await axios.post(
              `${appConfig.api.baseUrl}/auth/refresh`,
              { refreshToken }
            );
            tokenService.setTokens(data.accessToken, data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return client(originalRequest);
          }
        } catch {
          tokenService.clearTokens();
          window.location.href = appConfig.auth.loginPath;
          return Promise.reject(error);
        }
      }

      const apiError = apiErrorHandler.handle(error);
      return Promise.reject(apiError);
    }
  );

  return client;
};

export const axiosClient = createAxiosClient();

/**
 * Typed request helpers
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosClient.delete<T>(url, config).then((res) => res.data),
};

export type { ApiError };
