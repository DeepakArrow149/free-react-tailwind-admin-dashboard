/**
 * Super Admin Routes (Protected — super_admin role)
 */
import { Route } from 'react-router';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/layouts';
import { PageLoader } from './PageLoader';
import {
  SuperAdminDashboard,
  CompanyListPage,
  CreateCompanyPage,
  CompanyDetailPage,
  AiSettingsPage,
  BridgeKeysPage,
  FormBuilderPage,
  TemplateLibraryPage,
} from './lazyImports';

export function SuperAdminRoutes() {
  return (
    <>
      {/* ── Super Admin Layout (isolated — no ERP routes) ── */}
      <Route element={<ProtectedRoute requiredRoles={["super_admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/super-admin" element={<Suspense fallback={<PageLoader fullScreen />}><SuperAdminDashboard /></Suspense>} />
          <Route path="/super-admin/companies" element={<Suspense fallback={null}><CompanyListPage /></Suspense>} />
          <Route path="/super-admin/companies/create" element={<Suspense fallback={null}><CreateCompanyPage /></Suspense>} />
          <Route path="/super-admin/companies/:id" element={<Suspense fallback={null}><CompanyDetailPage /></Suspense>} />
          <Route path="/super-admin/ai-settings" element={<Suspense fallback={null}><AiSettingsPage /></Suspense>} />
          <Route path="/super-admin/bridge-keys" element={<Suspense fallback={null}><BridgeKeysPage /></Suspense>} />
        </Route>
      </Route>

      {/* Form Builder — accessible by super_admin AND company_admin */}
      <Route element={<ProtectedRoute requiredRoles={["super_admin", "company_admin"]} />}>
        <Route element={<Suspense fallback={<PageLoader />}><DashboardLayout /></Suspense>}>
          <Route path="/super-admin/form-builder" element={<Suspense fallback={null}><FormBuilderPage /></Suspense>} />
          <Route path="/super-admin/template-library" element={<Suspense fallback={null}><TemplateLibraryPage /></Suspense>} />
        </Route>
      </Route>
    </>
  );
}
