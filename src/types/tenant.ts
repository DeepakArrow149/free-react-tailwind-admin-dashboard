/**
 * Multi-Tenant Type Definitions
 */

// ─── Company / Tenant ────────────────────────────────────────

export interface Company {
  id: number;
  companyCode: string;
  companyName: string;
  databaseName: string;
  status: 'active' | 'suspended' | 'inactive' | 'deleted';
  plan?: string;
  subscriptionStatus?: string;
  maxUsers?: number;
  maxBranches?: number;
  createdAt: string;
}

export interface CompanyDetail extends Company {
  subscription: {
    plan: string;
    status: string;
    maxUsers: number;
    maxBranches: number;
  } | null;
  stats: {
    userCount: number;
    branchCount: number;
  };
}

export interface CreateCompanyPayload {
  companyCode: string;
  companyName: string;
  adminPassword?: string;
}

// ─── Branch ──────────────────────────────────────────────────

export interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface CreateBranchPayload {
  branchCode: string;
  branchName: string;
  location?: string;
  phone?: string;
  email?: string;
}

// ─── Tenant User ─────────────────────────────────────────────

export interface TenantUser {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: 'active' | 'inactive' | 'suspended';
  role: string;
  roleDisplay: string;
  roleId: number | null;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  lastLogin: string | null;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  name: string;
  roleId?: number;
  branchId?: number;
}

// ─── Role ────────────────────────────────────────────────────

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
}

// ─── Subscription ────────────────────────────────────────────

export interface Subscription {
  id: number;
  companyId: number;
  plan: 'free' | 'standard' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  maxUsers: number;
  maxBranches: number;
  startedAt: string;
  expiresAt: string | null;
}

// ─── Branch Summary (returned in login/validate responses) ──

export interface BranchSummary {
  id: number;
  branch_code: string;
  branch_name: string;
  location: string | null;
}

// ─── Login ───────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    avatar?: string;
    role: string;
    roleName?: string;
    companyCode: string;
    companyName?: string;
    branchId?: number;
    branchName?: string | null;
    branchCode?: string | null;
    isSuperAdmin?: boolean;
  };
  availableBranches?: BranchSummary[];
}

// ─── Validate Session Response ───────────────────────────────

export interface ValidateResponse {
  valid: boolean;
  reason?: string;
  code?: string;
  user?: LoginResponse['user'];
  company?: {
    id: number;
    companyCode: string;
    companyName: string;
  } | null;
  branch?: {
    id: number;
    branchCode: string;
    branchName: string;
    location: string | null;
  } | null;
  availableBranches?: BranchSummary[];
}

// ─── Switch Response ─────────────────────────────────────────

export type SwitchBranchResponse = LoginResponse;
export type SwitchCompanyResponse = LoginResponse;
