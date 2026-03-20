import { BrowserRouter as Router, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Home from "./pages/Dashboard/Home";

// Master Data
import BuyerList from "./pages/Master/Buyer/BuyerList";
import BuyerForm from "./pages/Master/Buyer/BuyerForm";
import SupplierList from "./pages/Master/Supplier/SupplierList";
import SupplierForm from "./pages/Master/Supplier/SupplierForm";
import MaterialList from "./pages/Master/Material/MaterialList";
import MaterialForm from "./pages/Master/Material/MaterialForm";
import StyleList from "./pages/Master/Style/StyleList";
import StyleForm from "./pages/Master/Style/StyleForm";
import ColorList from "./pages/Master/Color/ColorList";
import SeasonList from "./pages/Master/Season/SeasonList";
import CompanyList from "./pages/Master/Company/CompanyList";
import BranchList from "./pages/Master/Branch/BranchList";
import BuyingAgentList from "./pages/Master/BuyingAgent/BuyingAgentList";
import PartyGroupList from "./pages/Master/PartyGroup/PartyGroupList";
import SectionList from "./pages/Master/Section/SectionList";
import ThreadQualityList from "./pages/Master/ThreadQuality/ThreadQualityList";
import CountList from "./pages/Master/Count/CountList";

// Merchandising
import OrderList from "./pages/Merchandising/Orders/OrderList";
import OrderForm from "./pages/Merchandising/Orders/OrderForm";
import MerchandisingSamples from "./pages/Merchandising/Samples";
import SamplingPage from "./pages/Merchandising/SamplingPage";
import MerchandisingTNA from "./pages/Merchandising/TNA";

// Costing
import BomList from "./pages/Costing/BOM/BomList";
import BomForm from "./pages/Costing/BOM/BomForm";
import CostingList from "./pages/Costing/Sheets/CostingList";
import CostingForm from "./pages/Costing/Sheets/CostingForm";

// Planning
import TnaTemplateList from "./pages/Planning/TnaTemplateList";
import TnaTemplateForm from "./pages/Planning/TnaTemplateForm";
import TnaCalendar from "./pages/Planning/TnaCalendar";
import ProductionTargets from "./pages/Planning/ProductionTargets";
import CapacityPlanning from "./pages/Planning/Capacity";

// Procurement
import PurchaseOrderList from "./pages/Procurement/PurchaseOrderList";
import PurchaseOrderForm from "./pages/Procurement/PurchaseOrderForm";
import GrnList from "./pages/Procurement/GrnList";
import GrnForm from "./pages/Procurement/GrnForm";
import RfqPage from "./pages/Procurement/RfqPage";

// Inventory
import StockSummary from "./pages/Inventory/StockSummary";
import MaterialIssuePage from "./pages/Inventory/MaterialIssuePage";
import MaterialReturnPage from "./pages/Inventory/MaterialReturnPage";
import MachinePage from "./pages/Inventory/MachinePage";

// Production
import CuttingPage from "./pages/Production/CuttingPage";
import SewingFinishingPage from "./pages/Production/SewingFinishingPage";
import FgTransferPage from "./pages/Production/FgTransferPage";
import OperationBulletinPage from "./pages/Production/OperationBulletinPage";
import ProductionOrderPage from "./pages/Production/ProductionOrderPage";
import HourlyProductionPage from "./pages/Production/HourlyProductionPage";
import BundlePage from "./pages/Production/BundlePage";

// Quality
import AqlInspectionPage from "./pages/Quality/AqlInspectionPage";
import FabricInspectionPage from "./pages/Quality/FabricInspectionPage";
import BuyerClaimsPage from "./pages/Quality/BuyerClaimsPage";
import EndlineQcPage from "./pages/Quality/EndlineQcPage";
import LabTestPage from "./pages/Quality/LabTestPage";

// Packing & Export
import PackingListPage from "./pages/Packing/PackingListPage";
import ContainerStuffingPage from "./pages/Packing/ContainerStuffingPage";
import ScanPackPage from "./pages/Packing/ScanPackPage";
import ExportDocumentsPage from "./pages/Export/ExportDocumentsPage";

// Finance
import InvoicesPage from "./pages/Finance/InvoicesPage";
import PaymentsPage from "./pages/Finance/PaymentsPage";
import FixedAssetsPage from "./pages/Finance/FixedAssetsPage";
import GstReturnsPage from "./pages/Finance/GstReturnsPage";
import BankReconciliationPage from "./pages/Finance/BankReconciliationPage";
import FinanceReportsPage from "./pages/Finance/FinanceReportsPage";
import ChartOfAccountsPage from "./pages/Finance/ChartOfAccountsPage";

// HRM
import EmployeesPage from "./pages/HRM/EmployeesPage";
import AttendancePage from "./pages/HRM/AttendancePage";
import PayrollPage from "./pages/HRM/PayrollPage";
import LoansPage from "./pages/HRM/LoansPage";
import DepartmentsPage from "./pages/HRM/DepartmentsPage";
import DesignationsPage from "./pages/HRM/DesignationsPage";
import ShiftsPage from "./pages/HRM/ShiftsPage";
import LeaveTypesPage from "./pages/HRM/LeaveTypesPage";
import LeaveApplicationsPage from "./pages/HRM/LeaveApplicationsPage";
import LeaveBalancePage from "./pages/HRM/LeaveBalancePage";
import FnFPage from "./pages/HRM/FnFPage";
import StatutoryExportsPage from "./pages/HRM/StatutoryExportsPage";

// Reports
import MISDashboard from "./pages/Reports/MISDashboard";
import OrderStatusReport from "./pages/Reports/OrderStatusReport";
import ProductionEfficiencyReport from "./pages/Reports/ProductionEfficiencyReport";
import TnaDelayReport from "./pages/Reports/TnaDelayReport";
import InventoryAgingReport from "./pages/Reports/InventoryAgingReport";
import SupplierScorecardReport from "./pages/Reports/SupplierScorecardReport";
import BuyerAnalysisReport from "./pages/Reports/BuyerAnalysisReport";
import StylePnlReport from "./pages/Reports/StylePnlReport";

// Export Pages
import ShippingBillPage from "./pages/Export/ShippingBillPage";
import BillOfLadingPage from "./pages/Export/BillOfLadingPage";
import CooPage from "./pages/Export/CooPage";
import LcManagementPage from "./pages/Export/LcManagementPage";
import ExportIncentivesPage from "./pages/Export/ExportIncentivesPage";

// Subcontract & Production Plan
import SubcontractPage from "./pages/Procurement/SubcontractPage";
import ProductionPlanPage from "./pages/Planning/ProductionPlanPage";

// GST E-Invoice
import EInvoicePage from "./pages/Finance/EInvoicePage";

// System Admin
import ApprovalWorkflowPage from "./pages/Settings/ApprovalWorkflowPage";
import NotificationCenterPage from "./pages/Settings/NotificationCenterPage";
import RoleBuilderPage from "./pages/Settings/RoleBuilderPage";
import ExcelImportPage from "./pages/Settings/ExcelImportPage";

// Settings
import Settings from "./pages/Settings/Settings";

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" closeButton />
      <Router>
        <ScrollToTop />
        <ErrorBoundary>
        <Routes>
          {/* Protected Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
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
              <Route path="/costing/sheets/:id" element={<CostingForm />} />
              <Route path="/costing/bom" element={<BomList />} />
              <Route path="/costing/bom/new" element={<BomForm />} />
              <Route path="/costing/bom/:id" element={<BomForm />} />

              {/* ── Planning ── */}
              <Route path="/planning/tna-templates" element={<TnaTemplateList />} />
              <Route path="/planning/tna-templates/new" element={<TnaTemplateForm />} />
              <Route path="/planning/tna-templates/:id" element={<TnaTemplateForm />} />
              <Route path="/planning/tna" element={<TnaCalendar />} />
              <Route path="/planning/targets" element={<ProductionTargets />} />
              <Route path="/planning/capacity" element={<CapacityPlanning />} />
              <Route path="/planning/production-plan" element={<ProductionPlanPage />} />

              {/* ── Procurement ── */}
              <Route path="/procurement/rfq" element={<RfqPage />} />
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

              {/* ── Reports ── */}
              <Route path="/reports/dashboard" element={<MISDashboard />} />
              <Route path="/reports/orders" element={<OrderStatusReport />} />
              <Route path="/reports/production-efficiency" element={<ProductionEfficiencyReport />} />
              <Route path="/reports/tna-delays" element={<TnaDelayReport />} />
              <Route path="/reports/inventory-aging" element={<InventoryAgingReport />} />
              <Route path="/reports/supplier-scorecard" element={<SupplierScorecardReport />} />
              <Route path="/reports/buyer-analysis" element={<BuyerAnalysisReport />} />
              <Route path="/reports/style-pnl" element={<StylePnlReport />} />

              {/* ── Settings / Admin ── */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/approvals" element={<ApprovalWorkflowPage />} />
              <Route path="/settings/notifications" element={<NotificationCenterPage />} />
              <Route path="/settings/roles" element={<RoleBuilderPage />} />
              <Route path="/settings/excel-import" element={<ExcelImportPage />} />
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </Router>
    </>
  );
}
