import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bot, Database, Heart, Languages, LineChart, LogIn, LogOut,
  Map, Menu, MessageSquareHeart, Network, Settings, ShieldCheck, Store,
  UserRound, Users, X,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useLanguage, type Language } from '../i18n/LanguageContext';
import type { AppRole } from '../auth/authContextValue';
import { BrandMark } from './BrandMark';

const layoutCopy = {
  vi: {
    roles: { customer: 'Khách du lịch', seller: 'Đối tác địa điểm', admin: 'Quản trị viên' },
    account: 'Tài khoản', language: 'Ngôn ngữ', vietnamese: 'Tiếng Việt', english: 'English',
    logout: 'Đăng xuất', login: 'Đăng nhập', guest: 'Khách trải nghiệm',
    openMenu: 'Mở điều hướng', closeMenu: 'Đóng điều hướng',
    nav: {
      urbanAgent: 'Urban Agent', discovery: 'Khám phá', saved: 'Chuyến đi đã lưu',
      preferences: 'Sở thích', feedback: 'Phản hồi', sellerAnalytics: 'Phân tích vị trí',
      businessProfile: 'Hồ sơ địa điểm', adminOverview: 'Tổng quan', modelMetrics: 'Chỉ số mô hình',
    },
  },
  en: {
    roles: { customer: 'Traveler', seller: 'Place partner', admin: 'Administrator' },
    account: 'Account', language: 'Language', vietnamese: 'Vietnamese', english: 'English',
    logout: 'Sign out', login: 'Sign in', guest: 'Guest preview',
    openMenu: 'Open navigation', closeMenu: 'Close navigation',
    nav: {
      urbanAgent: 'Urban Agent', discovery: 'Discover', saved: 'Saved trips',
      preferences: 'Preferences', feedback: 'Feedback', sellerAnalytics: 'Location analytics',
      businessProfile: 'Business profile', adminOverview: 'Overview', modelMetrics: 'Model metrics',
    },
  },
};

export default function Layout() {
  const { language, setLanguage } = useLanguage();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const copy = layoutCopy[language];
  const navItems = getNavItems(role, language);

  const handleSignOut = async () => {
    setMobileOpen(false);
    if (!user) {
      navigate('/login');
      return;
    }
    await signOut();
    navigate(role === 'admin' ? '/admin/login' : '/', { replace: true });
  };

  const navigation = (
    <>
      <nav className="ua-app-nav" aria-label="Điều hướng chính">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `ua-app-nav__item${isActive ? ' is-active' : ''}`}
          >
            {item.icon}<span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="ua-app-sidebar__footer">
        <div className="ua-account-summary">
          <span className="ua-account-summary__avatar"><UserRound size={17} /></span>
          <span className="min-w-0">
            <strong>{user?.displayName || copy.account}</strong>
            <small>{user?.email || copy.guest}</small>
          </span>
        </div>
        <label className="ua-language-control">
          <Languages size={16} aria-hidden="true" />
          <span className="sr-only">{copy.language}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}>
            <option value="vi">{copy.vietnamese}</option>
            <option value="en">{copy.english}</option>
          </select>
        </label>
        <button type="button" onClick={handleSignOut} className="ua-app-signout">
          {user ? <LogOut size={17} /> : <LogIn size={17} />}
          {user ? copy.logout : copy.login}
        </button>
      </div>
    </>
  );

  return (
    <div className="ua-product-shell">
      <aside className="ua-app-sidebar">
        <BrandMark />
        {role && <span className="ua-role-label">{copy.roles[role]}</span>}
        {navigation}
      </aside>

      <header className="ua-mobile-header">
        <BrandMark />
        <button type="button" className="ua-icon-button" onClick={() => setMobileOpen(true)} aria-label={copy.openMenu} aria-expanded={mobileOpen}>
          <Menu size={21} />
        </button>
      </header>

      {mobileOpen && (
        <div className="ua-mobile-drawer" role="dialog" aria-modal="true" aria-label={copy.openMenu}>
          <button className="ua-mobile-drawer__scrim" aria-label={copy.closeMenu} onClick={() => setMobileOpen(false)} />
          <aside className="ua-mobile-drawer__panel">
            <div className="ua-mobile-drawer__head">
              <BrandMark />
              <button type="button" className="ua-icon-button" onClick={() => setMobileOpen(false)} aria-label={copy.closeMenu}><X size={21} /></button>
            </div>
            {navigation}
          </aside>
        </div>
      )}

      <main className="ua-product-page"><Outlet /></main>
    </div>
  );
}

function getNavItems(role: AppRole | null, language: Language) {
  const nav = layoutCopy[language].nav;
  if (role === 'seller') {
    return [
      { name: nav.sellerAnalytics, path: '/seller', icon: <BarChart3 size={19} />, end: true },
      { name: nav.businessProfile, path: '/seller/business-profile', icon: <Store size={19} /> },
    ];
  }
  if (role === 'admin') {
    return [
      { name: nav.adminOverview, path: '/admin', icon: <ShieldCheck size={19} />, end: true },
      { name: 'Users', path: '/admin/users', icon: <Users size={19} /> },
      { name: 'POIs', path: '/admin/pois', icon: <Database size={19} /> },
      { name: 'Reviews', path: '/admin/reviews', icon: <MessageSquareHeart size={19} /> },
      { name: 'System', path: '/admin/system', icon: <Settings size={19} /> },
      { name: nav.modelMetrics, path: '/admin/model-metrics', icon: <LineChart size={19} /> },
      { name: 't-SNE Cluster', path: '/admin/tsne-cluster', icon: <Network size={19} /> },
    ];
  }
  return [
    { name: nav.urbanAgent, path: '/urban-agent', icon: <Bot size={19} /> },
    { name: nav.discovery, path: '/map-data', icon: <Map size={19} /> },
    { name: nav.saved, path: '/saved', icon: <Heart size={19} /> },
    { name: nav.preferences, path: '/preferences', icon: <UserRound size={19} /> },
    { name: nav.feedback, path: '/feedback', icon: <MessageSquareHeart size={19} /> },
  ];
}
