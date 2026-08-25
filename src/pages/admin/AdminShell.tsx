import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  ChevronRight,
  Database,
  FileText,
  Gauge,
  LogOut,
  MapPinned,
  Menu,
  PlugZap,
  Search,
  Settings,
  ShieldAlert,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/BrandMark';
import { useAuth } from '../../auth/useAuth';
import { useLanguage, type Language } from '../../i18n/LanguageContext';

interface AdminNavItem {
  label: Record<Language, string>;
  path: string;
  icon: LucideIcon;
}
const navGroups: Array<{ label: Record<Language, string>; items: AdminNavItem[] }> = [
  {
    label: { vi: 'Không gian làm việc', en: 'Workspace' },
    items: [
      { label: { vi: 'Tổng quan', en: 'Overview' }, path: '/admin', icon: Gauge },
      { label: { vi: 'Người dùng', en: 'Users' }, path: '/admin/users', icon: Users },
    ],
  },
  {
    label: { vi: 'Vận hành sản phẩm', en: 'Product operations' },
    items: [
      { label: { vi: 'POI & Dữ liệu', en: 'POI & Data' }, path: '/admin/poi', icon: Database },
      { label: { vi: 'Lịch trình', en: 'Trips' }, path: '/admin/trips', icon: MapPinned },
      { label: { vi: 'Phân tích', en: 'Analytics' }, path: '/admin/analytics', icon: BarChart3 },
      { label: { vi: 'AI & Agent', en: 'AI & Agent' }, path: '/admin/agent', icon: Bot },
    ],
  },
  {
    label: { vi: 'Hệ thống', en: 'System' },
    items: [
      { label: { vi: 'Tích hợp', en: 'Integrations' }, path: '/admin/integrations', icon: PlugZap },
      { label: { vi: 'Sức khỏe hệ thống', en: 'System health' }, path: '/admin/system', icon: Activity },
      { label: { vi: 'Nhật ký', en: 'Logs' }, path: '/admin/logs', icon: FileText },
      { label: { vi: 'Cài đặt', en: 'Settings' }, path: '/admin/settings', icon: Settings },
    ],
  },
];

export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const allItems = useMemo(() => navGroups.flatMap((group) => group.items), []);
  const matchingItems = searchText.trim()
    ? allItems.filter((item) => item.label[language].toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US')
      .includes(searchText.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US')))
    : [];

  const isActive = (path: string) => path === '/admin'
    ? location.pathname === '/admin'
    : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const sidebar = (
    <>
      <div className="ua-admin-sidebar__brand">
        <BrandMark showTagline={false} />
        <span>Admin</span>
        <button type="button" className="ua-admin-icon-button ua-admin-sidebar__close" onClick={() => setDrawerOpen(false)} aria-label={language === 'vi' ? 'Đóng menu' : 'Close menu'}>
          <X size={18} />
        </button>
      </div>
      <label className="ua-admin-sidebar__search">
        <Search size={16} />
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder={language === 'vi' ? 'Tìm trong Admin' : 'Search Admin'}
          aria-label={language === 'vi' ? 'Tìm trong Admin' : 'Search Admin'}
        />
      </label>
      {matchingItems.length > 0 && (
        <div className="ua-admin-search-results">
          {matchingItems.map((item) => (
            <Link key={item.path} to={item.path} onClick={() => setDrawerOpen(false)}>
              <item.icon size={15} />
              <span>{item.label[language]}</span>
              <ChevronRight size={14} />
            </Link>
          ))}
        </div>
      )}
      <nav className="ua-admin-nav" aria-label={language === 'vi' ? 'Điều hướng quản trị' : 'Admin navigation'}>
        {navGroups.map((group) => (
          <div key={group.label.en} className="ua-admin-nav__group">
            <p>{group.label[language]}</p>
            {group.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={isActive(item.path) ? 'is-active' : ''}
                onClick={() => setDrawerOpen(false)}
              >
                <item.icon size={17} strokeWidth={1.8} />
                <span>{item.label[language]}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="ua-admin-sidebar__account">
        <div className="ua-admin-avatar" aria-hidden="true">{(user?.displayName || user?.email || 'UA').slice(0, 2).toUpperCase()}</div>
        <div>
          <strong>{user?.displayName || 'UrbanAgent Admin'}</strong>
          <span>{user?.email || (language === 'vi' ? 'Phiên quản trị' : 'Admin session')}</span>
        </div>
        <button type="button" className="ua-admin-icon-button" onClick={() => void handleSignOut()} title={language === 'vi' ? 'Đăng xuất' : 'Sign out'} aria-label={language === 'vi' ? 'Đăng xuất' : 'Sign out'}>
          <LogOut size={17} />
        </button>
      </div>
    </>
  );

  return (
    <div className="ua-admin-shell">
      <aside className="ua-admin-sidebar">{sidebar}</aside>
      {drawerOpen && (
        <div className="ua-admin-drawer" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Menu quản trị' : 'Admin menu'}>
          <button type="button" className="ua-admin-drawer__backdrop" onClick={() => setDrawerOpen(false)} aria-label={language === 'vi' ? 'Đóng menu' : 'Close menu'} />
          <aside className="ua-admin-sidebar is-drawer">{sidebar}</aside>
        </div>
      )}
      <div className="ua-admin-workspace">
        <header className="ua-admin-topbar">
          <button type="button" className="ua-admin-icon-button ua-admin-menu-button" onClick={() => setDrawerOpen(true)} aria-label={language === 'vi' ? 'Mở menu' : 'Open menu'}>
            <Menu size={19} />
          </button>
          <div className="ua-admin-topbar__title">
            <strong>UrbanAgent AI Admin</strong>
            <span>{language === 'vi' ? 'Không gian vận hành' : 'Operations workspace'}</span>
          </div>
          <Link className="ua-admin-view-product" to="/urban-agent">
            {language === 'vi' ? 'Mở sản phẩm' : 'Open product'}
          </Link>
        </header>
        <main className="ua-admin-main">
          <div className="ua-admin-security-note" role="note">
            <ShieldAlert size={18} />
            <div>
              <strong>ADMIN_AUTH_BACKEND_REQUIRED</strong>
              <span>{language === 'vi'
                ? 'Dashboard chỉ dùng các nguồn công khai an toàn. Quyền admin hiện tại chưa phải ranh giới bảo mật phía máy chủ.'
                : 'This dashboard only uses safe public sources. The current admin role is not yet a server-enforced security boundary.'}</span>
            </div>
          </div>
          <div className="ua-admin-page-heading">
            <div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
