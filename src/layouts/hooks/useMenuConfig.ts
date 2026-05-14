/**
 * useMenuConfig — Dynamic menu configuration hook
 *
 * Starts with the static `defaultMenuConfig` and merges in
 * dynamically-created forms that have been assigned to ERP modules
 * via the Module Bridge (GET /api/forms/menu-items).
 *
 * Published forms with a target_module appear as children under
 * the matching parent menu item, or as items in a new "Custom" section.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MenuSection, MenuItem } from '../config/menuTypes';
import { defaultMenuConfig } from '../config/menuConfig';
import { filterMenuByRole } from '../config/menuTypes';
import { fetchMenuItems as apiFetchMenuItems } from '@/modules/super-admin/api/formBuilderApi';
import type { DynamicMenuItem } from '@/modules/super-admin/api/formBuilderApi';
import { useAuthStore } from '@/store';

/**
 * Fetches dynamic menu items from the API and merges them into
 * the static menu config. Returns the fully merged + role-filtered menu.
 */
export function useMenuConfig() {
  const user = useAuthStore((s) => s.user);
  const [dynamicItems, setDynamicItems] = useState<DynamicMenuItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchMenuItems = useCallback(async () => {
    try {
      const items = await apiFetchMenuItems();
      setDynamicItems(items);
    } catch {
      // Silently fail — forms table may not exist yet
      setDynamicItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMenuItems();
    }
  }, [user, fetchMenuItems]);

  const mergedMenu = useMemo(() => {
    if (!user) return [];

    // Start with a deep clone of the static config
    const config: MenuSection[] = JSON.parse(JSON.stringify(defaultMenuConfig));

    if (dynamicItems.length > 0) {
      // Group items by menuParentId
      const byParent = new Map<string, DynamicMenuItem[]>();
      for (const item of dynamicItems) {
        const key = item.menuParentId;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(item);
      }

      // Merge into existing menu sections
      for (const section of config) {
        for (const menuItem of section.items) {
          injectDynamicChildren(menuItem, byParent);
        }
      }

      // Handle custom modules — items whose menuParentId doesn't match any existing menu item
      const allExistingIds = new Set<string>();
      for (const section of config) {
        for (const item of section.items) {
          collectIds(item, allExistingIds);
        }
      }

      // Group unmatched items by parentId to create custom sections
      const customGroups = new Map<string, DynamicMenuItem[]>();
      for (const [parentId, items] of byParent) {
        if (!allExistingIds.has(parentId)) {
          customGroups.set(parentId, items);
        }
      }

      if (customGroups.size > 0) {
        // Add a "Custom Forms" section (or individual groups)
        const customItems: MenuItem[] = [];
        for (const [parentId, items] of customGroups) {
          // Use the parentId to derive a group label
          const groupLabel = parentId.replace(/^custom-/, '').replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          if (items.length === 1) {
            // Single item → direct child
            const di = items[0];
            customItems.push({
              id: `dynamic-form-${di.formId}`,
              label: di.menuLabel,
              path: `/app/forms/${di.slug}`,
              roles: di.allowedRoles.length > 0 ? di.allowedRoles : undefined,
              badge: { text: 'Form', variant: 'new' },
            });
          } else {
            // Multiple items → group
            customItems.push({
              id: `custom-group-${parentId}`,
              label: groupLabel,
              children: items
                .sort((a, b) => a.menuSortOrder - b.menuSortOrder)
                .map((di) => ({
                  id: `dynamic-form-${di.formId}`,
                  label: di.menuLabel,
                  path: `/app/forms/${di.slug}`,
                  roles: di.allowedRoles.length > 0 ? di.allowedRoles : undefined,
                  badge: { text: 'Form', variant: 'new' as const },
                })),
            });
          }
        }

        if (customItems.length > 0) {
          config.push({
            title: 'Custom Forms',
            items: customItems,
          });
        }
      }
    }

    // Apply role-based filtering
    if (user.isSuperAdmin) {
      // Super admin sees ALL menu items — SA panel + full ERP modules.
      // Backend also bypasses permission checks for super admins.
      return config;
    }

    const userRoles = user.roles ?? [];
    return filterMenuByRole(config, userRoles);
  }, [user, dynamicItems]);

  return { menuConfig: mergedMenu, refetchMenuItems: fetchMenuItems, loaded };
}

// ─── Internal Helpers ─────────────────────────────────────────

function injectDynamicChildren(
  menuItem: MenuItem,
  byParent: Map<string, DynamicMenuItem[]>,
) {
  const items = byParent.get(menuItem.id);
  if (items && items.length > 0) {
    // Ensure children array exists
    if (!menuItem.children) menuItem.children = [];
    for (const di of items.sort((a, b) => a.menuSortOrder - b.menuSortOrder)) {
      // Avoid duplicates
      const existingId = `dynamic-form-${di.formId}`;
      if (!menuItem.children.some((c) => c.id === existingId)) {
        menuItem.children.push({
          id: existingId,
          label: di.menuLabel,
          path: `/app/forms/${di.slug}`,
          roles: di.allowedRoles.length > 0 ? di.allowedRoles : undefined,
          badge: { text: 'Form', variant: 'new' },
        });
      }
    }
    // Remove from the map so we know it was consumed
    byParent.delete(menuItem.id);
  }

  // Recurse into children
  if (menuItem.children) {
    for (const child of menuItem.children) {
      injectDynamicChildren(child, byParent);
    }
  }
}

function collectIds(item: MenuItem, ids: Set<string>) {
  ids.add(item.id);
  if (item.children) {
    for (const child of item.children) {
      collectIds(child, ids);
    }
  }
}


