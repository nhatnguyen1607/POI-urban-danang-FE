export type TrustEvidence = {
  sourceName?: string | null;
  sourceType?: string | null;
  lastVerifiedAt?: string | null;
  observedAt?: string | null;
  status?: string | null;
  freshnessState?: string | null;
  confidenceReason?: string | null;
  conflict?: boolean;
};

export type PoiTrust = {
  status?: string | null;
  freshnessState?: string | null;
  evidenceLevel?: string | null;
  currentStatusVerified?: boolean;
  conflict?: boolean;
  message?: string | null;
  availability?: {
    state?: string;
    handoffRequired?: boolean;
    providerStatus?: string;
    providerName?: string | null;
    observedAt?: string | null;
    validUntil?: string | null;
    price?: number | null;
    currency?: string | null;
  };
  handoff?: {
    providerId?: string;
    providerName?: string;
    capability?: string;
    url?: string;
    evidenceState?: string;
  } | null;
  evidence?: TrustEvidence[];
};

const HANDOFF_DOMAINS = ['booking.com', 'traveloka.com', 'grab.com', 'shopeefood.vn'];

export function safePartnerHandoffUrl(value?: string | null) {
  try {
    const url = new URL(value || '');
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' && HANDOFF_DOMAINS.some((domain) => hostname === domain || hostname.endsWith('.' + domain))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function availabilityPresentation(trust?: PoiTrust | null) {
  const availability = trust?.availability;
  const state = String(availability?.state || 'NOT_APPLICABLE');
  if (state === 'NOT_APPLICABLE' && !trust?.handoff) return null;
  if (state === 'CONFLICT') {
    return { label: 'Nguồn phòng trống chưa thống nhất', detail: 'Hãy kiểm tra trực tiếp với nhà cung cấp trước khi quyết định.', tone: 'warning' as const };
  }
  if (state === 'AVAILABLE') {
    return {
      label: 'Còn phòng theo đối tác',
      detail: availability?.observedAt ? 'Đã xác minh lúc ' + formatVerificationTime(availability.observedAt) + '.' : 'Đã được đối tác xác minh gần đây.',
      tone: 'positive' as const,
    };
  }
  if (state === 'SOLD_OUT' || state === 'UNAVAILABLE') {
    return { label: state === 'SOLD_OUT' ? 'Đối tác báo hết phòng' : 'Đối tác báo không khả dụng', detail: 'Trạng thái có thể thay đổi; hãy kiểm tra lại trước khi đặt.', tone: 'warning' as const };
  }
  if (state === 'STALE') {
    return { label: 'Thông tin phòng có thể đã thay đổi', detail: 'Bằng chứng khả dụng đã hết thời hạn và không còn được xem là trực tiếp.', tone: 'warning' as const };
  }
  return { label: 'Chưa xác minh phòng trống', detail: 'UrbanAgent chưa xác minh tình trạng phòng trống.', tone: 'neutral' as const };
}

export function trustPresentation(trust?: PoiTrust | null) {
  if (!trust) return { label: 'Chưa xác minh', tone: 'neutral' as const, detail: 'Chưa có bằng chứng trạng thái hiện hành.' };
  if (trust.conflict || trust.status === 'CONFLICT') {
    return { label: 'Nguồn chưa thống nhất', tone: 'warning' as const, detail: trust.message || 'Hãy xác minh trước khi đến.' };
  }
  if (trust.currentStatusVerified && trust.status === 'OPEN') {
    return { label: 'Đã xác minh gần đây', tone: 'positive' as const, detail: trust.message || 'Trạng thái mở cửa có bằng chứng còn hiệu lực.' };
  }
  if (trust.availability?.state === 'UNVERIFIED') {
    return { label: 'Phòng trống chưa xác minh', tone: 'neutral' as const, detail: trust.message || 'Kiểm tra với cơ sở lưu trú trước khi đặt.' };
  }
  if (['STALE', 'EXPIRED'].includes(String(trust.freshnessState))) {
    return { label: 'Dữ liệu cần kiểm tra lại', tone: 'warning' as const, detail: trust.message || 'Bằng chứng đã cũ.' };
  }
  return { label: 'Thông tin tham khảo', tone: 'neutral' as const, detail: trust.message || 'Vui lòng kiểm tra trước khi đến.' };
}

export function formatVerificationTime(value?: string | null) {
  if (!value) return 'Chưa có thời điểm xác minh';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Thời điểm xác minh không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
