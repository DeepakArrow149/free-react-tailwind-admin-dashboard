import { useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import { DashboardLayout } from "./layouts";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import { DashboardRoutes, SuperAdminRoutes, AuthRoutes, PageLoader } from "./routes";

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <Toaster richColors position="top-right" closeButton />
      <Router>
        <ScrollToTop />
        <ErrorBoundary>
        <Routes>
          {/* Protected Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Suspense fallback={<PageLoader />}><DashboardLayout /></Suspense>}>
              {DashboardRoutes()}
            </Route>
          </Route>

          {/* Super Admin routes */}
          {SuperAdminRoutes()}

          {/* Auth & public routes */}
          {AuthRoutes()}
        </Routes>
        </ErrorBoundary>
      </Router>
    </>
  );
}
