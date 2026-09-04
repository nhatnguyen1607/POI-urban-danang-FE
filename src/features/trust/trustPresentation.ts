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
  availability?: { state?: string; handoffRequired?: boolean };
  evidence?: TrustEvidence[];
};

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
