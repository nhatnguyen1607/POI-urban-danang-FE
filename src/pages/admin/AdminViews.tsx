import type { ReactNode } from 'react';
import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudCog,
  Database,
  FileText,
  KeyRound,
  Map,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAdminUsers, type SafeAdminSnapshot, type ServiceStatus } from './adminData';

function statusLabel(status: ServiceStatus, language: 'vi' | 'en') {
  const labels = {
    vi: { active: 'Hoạt động', waiting: 'Chờ cấu hình', unavailable: 'Không khả dụng', unknown: 'Không xác định' },
    en: { active: 'Operational', waiting: 'Configuration pending', unavailable: 'Unavailable', unknown: 'Unknown' },
  } as const;
  return labels[language][status];
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const { language } = useLanguage();
  return <span className={`ua-admin-status is-${status}`}>{statusLabel(status, language)}</span>;
}

function MetricCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return (
    <article className="ua-admin-metric">
      <div className="ua-admin-metric__icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{helper}</span>
      </div>
    </article>
  );
}

function SkeletonMetrics() {
  return (
    <div className="ua-admin-metric-grid" aria-label="Loading">
      {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="ua-admin-skeleton ua-admin-skeleton--metric" />)}
    </div>
  );
}

function UnavailableState({ title, description, icon = <CircleHelp size={22} /> }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <div className="ua-admin-unavailable">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="ua-admin-section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function SystemRows({ snapshot }: { snapshot: SafeAdminSnapshot }) {
  const { language } = useLanguage();
  const rows: Array<{ service: string; status: ServiceStatus; message: string }> = [
    { service: 'Backend API', status: snapshot.backendStatus, message: language === 'vi' ? 'Nguồn: Admin Health API đã xác thực.' : 'Source: authenticated Admin Health API.' },
    { service: language === 'vi' ? 'Bộ dữ liệu POI' : 'POI dataset', status: snapshot.canonicalPois !== null && snapshot.canonicalPois > 0 && snapshot.canonicalHeaderValid !== false ? 'active' : snapshot.backendStatus === 'unavailable' ? 'unavailable' : 'unknown', message: snapshot.canonicalPois === null ? '—' : `${snapshot.canonicalPois.toLocaleString('en-US')} application POIs` },
    { service: 'OSRM', status: snapshot.osrmStatus, message: language === 'vi' ? 'Chưa có kiểm tra live phía máy chủ.' : 'No server-side live check yet.' },
    { service: 'Google Maps', status: snapshot.googleStatus, message: 'GOOGLE_LIVE_CONFIGURATION_PENDING' },
    { service: 'Photon', status: snapshot.photonStatus, message: language === 'vi' ? 'Đã cấu hình; chưa kiểm tra live trong health request.' : 'Configured; not live-checked by the health request.' },
    { service: 'Firebase Admin', status: snapshot.firebaseStatus, message: language === 'vi' ? 'Chỉ hiển thị cờ readiness, không hiển thị cấu hình.' : 'Readiness flag only; configuration is never displayed.' },
  ];
  return (
    <div className="ua-admin-table-wrap">
      <table className="ua-admin-table">
        <thead><tr><th>{language === 'vi' ? 'Dịch vụ' : 'Service'}</th><th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th><th>{language === 'vi' ? 'Thông tin' : 'Message'}</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.service}><td><strong>{row.service}</strong></td><td><StatusBadge status={row.status} /></td><td>{row.message}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function AdminOverview({ snapshot, refresh }: { snapshot: SafeAdminSnapshot; refresh: () => Promise<void> }) {
  const { language } = useLanguage();
  if (snapshot.loading && !snapshot.checkedAt) return <SkeletonMetrics />;
  const noSource = language === 'vi' ? 'Chưa có nguồn dữ liệu quản trị' : 'No admin data source';
  return (
    <div className="ua-admin-stack" data-admin-view="overview">
      <div className="ua-admin-metric-grid">
        <MetricCard icon={<Database size={19} />} label="Canonical POIs" value={snapshot.canonicalPois?.toLocaleString('en-US') || '—'} helper={snapshot.canonicalPois ? (language === 'vi' ? 'Nguồn: báo cáo chất lượng runtime' : 'Source: runtime quality report') : noSource} />
        <MetricCard icon={<MapPinned size={19} />} label={language === 'vi' ? 'Lịch trình' : 'Trips'} value="—" helper={noSource} />
        <MetricCard icon={<Users size={19} />} label={language === 'vi' ? 'Người dùng' : 'Users'} value="—" helper={noSource} />
        <MetricCard icon={<Search size={19} />} label={language === 'vi' ? 'Tìm kiếm' : 'Searches'} value="—" helper={noSource} />
        <MetricCard icon={<Bot size={19} />} label={language === 'vi' ? 'Gợi ý' : 'Recommendations'} value="—" helper={noSource} />
        <MetricCard icon={<FileText size={19} />} label="Feedback" value="—" helper={noSource} />
      </div>
      <section>
        <SectionHeading
          title={language === 'vi' ? 'Trạng thái hệ thống' : 'System status'}
          description={snapshot.checkedAt ? `${language === 'vi' ? 'Kiểm tra lúc' : 'Checked at'} ${snapshot.checkedAt.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}` : undefined}
          action={<button type="button" className="ua-admin-secondary-button" onClick={() => void refresh()} disabled={snapshot.loading}><RefreshCw size={15} className={snapshot.loading ? 'is-spinning' : ''} />{language === 'vi' ? 'Kiểm tra lại' : 'Refresh'}</button>}
        />
        <SystemRows snapshot={snapshot} />
      </section>
      <section>
        <SectionHeading title={language === 'vi' ? 'Hoạt động gần đây' : 'Recent activity'} />
        <UnavailableState title={language === 'vi' ? 'Chưa có nguồn dữ liệu hoạt động' : 'No activity data source'} description={language === 'vi' ? 'Cần Admin Activity API có phân quyền phía máy chủ.' : 'A server-authorized Admin Activity API is required.'} />
      </section>
    </div>
  );
}

export function AdminUsers() {
  const { language } = useLanguage();
  const {
    users,
    loading,
    error,
    page,
    canPrevious,
    canNext,
    previous,
    next,
    retry,
  } = useAdminUsers();

  if (loading) return <div className="ua-admin-skeleton ua-admin-skeleton--table" role="status" aria-label="Loading users" />;
  if (error) {
    return (
      <div className="ua-admin-stack" data-admin-view="users-error">
        <UnavailableState icon={<Users size={22} />} title={language === 'vi' ? 'Không thể tải người dùng' : 'Users unavailable'} description={error} />
        <button type="button" className="ua-admin-secondary-button ua-admin-retry" onClick={retry}><RefreshCw size={15} />{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
      </div>
    );
  }
  if (!users.length) {
    return <UnavailableState icon={<Users size={22} />} title={language === 'vi' ? 'Chưa có người dùng' : 'No users found'} description={language === 'vi' ? 'Firebase Auth không trả về tài khoản nào trong trang này.' : 'Firebase Auth returned no accounts on this page.'} />;
  }

  return (
    <div className="ua-admin-stack" data-admin-view="users">
      <div className="ua-admin-table-wrap">
        <table className="ua-admin-table">
          <thead><tr><th>{language === 'vi' ? 'Người dùng' : 'User'}</th><th>{language === 'vi' ? 'Xác minh' : 'Verified'}</th><th>Admin</th><th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th><th>{language === 'vi' ? 'Đăng nhập gần nhất' : 'Last sign-in'}</th></tr></thead>
          <tbody>{users.map((user) => (
            <tr key={user.uid}>
              <td><strong>{user.displayName || user.email || user.uid}</strong><span className="ua-admin-table__secondary">{user.email || user.uid}</span></td>
              <td>{user.emailVerified ? (language === 'vi' ? 'Đã xác minh' : 'Verified') : '—'}</td>
              <td>{user.admin ? 'Yes' : 'No'}</td>
              <td><StatusBadge status={user.disabled ? 'unavailable' : 'active'} /></td>
              <td>{user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="ua-admin-pagination">
        <button type="button" onClick={previous} disabled={!canPrevious}><ChevronLeft size={15} />{language === 'vi' ? 'Trang trước' : 'Previous'}</button>
        <span>{language === 'vi' ? 'Trang' : 'Page'} {page}</span>
        <button type="button" onClick={next} disabled={!canNext}>{language === 'vi' ? 'Trang sau' : 'Next'}<ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

export function AdminPoi({ snapshot }: { snapshot: SafeAdminSnapshot }) {
  const { language } = useLanguage();
  return (
    <div className="ua-admin-stack" data-admin-view="poi">
      <div className="ua-admin-metric-grid ua-admin-metric-grid--compact">
        <MetricCard icon={<Database size={19} />} label="Canonical POIs" value={snapshot.canonicalPois?.toLocaleString('en-US') || '—'} helper={language === 'vi' ? 'Runtime Da Nang hiện tại' : 'Current Da Nang runtime'} />
        <MetricCard icon={<ShieldCheck size={19} />} label={language === 'vi' ? 'Schema canonical' : 'Canonical schema'} value={snapshot.canonicalHeaderValid === null ? '—' : snapshot.canonicalHeaderValid ? 'PASS' : 'FAIL'} helper={language === 'vi' ? 'Nguồn: Admin POI Summary' : 'Source: Admin POI Summary'} />
      </div>
      <div className="ua-admin-filterbar" aria-disabled="true">
        <span><Search size={15} />{language === 'vi' ? 'Tìm POI' : 'Search POIs'}</span>
        <span><SlidersHorizontal size={15} />{language === 'vi' ? 'Danh mục / nguồn / trạng thái' : 'Category / source / status'}</span>
      </div>
      <UnavailableState icon={<MapPinned size={22} />} title={language === 'vi' ? 'Quản lý POI đang ở chế độ chỉ đọc' : 'POI administration is read-only'} description={language === 'vi' ? 'Backend chỉ cung cấp tổng hợp canonical an toàn; sửa, xóa và đồng bộ chưa được hỗ trợ.' : 'The backend exposes only a safe canonical summary; edit, delete, and sync are unsupported.'} />
    </div>
  );
}

export function AdminTrips() {
  const { language } = useLanguage();
  return <UnavailableState icon={<MapPinned size={22} />} title={language === 'vi' ? 'Chưa có nguồn danh sách lịch trình toàn cục' : 'No global trip-list source'} description={language === 'vi' ? 'Saved Trip API hiện chỉ cho chủ sở hữu. Cần Admin Trips API riêng để xem toàn cục.' : 'The Saved Trip API is owner-only. A dedicated Admin Trips API is required for global inspection.'} />;
}

export function AdminAnalytics() {
  const { language } = useLanguage();
  return <UnavailableState icon={<Activity size={22} />} title={language === 'vi' ? 'Chưa có nguồn analytics quản trị' : 'No admin analytics source'} description={language === 'vi' ? 'Không dựng biểu đồ giả cho lượt tìm kiếm, tạo chuyến đi, quan tâm danh mục hay feedback.' : 'No fabricated charts are rendered for searches, trip generation, category interest, or feedback.'} />;
}

export function AdminAgent() {
  const { language } = useLanguage();
  return <UnavailableState icon={<Bot size={22} />} title={language === 'vi' ? 'Chưa có nguồn dữ liệu quản trị Agent' : 'No Agent administration source'} description={language === 'vi' ? 'Request count, token usage và cost metrics cần telemetry API đã được phân quyền.' : 'Request counts, token usage, and cost metrics require an authorized telemetry API.'} />;
}

export function AdminIntegrations({ snapshot }: { snapshot: SafeAdminSnapshot }) {
  const { language } = useLanguage();
  const items: Array<{ name: string; purpose: string; status: ServiceStatus; note: string; icon: ReactNode }> = [
    { name: 'Google Maps', purpose: language === 'vi' ? 'Tìm địa điểm và bàn giao bản đồ' : 'Place search and map handoff', status: snapshot.googleStatus, note: 'GOOGLE_LIVE_CONFIGURATION_PENDING', icon: <Map size={20} /> },
    { name: 'Photon', purpose: language === 'vi' ? 'Geocoding dự phòng' : 'Fallback geocoding', status: snapshot.photonStatus, note: language === 'vi' ? 'Trạng thái từ Admin Health API; chưa live-check.' : 'Status from Admin Health API; not live-checked.', icon: <Search size={20} /> },
    { name: 'OSRM', purpose: language === 'vi' ? 'Ước tính lộ trình đường bộ' : 'Road-route estimation', status: snapshot.osrmStatus, note: language === 'vi' ? 'Chưa có kiểm tra live phía máy chủ.' : 'No server-side live check yet.', icon: <MapPinned size={20} /> },
    { name: 'Firebase', purpose: language === 'vi' ? 'Xác thực và dữ liệu người dùng' : 'Authentication and user data', status: snapshot.firebaseStatus, note: language === 'vi' ? 'Không hiển thị project ID, key hoặc token.' : 'Project ID, keys, and tokens are never displayed.', icon: <CloudCog size={20} /> },
  ];
  return <div className="ua-admin-integration-grid" data-admin-view="integrations">{items.map((item) => <article key={item.name} className="ua-admin-integration"><div className="ua-admin-integration__icon">{item.icon}</div><div><h2>{item.name}</h2><p>{item.purpose}</p><StatusBadge status={item.status} /><span>{item.note}</span></div></article>)}</div>;
}

export function AdminSystem({ snapshot, refresh }: { snapshot: SafeAdminSnapshot; refresh: () => Promise<void> }) {
  const { language } = useLanguage();
  return (
    <div className="ua-admin-stack" data-admin-view="system">
      <SectionHeading title={language === 'vi' ? 'Dịch vụ runtime' : 'Runtime services'} description={snapshot.checkedAt ? `${language === 'vi' ? 'Lần kiểm tra gần nhất' : 'Last checked'}: ${snapshot.checkedAt.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}` : undefined} action={<button type="button" className="ua-admin-secondary-button" onClick={() => void refresh()} disabled={snapshot.loading}><RefreshCw size={15} className={snapshot.loading ? 'is-spinning' : ''} />{language === 'vi' ? 'Kiểm tra lại' : 'Refresh'}</button>} />
      {snapshot.loading && !snapshot.checkedAt ? <div className="ua-admin-skeleton ua-admin-skeleton--table" /> : <SystemRows snapshot={snapshot} />}
      <UnavailableState icon={<Activity size={22} />} title={language === 'vi' ? 'Chưa có dữ liệu jobs/uptime' : 'No jobs or uptime data'} description={language === 'vi' ? 'Không hiển thị phần trăm uptime khi chưa có nguồn đo tin cậy.' : 'Uptime percentages are not shown without a trusted monitoring source.'} />
    </div>
  );
}

export function AdminLogs() {
  const { language } = useLanguage();
  return <UnavailableState icon={<FileText size={22} />} title={language === 'vi' ? 'Chưa có Admin Logs API' : 'No Admin Logs API'} description={language === 'vi' ? 'Console, authorization token và payload nội bộ không được hiển thị tại đây.' : 'Console output, authorization tokens, and internal payloads are not exposed here.'} />;
}

export function AdminSettings() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="ua-admin-settings" data-admin-view="settings">
      <section>
        <div className="ua-admin-setting-icon"><SlidersHorizontal size={19} /></div>
        <div><h2>{language === 'vi' ? 'Ngôn ngữ giao diện' : 'Interface language'}</h2><p>{language === 'vi' ? 'Cài đặt an toàn, chỉ áp dụng trên trình duyệt này.' : 'Safe setting applied only in this browser.'}</p></div>
        <div className="ua-admin-segmented" aria-label={language === 'vi' ? 'Ngôn ngữ' : 'Language'}>
          <button type="button" className={language === 'vi' ? 'is-active' : ''} onClick={() => setLanguage('vi')}>VI</button>
          <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>
      </section>
      <section>
        <div className="ua-admin-setting-icon"><KeyRound size={19} /></div>
        <div><h2>{language === 'vi' ? 'Cấu hình máy chủ' : 'Server configuration'}</h2><p>{language === 'vi' ? 'Chỉ đọc. Secret và biến môi trường không được gửi xuống frontend.' : 'Read-only. Secrets and environment values are not sent to the frontend.'}</p></div>
        <StatusBadge status="unknown" />
      </section>
    </div>
  );
}
