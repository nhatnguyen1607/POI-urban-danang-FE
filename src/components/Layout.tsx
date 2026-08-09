import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  Database,
  Languages,
  LineChart,
  LogOut,
  MapPin,
  MessageSquareHeart,
  Network,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useLanguage, type Language } from '../i18n/LanguageContext';
import type { AppRole } from '../auth/authContextValue';

const layoutCopy = {
  vi: {
    roles: {
      customer: 'Khách du lịch',
      seller: 'Người kinh doanh',
      admin: 'Quản trị viên',
    },
    system: 'Hệ thống đô thị AI',
    account: 'Tài khoản',
    language: 'Ngôn ngữ',
    vietnamese: 'Tiếng Việt',
    english: 'English',
    logout: 'Đăng xuất',
    login: 'Đăng nhập',
    guest: 'Chưa đăng nhập',
    nav: {
      sellerAnalytics: 'Phân tích vị trí',
      businessProfile: 'Hồ sơ địa điểm',
      adminOverview: 'Tổng quan',
      modelMetrics: 'Chỉ số mô hình',
      mapData: 'Bản đồ & dữ liệu',
      preferences: 'Sở thích cá nhân',
      feedback: 'Phản hồi',
    },
  },
  en: {
    roles: {
      customer: 'Traveler',
      seller: 'Business owner',
      admin: 'Administrator',
    },
    system: 'AI urban system',
    account: 'Account',
    language: 'Language',
    vietnamese: 'Vietnamese',
    english: 'English',
    logout: 'Sign out',
    login: 'Sign in',
    guest: 'Guest preview',
    nav: {
      sellerAnalytics: 'Location analytics',
      businessProfile: 'Business profile',
      adminOverview: 'Overview',
      modelMetrics: 'Model metrics',
      mapData: 'Map & data',
      preferences: 'Preferences',
      feedback: 'Feedback',
    },
  },
};

export default function Layout() {
  const { language, setLanguage } = useLanguage();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const copy = layoutCopy[language];
  const navItems = getNavItems(role, language);

  const handleSignOut = async () => {
    if (!user) {
      navigate('/login', { replace: false });
      return;
    }
    await signOut();
    navigate(role === 'admin' ? '/admin/login' : '/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#f5f8fb] text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-600 p-2 text-white shadow-sm">
              <MapPin size={24} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-950">Danang UrbanAgent</h1>
              <p className="text-xs font-medium text-slate-500">{role ? copy.roles[role] : copy.system}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border border-cyan-200 bg-cyan-50 text-cyan-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-4 border-t border-slate-200 p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-bold text-slate-950">
              <UserRound size={16} />
              {copy.account}
            </div>
            <p className="truncate text-slate-600">{user?.displayName || user?.email || copy.guest}</p>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Languages size={14} />
            {copy.language}
          </label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-500"
          >
            <option value="vi">{copy.vietnamese}</option>
            <option value="en">{copy.english}</option>
          </select>

          <button
            onClick={handleSignOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut size={16} />
            {user ? copy.logout : copy.login}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <MapPin className="text-cyan-700" size={20} />
              Danang UrbanAgent
            </div>
            <button onClick={handleSignOut} className="rounded-lg border border-slate-200 p-2 text-slate-600" aria-label={user ? copy.logout : copy.login}>
              {user ? <LogOut size={18} /> : <UserRound size={18} />}
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-cyan-50 text-cyan-800' : 'bg-slate-100 text-slate-600'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function getNavItems(role: AppRole | null, language: Language) {
  const nav = layoutCopy[language].nav;
  if (role === 'seller') {
    return [
      { name: nav.sellerAnalytics, path: '/seller', icon: <BarChart3 size={20} />, end: true },
      { name: nav.businessProfile, path: '/seller/business-profile', icon: <Store size={20} /> },
    ];
  }

  if (role === 'admin') {
    return [
      { name: nav.adminOverview, path: '/admin', icon: <ShieldCheck size={20} />, end: true },
      { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
      { name: 'POIs', path: '/admin/pois', icon: <Database size={20} /> },
      { name: 'Reviews', path: '/admin/reviews', icon: <MessageSquareHeart size={20} /> },
      { name: 'System', path: '/admin/system', icon: <Settings size={20} /> },
      { name: nav.modelMetrics, path: '/admin/model-metrics', icon: <LineChart size={20} /> },
      { name: 't-SNE Cluster', path: '/admin/tsne-cluster', icon: <Network size={20} /> },
    ];
  }

  return [
    { name: 'Urban Agent', path: '/urban-agent', icon: <Bot size={20} /> },
    { name: nav.mapData, path: '/', icon: <MapPin size={20} />, end: true },
    { name: nav.preferences, path: '/preferences', icon: <UserRound size={20} /> },
    { name: nav.feedback, path: '/feedback', icon: <MessageSquareHeart size={20} /> },
  ];
}
