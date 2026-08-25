import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { AdminShell } from './AdminShell';
import {
  AdminAgent,
  AdminAnalytics,
  AdminIntegrations,
  AdminLogs,
  AdminOverview,
  AdminPoi,
  AdminSettings,
  AdminSystem,
  AdminTrips,
  AdminUsers,
} from './AdminViews';
import { useSafeAdminSnapshot } from './adminData';
import './admin.css';

function AdminPage({
  title,
  description,
  children,
}: {
  title: { vi: string; en: string };
  description: { vi: string; en: string };
  children: ReactNode;
}) {
  const { language } = useLanguage();
  return <AdminShell title={title[language]} description={description[language]}>{children}</AdminShell>;
}

export default function AdminApp() {
  const { snapshot, refresh } = useSafeAdminSnapshot();
  const { pathname } = useLocation();
  const redirects: Record<string, string> = {
    '/admin/pois': '/admin/poi',
    '/admin/reviews': '/admin/logs',
    '/admin/model-metrics': '/admin/analytics',
    '/admin/tsne-cluster': '/admin/analytics',
  };
  if (redirects[pathname]) return <Navigate to={redirects[pathname]} replace />;

  const pages: Record<string, ReactNode> = {
    '/admin': <AdminPage title={{ vi: 'Tổng quan', en: 'Overview' }} description={{ vi: 'Theo dõi dữ liệu, hoạt động và trạng thái UrbanAgent.', en: 'Monitor UrbanAgent data, activity, and service status.' }}><AdminOverview snapshot={snapshot} refresh={refresh} /></AdminPage>,
    '/admin/users': <AdminPage title={{ vi: 'Người dùng', en: 'Users' }} description={{ vi: 'Quản trị tài khoản qua nguồn dữ liệu được phân quyền.', en: 'Manage accounts through authorized data sources.' }}><AdminUsers /></AdminPage>,
    '/admin/poi': <AdminPage title={{ vi: 'POI & Dữ liệu', en: 'POI & Data' }} description={{ vi: 'Theo dõi canonical POI, candidate, temporary places và data sync.', en: 'Monitor canonical POIs, candidates, temporary places, and data sync.' }}><AdminPoi snapshot={snapshot} /></AdminPage>,
    '/admin/trips': <AdminPage title={{ vi: 'Lịch trình', en: 'Trips' }} description={{ vi: 'Theo dõi trip, saved trip và trạng thái lộ trình.', en: 'Inspect trips, saved trips, and route status.' }}><AdminTrips /></AdminPage>,
    '/admin/analytics': <AdminPage title={{ vi: 'Phân tích', en: 'Analytics' }} description={{ vi: 'Search, recommendation, feedback và usage từ nguồn đo tin cậy.', en: 'Search, recommendation, feedback, and usage from trusted telemetry.' }}><AdminAnalytics /></AdminPage>,
    '/admin/agent': <AdminPage title={{ vi: 'AI & Agent', en: 'AI & Agent' }} description={{ vi: 'Hoạt động Agent, scheduler và generation failures.', en: 'Agent activity, scheduler, and generation failures.' }}><AdminAgent /></AdminPage>,
    '/admin/integrations': <AdminPage title={{ vi: 'Tích hợp', en: 'Integrations' }} description={{ vi: 'Trạng thái kết nối mà không phơi bày credential.', en: 'Connection status without exposing credentials.' }}><AdminIntegrations snapshot={snapshot} /></AdminPage>,
    '/admin/system': <AdminPage title={{ vi: 'Sức khỏe hệ thống', en: 'System health' }} description={{ vi: 'Kiểm tra các dịch vụ qua health contract an toàn hiện có.', en: 'Check services through existing safe health contracts.' }}><AdminSystem snapshot={snapshot} refresh={refresh} /></AdminPage>,
    '/admin/logs': <AdminPage title={{ vi: 'Nhật ký', en: 'Logs' }} description={{ vi: 'Vùng dành cho log vận hành đã được lọc và phân quyền.', en: 'Reserved for filtered, authorized operational logs.' }}><AdminLogs /></AdminPage>,
    '/admin/settings': <AdminPage title={{ vi: 'Cài đặt', en: 'Settings' }} description={{ vi: 'Cấu hình giao diện an toàn và trạng thái server chỉ đọc.', en: 'Safe interface settings and read-only server state.' }}><AdminSettings /></AdminPage>,
  };
  return pages[pathname] || <Navigate to="/admin" replace />;
}
