/**
 * Global type definitions
 *
 * Shared types used across multiple modules.
 * Module-specific types should live in their respective module directories.
 */

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
  status: 'active' | 'inactive' | 'suspended';
}

export interface UserProfile extends User {
  phone?: string;
  address?: string;
  bio?: string;
  department?: string;
  position?: string;
}

// ─── API Response Types ──────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
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
