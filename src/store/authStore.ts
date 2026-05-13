/**
 * Auth Store
 * Manages authentication state with Zustand.
 * Extended to support multi-tenant context with session validation,
 * branch switching, and super admin company impersonation.
 */

import { create } from 'zustand';
import { tokenService } from '@/core/services';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';
import { authApi, type AuthUser } from '../api/auth';
import type { BranchSummary, ValidateResponse } from '@/types/tenant';

export interface User {
  id: string | number;
  email: string;
  name: string;
  fullName?: string;
  username?: string;
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
  /** Module permissions from Role Builder: { "Master": ["View","Create",...], ... } */
  permissions?: Record<string, string[]> | { all?: boolean; readOnly?: boolean; modules?: string[] };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidated: boolean;
  availableBranches: BranchSummary[];

  /** Login with email & password */
  login: (email: string, password: string) => Promise<void>;
  /** Logout and clear auth state */
  logout: () => Promise<void>;
  /** Load current user from server */
  loadUser: () => Promise<void>;
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

  /* ── Login via authApi ── */
  login: async (email: string, password: string) => {
    const { data: resp } = await authApi.login({ email, password });
    const { accessToken, refreshToken, user } = resp.data;
    tokenService.setTokens(accessToken, refreshToken);

    const loginUser = user as AuthUser & { isSuperAdmin?: boolean; companyCode?: string; roleName?: string };
    const isSuperAdmin = Boolean(loginUser.isSuperAdmin);
    const roles = isSuperAdmin ? ['super_admin'] : [user.role];

    set({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.fullName || user.email,
        fullName: user.fullName,
        username: user.username,
        roles,
        role: user.role,
        roleName: loginUser.roleName || user.role,
        companyCode: loginUser.companyCode,
        isSuperAdmin,
        permissions: loginUser.permissions as User['permissions'],
      },
      isAuthenticated: true,
      isLoading: false,
      isValidated: true,
    });
  },

  /* ── Logout ── */
  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    get().clearAuth();
  },

  /* ── Load user from /auth/me ── */
  loadUser: async () => {
    const token = tokenService.getAccessToken();
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const { data: resp } = await authApi.me();
      const raw = resp.data;
      // API wraps user in { user: {...} } — unwrap if needed
      const u = (raw as unknown as Record<string, unknown>).user
        ? ((raw as unknown as Record<string, unknown>).user as typeof raw)
        : raw;
      const isSA = Boolean((u as unknown as Record<string, unknown>).isSuperAdmin);
      set({
        user: {
          id: u.id,
          email: u.email,
          name: u.fullName || u.username || u.email,
          fullName: u.fullName,
          username: u.username,
          roles: isSA ? ['super_admin'] : [u.role],
          role: u.role,
          isSuperAdmin: isSA,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      get().clearAuth();
    }
  },

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  clearAuth: () => {
    tokenService.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false, isValidated: false, availableBranches: [] });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  initAuth: () => {
    // Don't overwrite state if login already set isValidated
    if (get().isValidated) return;

    const token = tokenService.getAccessToken();
    if (token && !tokenService.isTokenExpired(token)) {
      const decoded = tokenService.decodeToken(token);
      if (decoded) {
        const decodedIsSA = Boolean(decoded.isSuperAdmin);
        set({
          user: {
            id: String(decoded.sub || decoded.userId || ''),
            email: String(decoded.email || ''),
            name: String(decoded.name || decoded.fullName || 'User'),
            fullName: String(decoded.name || decoded.fullName || ''),
            roles: decodedIsSA
              ? ['super_admin']
              : (decoded.roles as string[]) || [String(decoded.role || decoded.roleName || 'user')],
            role: String(decoded.role || decoded.roleName || 'user'),
            companyCode: String(decoded.companyCode || ''),
            branchId: decoded.branchId as number | undefined,
            branchName: (decoded.branchName as string) || null,
            branchCode: (decoded.branchCode as string) || null,
            isSuperAdmin: decodedIsSA,
          },
          isAuthenticated: true,
          isLoading: false,
          isValidated: false, // explicit: needs backend validation via ProtectedRoute
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
      const saRoles: string[] = u.isSuperAdmin ? ['super_admin'] : [u.role];
      set({
        user: {
          id: String(u.id),
          email: u.email,
          name: u.name,
          fullName: u.name,
          avatar: u.avatar,
          roles: saRoles,
          role: u.role,
          roleName: u.roleName,
          companyCode: u.companyCode,
          companyName: u.companyName,
          branchId: u.branchId,
          branchName: u.branchName,
          branchCode: u.branchCode,
          isSuperAdmin: u.isSuperAdmin,
          permissions: (u as Record<string, unknown>).permissions as User['permissions'],
        },
        isAuthenticated: true,
        isLoading: false,
        isValidated: true,
        availableBranches: response.availableBranches || [],
      });
      return true;
    } catch (err) {
      console.error('[validateSession] Failed:', err);
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
          fullName: String(u.name || ''),
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
          fullName: String(u.name || ''),
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
          fullName: String(u.name || ''),
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
