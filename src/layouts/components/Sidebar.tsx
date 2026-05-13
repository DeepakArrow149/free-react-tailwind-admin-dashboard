/**
 * Sidebar Component
 * Config-driven collapsible sidebar with nested menu support.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useSidebar } from '../context/SidebarContext';
import { cn } from '@/core/utils';
import { SIDEBAR } from '@/core/constants';
import type { MenuItem, MenuSection } from '../config/menuTypes';
import { defaultMenuConfig } from '../config/menuConfig';

interface SidebarProps {
  /** Custom menu config (overrides default) */
  menuConfig?: MenuSection[];
  /** Logo component or image */
  logo?: React.ReactNode;
  /** Collapsed logo (icon only) */
  logoIcon?: React.ReactNode;
  /** Footer content (e.g., widget) */
  footer?: React.ReactNode;
}

export function Sidebar({
  menuConfig = defaultMenuConfig,
  logo,
  logoIcon,
  footer,
}: SidebarProps) {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [subMenuHeights, setSubMenuHeights] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const showFull = isExpanded || isHovered || isMobileOpen;

  // Auto-open active submenu on route change
  useEffect(() => {
    for (const section of menuConfig) {
      for (const item of section.items) {
        if (item.children) {
          for (const child of item.children) {
            if (child.path && isActive(child.path)) {
              setOpenSubmenu(item.id);
              return;
            }
          }
        }
      }
    }
  }, [location.pathname, menuConfig, isActive]);

  // Calculate submenu heights for animation
  useEffect(() => {
    if (openSubmenu && subMenuRefs.current[openSubmenu]) {
      setSubMenuHeights((prev) => ({
        ...prev,
        [openSubmenu]: subMenuRefs.current[openSubmenu]?.scrollHeight || 0,
      }));
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (id: string) => {
    setOpenSubmenu((prev) => (prev === id ? null : id));
  };

  const isItemActive = (item: MenuItem): boolean => {
    if (item.path) return isActive(item.path);
    if (item.children) return item.children.some((c) => c.path && isActive(c.path));
    return false;
  };

  const renderMenuItem = (item: MenuItem) => {
    const active = isItemActive(item);
    const isSubmenuOpen = openSubmenu === item.id;

    if (item.children && item.children.length > 0) {
      return (
        <li key={item.id}>
          <button
            onClick={() => handleSubmenuToggle(item.id)}
            className={cn(
              'menu-item group cursor-pointer',
              active ? 'menu-item-active' : 'menu-item-inactive',
              !showFull && 'lg:justify-center'
            )}
          >
            {item.icon && (
              <span className={cn('menu-item-icon-size', active ? 'menu-item-icon-active' : 'menu-item-icon-inactive')}>
                {item.icon}
              </span>
            )}
            {showFull && <span className="menu-item-text">{item.label}</span>}
            {showFull && (
              <svg
                className={cn(
                  'ml-auto h-5 w-5 transition-transform duration-200',
                  isSubmenuOpen && 'rotate-180 text-brand-500'
                )}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {showFull && (
            <div
              ref={(el) => { subMenuRefs.current[item.id] = el; }}
              className="overflow-hidden transition-all duration-300"
              style={{ height: isSubmenuOpen ? `${subMenuHeights[item.id] || 0}px` : '0px' }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {item.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      to={child.path || '#'}
                      target={child.external ? '_blank' : undefined}
                      className={cn(
                        'menu-dropdown-item',
                        child.path && isActive(child.path)
                          ? 'menu-dropdown-item-active'
                          : 'menu-dropdown-item-inactive'
                      )}
                    >
                      {child.label}
                      {child.badge && (
                        <span className={cn(
                          'ml-auto menu-dropdown-badge',
                          child.path && isActive(child.path)
                            ? 'menu-dropdown-badge-active'
                            : 'menu-dropdown-badge-inactive'
                        )}>
                          {child.badge.text}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      );
    }

    // Leaf item (no children)
    if (!item.path) return null;

    return (
      <li key={item.id}>
        <Link
          to={item.path}
          target={item.external ? '_blank' : undefined}
          className={cn(
            'menu-item group',
            active ? 'menu-item-active' : 'menu-item-inactive'
          )}
        >
          {item.icon && (
            <span className={cn('menu-item-icon-size', active ? 'menu-item-icon-active' : 'menu-item-icon-inactive')}>
              {item.icon}
            </span>
          )}
          {showFull && <span className="menu-item-text">{item.label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 mt-16 lg:mt-0',
        showFull ? `w-[${SIDEBAR.EXPANDED_WIDTH}px]` : `w-[${SIDEBAR.COLLAPSED_WIDTH}px]`,
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
      style={{ width: showFull ? SIDEBAR.EXPANDED_WIDTH : SIDEBAR.COLLAPSED_WIDTH }}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={cn('flex py-8', !showFull ? 'lg:justify-center' : 'justify-start')}>
        <Link to="/">
          {showFull ? (
            logo || (
              <>
                <img className="dark:hidden" src="/images/logo/logo.svg" alt="Logo" width={150} height={40} />
                <img className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="Logo" width={150} height={40} />
              </>
            )
          ) : (
            logoIcon || <img src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {menuConfig.map((section) => (
              <div key={section.title}>
                <h2
                  className={cn(
                    'mb-4 flex text-xs uppercase leading-5 text-gray-400',
                    !showFull ? 'lg:justify-center' : 'justify-start'
                  )}
                >
                  {showFull ? section.title : (
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                    </svg>
                  )}
                </h2>
                <ul className="flex flex-col gap-4">
                  {section.items.map(renderMenuItem)}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {showFull && footer}
      </div>
    </aside>
  );
}
