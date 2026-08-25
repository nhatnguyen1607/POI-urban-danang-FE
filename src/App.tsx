import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ModelMetricsPage from './pages/analytics/ModelMetricsPage';
import TSNEClusterPage from './pages/analytics/TSNEClusterPage';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { AdminLoginPage, LoginPage, RoleSelectionPage } from './pages/auth/AuthPages';
import {
  AdminOverviewPage,
  BusinessProfilePage,
  FeedbackPage,
  ModerationPage,
  PreferencesPage,
  SellerAnalyticsPage,
} from './pages/role/RolePages';
import type { AppRole } from './auth/authContextValue';

const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const UrbanAgentPage = lazy(() => import('./pages/urban-agent/UrbanAgentPage'));

const defaultPath: Record<AppRole, string> = {
  customer: '/urban-agent',
  seller: '/seller',
  admin: '/admin',
};

function RequireRole({ roles }: { roles: AppRole[] }) {
  const { user, role, loading } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fb] text-sm font-semibold text-slate-600">
        {language === 'vi' ? 'Đang kiểm tra phiên đăng nhập...' : 'Checking your sign-in session...'}
      </div>
    );
  }

  if (!user) {
    return <Navigate to={roles.includes('admin') ? '/admin/login' : '/login'} state={{ from: location }} replace />;
  }

  if (!role) {
    return <Navigate to="/chon-vai-tro" replace />;
  }

  if (!roles.includes(role)) {
    return <Navigate to={defaultPath[role]} replace />;
  }

  return <Outlet />;
}

function RoleRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (!role) return <Navigate to="/chon-vai-tro" replace />;
  return <Navigate to={defaultPath[role]} replace />;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="ua-route-loading" role="status">Đang chuẩn bị trải nghiệm...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/chon-vai-tro" element={<RoleSelectionPage />} />
            <Route path="/" element={<LandingPage />} />

            <Route path="/" element={<Layout />}>
              <Route path="urban-agent" element={<UrbanAgentPage />} />
            </Route>

            <Route element={<RequireRole roles={['customer']} />}>
              <Route path="/" element={<Layout />}>
                <Route path="map-data" element={<DashboardPage />} />
                <Route path="saved" element={<Navigate to="/urban-agent#saved-trips" replace />} />
                <Route path="preferences" element={<PreferencesPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="text-search" element={<Navigate to="/urban-agent" replace />} />
              </Route>
            </Route>

            <Route element={<RequireRole roles={['seller']} />}>
              <Route path="/seller" element={<Layout />}>
                <Route index element={<SellerAnalyticsPage />} />
                <Route path="business-profile" element={<BusinessProfilePage />} />
              </Route>
            </Route>

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<Layout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<ModerationPage type="users" />} />
                <Route path="pois" element={<ModerationPage type="pois" />} />
                <Route path="reviews" element={<ModerationPage type="reviews" />} />
                <Route path="system" element={<ModerationPage type="system" />} />
                <Route path="model-metrics" element={<ModelMetricsPage />} />
                <Route path="tsne-cluster" element={<TSNEClusterPage />} />
              </Route>
            </Route>

            <Route path="/ai-site-selection" element={<Navigate to="/seller" replace />} />
            <Route path="/demo" element={<Navigate to="/urban-agent" replace />} />
            <Route path="/model-metrics" element={<Navigate to="/admin/model-metrics" replace />} />
            <Route path="/tsne-cluster" element={<Navigate to="/admin/tsne-cluster" replace />} />
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
