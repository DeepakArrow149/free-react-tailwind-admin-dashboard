/**
 * Centralized Hooks
 * Re-exports all shared hooks from a single entry point.
 *
 * Usage:  import { useToggle, useGoBack, useSidebar } from '@/hooks';
 */

// ── Generic utility hooks (from core) ──
export { useToggle } from '@/core/hooks/useToggle';
export { useMediaQuery } from '@/core/hooks/useMediaQuery';
export { useGoBack } from '@/core/hooks/useGoBack';
export { usePagination } from '@/core/hooks/usePagination';

// ── Layout hooks ──
export { useMenuConfig } from '@/layouts/hooks/useMenuConfig';

// ── Context-derived hooks ──
export { useSidebar } from '@/layouts/context/SidebarContext';
export { useTheme } from '@/theme/ThemeContext';

// ── Master data / Lookup hooks ──
export * from './useMasterLookups';

// ── Module-specific React-Query hooks ──
export * from './useHrm';
export * from './useFinance';
export * from './useQuality';
export * from './useProcurement';
export * from './useProduction';
export * from './useExport';
export * from './useMaintenance';
