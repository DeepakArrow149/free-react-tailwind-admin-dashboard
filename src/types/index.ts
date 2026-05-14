/**
 * Global type definitions
 *
 * Shared types used across multiple modules.
 * Module-specific types should live in their respective module directories.
 */

// ─── Re-exports from shared-types ────────────────────────────
export {
  type OrderStatus, ORDER_STATUSES,
  type OrderType, ORDER_TYPES,
  type PoStatus, PO_STATUSES,
  type ProductionStatus, PRODUCTION_STATUSES,
  type ShipmentStatus, SHIPMENT_STATUSES,
  type UserStatus, USER_STATUSES,
  type CompanyStatus, COMPANY_STATUSES,
  type ApprovalModule, APPROVAL_MODULES,
  type SystemRole, SYSTEM_ROLES,
  type SubscriptionPlan, SUBSCRIPTION_PLANS,
  type SubscriptionStatus, SUBSCRIPTION_STATUSES,
  type ShipMode, SHIP_MODES,
  type Incoterm, INCOTERMS,
  type PaginationParams,
  type ApiResponse as SharedApiResponse,
  type PaginatedResponse as SharedPaginatedResponse,
} from '@erp/shared-types';

// ─── Common Entity Types ─────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User Types ──────────────────────────────────────────────

export interface User extends BaseEntity {
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
  status: UserStatus;
}

export interface UserProfile extends User {
  phone?: string;
  address?: string;
  bio?: string;
  department?: string;
  position?: string;
}

// ─── API Response Types ──────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}

// ─── Form Types ──────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ─── Table Types ─────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  key: string;
  value: string | string[];
  operator?: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
}

// ─── Auth Types ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// ─── Notification Types ──────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// ─── Route Types ─────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  path?: string;
}
