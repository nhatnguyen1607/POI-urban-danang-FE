import { useDeferredValue, useState, type ReactNode } from 'react';
import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudCog,
  Database,
  Eye,
  FileText,
  KeyRound,
  Map,
  MapPinned,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  useAdminFeedback,
  useAdminOverview,
  useAdminPois,
  useAdminTripDetail,
  useAdminTrips,
  useAdminUsers,
  type AdminPoiRecord,
  type AdminTripRecord,
  type SafeAdminSnapshot,
  type ServiceStatus,
} from './adminData';

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

function DetailDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="ua-admin-detail" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="ua-admin-detail__backdrop" onClick={onClose} aria-label="Close" />
      <aside className="ua-admin-detail__panel">
        <header><h2>{title}</h2><button type="button" className="ua-admin-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="ua-admin-detail__body">{children}</div>
      </aside>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="ua-admin-detail-row"><span>{label}</span><strong>{value || '—'}</strong></div>;
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
  const overview = useAdminOverview();
  if ((snapshot.loading && !snapshot.checkedAt) || overview.loading) return <SkeletonMetrics />;
  const realData = language === 'vi' ? 'Dữ liệu quản trị đã xác thực' : 'Verified admin data';
  const countValue = (value: number | null) => value === null ? '—' : value.toLocaleString('en-US');
  return (
    <div className="ua-admin-stack" data-admin-view="overview">
      <div className="ua-admin-metric-grid">
        <MetricCard icon={<Database size={19} />} label="Canonical POIs" value={countValue(snapshot.canonicalPois)} helper={language === 'vi' ? 'Nguồn: runtime canonical hiện tại' : 'Source: current canonical runtime'} />
        <MetricCard icon={<MapPinned size={19} />} label={language === 'vi' ? 'Lịch trình đã lưu' : 'Saved trips'} value={countValue(overview.data.counts.trips.value)} helper={overview.data.counts.trips.exact ? realData : `${realData} · limited`} />
        <MetricCard icon={<Users size={19} />} label={language === 'vi' ? 'Người dùng' : 'Users'} value={countValue(overview.data.counts.users.value)} helper={overview.data.counts.users.exact ? realData : realData + ' · limited'} />
        <MetricCard icon={<MessageSquare size={19} />} label="Feedback" value={countValue(overview.data.counts.feedback.value)} helper={overview.data.counts.feedback.exact ? realData : realData + ' · limited'} />
      </div>
      {overview.error && <UnavailableState title={language === 'vi' ? 'Một số chỉ số chưa tải được' : 'Some metrics are unavailable'} description={overview.error} />}
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
        {overview.data.recentActivity.length ? (
          <div className="ua-admin-table-wrap">
            <table className="ua-admin-table">
              <thead><tr><th>{language === 'vi' ? 'Loại' : 'Type'}</th><th>{language === 'vi' ? 'Hoạt động' : 'Activity'}</th><th>{language === 'vi' ? 'Người dùng' : 'User'}</th><th>{language === 'vi' ? 'Thời gian' : 'Time'}</th></tr></thead>
              <tbody>{overview.data.recentActivity.map((item) => (
                <tr key={item.id}>
                  <td>{item.type === 'trip' ? (language === 'vi' ? 'Lịch trình' : 'Trip') : 'Feedback'}</td>
                  <td><strong>{item.label}</strong></td>
                  <td>{item.ownerId || '—'}</td>
                  <td>{item.occurredAt ? new Date(item.occurredAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <UnavailableState title={language === 'vi' ? 'Chưa có hoạt động' : 'No recent activity'} description={language === 'vi' ? 'Trip và feedback mới sẽ xuất hiện tại đây.' : 'New trips and feedback will appear here.'} />}
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
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [selectedPoi, setSelectedPoi] = useState<AdminPoiRecord | null>(null);
  const deferredQuery = useDeferredValue(query);
  const result = useAdminPois({ query: deferredQuery, category, source });
  return (
    <div className="ua-admin-stack" data-admin-view="poi">
      <div className="ua-admin-metric-grid ua-admin-metric-grid--compact">
        <MetricCard icon={<Database size={19} />} label="Canonical POIs" value={snapshot.canonicalPois?.toLocaleString('en-US') || '—'} helper={language === 'vi' ? 'Runtime Da Nang hiện tại' : 'Current Da Nang runtime'} />
        <MetricCard icon={<ShieldCheck size={19} />} label={language === 'vi' ? 'Schema canonical' : 'Canonical schema'} value={snapshot.canonicalHeaderValid === null ? '—' : snapshot.canonicalHeaderValid ? 'PASS' : 'FAIL'} helper={language === 'vi' ? 'Nguồn: Admin POI Summary' : 'Source: Admin POI Summary'} />
      </div>
      <div className="ua-admin-filterbar">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'vi' ? 'Tìm tên, địa chỉ hoặc mã POI' : 'Search name, address, or POI ID'} /></label>
        <label><SlidersHorizontal size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{language === 'vi' ? 'Mọi danh mục' : 'All categories'}</option>{result.data.filters.categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><Database size={15} /><select value={source} onChange={(event) => setSource(event.target.value)}><option value="">{language === 'vi' ? 'Mọi nguồn' : 'All sources'}</option>{result.data.filters.sources.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      {result.loading ? <div className="ua-admin-skeleton ua-admin-skeleton--table" role="status" /> : result.error ? <UnavailableState title={language === 'vi' ? 'Không thể tải POI' : 'POIs unavailable'} description={result.error} /> : result.data.pois.length ? (
        <div className="ua-admin-table-wrap"><table className="ua-admin-table"><thead><tr><th>{language === 'vi' ? 'Địa điểm' : 'Place'}</th><th>{language === 'vi' ? 'Danh mục' : 'Category'}</th><th>{language === 'vi' ? 'Nguồn' : 'Source'}</th><th>{language === 'vi' ? 'Đánh giá' : 'Rating'}</th><th>{language === 'vi' ? 'Chi tiết' : 'Details'}</th></tr></thead><tbody>{result.data.pois.map((poi) => <tr key={poi.poiId}><td><strong>{poi.name}</strong><span className="ua-admin-table__secondary">{poi.address || poi.poiId}</span></td><td>{poi.category}</td><td>{poi.source || '—'}</td><td>{poi.rating === null ? '—' : `${poi.rating.toFixed(1)} · ${poi.reviewCount ?? '—'}`}</td><td><button type="button" className="ua-admin-icon-button" onClick={() => setSelectedPoi(poi)} title={language === 'vi' ? 'Xem chi tiết' : 'View details'}><Eye size={16} /></button></td></tr>)}</tbody></table></div>
      ) : <UnavailableState title={language === 'vi' ? 'Không tìm thấy POI' : 'No POIs found'} description={language === 'vi' ? 'Hãy thử từ khóa hoặc bộ lọc khác.' : 'Try another keyword or filter.'} />}
      <p className="ua-admin-source-note">{language === 'vi' ? `Hiển thị ${result.data.pois.length}/${result.data.total} POI · Chế độ chỉ đọc.` : `Showing ${result.data.pois.length}/${result.data.total} POIs · Read-only.`}</p>
      {selectedPoi && <DetailDrawer title={selectedPoi.name} onClose={() => setSelectedPoi(null)}><DetailRow label="POI ID" value={selectedPoi.poiId} /><DetailRow label={language === 'vi' ? 'Danh mục' : 'Category'} value={selectedPoi.category} /><DetailRow label={language === 'vi' ? 'Địa chỉ' : 'Address'} value={selectedPoi.address} /><DetailRow label={language === 'vi' ? 'Khu vực' : 'District'} value={selectedPoi.district} /><DetailRow label={language === 'vi' ? 'Nguồn' : 'Source'} value={selectedPoi.source} /><DetailRow label={language === 'vi' ? 'Tọa độ' : 'Coordinates'} value={selectedPoi.location ? `${selectedPoi.location.lat}, ${selectedPoi.location.lng}` : null} /><DetailRow label={language === 'vi' ? 'Đánh giá' : 'Rating'} value={selectedPoi.rating === null ? null : `${selectedPoi.rating} (${selectedPoi.reviewCount ?? '—'})`} /></DetailDrawer>}
    </div>
  );
}

export function AdminTrips() {
  const { language } = useLanguage();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const result = useAdminTrips();
  const detail = useAdminTripDetail(selectedTripId);
  if (result.loading) return <div className="ua-admin-skeleton ua-admin-skeleton--table" role="status" />;
  if (result.error) return <UnavailableState icon={<MapPinned size={22} />} title={language === 'vi' ? 'Không thể tải lịch trình' : 'Trips unavailable'} description={result.error} />;
  if (!result.data.trips.length) return <UnavailableState icon={<MapPinned size={22} />} title={language === 'vi' ? 'Chưa có lịch trình đã lưu' : 'No saved trips'} description={language === 'vi' ? 'Lịch trình đã lưu của người dùng sẽ xuất hiện tại đây.' : 'Traveler saved trips will appear here.'} />;
  return (
    <div className="ua-admin-stack" data-admin-view="trips">
      <div className="ua-admin-table-wrap"><table className="ua-admin-table"><thead><tr><th>{language === 'vi' ? 'Lịch trình' : 'Trip'}</th><th>{language === 'vi' ? 'Người dùng' : 'User'}</th><th>{language === 'vi' ? 'Ngày / điểm' : 'Days / stops'}</th><th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th><th>{language === 'vi' ? 'Cập nhật' : 'Updated'}</th><th>{language === 'vi' ? 'Chi tiết' : 'Details'}</th></tr></thead><tbody>{result.data.trips.map((trip) => <tr key={trip.tripId}><td><strong>{trip.title}</strong><span className="ua-admin-table__secondary">{trip.startDate || trip.tripId}</span></td><td>{trip.ownerId || '—'}</td><td>{trip.dayCount} / {trip.stopCount}</td><td><StatusBadge status={trip.needsReplan ? 'waiting' : 'active'} /></td><td>{trip.updatedAt ? new Date(trip.updatedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</td><td><button type="button" className="ua-admin-icon-button" onClick={() => setSelectedTripId(trip.tripId)} title={language === 'vi' ? 'Xem chi tiết' : 'View details'}><Eye size={16} /></button></td></tr>)}</tbody></table></div>
      {selectedTripId && <DetailDrawer title={language === 'vi' ? 'Chi tiết lịch trình' : 'Trip details'} onClose={() => setSelectedTripId(null)}>{detail.loading ? <div className="ua-admin-skeleton ua-admin-skeleton--table" /> : detail.error || !detail.data.trip ? <UnavailableState title={language === 'vi' ? 'Không thể tải chi tiết' : 'Details unavailable'} description={detail.error || 'Trip not found'} /> : <TripDetail trip={detail.data.trip} language={language} />}</DetailDrawer>}
    </div>
  );
}

function TripDetail({ trip, language }: { trip: AdminTripRecord; language: 'vi' | 'en' }) {
  return <><DetailRow label="Trip ID" value={trip.tripId} /><DetailRow label={language === 'vi' ? 'Chủ sở hữu' : 'Owner'} value={trip.ownerId} /><DetailRow label={language === 'vi' ? 'Ngày bắt đầu' : 'Start date'} value={trip.startDate} /><DetailRow label={language === 'vi' ? 'Số ngày' : 'Days'} value={trip.dayCount} /><DetailRow label={language === 'vi' ? 'Phương tiện' : 'Transport'} value={trip.transport} /><h3 className="ua-admin-detail__subheading">{language === 'vi' ? 'Điểm dừng' : 'Stops'}</h3>{trip.stops?.length ? <ol className="ua-admin-stop-list">{trip.stops.map((stop) => <li key={stop.stopId || `${stop.dayNumber}-${stop.order}`}><span>{stop.dayNumber}.{stop.order}</span><div><strong>{stop.poi.name}</strong><small>{stop.arrivalTime || '—'} - {stop.departureTime || '—'} · {stop.poi.category}</small></div></li>)}</ol> : <p className="ua-admin-source-note">{language === 'vi' ? 'Không có điểm dừng.' : 'No stops.'}</p>}</>;
}

export function AdminAnalytics() {
  const { language } = useLanguage();
  return <UnavailableState icon={<Activity size={22} />} title={language === 'vi' ? 'Chưa có nguồn analytics quản trị' : 'No admin analytics source'} description={language === 'vi' ? 'Không dựng biểu đồ giả cho lượt tìm kiếm, tạo chuyến đi, quan tâm danh mục hay feedback.' : 'No fabricated charts are rendered for searches, trip generation, category interest, or feedback.'} />;
}

export function AdminFeedback() {
  const { language } = useLanguage();
  const result = useAdminFeedback();
  if (result.loading) return <div className="ua-admin-skeleton ua-admin-skeleton--table" role="status" />;
  if (result.error) return <UnavailableState icon={<MessageSquare size={22} />} title={language === 'vi' ? 'Không thể tải feedback' : 'Feedback unavailable'} description={result.error} />;
  if (!result.data.feedback.length) return <UnavailableState icon={<MessageSquare size={22} />} title={language === 'vi' ? 'Chưa có feedback' : 'No feedback yet'} description={language === 'vi' ? 'Đánh giá và tín hiệu hành trình sẽ xuất hiện tại đây.' : 'Ratings and trip signals will appear here.'} />;
  return (
    <div className="ua-admin-table-wrap" data-admin-view="feedback"><table className="ua-admin-table"><thead><tr><th>{language === 'vi' ? 'Tín hiệu' : 'Signal'}</th><th>{language === 'vi' ? 'Người dùng' : 'User'}</th><th>{language === 'vi' ? 'Đánh giá' : 'Rating'}</th><th>{language === 'vi' ? 'Nội dung' : 'Message'}</th><th>POI / Trip</th><th>{language === 'vi' ? 'Thời gian' : 'Time'}</th></tr></thead><tbody>{result.data.feedback.map((item) => <tr key={item.eventId}><td><strong>{item.eventType}</strong></td><td>{item.userId || '—'}</td><td>{item.rating === null ? '—' : <span className="ua-admin-rating"><Star size={13} fill="currentColor" />{item.rating}</span>}</td><td>{item.message || '—'}</td><td>{item.poiId || item.itineraryId || '—'}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</td></tr>)}</tbody></table></div>
  );
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
