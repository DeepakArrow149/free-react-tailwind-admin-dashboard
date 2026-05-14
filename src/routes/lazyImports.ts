/**
 * Lazy-loaded page imports
 * Centralized lazy() declarations for all pages — keeps route files clean.
 */
import { lazy } from 'react';

// ── Super Admin ──
export const SuperAdminDashboard = lazy(() => import('@/modules/super-admin/pages/SuperAdminDashboard'));
export const CompanyListPage = lazy(() => import('@/modules/super-admin/pages/CompanyListPage'));
export const CreateCompanyPage = lazy(() => import('@/modules/super-admin/pages/CreateCompanyPage'));
export const CompanyDetailPage = lazy(() => import('@/modules/super-admin/pages/CompanyDetailPage'));
export const FormBuilderPage = lazy(() => import('@/modules/super-admin/form-builder/FormBuilderPage'));
export const AiSettingsPage = lazy(() => import('@/modules/super-admin/pages/AiSettingsPage'));
export const BridgeKeysPage = lazy(() => import('@/modules/super-admin/pages/BridgeKeysPage'));
export const DashboardFormPage = lazy(() => import('@/pages/DashboardFormPage'));
export const TemplateLibraryPage = lazy(() => import('@/pages/TemplateLibraryPage'));

// ── Master Data ──
export const MachineTypeListPage = lazy(() => import('@/pages/Master/MachineType/MachineTypeListPage'));
export const BuyerList = lazy(() => import('@/pages/Master/Buyer/BuyerList'));
export const BuyerForm = lazy(() => import('@/pages/Master/Buyer/BuyerForm'));
export const SupplierList = lazy(() => import('@/pages/Master/Supplier/SupplierList'));
export const SupplierForm = lazy(() => import('@/pages/Master/Supplier/SupplierForm'));
export const MaterialList = lazy(() => import('@/pages/Master/Material/MaterialList'));
export const MaterialForm = lazy(() => import('@/pages/Master/Material/MaterialForm'));
export const StyleList = lazy(() => import('@/pages/Master/Style/StyleList'));
export const StyleForm = lazy(() => import('@/pages/Master/Style/StyleForm'));
export const ColorList = lazy(() => import('@/pages/Master/Color/ColorList'));
export const SeasonList = lazy(() => import('@/pages/Master/Season/SeasonList'));
export const CompanyList = lazy(() => import('@/pages/Master/Company/CompanyList'));
export const BranchList = lazy(() => import('@/pages/Master/Branch/BranchList'));
export const BuyingAgentList = lazy(() => import('@/pages/Master/BuyingAgent/BuyingAgentList'));
export const PartyGroupList = lazy(() => import('@/pages/Master/PartyGroup/PartyGroupList'));
export const SectionList = lazy(() => import('@/pages/Master/Section/SectionList'));
export const ThreadQualityList = lazy(() => import('@/pages/Master/ThreadQuality/ThreadQualityList'));
export const CountList = lazy(() => import('@/pages/Master/Count/CountList'));
export const UnitList = lazy(() => import('@/pages/Master/Unit/UnitList'));
export const LineMasterPage = lazy(() => import('@/pages/Master/Line/LineMasterPage'));
export const OperationMasterPage = lazy(() => import('@/pages/Master/Operation/OperationMasterPage'));
export const OperatorListPage = lazy(() => import('@/pages/Master/Operator/OperatorListPage'));

// ── Merchandising ──
export const OrderList = lazy(() => import('@/pages/Merchandising/Orders/OrderList'));
export const OrderForm = lazy(() => import('@/pages/Merchandising/Orders/OrderForm'));
export const MerchandisingSamples = lazy(() => import('@/pages/Merchandising/Samples'));
export const SamplingPage = lazy(() => import('@/pages/Merchandising/SamplingPage'));
export const MerchandisingTNA = lazy(() => import('@/pages/Merchandising/TNA'));

// ── Costing ──
export const BomList = lazy(() => import('@/pages/Costing/BOM/BomList'));
export const BomForm = lazy(() => import('@/pages/Costing/BOM/BomForm'));
export const CostingList = lazy(() => import('@/pages/Costing/Sheets/CostingList'));
export const CostingForm = lazy(() => import('@/pages/Costing/Sheets/CostingForm'));
export const CostingDetail = lazy(() => import('@/pages/Costing/Sheets/CostingDetail'));

// ── Master Modules Pack (Phase 1 + 2) ──
export const LocationPage         = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.LocationPage })));
export const RackPage             = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.RackPage })));
export const BinPage              = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.BinPage })));
export const SizePage             = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.SizePage })));
export const DiaPage              = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.DiaPage })));
export const ItemDescriptionPage  = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.ItemDescriptionPage })));
export const BuyerCodePage        = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.BuyerCodePage })));
export const PaymentTermPage      = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.PaymentTermPage })));
export const TaxTypePage          = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.TaxTypePage })));
export const TaxGroupPage         = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.TaxGroupPage })));
export const TaxDeductionPage     = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.TaxDeductionPage })));
export const VoucherGroupPage     = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.VoucherGroupPage })));
export const VoucherTypePage      = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.VoucherTypePage })));
export const PortPage             = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.PortPage })));
export const DocumentTypePage     = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.DocumentTypePage })));
export const NumberSeriesPage     = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.NumberSeriesPage })));
export const CountryPage          = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.CountryPage })));
export const CityPage             = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.CityPage })));
export const PartyTypePage        = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.PartyTypePage })));
export const PartyPage            = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.PartyPage })));
export const YarnTypePage         = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.YarnTypePage })));
export const CompositionPage      = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.CompositionPage })));
export const YarnPage             = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.YarnPage })));
export const FabricStructurePage  = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.FabricStructurePage })));
export const FabricPage           = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.FabricPage })));
export const AttributePage        = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.AttributePage })));
export const ProcessGroupPage     = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.ProcessGroupPage })));
export const ProcessPage          = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.ProcessPage })));
export const PortionPage          = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.PortionPage })));
export const StyleComponentPage   = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.StyleComponentPage })));
export const KnitTypePage         = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.KnitTypePage })));
export const WashTypePage         = lazy(() => import('@/pages/MasterPack/pages').then(m => ({ default: m.WashTypePage })));

// ── Planning ──
export const TnaTemplateList = lazy(() => import('@/pages/Planning/TnaTemplateList'));
export const TnaTemplateForm = lazy(() => import('@/pages/Planning/TnaTemplateForm'));
export const TnaCalendar = lazy(() => import('@/pages/Planning/TnaCalendar'));
export const ProductionTargets = lazy(() => import('@/pages/Planning/ProductionTargets'));
export const CapacityPlanning = lazy(() => import('@/pages/Planning/Capacity'));
export const ProductionPlanPage = lazy(() => import('@/pages/Planning/ProductionPlanPage'));
export const PlanningBoardPage = lazy(() => import('@/pages/Planning/PlanningBoardPage'));
export const LineLayoutPage = lazy(() => import('@/pages/LinePlanning/LineLayoutPage'));
export const LineBalancingPage = lazy(() => import('@/pages/LinePlanning/LineBalancingPage'));
export const LineListPage = lazy(() => import('@/pages/LinePlanning/LineListPage'));
export const OperatorSkillMatrixPage = lazy(() => import('@/pages/LinePlanning/OperatorSkillMatrixPage'));
export const SimulationPage = lazy(() => import('@/pages/LinePlanning/SimulationPage'));
export const ProductionDashboard = lazy(() => import('@/pages/Planning/ProductionDashboard'));
export const LineDetailPage = lazy(() => import('@/pages/Planning/LineDetailPage'));

// ── Procurement ──
export const PurchaseOrderList = lazy(() => import('@/pages/Procurement/PurchaseOrderList'));
export const PurchaseOrderForm = lazy(() => import('@/pages/Procurement/PurchaseOrderForm'));
export const GrnList = lazy(() => import('@/pages/Procurement/GrnList'));
export const GrnForm = lazy(() => import('@/pages/Procurement/GrnForm'));
export const RfqPage = lazy(() => import('@/pages/Procurement/RfqPage'));
export const SubcontractPage = lazy(() => import('@/pages/Procurement/SubcontractPage'));

// ── Inventory ──
export const StockSummary = lazy(() => import('@/pages/Inventory/StockSummary'));
export const MaterialIssuePage = lazy(() => import('@/pages/Inventory/MaterialIssuePage'));
export const MaterialReturnPage = lazy(() => import('@/pages/Inventory/MaterialReturnPage'));
export const MachinePage = lazy(() => import('@/pages/Inventory/MachinePage'));
export const RollsPage = lazy(() => import('@/pages/Inventory/RollsPage'));
export const StockCountPage = lazy(() => import('@/pages/Inventory/StockCountPage'));
export const StockAdjustmentPage = lazy(() => import('@/pages/Inventory/StockAdjustmentPage'));
export const StockTransferPage = lazy(() => import('@/pages/Inventory/StockTransferPage'));

// ── Production ──
export const CuttingPage = lazy(() => import('@/pages/Production/CuttingPage'));
export const SewingFinishingPage = lazy(() => import('@/pages/Production/SewingFinishingPage'));
export const FgTransferPage = lazy(() => import('@/pages/Production/FgTransferPage'));
export const OperationBulletinPage = lazy(() => import('@/pages/Production/OperationBulletinPage'));
export const ProductionOrderPage = lazy(() => import('@/pages/Production/ProductionOrderPage'));
export const HourlyProductionPage = lazy(() => import('@/pages/Production/HourlyProductionPage'));
export const BundlePage = lazy(() => import('@/pages/Production/BundlePage'));

// ── Quality ──
export const AqlInspectionPage = lazy(() => import('@/pages/Quality/AqlInspectionPage'));
export const FabricInspectionPage = lazy(() => import('@/pages/Quality/FabricInspectionPage'));
export const BuyerClaimsPage = lazy(() => import('@/pages/Quality/BuyerClaimsPage'));
export const EndlineQcPage = lazy(() => import('@/pages/Quality/EndlineQcPage'));
export const LabTestPage = lazy(() => import('@/pages/Quality/LabTestPage'));

// ── Packing & Export ──
export const PackingListPage = lazy(() => import('@/pages/Packing/PackingListPage'));
export const ContainerStuffingPage = lazy(() => import('@/pages/Packing/ContainerStuffingPage'));
export const ScanPackPage = lazy(() => import('@/pages/Packing/ScanPackPage'));
export const ExportDocumentsPage = lazy(() => import('@/pages/Export/ExportDocumentsPage'));
export const ShippingBillPage = lazy(() => import('@/pages/Export/ShippingBillPage'));
export const BillOfLadingPage = lazy(() => import('@/pages/Export/BillOfLadingPage'));
export const CooPage = lazy(() => import('@/pages/Export/CooPage'));
export const LcManagementPage = lazy(() => import('@/pages/Export/LcManagementPage'));
export const ExportIncentivesPage = lazy(() => import('@/pages/Export/ExportIncentivesPage'));

// ── Finance ──
export const InvoicesPage = lazy(() => import('@/pages/Finance/InvoicesPage'));
export const PaymentsPage = lazy(() => import('@/pages/Finance/PaymentsPage'));
export const FixedAssetsPage = lazy(() => import('@/pages/Finance/FixedAssetsPage'));
export const GstReturnsPage = lazy(() => import('@/pages/Finance/GstReturnsPage'));
export const BankReconciliationPage = lazy(() => import('@/pages/Finance/BankReconciliationPage'));
export const FinanceReportsPage = lazy(() => import('@/pages/Finance/FinanceReportsPage'));
export const ChartOfAccountsPage = lazy(() => import('@/pages/Finance/ChartOfAccountsPage'));
export const EInvoicePage = lazy(() => import('@/pages/Finance/EInvoicePage'));

// ── HRM ──
export const EmployeesPage = lazy(() => import('@/pages/HRM/EmployeesPage'));
export const AttendancePage = lazy(() => import('@/pages/HRM/AttendancePage'));
export const PayrollPage = lazy(() => import('@/pages/HRM/PayrollPage'));
export const LoansPage = lazy(() => import('@/pages/HRM/LoansPage'));
export const DepartmentsPage = lazy(() => import('@/pages/HRM/DepartmentsPage'));
export const DesignationsPage = lazy(() => import('@/pages/HRM/DesignationsPage'));
export const ShiftsPage = lazy(() => import('@/pages/HRM/ShiftsPage'));
export const LeaveTypesPage = lazy(() => import('@/pages/HRM/LeaveTypesPage'));
export const LeaveApplicationsPage = lazy(() => import('@/pages/HRM/LeaveApplicationsPage'));
export const LeaveBalancePage = lazy(() => import('@/pages/HRM/LeaveBalancePage'));
export const FnFPage = lazy(() => import('@/pages/HRM/FnFPage'));
export const StatutoryExportsPage = lazy(() => import('@/pages/HRM/StatutoryExportsPage'));
export const HolidaysPage = lazy(() => import('@/pages/HRM/HolidaysPage'));
export const OvertimePage = lazy(() => import('@/pages/HRM/OvertimePage'));
export const PieceRatePage = lazy(() => import('@/pages/HRM/PieceRatePage'));
export const SkillMatrixPage = lazy(() => import('@/pages/HRM/SkillMatrixPage'));

// ── Reports ──
export const MISDashboard = lazy(() => import('@/pages/Reports/MISDashboard'));
export const OrderStatusReport = lazy(() => import('@/pages/Reports/OrderStatusReport'));
export const ProductionEfficiencyReport = lazy(() => import('@/pages/Reports/ProductionEfficiencyReport'));
export const TnaDelayReport = lazy(() => import('@/pages/Reports/TnaDelayReport'));
export const InventoryAgingReport = lazy(() => import('@/pages/Reports/InventoryAgingReport'));
export const SupplierScorecardReport = lazy(() => import('@/pages/Reports/SupplierScorecardReport'));
export const BuyerAnalysisReport = lazy(() => import('@/pages/Reports/BuyerAnalysisReport'));
export const StylePnlReport = lazy(() => import('@/pages/Reports/StylePnlReport'));

// ── Settings / Admin ──
export const ApprovalWorkflowPage = lazy(() => import('@/pages/Settings/ApprovalWorkflowPage'));
export const NotificationCenterPage = lazy(() => import('@/pages/Settings/NotificationCenterPage'));
export const RoleBuilderPage = lazy(() => import('@/pages/Settings/RoleBuilderPage'));
export const ExcelImportPage = lazy(() => import('@/pages/Settings/ExcelImportPage'));
export const AuditLogPage = lazy(() => import('@/pages/Settings/AuditLogPage'));
export const UserManagementPage = lazy(() => import('@/pages/Settings/UserManagementPage'));
export const EmailTemplateManagementPage = lazy(() => import('@/pages/Settings/EmailTemplateManagementPage'));
export const Settings = lazy(() => import('@/pages/Settings/Settings'));

// ── MRP ──
export const MrpRunList = lazy(() => import('@/pages/MRP/MrpRunList'));
export const MrpCalculate = lazy(() => import('@/pages/MRP/MrpCalculate'));
export const MrpRunDetail = lazy(() => import('@/pages/MRP/MrpRunDetail'));
export const ProcessList = lazy(() => import('@/pages/MRP/ProcessList'));
export const ProcessForm = lazy(() => import('@/pages/MRP/ProcessForm'));
export const ProcessMaterialList = lazy(() => import('@/pages/MRP/ProcessMaterialList'));
export const AllowanceList = lazy(() => import('@/pages/MRP/AllowanceList'));
export const AllowanceForm = lazy(() => import('@/pages/MRP/AllowanceForm'));
export const TemplateBomList = lazy(() => import('@/pages/MRP/TemplateBomList'));
export const TemplateBomForm = lazy(() => import('@/pages/MRP/TemplateBomForm'));
export const SplBomList = lazy(() => import('@/pages/MRP/SplBomList'));
export const SplBomForm = lazy(() => import('@/pages/MRP/SplBomForm'));
export const FabricDesignList = lazy(() => import('@/pages/MRP/FabricDesignList'));
export const FabricDesignForm = lazy(() => import('@/pages/MRP/FabricDesignForm'));
export const BarcodeGeneration = lazy(() => import('@/pages/MRP/BarcodeGeneration'));
export const MrpConfigPage = lazy(() => import('@/pages/MRP/MrpConfigPage'));
export const ProcessSelectionPage = lazy(() => import('@/pages/MRP/ProcessSelectionPage'));
export const SpecificationPage = lazy(() => import('@/pages/MRP/SpecificationPage'));
export const IncompleteSpecsList = lazy(() => import('@/pages/MRP/IncompleteSpecsList'));
export const BomApprovalPage = lazy(() => import('@/pages/MRP/BomApprovalPage'));

// ── IE Floor ──
export const RealtimeDashboardPage = lazy(() => import('@/pages/IEFloor/RealtimeDashboardPage'));
export const SupervisorPanelPage = lazy(() => import('@/pages/IEFloor/SupervisorPanelPage'));
export const BreakdownManagerPage = lazy(() => import('@/pages/IEFloor/BreakdownManagerPage'));
export const ChangeoverTrackerPage = lazy(() => import('@/pages/IEFloor/ChangeoverTrackerPage'));
export const AlertsDashboardPage = lazy(() => import('@/pages/IEFloor/AlertsDashboardPage'));
export const DeploymentPage = lazy(() => import('@/pages/IEFloor/DeploymentPage'));
export const MultiLineDashboardPage = lazy(() => import('@/pages/IEFloor/MultiLineDashboardPage'));

// ── IE Tools ──
export const GsdTemplatesPage = lazy(() => import('@/pages/IETools/GsdTemplatesPage'));
export const MachineSpecsPage = lazy(() => import('@/pages/IETools/MachineSpecsPage'));
export const ObVersionsPage = lazy(() => import('@/pages/IETools/ObVersionsPage'));
export const GarmentAnalyserPage = lazy(() => import('@/pages/IETools/GarmentAnalyserPage'));
export const FeatureFlagsPage = lazy(() => import('@/pages/IETools/FeatureFlagsPage'));

// ── IE Analytics ──
export const IeAnalyticsPage = lazy(() => import('@/pages/IEAnalytics/IeAnalyticsPage'));
export const OperatorAnalyticsPage = lazy(() => import('@/pages/IEAnalytics/OperatorAnalyticsPage'));
export const IncentiveCalcPage = lazy(() => import('@/pages/IEAnalytics/IncentiveCalcPage'));
export const IncentiveRulesPage = lazy(() => import('@/pages/IEAnalytics/IncentiveRulesPage'));

// ── Maintenance / CMMS ──
export const MaintenanceDashboardPage = lazy(() => import('@/pages/Maintenance/MaintenanceDashboardPage'));
export const MaintenanceTicketsPage = lazy(() => import('@/pages/Maintenance/MaintenanceTicketsPage'));
export const PmSchedulesPage = lazy(() => import('@/pages/Maintenance/PmSchedulesPage'));
export const SparePartsPage = lazy(() => import('@/pages/Maintenance/SparePartsPage'));
export const MaintenanceLookupsPage = lazy(() => import('@/pages/Maintenance/MaintenanceLookupsPage'));
export const ChecklistsPage = lazy(() => import('@/pages/Maintenance/ChecklistsPage'));

// ── Report Builder (custom user-built reports) ──
export const ReportListPage = lazy(() => import('@/modules/report-builder/pages/ReportListPage'));
export const ReportBuilderPage = lazy(() => import('@/modules/report-builder/ReportBuilderPage'));
export const PublicReportPage = lazy(() => import('@/modules/report-builder/pages/PublicReportPage'));

// ── Settings ──
export const BranchManagementPage = lazy(() => import('@/modules/settings/pages/BranchManagementPage'));

// ── Auth ──
export const ForgotPassword = lazy(() => import('@/pages/AuthPages/ForgotPassword'));
export const ResetPassword = lazy(() => import('@/pages/AuthPages/ResetPassword'));

// ── Public ──
export const PublicFormPage = lazy(() => import('@/pages/PublicFormPage'));
