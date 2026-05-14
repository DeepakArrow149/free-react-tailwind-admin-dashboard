/**
 * ERP Menu Configuration
 * Sidebar navigation for the Apparel ERP application.
 * All paths match routes defined in App.tsx.
 */

import type { MenuSection } from './menuTypes';

export const defaultMenuConfig: MenuSection[] = [
  // ─── Super Admin Menu (only visible to super_admin role) ──
  {
    title: 'Super Admin',
    items: [
      {
        id: 'sa-dashboard',
        label: 'SA Dashboard',
        path: '/super-admin',
        roles: ['super_admin'],
      },
      {
        id: 'sa-companies',
        label: 'Companies',
        path: '/super-admin/companies',
        roles: ['super_admin'],
      },
      {
        id: 'sa-create-company',
        label: 'Create Company',
        path: '/super-admin/companies/create',
        roles: ['super_admin'],
      },
    ],
  },
  // ─── No-Code Menu (citizen-developer tools) ──────────────────
  {
    title: 'No-Code',
    items: [
      {
        id: 'nc-form-builder',
        label: 'Form Builder',
        path: '/super-admin/form-builder',
        roles: ['super_admin', 'company_admin'],
        badge: { text: 'New', variant: 'new' },
      },
      {
        id: 'nc-template-library',
        label: 'Template Library',
        path: '/super-admin/template-library',
        roles: ['super_admin', 'company_admin'],
      },
      {
        id: 'nc-report-builder',
        label: 'Report Builder',
        path: '/reports/builder',
        roles: ['super_admin', 'company_admin'],
        badge: { text: 'AI', variant: 'new' },
      },
      {
        id: 'nc-ai-settings',
        label: 'AI Settings',
        path: '/super-admin/ai-settings',
        roles: ['super_admin'],
        badge: { text: 'AI', variant: 'new' },
      },
      {
        id: 'nc-bridge-keys',
        label: 'Bridge Keys',
        path: '/super-admin/bridge-keys',
        roles: ['super_admin'],
        badge: { text: 'API', variant: 'new' },
      },
    ],
  },
  // ─── Main Menu ────────────────────────────────────────────────
  {
    title: 'Menu',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/',
      },
      {
        id: 'master',
        label: 'Master Data',
        children: [
          // ── Parties ──
          { id: 'master-buyers', label: 'Buyers', path: '/master/buyers' },
          { id: 'master-buyer-codes', label: 'Buyer Codes', path: '/master/buyer-codes', badge: { text: 'New', variant: 'new' } },
          { id: 'master-suppliers', label: 'Suppliers', path: '/master/suppliers' },
          { id: 'master-buying-agents', label: 'Buying Agents', path: '/master/buying-agents' },
          { id: 'master-party-types', label: 'Party Types', path: '/master/party-types', badge: { text: 'New', variant: 'new' } },
          { id: 'master-parties', label: 'Parties', path: '/master/parties', badge: { text: 'New', variant: 'new' } },
          { id: 'master-party-groups', label: 'Party Groups', path: '/master/party-groups' },
          // ── Geography ──
          { id: 'master-countries', label: 'Countries', path: '/master/countries', badge: { text: 'New', variant: 'new' } },
          { id: 'master-cities', label: 'Cities', path: '/master/cities', badge: { text: 'New', variant: 'new' } },
          // ── Products / Styles ──
          { id: 'master-styles', label: 'Styles', path: '/master/styles' },
          { id: 'master-colors', label: 'Colors', path: '/master/colors' },
          { id: 'master-seasons', label: 'Seasons', path: '/master/seasons' },
          { id: 'master-sizes', label: 'Sizes', path: '/master/sizes', badge: { text: 'New', variant: 'new' } },
          { id: 'master-dias', label: 'DIA Master', path: '/master/dias', badge: { text: 'New', variant: 'new' } },
          { id: 'master-item-descriptions', label: 'Item Descriptions', path: '/master/item-descriptions', badge: { text: 'New', variant: 'new' } },
          { id: 'master-attributes', label: 'Attributes', path: '/master/attributes', badge: { text: 'New', variant: 'new' } },
          // ── Materials / Fabric / Yarn ──
          { id: 'master-materials', label: 'Materials', path: '/master/materials' },
          { id: 'master-yarn-types', label: 'Yarn Types', path: '/master/yarn-types', badge: { text: 'New', variant: 'new' } },
          { id: 'master-compositions', label: 'Compositions', path: '/master/compositions', badge: { text: 'New', variant: 'new' } },
          { id: 'master-yarns', label: 'Yarns', path: '/master/yarns', badge: { text: 'New', variant: 'new' } },
          { id: 'master-fabric-structures', label: 'Fabric Structures', path: '/master/fabric-structures', badge: { text: 'New', variant: 'new' } },
          { id: 'master-fabrics', label: 'Fabrics', path: '/master/fabrics', badge: { text: 'New', variant: 'new' } },
          { id: 'master-portions', label: 'Portions', path: '/master/portions', badge: { text: 'New', variant: 'new' } },
          { id: 'master-style-components', label: 'Style Components', path: '/master/style-components', badge: { text: 'New', variant: 'new' } },
          { id: 'master-knit-types', label: 'Knit Types', path: '/master/knit-types', badge: { text: 'New', variant: 'new' } },
          { id: 'master-wash-types', label: 'Wash Types', path: '/master/wash-types', badge: { text: 'New', variant: 'new' } },
          { id: 'master-counts', label: 'Counts', path: '/master/counts' },
          { id: 'master-thread-qualities', label: 'Thread Qualities', path: '/master/thread-qualities' },
          // ── Manufacturing ──
          { id: 'master-process-groups', label: 'Process Groups', path: '/master/process-groups', badge: { text: 'New', variant: 'new' } },
          { id: 'master-processes', label: 'Processes', path: '/master/processes', badge: { text: 'New', variant: 'new' } },
          { id: 'master-operations', label: 'Operations', path: '/master/operations' },
          { id: 'master-operators', label: 'Operators', path: '/master/operators' },
          { id: 'master-lines', label: 'Lines', path: '/master/lines' },
          { id: 'master-machine-types', label: 'Machine Types', path: '/master/machine-types' },
          { id: 'master-sections', label: 'Sections', path: '/master/sections' },
          { id: 'master-units', label: 'Units (UOM)', path: '/master/units' },
          // ── Warehouse ──
          { id: 'master-locations', label: 'Locations', path: '/master/locations', badge: { text: 'New', variant: 'new' } },
          { id: 'master-racks', label: 'Racks', path: '/master/racks', badge: { text: 'New', variant: 'new' } },
          { id: 'master-bins', label: 'Bins', path: '/master/bins', badge: { text: 'New', variant: 'new' } },
          // ── Org ──
          { id: 'master-companies', label: 'Companies', path: '/master/companies' },
          { id: 'master-branches', label: 'Branches', path: '/master/branches' },
          // ── Commercial / Export ──
          { id: 'master-ports', label: 'Ports', path: '/master/ports', badge: { text: 'New', variant: 'new' } },
          // ── Finance Masters ──
          { id: 'master-payment-terms', label: 'Payment Terms', path: '/master/payment-terms', badge: { text: 'New', variant: 'new' } },
          { id: 'master-tax-types', label: 'Tax Types', path: '/master/tax-types', badge: { text: 'New', variant: 'new' } },
          { id: 'master-tax-groups', label: 'Tax Groups', path: '/master/tax-groups', badge: { text: 'New', variant: 'new' } },
          { id: 'master-tax-deductions', label: 'Tax Deductions', path: '/master/tax-deductions', badge: { text: 'New', variant: 'new' } },
          { id: 'master-voucher-groups', label: 'Voucher Groups', path: '/master/voucher-groups', badge: { text: 'New', variant: 'new' } },
          { id: 'master-voucher-types', label: 'Voucher Types', path: '/master/voucher-types', badge: { text: 'New', variant: 'new' } },
          // ── System ──
          { id: 'master-document-types', label: 'Document Types', path: '/master/document-types', badge: { text: 'New', variant: 'new' } },
          { id: 'master-number-series', label: 'Number Series', path: '/master/number-series', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'merchandising',
        label: 'Merchandising',
        children: [
          { id: 'merch-orders', label: 'Orders', path: '/merchandising/orders' },
          { id: 'merch-samples', label: 'Samples', path: '/merchandising/samples' },
          { id: 'merch-sampling', label: 'Sampling Requests', path: '/merchandising/sampling', badge: { text: 'New', variant: 'new' } },
          { id: 'merch-tna', label: 'T&A Tracker', path: '/merchandising/tna' },
        ],
      },
      {
        id: 'costing',
        label: 'Costing',
        children: [
          { id: 'costing-sheets', label: 'Cost Sheets', path: '/costing/sheets' },
          { id: 'costing-bom', label: 'BOM', path: '/costing/bom' },
        ],
      },
      {
        id: 'mrp',
        label: 'MRP',
        badge: { text: 'New', variant: 'new' as const },
        children: [
          { id: 'mrp-runs', label: 'MRP Runs', path: '/mrp/runs' },
          { id: 'mrp-calculate', label: 'MRP Calculate', path: '/mrp/calculate' },
          { id: 'mrp-processes', label: 'Processes', path: '/mrp/processes' },
          { id: 'mrp-process-materials', label: 'Process Materials', path: '/mrp/process-materials' },
          { id: 'mrp-allowances', label: 'Allowances', path: '/mrp/allowances' },
          { id: 'mrp-template-boms', label: 'Template BOMs', path: '/mrp/template-boms' },
          { id: 'mrp-spl-bom', label: 'SPL Process BOM', path: '/mrp/spl-bom' },
          { id: 'mrp-fabric-designs', label: 'Fabric Designs', path: '/mrp/fabric-designs' },
          { id: 'mrp-barcodes', label: 'Barcodes', path: '/mrp/barcodes' },
          { id: 'mrp-config', label: 'MRP Config', path: '/mrp/config' },
          { id: 'mrp-incomplete-specs', label: 'Incomplete Specs', path: '/mrp/incomplete-specs' },
          { id: 'mrp-bom-approval', label: 'BOM Approval', path: '/mrp/bom-approval/0' },
        ],
      },
      {
        id: 'planning',
        label: 'Planning',
        children: [
          { id: 'plan-tna-templates', label: 'TNA Templates', path: '/planning/tna-templates' },
          { id: 'plan-tna', label: 'TNA Calendar', path: '/planning/tna' },
          { id: 'plan-targets', label: 'Production Targets', path: '/planning/targets' },
          { id: 'plan-production-plan', label: 'Production Plan', path: '/planning/production-plan' },
          { id: 'plan-board', label: 'Planning Board', path: '/planning/board', badge: { text: 'APS', variant: 'new' } },
          { id: 'plan-dashboard', label: 'Production Dashboard', path: '/planning/dashboard', badge: { text: 'New', variant: 'new' } },
          { id: 'plan-capacity', label: 'Capacity', path: '/planning/capacity' },
        ],
      },
      {
        id: 'line-planning',
        label: 'Line Planning',
        badge: { text: 'New', variant: 'new' as const },
        children: [
          { id: 'lp-lines', label: 'Lines', path: '/line-planning/lines' },
          { id: 'lp-layouts', label: 'Line Layouts', path: '/line-planning/layouts' },
          { id: 'lp-balancing', label: 'Line Balancing', path: '/line-planning/balancing' },
          { id: 'lp-skill-matrix', label: 'Skill Matrix', path: '/line-planning/skill-matrix' },
          { id: 'lp-simulation', label: 'Simulation', path: '/line-planning/simulation', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'ie-floor',
        label: 'IE Floor',
        badge: { text: 'New', variant: 'new' as const },
        children: [
          { id: 'ie-realtime', label: 'Realtime Dashboard', path: '/ie-floor/realtime' },
          { id: 'ie-supervisor', label: 'Supervisor Panel', path: '/ie-floor/supervisor' },
          { id: 'ie-breakdowns', label: 'Breakdowns', path: '/ie-floor/breakdowns' },
          { id: 'ie-changeovers', label: 'Changeovers', path: '/ie-floor/changeovers' },
          { id: 'ie-alerts', label: 'Alerts', path: '/ie-floor/alerts' },
          { id: 'ie-deployment', label: 'Deployment', path: '/ie-floor/deployment' },
          { id: 'ie-multi-line', label: 'Multi-Line Dashboard', path: '/ie-floor/multi-line' },
        ],
      },
      {
        id: 'ie-tools',
        label: 'IE Tools',
        badge: { text: 'New', variant: 'new' as const },
        children: [
          { id: 'ie-gsd', label: 'GSD Templates', path: '/ie-tools/gsd' },
          { id: 'ie-machine-specs', label: 'Machine Specs', path: '/ie-tools/machine-specs' },
          { id: 'ie-ob-versions', label: 'OB Versions', path: '/ie-tools/ob-versions' },
          { id: 'ie-garment-analyser', label: 'Garment Analyser', path: '/ie-tools/garment-analyser' },
          { id: 'ie-feature-flags', label: 'Feature Flags', path: '/ie-tools/feature-flags' },
        ],
      },
      {
        id: 'ie-analytics',
        label: 'IE Analytics',
        badge: { text: 'New', variant: 'new' as const },
        children: [
          { id: 'ie-analytics-main', label: 'Production Analytics', path: '/ie-analytics/analytics' },
          { id: 'ie-operator-analytics', label: 'Operator Analytics', path: '/ie-analytics/operator' },
          { id: 'ie-incentive-calc', label: 'Incentive Calculator', path: '/ie-analytics/incentive-calc' },
          { id: 'ie-incentive-rules', label: 'Incentive Rules', path: '/ie-analytics/incentive-rules' },
        ],
      },
      {
        id: 'procurement',
        label: 'Procurement',
        children: [
          { id: 'proc-rfq', label: 'RFQ', path: '/procurement/rfq', badge: { text: 'New', variant: 'new' } },
          { id: 'proc-po', label: 'Purchase Orders', path: '/procurement/po' },
          { id: 'proc-grn', label: 'GRN', path: '/procurement/grn' },
          { id: 'proc-subcontract', label: 'Subcontract', path: '/procurement/subcontract', badge: { text: 'New', variant: 'new' } },
        ],
      },
    ],
  },
  // ─── Others ───────────────────────────────────────────────────
  {
    title: 'Others',
    items: [
      {
        id: 'inventory',
        label: 'Inventory',
        children: [
          { id: 'inv-stock', label: 'Stock', path: '/inventory/stock' },
          { id: 'inv-issue', label: 'Issue', path: '/inventory/issue' },
          { id: 'inv-return', label: 'Return', path: '/inventory/return' },
          { id: 'inv-machines', label: 'Machines', path: '/inventory/machines', badge: { text: 'New', variant: 'new' } },
          { id: 'inv-rolls', label: 'Rolls', path: '/inventory/rolls', badge: { text: 'New', variant: 'new' } },
          { id: 'inv-stock-counts', label: 'Stock Counts', path: '/inventory/stock-counts', badge: { text: 'New', variant: 'new' } },
          { id: 'inv-adjustments', label: 'Adjustments', path: '/inventory/adjustments', badge: { text: 'New', variant: 'new' } },
          { id: 'inv-transfers', label: 'Transfers', path: '/inventory/transfers', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'production',
        label: 'Production',
        children: [
          { id: 'prod-cutting', label: 'Cutting', path: '/production/cutting' },
          { id: 'prod-sewing', label: 'Sewing', path: '/production/sewing' },
          { id: 'prod-finishing', label: 'Finishing', path: '/production/finishing' },
          { id: 'prod-bulletins', label: 'Op. Bulletins', path: '/production/bulletins', badge: { text: 'New', variant: 'new' } },
          { id: 'prod-orders', label: 'Prod. Orders', path: '/production/orders', badge: { text: 'New', variant: 'new' } },
          { id: 'prod-hourly', label: 'Hourly Tracking', path: '/production/hourly', badge: { text: 'New', variant: 'new' } },
          { id: 'prod-bundles', label: 'Bundles', path: '/production/bundles', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'quality',
        label: 'Quality',
        children: [
          { id: 'qa-aql', label: 'AQL Inspection', path: '/quality/aql' },
          { id: 'qa-fabric', label: 'Fabric Inspection', path: '/quality/fabric' },
          { id: 'qa-lab', label: 'Lab Tests', path: '/quality/lab', badge: { text: 'New', variant: 'new' } },
          { id: 'qa-claims', label: 'Buyer Claims', path: '/quality/claims' },
          { id: 'qa-endline', label: 'Endline QC', path: '/quality/endline', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'packing-export',
        label: 'Packing & Export',
        children: [
          { id: 'pack-lists', label: 'Packing Lists', path: '/packing/lists' },
          { id: 'pack-scan', label: 'Scan & Pack', path: '/packing/scan', badge: { text: 'New', variant: 'new' } },
          { id: 'pack-containers', label: 'Containers', path: '/packing/containers' },
          { id: 'exp-documents', label: 'Export Docs', path: '/export/documents' },
          { id: 'exp-shipping-bills', label: 'Shipping Bills', path: '/export/shipping-bills', badge: { text: 'New', variant: 'new' } },
          { id: 'exp-bol', label: 'Bill of Lading', path: '/export/bill-of-lading', badge: { text: 'New', variant: 'new' } },
          { id: 'exp-coo', label: 'COO', path: '/export/coo', badge: { text: 'New', variant: 'new' } },
          { id: 'exp-lc', label: 'LC Management', path: '/export/lc', badge: { text: 'New', variant: 'new' } },
          { id: 'exp-incentives', label: 'Export Incentives', path: '/export/incentives', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'finance',
        label: 'Finance',
        children: [
          { id: 'fin-invoices', label: 'Invoices', path: '/finance/invoices' },
          { id: 'fin-payments', label: 'Payments', path: '/finance/payments' },
          { id: 'fin-coa', label: 'Chart of Accounts', path: '/finance/chart-of-accounts', badge: { text: 'New', variant: 'new' } },
          { id: 'fin-fixed-assets', label: 'Fixed Assets', path: '/finance/fixed-assets', badge: { text: 'New', variant: 'new' } },
          { id: 'fin-gst', label: 'GST Returns', path: '/finance/gst-returns', badge: { text: 'New', variant: 'new' } },
          { id: 'fin-einvoice', label: 'E-Invoice / E-Way', path: '/finance/e-invoice', badge: { text: 'New', variant: 'new' } },
          { id: 'fin-bank-recon', label: 'Bank Recon', path: '/finance/bank-recon', badge: { text: 'New', variant: 'new' } },
          { id: 'fin-reports', label: 'Financial Reports', path: '/finance/reports', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'hrm',
        label: 'HRM',
        children: [
          { id: 'hrm-departments', label: 'Departments', path: '/hrm/departments' },
          { id: 'hrm-designations', label: 'Designations', path: '/hrm/designations' },
          { id: 'hrm-shifts', label: 'Shifts', path: '/hrm/shifts', badge: { text: 'New', variant: 'new' } },
          { id: 'hrm-employees', label: 'Employees', path: '/hrm/employees' },
          { id: 'hrm-attendance', label: 'Attendance', path: '/hrm/attendance' },
          { id: 'hrm-leave-types', label: 'Leave Types', path: '/hrm/leave-types' },
          { id: 'hrm-leaves', label: 'Leave Applications', path: '/hrm/leaves' },
          { id: 'hrm-leave-balances', label: 'Leave Balances', path: '/hrm/leave-balances', badge: { text: 'New', variant: 'new' } },
          { id: 'hrm-payroll', label: 'Payroll', path: '/hrm/payroll' },
          { id: 'hrm-loans', label: 'Loans', path: '/hrm/loans' },
          { id: 'hrm-fnf', label: 'FnF Settlement', path: '/hrm/fnf', badge: { text: 'New', variant: 'new' } },
          { id: 'hrm-statutory', label: 'Statutory Exports', path: '/hrm/statutory-exports', badge: { text: 'New', variant: 'new' } },
          { id: 'hrm-skill-matrix', label: 'Skill Matrix', path: '/hrm/skill-matrix', badge: { text: 'New', variant: 'new' } },
          { id: 'hrm-holidays', label: 'Holidays', path: '/hrm/holidays', badge: { text: 'New', variant: 'new' } },
          { id: 'hrm-overtime', label: 'Overtime', path: '/hrm/overtime', badge: { text: 'New', variant: 'new' } },
          { id: 'hrm-piece-rate', label: 'Piece Rate', path: '/hrm/piece-rate', badge: { text: 'New', variant: 'new' } },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        children: [
          { id: 'rpt-dashboard', label: 'MIS Dashboard', path: '/reports/dashboard' },
          { id: 'rpt-orders', label: 'Order Status', path: '/reports/orders' },
          { id: 'rpt-prod-eff', label: 'Production Efficiency', path: '/reports/production-efficiency', badge: { text: 'New', variant: 'new' } },
          { id: 'rpt-tna-delays', label: 'T&A Delays', path: '/reports/tna-delays', badge: { text: 'New', variant: 'new' } },
          { id: 'rpt-inv-aging', label: 'Inventory Aging', path: '/reports/inventory-aging', badge: { text: 'New', variant: 'new' } },
          { id: 'rpt-supplier', label: 'Supplier Scorecard', path: '/reports/supplier-scorecard', badge: { text: 'New', variant: 'new' } },
          { id: 'rpt-buyer', label: 'Buyer Analysis', path: '/reports/buyer-analysis', badge: { text: 'New', variant: 'new' } },
          { id: 'rpt-style-pnl', label: 'Style P&L', path: '/reports/style-pnl', badge: { text: 'New', variant: 'new' } },
          { id: 'rpt-builder', label: 'Custom Reports', path: '/reports/builder', badge: { text: 'AI', variant: 'new' } },
        ],
      },
      {
        id: 'maintenance',
        label: 'Maintenance',
        badge: { text: 'New', variant: 'new' },
        children: [
          { id: 'maint-dashboard', label: 'Dashboard', path: '/maintenance/dashboard' },
          { id: 'maint-tickets', label: 'Work Orders', path: '/maintenance/tickets' },
          { id: 'maint-pm', label: 'PM Schedules', path: '/maintenance/pm-schedules' },
          { id: 'maint-spare-parts', label: 'Spare Parts', path: '/maintenance/spare-parts' },
          { id: 'maint-checklists', label: 'Checklists', path: '/maintenance/checklists' },
          { id: 'maint-lookups', label: 'Lookups', path: '/maintenance/lookups' },
        ],
      },
      {
        id: 'system-admin',
        label: 'System Admin',
        children: [
          { id: 'admin-settings', label: 'Settings', path: '/settings' },
          { id: 'admin-branches', label: 'Branch Management', path: '/settings/branches', badge: { text: 'New', variant: 'new' } },
          { id: 'admin-approvals', label: 'Approval Workflows', path: '/settings/approvals', badge: { text: 'New', variant: 'new' } },
          { id: 'admin-notifications', label: 'Notifications', path: '/settings/notifications', badge: { text: 'New', variant: 'new' } },
          { id: 'admin-users', label: 'User Management', path: '/settings/users', badge: { text: 'New', variant: 'new' } },
          { id: 'admin-audit', label: 'Audit Logs', path: '/settings/audit-logs', badge: { text: 'New', variant: 'new' } },
          { id: 'admin-roles', label: 'Role Builder', path: '/settings/roles', badge: { text: 'New', variant: 'new' } },
          { id: 'admin-excel', label: 'Excel Import', path: '/settings/excel-import', badge: { text: 'New', variant: 'new' } },
          { id: 'admin-email-templates', label: 'Email Templates', path: '/settings/email-templates', badge: { text: 'New', variant: 'new' } },
        ],
      },
    ],
  },
];
