/**
 * Services Barrel
 * Canonical import point for all API service modules.
 *
 * Usage:  import { masterApi, authApi } from '@/services';
 *
 * The actual implementations live in @/api/* — this barrel provides
 * the recommended import path going forward.
 */

export * as analyticsApi from '@/api/analytics';
export * as authApi from '@/api/auth';
export { default as apiClient } from '@/api/client';
export * as costingApi from '@/api/costing';
export * as exportApi from '@/api/export';
export * as financeApi from '@/api/finance';
export * as hrmApi from '@/api/hrm';
export * as inventoryApi from '@/api/inventory';
export * as machineApi from '@/api/machine';
export * as masterApi from '@/api/master';
export * as merchandisingApi from '@/api/merchandising';
export * as packingApi from '@/api/packing';
export * as planningApi from '@/api/planning';
export * as procurementApi from '@/api/procurement';
export * as productionApi from '@/api/production';
export * as qualityApi from '@/api/quality';
export * as samplingApi from '@/api/sampling';
