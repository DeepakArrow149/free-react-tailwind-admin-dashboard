/**
 * ERP Dashboard Routes (Protected)
 * All module routes rendered inside DashboardLayout.
 */
import { Route } from 'react-router';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Home from '@/pages/Dashboard/Home';
import { PageLoader } from './PageLoader';
import {
  // Master
  BuyerList, BuyerForm, SupplierList, SupplierForm,
  MaterialList, MaterialForm, StyleList, StyleForm,
  ColorList, SeasonList, CompanyList, BranchList,
  BuyingAgentList, PartyGroupList, SectionList,
  ThreadQualityList, CountList, MachineTypeListPage,
  UnitList, LineMasterPage, OperationMasterPage, OperatorListPage,
  // Merchandising
  OrderList, OrderForm, MerchandisingSamples, SamplingPage, MerchandisingTNA,
  // Costing
  BomList, BomForm, CostingList, CostingForm, CostingDetail,
  // Master Modules Pack
  LocationPage, RackPage, BinPage, SizePage, DiaPage, ItemDescriptionPage, BuyerCodePage,
  PaymentTermPage, TaxTypePage, TaxGroupPage, TaxDeductionPage,
  VoucherGroupPage, VoucherTypePage, PortPage, DocumentTypePage, NumberSeriesPage,
  CountryPage, CityPage, PartyTypePage, PartyPage,
  YarnTypePage, CompositionPage, YarnPage,
  FabricStructurePage, FabricPage, AttributePage,
  ProcessGroupPage, ProcessPage,
  PortionPage, StyleComponentPage, KnitTypePage, WashTypePage,
  // Planning
  TnaTemplateList, TnaTemplateForm, TnaCalendar,
  ProductionTargets, CapacityPlanning, ProductionPlanPage,
  PlanningBoardPage, ProductionDashboard, LineDetailPage,
  LineLayoutPage, LineBalancingPage, LineListPage, OperatorSkillMatrixPage, SimulationPage,
  // Procurement
  PurchaseOrderList, PurchaseOrderForm, GrnList, GrnForm, RfqPage, SubcontractPage,
  // Inventory
  StockSummary, MaterialIssuePage, MaterialReturnPage, MachinePage,
  RollsPage, StockCountPage, StockAdjustmentPage, StockTransferPage,
  // Production
  CuttingPage, SewingFinishingPage, FgTransferPage,
  OperationBulletinPage, ProductionOrderPage, HourlyProductionPage, BundlePage,
  // Quality
  AqlInspectionPage, FabricInspectionPage, BuyerClaimsPage, EndlineQcPage, LabTestPage,
  // Packing & Export
  PackingListPage, ContainerStuffingPage, ScanPackPage,
  ExportDocumentsPage, ShippingBillPage, BillOfLadingPage,
  CooPage, LcManagementPage, ExportIncentivesPage,
  // Finance
  InvoicesPage, PaymentsPage, ChartOfAccountsPage, FixedAssetsPage,
  GstReturnsPage, BankReconciliationPage, FinanceReportsPage, EInvoicePage,
  // HRM
  DepartmentsPage, DesignationsPage, ShiftsPage, EmployeesPage,
  AttendancePage, LeaveTypesPage, LeaveApplicationsPage, LeaveBalancePage,
  PayrollPage, LoansPage, FnFPage, StatutoryExportsPage,
  HolidaysPage, OvertimePage, PieceRatePage, SkillMatrixPage,
  // Reports
  MISDashboard, OrderStatusReport, ProductionEfficiencyReport,
  TnaDelayReport, InventoryAgingReport, SupplierScorecardReport,
  BuyerAnalysisReport, StylePnlReport,
  ReportListPage, ReportBuilderPage,
  // Settings
  Settings, ApprovalWorkflowPage, NotificationCenterPage,
  RoleBuilderPage, ExcelImportPage, UserManagementPage, AuditLogPage,
  BranchManagementPage, EmailTemplateManagementPage,
  // MRP
  MrpRunList, MrpCalculate, MrpRunDetail,
  ProcessList, ProcessForm, ProcessMaterialList,
  AllowanceList, AllowanceForm,
  TemplateBomList, TemplateBomForm,
  SplBomList, SplBomForm,
  FabricDesignList, FabricDesignForm,
  BarcodeGeneration, MrpConfigPage,
  ProcessSelectionPage, SpecificationPage, IncompleteSpecsList, BomApprovalPage,
  // IE Floor
  RealtimeDashboardPage, SupervisorPanelPage, BreakdownManagerPage,
  ChangeoverTrackerPage, AlertsDashboardPage, DeploymentPage, MultiLineDashboardPage,
  // IE Tools
  GsdTemplatesPage, MachineSpecsPage, ObVersionsPage, GarmentAnalyserPage, FeatureFlagsPage,
  // IE Analytics
  IeAnalyticsPage, OperatorAnalyticsPage, IncentiveCalcPage, IncentiveRulesPage,
  // Maintenance / CMMS
  MaintenanceDashboardPage, MaintenanceTicketsPage, PmSchedulesPage,
  SparePartsPage, MaintenanceLookupsPage, ChecklistsPage,
  // Dynamic Forms
  DashboardFormPage,
} from './lazyImports';

export function DashboardRoutes() {
  return (
    <>
      <Route index path="/" element={<Home />} />

      {/* ── Master Data ── */}
      <Route path="/master/buyers" element={<BuyerList />} />
      <Route path="/master/buyers/new" element={<BuyerForm />} />
      <Route path="/master/buyers/:id" element={<BuyerForm />} />
      <Route path="/master/suppliers" element={<SupplierList />} />
      <Route path="/master/suppliers/new" element={<SupplierForm />} />
      <Route path="/master/suppliers/:id" element={<SupplierForm />} />
      <Route path="/master/materials" element={<MaterialList />} />
      <Route path="/master/materials/new" element={<MaterialForm />} />
      <Route path="/master/materials/:id" element={<MaterialForm />} />
      <Route path="/master/styles" element={<StyleList />} />
      <Route path="/master/styles/new" element={<StyleForm />} />
      <Route path="/master/styles/:id" element={<StyleForm />} />
      <Route path="/master/colors" element={<ColorList />} />
      <Route path="/master/seasons" element={<SeasonList />} />
      <Route path="/master/companies" element={<CompanyList />} />
      <Route path="/master/branches" element={<BranchList />} />
      <Route path="/master/buying-agents" element={<BuyingAgentList />} />
      <Route path="/master/party-groups" element={<PartyGroupList />} />
      <Route path="/master/sections" element={<SectionList />} />
      <Route path="/master/thread-qualities" element={<ThreadQualityList />} />
      <Route path="/master/counts" element={<CountList />} />
      <Route path="/master/machine-types" element={<MachineTypeListPage />} />
      <Route path="/master/units" element={<UnitList />} />
      <Route path="/master/lines" element={<LineMasterPage />} />
      <Route path="/master/operations" element={<OperationMasterPage />} />
      <Route path="/master/operators" element={<OperatorListPage />} />

      {/* ── Merchandising ── */}
      <Route path="/merchandising/orders" element={<OrderList />} />
      <Route path="/merchandising/orders/new" element={<OrderForm />} />
      <Route path="/merchandising/orders/:id" element={<OrderForm />} />
      <Route path="/merchandising/samples" element={<MerchandisingSamples />} />
      <Route path="/merchandising/sampling" element={<SamplingPage />} />
      <Route path="/merchandising/tna" element={<MerchandisingTNA />} />

      {/* ── Costing ── */}
      <Route path="/costing/sheets" element={<CostingList />} />
      <Route path="/costing/sheets/new" element={<CostingForm />} />
      <Route path="/costing/sheets/:id/edit" element={<CostingForm />} />
      <Route path="/costing/sheets/:id/detail" element={<CostingDetail />} />
      <Route path="/costing/sheets/:id" element={<CostingDetail />} />
      <Route path="/costing/bom" element={<BomList />} />
      <Route path="/costing/bom/new" element={<BomForm />} />
      <Route path="/costing/bom/:id" element={<BomForm />} />

      {/* ── Master Modules Pack (Phase 1 + 2) ── */}
      <Route path="/master/locations" element={<LocationPage />} />
      <Route path="/master/racks" element={<RackPage />} />
      <Route path="/master/bins" element={<BinPage />} />
      <Route path="/master/sizes" element={<SizePage />} />
      <Route path="/master/dias" element={<DiaPage />} />
      <Route path="/master/item-descriptions" element={<ItemDescriptionPage />} />
      <Route path="/master/buyer-codes" element={<BuyerCodePage />} />
      <Route path="/master/payment-terms" element={<PaymentTermPage />} />
      <Route path="/master/tax-types" element={<TaxTypePage />} />
      <Route path="/master/tax-groups" element={<TaxGroupPage />} />
      <Route path="/master/tax-deductions" element={<TaxDeductionPage />} />
      <Route path="/master/voucher-groups" element={<VoucherGroupPage />} />
      <Route path="/master/voucher-types" element={<VoucherTypePage />} />
      <Route path="/master/ports" element={<PortPage />} />
      <Route path="/master/document-types" element={<DocumentTypePage />} />
      <Route path="/master/number-series" element={<NumberSeriesPage />} />
      <Route path="/master/countries" element={<CountryPage />} />
      <Route path="/master/cities" element={<CityPage />} />
      <Route path="/master/party-types" element={<PartyTypePage />} />
      <Route path="/master/parties" element={<PartyPage />} />
      <Route path="/master/yarn-types" element={<YarnTypePage />} />
      <Route path="/master/compositions" element={<CompositionPage />} />
      <Route path="/master/yarns" element={<YarnPage />} />
      <Route path="/master/fabric-structures" element={<FabricStructurePage />} />
      <Route path="/master/fabrics" element={<FabricPage />} />
      <Route path="/master/attributes" element={<AttributePage />} />
      <Route path="/master/process-groups" element={<ProcessGroupPage />} />
      <Route path="/master/processes" element={<ProcessPage />} />
      <Route path="/master/portions" element={<PortionPage />} />
      <Route path="/master/style-components" element={<StyleComponentPage />} />
      <Route path="/master/knit-types" element={<KnitTypePage />} />
      <Route path="/master/wash-types" element={<WashTypePage />} />

      {/* ── Planning ── */}
      <Route path="/planning/tna-templates" element={<TnaTemplateList />} />
      <Route path="/planning/tna-templates/new" element={<TnaTemplateForm />} />
      <Route path="/planning/tna-templates/:id" element={<TnaTemplateForm />} />
      <Route path="/planning/tna" element={<TnaCalendar />} />
      <Route path="/planning/targets" element={<ProductionTargets />} />
      <Route path="/planning/capacity" element={<CapacityPlanning />} />
      <Route path="/planning/production-plan" element={<ProductionPlanPage />} />
      <Route path="/planning/board" element={<PlanningBoardPage />} />
      <Route path="/planning/dashboard" element={<ProductionDashboard />} />
      <Route path="/planning/line/:lineId" element={<LineDetailPage />} />

      {/* ── Line Planning ── */}
      <Route path="/line-planning/lines" element={<LineListPage />} />
      <Route path="/line-planning/layouts" element={<LineLayoutPage />} />
      <Route path="/line-planning/balancing" element={<LineBalancingPage />} />
      <Route path="/line-planning/skill-matrix" element={<OperatorSkillMatrixPage />} />
      <Route path="/line-planning/simulation" element={<SimulationPage />} />

      {/* ── Procurement ── */}
      <Route path="/procurement/rfq" element={<RfqPage />} />

      {/* ── MRP ── */}
      <Route path="/mrp/runs" element={<MrpRunList />} />
      <Route path="/mrp/calculate" element={<MrpCalculate />} />
      <Route path="/mrp/runs/:id" element={<MrpRunDetail />} />
      <Route path="/mrp/processes" element={<ProcessList />} />
      <Route path="/mrp/processes/new" element={<ProcessForm />} />
      <Route path="/mrp/processes/:id" element={<ProcessForm />} />
      <Route path="/mrp/process-materials" element={<ProcessMaterialList />} />
      <Route path="/mrp/allowances" element={<AllowanceList />} />
      <Route path="/mrp/allowances/new" element={<AllowanceForm />} />
      <Route path="/mrp/allowances/:id" element={<AllowanceForm />} />
      <Route path="/mrp/template-boms" element={<TemplateBomList />} />
      <Route path="/mrp/template-boms/new" element={<TemplateBomForm />} />
      <Route path="/mrp/template-boms/:id" element={<TemplateBomForm />} />
      <Route path="/mrp/spl-bom" element={<SplBomList />} />
      <Route path="/mrp/spl-bom/new" element={<SplBomForm />} />
      <Route path="/mrp/spl-bom/:id" element={<SplBomForm />} />
      <Route path="/mrp/fabric-designs" element={<FabricDesignList />} />
      <Route path="/mrp/fabric-designs/new" element={<FabricDesignForm />} />
      <Route path="/mrp/fabric-designs/:id" element={<FabricDesignForm />} />
      <Route path="/mrp/barcodes" element={<BarcodeGeneration />} />
      <Route path="/mrp/config" element={<MrpConfigPage />} />
      <Route path="/mrp/process-selection/:orderId" element={<ProcessSelectionPage />} />
      <Route path="/mrp/specifications/:orderId" element={<SpecificationPage />} />
      <Route path="/mrp/incomplete-specs" element={<IncompleteSpecsList />} />
      <Route path="/mrp/bom-approval/:bomId" element={<BomApprovalPage />} />
      <Route path="/procurement/po" element={<PurchaseOrderList />} />
      <Route path="/procurement/po/new" element={<PurchaseOrderForm />} />
      <Route path="/procurement/po/:id" element={<PurchaseOrderForm />} />
      <Route path="/procurement/grn" element={<GrnList />} />
      <Route path="/procurement/grn/new" element={<GrnForm />} />
      <Route path="/procurement/subcontract" element={<SubcontractPage />} />

      {/* ── Inventory ── */}
      <Route path="/inventory/stock" element={<StockSummary />} />
      <Route path="/inventory/issue" element={<MaterialIssuePage />} />
      <Route path="/inventory/return" element={<MaterialReturnPage />} />
      <Route path="/inventory/machines" element={<MachinePage />} />
      <Route path="/inventory/rolls" element={<RollsPage />} />
      <Route path="/inventory/stock-counts" element={<StockCountPage />} />
      <Route path="/inventory/adjustments" element={<StockAdjustmentPage />} />
      <Route path="/inventory/transfers" element={<StockTransferPage />} />

      {/* ── Production ── */}
      <Route path="/production/cutting" element={<CuttingPage />} />
      <Route path="/production/sewing" element={<SewingFinishingPage />} />
      <Route path="/production/finishing" element={<FgTransferPage />} />
      <Route path="/production/bulletins" element={<OperationBulletinPage />} />
      <Route path="/production/orders" element={<ProductionOrderPage />} />
      <Route path="/production/hourly" element={<HourlyProductionPage />} />
      <Route path="/production/bundles" element={<BundlePage />} />

      {/* ── Quality ── */}
      <Route path="/quality/aql" element={<AqlInspectionPage />} />
      <Route path="/quality/fabric" element={<FabricInspectionPage />} />
      <Route path="/quality/lab" element={<LabTestPage />} />
      <Route path="/quality/claims" element={<BuyerClaimsPage />} />
      <Route path="/quality/endline" element={<EndlineQcPage />} />

      {/* ── Packing & Export ── */}
      <Route path="/packing/lists" element={<PackingListPage />} />
      <Route path="/packing/containers" element={<ContainerStuffingPage />} />
      <Route path="/packing/scan" element={<ScanPackPage />} />
      <Route path="/export/documents" element={<ExportDocumentsPage />} />
      <Route path="/export/shipping-bills" element={<ShippingBillPage />} />
      <Route path="/export/bill-of-lading" element={<BillOfLadingPage />} />
      <Route path="/export/coo" element={<CooPage />} />
      <Route path="/export/lc" element={<LcManagementPage />} />
      <Route path="/export/incentives" element={<ExportIncentivesPage />} />

      {/* ── Finance ── */}
      <Route path="/finance/invoices" element={<InvoicesPage />} />
      <Route path="/finance/payments" element={<PaymentsPage />} />
      <Route path="/finance/chart-of-accounts" element={<ChartOfAccountsPage />} />
      <Route path="/finance/fixed-assets" element={<FixedAssetsPage />} />
      <Route path="/finance/gst-returns" element={<GstReturnsPage />} />
      <Route path="/finance/bank-recon" element={<BankReconciliationPage />} />
      <Route path="/finance/reports" element={<FinanceReportsPage />} />
      <Route path="/finance/e-invoice" element={<EInvoicePage />} />

      {/* ── HRM ── */}
      <Route path="/hrm/departments" element={<DepartmentsPage />} />
      <Route path="/hrm/designations" element={<DesignationsPage />} />
      <Route path="/hrm/shifts" element={<ShiftsPage />} />
      <Route path="/hrm/employees" element={<EmployeesPage />} />
      <Route path="/hrm/attendance" element={<AttendancePage />} />
      <Route path="/hrm/leave-types" element={<LeaveTypesPage />} />
      <Route path="/hrm/leaves" element={<LeaveApplicationsPage />} />
      <Route path="/hrm/leave-balances" element={<LeaveBalancePage />} />
      <Route path="/hrm/payroll" element={<PayrollPage />} />
      <Route path="/hrm/loans" element={<LoansPage />} />
      <Route path="/hrm/fnf" element={<FnFPage />} />
      <Route path="/hrm/statutory-exports" element={<StatutoryExportsPage />} />
      <Route path="/hrm/holidays" element={<HolidaysPage />} />
      <Route path="/hrm/overtime" element={<OvertimePage />} />
      <Route path="/hrm/piece-rate" element={<PieceRatePage />} />
      <Route path="/hrm/skill-matrix" element={<SkillMatrixPage />} />

      {/* ── Reports ── */}
      <Route path="/reports/dashboard" element={<MISDashboard />} />
      <Route path="/reports/orders" element={<OrderStatusReport />} />
      <Route path="/reports/production-efficiency" element={<ProductionEfficiencyReport />} />
      <Route path="/reports/tna-delays" element={<TnaDelayReport />} />
      <Route path="/reports/inventory-aging" element={<InventoryAgingReport />} />
      <Route path="/reports/supplier-scorecard" element={<SupplierScorecardReport />} />
      <Route path="/reports/buyer-analysis" element={<BuyerAnalysisReport />} />
      <Route path="/reports/style-pnl" element={<StylePnlReport />} />

      {/* ── Custom Report Builder ── */}
      <Route path="/reports/builder" element={<ReportListPage />} />
      <Route path="/reports/builder/:id" element={<ReportBuilderPage />} />

      {/* ── IE Floor ── */}
      <Route path="/ie-floor/realtime" element={<RealtimeDashboardPage />} />
      <Route path="/ie-floor/supervisor" element={<SupervisorPanelPage />} />
      <Route path="/ie-floor/breakdowns" element={<BreakdownManagerPage />} />
      <Route path="/ie-floor/changeovers" element={<ChangeoverTrackerPage />} />
      <Route path="/ie-floor/alerts" element={<AlertsDashboardPage />} />
      <Route path="/ie-floor/deployment" element={<DeploymentPage />} />
      <Route path="/ie-floor/multi-line" element={<MultiLineDashboardPage />} />

      {/* ── IE Tools ── */}
      <Route path="/ie-tools/gsd" element={<GsdTemplatesPage />} />
      <Route path="/ie-tools/machine-specs" element={<MachineSpecsPage />} />
      <Route path="/ie-tools/ob-versions" element={<ObVersionsPage />} />
      <Route path="/ie-tools/garment-analyser" element={<GarmentAnalyserPage />} />
      <Route path="/ie-tools/feature-flags" element={<FeatureFlagsPage />} />

      {/* ── IE Analytics ── */}
      <Route path="/ie-analytics/analytics" element={<IeAnalyticsPage />} />
      <Route path="/ie-analytics/operator" element={<OperatorAnalyticsPage />} />
      <Route path="/ie-analytics/incentive-calc" element={<IncentiveCalcPage />} />
      <Route path="/ie-analytics/incentive-rules" element={<IncentiveRulesPage />} />

      {/* ── Maintenance / CMMS ── */}
      <Route path="/maintenance/dashboard" element={<MaintenanceDashboardPage />} />
      <Route path="/maintenance/tickets" element={<MaintenanceTicketsPage />} />
      <Route path="/maintenance/pm-schedules" element={<PmSchedulesPage />} />
      <Route path="/maintenance/spare-parts" element={<SparePartsPage />} />
      <Route path="/maintenance/lookups" element={<MaintenanceLookupsPage />} />
      <Route path="/maintenance/checklists" element={<ChecklistsPage />} />

      {/* ── Settings / Admin (Admin role required) ── */}
      <Route path="/settings" element={<Settings />} />
      <Route element={<ProtectedRoute requiredRoles={["Admin"]} />}>
        <Route path="/settings/approvals" element={<ApprovalWorkflowPage />} />
        <Route path="/settings/notifications" element={<NotificationCenterPage />} />
        <Route path="/settings/roles" element={<RoleBuilderPage />} />
        <Route path="/settings/excel-import" element={<ExcelImportPage />} />
        <Route path="/settings/users" element={<UserManagementPage />} />
        <Route path="/settings/audit-logs" element={<AuditLogPage />} />
        <Route path="/settings/branches" element={<BranchManagementPage />} />
        <Route path="/settings/email-templates" element={<EmailTemplateManagementPage />} />
      </Route>

      {/* ── Dynamic Forms (Module Bridge) ── */}
      <Route path="/app/forms/:slug" element={<Suspense fallback={<PageLoader />}><DashboardFormPage /></Suspense>} />
    </>
  );
}
