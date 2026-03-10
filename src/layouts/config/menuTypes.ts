/**
 * Menu Configuration
 * Config-driven sidebar navigation system.
 * Supports role-based access, nested menus, icons, and route linking.
 */

import type { ReactNode } from 'react';

export interface MenuBadge {
  text: string;
  variant?: 'new' | 'pro' | 'beta';
}

export interface MenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: ReactNode;
  /** Route path (for leaf items) */
  path?: string;
  /** Nested sub-items */
  children?: MenuItem[];
  /** Required roles — if empty, accessible to all */
  roles?: string[];
  /** Badge to display */
  badge?: MenuBadge;
  /** Whether this item is hidden */
  hidden?: boolean;
  /** External link (opens in new tab) */
  external?: boolean;
}

export interface MenuSection {
  /** Section title (e.g., "Menu", "Others") */
  title: string;
  /** Menu items in this section */
  items: MenuItem[];
}

/**
 * Filter menu items based on user roles
 */
export function filterMenuByRole(sections: MenuSection[], userRoles: string[]): MenuSection[] {
  const filterItems = (items: MenuItem[]): MenuItem[] =>
    items
      .filter((item) => {
        if (item.hidden) return false;
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.some((role) => userRoles.includes(role));
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined,
      }));

  return sections
    .map((section) => ({
      ...section,
      items: filterItems(section.items),
    }))
    .filter((section) => section.items.length > 0);
}
