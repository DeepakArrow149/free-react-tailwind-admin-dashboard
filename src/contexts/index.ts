/**
 * Centralized Contexts
 * Re-exports all React contexts and their providers from a single entry point.
 *
 * Usage:  import { ThemeProvider, SidebarProvider } from '@/contexts';
 */

// ── Theme ──
export { ThemeProvider, useTheme, type Theme } from '@/theme/ThemeContext';

// ── Sidebar ──
export { SidebarProvider, useSidebar } from '@/layouts/context/SidebarContext';
