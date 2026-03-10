/**
 * Auth Store
 * Manages authentication state with Zustand.
 * Extended to support multi-tenant context with session validation,
 * branch switching, and super admin company impersonation.
 */

import { create } from 'zustand';
import { tokenService } from '@/core/services';
import { api } from '@/core/api/axiosClient';
import { apiRoutes } from '@/core/api/apiRoutes';
import type { BranchSummary, ValidateResponse } from '@/types/tenant';

export interface User {
  id: string | number;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  role?: string;
  roleName?: string;
  companyCode?: string;
  companyName?: string;
  branchId?: number;
  branchName?: string | null;
  branchCode?: string | null;
  isSuperAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidated: boolean;
  availableBranches: BranchSummary[];

  /** Set user after login */
  setUser: (user: User) => void;
  /** Clear auth state (logout) */
  clearAuth: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Initialize auth from stored token (offline decode) */
  initAuth: () => void;
  /** Validate session with backend (route service provider) */
  validateSession: () => Promise<boolean>;
  /** Switch to a different branch (same company) */
  switchBranch: (branchId: number) => Promise<boolean>;
  /** Super admin: impersonate a company */
  switchCompany: (companyCode: string) => Promise<boolean>;
  /** Super admin: return to system context */
  exitCompany: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isValidated: false,
  availableBranches: [],

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  clearAuth: () => {
    tokenService.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false, isValidated: false, availableBranches: [] });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  initAuth: () => {
    const token = tokenService.getAccessToken();
    if (token && !tokenService.isTokenExpired(token)) {
      const decoded = tokenService.decodeToken(token);
      if (decoded) {
        set({
          user: {
            id: String(decoded.sub || decoded.userId || ''),
            email: String(decoded.email || ''),
            name: String(decoded.name || 'User'),
            roles: (decoded.roles as string[]) || [String(decoded.role || 'user')],
            role: String(decoded.role || 'user'),
            companyCode: String(decoded.companyCode || ''),
            branchId: decoded.branchId as number | undefined,
            branchName: (decoded.branchName as string) || null,
            branchCode: (decoded.branchCode as string) || null,
            isSuperAdmin: Boolean(decoded.isSuperAdmin),
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  validateSession: async () => {
    try {
      const token = tokenService.getAccessToken();
      if (!token || tokenService.isTokenExpired(token)) {
        get().clearAuth();
        return false;
      }

      const response = await api.get<ValidateResponse>(apiRoutes.auth.validate);

      if (!response.valid) {
        get().clearAuth();
        return false;
      }

      const u = response.user!;
      set({
        user: {
          id: String(u.id),
          email: u.email,
          name: u.name,
          avatar: u.avatar,
          roles: [u.role],
          role: u.role,
          roleName: u.roleName,
          companyCode: u.companyCode,
          companyName: u.companyName,
          branchId: u.branchId,
          branchName: u.branchName,
          branchCode: u.branchCode,
          isSuperAdmin: u.isSuperAdmin,
        },
        isAuthenticated: true,
        isLoading: false,
        isValidated: true,
        availableBranches: response.availableBranches || [],
      });
      return true;
    } catch {
      get().clearAuth();
      return false;
    }
  },

  switchBranch: async (branchId: number) => {
    try {
      const response = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string; user: Record<string, unknown>; availableBranches: BranchSummary[] } }>(
        apiRoutes.auth.switchBranch,
        { branchId },
      );

      if (!response.success) return false;

      const { accessToken, refreshToken, user: u, availableBranches } = response.data;
      tokenService.setTokens(accessToken, refreshToken);

      set({
        user: {
          id: String(u.id),
          email: String(u.email),
          name: String(u.name),
          avatar: u.avatar as string | undefined,
          roles: [String(u.role)],
          role: String(u.role),
          roleName: String(u.roleName || ''),
          companyCode: String(u.companyCode),
          companyName: String(u.companyName || ''),
          branchId: u.branchId as number,
          branchName: u.branchName as string,
          branchCode: u.branchCode as string,
          isSuperAdmin: Boolean(u.isSuperAdmin),
        },
        availableBranches: availableBranches || [],
      });
      return true;
    } catch {
      return false;
    }
  },

  switchCompany: async (companyCode: string) => {
    try {
      const response = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string; user: Record<string, unknown>; availableBranches?: BranchSummary[] } }>(
        apiRoutes.auth.switchCompany,
        { companyCode },
      );

      if (!response.success) return false;

      const { accessToken, refreshToken, user: u, availableBranches } = response.data;
      tokenService.setTokens(accessToken, refreshToken);

      set({
        user: {
          id: String(u.id),
          email: String(u.email),
          name: String(u.name),
          roles: ['super_admin'],
          role: 'super_admin',
          companyCode: String(u.companyCode),
          companyName: String(u.companyName || ''),
          branchId: u.branchId as number | undefined,
          branchName: u.branchName as string | null,
          branchCode: u.branchCode as string | null,
          isSuperAdmin: true,
        },
        availableBranches: availableBranches || [],
      });
      return true;
    } catch {
      return false;
    }
  },

  exitCompany: async () => {
    try {
      const response = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string; user: Record<string, unknown> } }>(
        apiRoutes.auth.exitCompany,
      );

      if (!response.success) return false;

      const { accessToken, refreshToken, user: u } = response.data;
      tokenService.setTokens(accessToken, refreshToken);

      set({
        user: {
          id: String(u.id),
          email: String(u.email),
          name: String(u.name),
          roles: ['super_admin'],
          role: 'super_admin',
          companyCode: 'system',
          isSuperAdmin: true,
        },
        availableBranches: [],
      });
      return true;
    } catch {
      return false;
    }
  },
}));
