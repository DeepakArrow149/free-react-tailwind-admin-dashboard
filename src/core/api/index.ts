/**
 * Core API barrel — now delegates to the unified client at src/api/client.ts.
 * axiosClient.ts is DEPRECATED; all imports should resolve through here.
 */
export { default as axiosClient, api } from '@/api/client';
export { apiRoutes } from './apiRoutes';
export { apiErrorHandler } from './apiErrorHandler';
export type { ApiError } from './apiErrorHandler';
