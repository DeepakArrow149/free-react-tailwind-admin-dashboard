/**
 * Auth Routes (Public — no authentication required)
 */
import { Route } from 'react-router';
import { Suspense } from 'react';
import SignIn from '@/pages/AuthPages/SignIn';
import NotFound from '@/pages/OtherPage/NotFound';
import { PageLoader } from './PageLoader';
import { ForgotPassword, ResetPassword, PublicFormPage, PublicReportPage } from './lazyImports';

export function AuthRoutes() {
  return (
    <>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/auth/signin" element={<SignIn />} />
      <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />

      {/* Public Form (no auth) */}
      <Route path="/forms/:slug" element={<Suspense fallback={<PageLoader />}><PublicFormPage /></Suspense>} />

      {/* Public Report (shared via tokenized link) */}
      <Route path="/reports/public/:token" element={<Suspense fallback={<PageLoader />}><PublicReportPage /></Suspense>} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </>
  );
}
