import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Master Data",
    subItems: [
      { name: "Buyers", path: "/master/buyers" },
      { name: "Suppliers", path: "/master/suppliers" },
      { name: "Materials", path: "/master/materials" },
      { name: "Styles", path: "/master/styles" },
      { name: "Colors", path: "/master/colors" },
      { name: "Seasons", path: "/master/seasons" },
      { name: "Companies", path: "/master/companies" },
      { name: "Branches", path: "/master/branches" },
      { name: "Buying Agents", path: "/master/buying-agents" },
      { name: "Party Groups", path: "/master/party-groups" },
      { name: "Sections", path: "/master/sections" },
      { name: "Thread Qualities", path: "/master/thread-qualities" },
      { name: "Counts", path: "/master/counts" },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Merchandising",
    subItems: [
      { name: "Orders", path: "/merchandising/orders" },
      { name: "Samples", path: "/merchandising/samples" },
      { name: "Sampling Requests", path: "/merchandising/sampling", new: true },
      { name: "T&A Tracker", path: "/merchandising/tna" },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Costing",
    subItems: [
      { name: "Cost Sheets", path: "/costing/sheets" },
      { name: "BOM", path: "/costing/bom" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Planning",
    subItems: [
      { name: "TNA Templates", path: "/planning/tna-templates" },
      { name: "TNA Calendar", path: "/planning/tna" },
      { name: "Production Targets", path: "/planning/targets" },
      { name: "Production Plan", path: "/planning/production-plan", new: true },
      { name: "Capacity", path: "/planning/capacity" },
    ],
  },
  {
    icon: <PageIcon />,
    name: "Procurement",
    subItems: [
      { name: "RFQ", path: "/procurement/rfq", new: true },
      { name: "Purchase Orders", path: "/procurement/po" },
      { name: "GRN", path: "/procurement/grn" },
      { name: "Subcontract", path: "/procurement/subcontract", new: true },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PlugInIcon />,
    name: "Inventory",
    subItems: [
      { name: "Stock", path: "/inventory/stock" },
      { name: "Issue", path: "/inventory/issue" },
      { name: "Return", path: "/inventory/return" },
      { name: "Machines", path: "/inventory/machines", new: true },
    ],
  },
  {
    icon: <PieChartIcon />,
    name: "Production",
    subItems: [
      { name: "Cutting", path: "/production/cutting" },
      { name: "Sewing", path: "/production/sewing" },
      { name: "Finishing", path: "/production/finishing" },
      { name: "Op. Bulletins", path: "/production/bulletins", new: true },
      { name: "Prod. Orders", path: "/production/orders", new: true },
      { name: "Hourly Tracking", path: "/production/hourly", new: true },
      { name: "Bundles", path: "/production/bundles", new: true },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Quality",
    subItems: [
      { name: "AQL Inspection", path: "/quality/aql" },
      { name: "Fabric Inspection", path: "/quality/fabric" },
      { name: "Lab Tests", path: "/quality/lab", new: true },
      { name: "Buyer Claims", path: "/quality/claims" },
      { name: "Endline QC", path: "/quality/endline", new: true },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Packing & Export",
    subItems: [
      { name: "Packing Lists", path: "/packing/lists" },
      { name: "Scan & Pack", path: "/packing/scan", new: true },
      { name: "Containers", path: "/packing/containers" },
      { name: "Export Docs", path: "/export/documents" },
      { name: "Shipping Bills", path: "/export/shipping-bills", new: true },
      { name: "Bill of Lading", path: "/export/bill-of-lading", new: true },
      { name: "COO", path: "/export/coo", new: true },
      { name: "LC Management", path: "/export/lc", new: true },
      { name: "Export Incentives", path: "/export/incentives", new: true },
    ],
  },
  {
    icon: <PieChartIcon />,
    name: "Finance",
    subItems: [
      { name: "Invoices", path: "/finance/invoices" },
      { name: "Payments", path: "/finance/payments" },
      { name: "Chart of Accounts", path: "/finance/chart-of-accounts", new: true },
      { name: "Fixed Assets", path: "/finance/fixed-assets", new: true },
      { name: "GST Returns", path: "/finance/gst-returns", new: true },
      { name: "E-Invoice / E-Way", path: "/finance/e-invoice", new: true },
      { name: "Bank Recon", path: "/finance/bank-recon", new: true },
      { name: "Financial Reports", path: "/finance/reports", new: true },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "HRM",
    subItems: [
      { name: "Departments", path: "/hrm/departments" },
      { name: "Designations", path: "/hrm/designations" },
      { name: "Shifts", path: "/hrm/shifts", new: true },
      { name: "Employees", path: "/hrm/employees" },
      { name: "Attendance", path: "/hrm/attendance" },
      { name: "Leave Types", path: "/hrm/leave-types" },
      { name: "Leave Applications", path: "/hrm/leaves" },
      { name: "Leave Balances", path: "/hrm/leave-balances", new: true },
      { name: "Payroll", path: "/hrm/payroll" },
      { name: "Loans", path: "/hrm/loans" },
      { name: "FnF Settlement", path: "/hrm/fnf", new: true },
      { name: "Statutory Exports", path: "/hrm/statutory-exports", new: true },
    ],
  },
  {
    icon: <GridIcon />,
    name: "Reports",
    subItems: [
      { name: "MIS Dashboard", path: "/reports/dashboard" },
      { name: "Order Status", path: "/reports/orders" },
      { name: "Production Efficiency", path: "/reports/production-efficiency", new: true },
      { name: "T&A Delays", path: "/reports/tna-delays", new: true },
      { name: "Inventory Aging", path: "/reports/inventory-aging", new: true },
      { name: "Supplier Scorecard", path: "/reports/supplier-scorecard", new: true },
      { name: "Buyer Analysis", path: "/reports/buyer-analysis", new: true },
      { name: "Style P&L", path: "/reports/style-pnl", new: true },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "System Admin",
    subItems: [
      { name: "Settings", path: "/settings" },
      { name: "Approval Workflows", path: "/settings/approvals", new: true },
      { name: "Notifications", path: "/settings/notifications", new: true },
      { name: "Role Builder", path: "/settings/roles", new: true },
      { name: "Excel Import", path: "/settings/excel-import", new: true },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-72.5"
            : isHovered
            ? "w-72.5"
            : "w-22.5"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="text-xl font-bold text-brand-500 dark:text-brand-400">
              ERP TRACK
            </span>
          ) : (
            <span className="text-xl font-bold text-brand-500 dark:text-brand-400">
              ET
            </span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
