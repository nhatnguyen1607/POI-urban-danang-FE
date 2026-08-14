const WARNING_LABELS: Record<string, string> = {
  OPENING_HOURS_UNKNOWN: 'Chưa có thông tin giờ mở cửa',
  DURATION_ESTIMATED: 'Thời lượng tham quan là ước tính',
  TRAVEL_TIME_ESTIMATED: 'Thời gian di chuyển là ước tính',
  ORIGIN_NOT_PROVIDED: 'Chưa có điểm xuất phát; hệ thống không tự điền vị trí thay thế',
  MISSING_ORIGIN: 'Chưa có điểm xuất phát; hệ thống không tự điền vị trí thay thế',
  COORDINATES_UNKNOWN: 'Địa điểm chưa có tọa độ để hiển thị trên bản đồ',
  ADDRESS_UNKNOWN: 'Địa chỉ địa điểm chưa đầy đủ',
  RATING_UNKNOWN: 'Địa điểm chưa có điểm đánh giá',
  REVIEW_COUNT_UNKNOWN: 'Địa điểm chưa có số lượt đánh giá',
  DAILY_WINDOW_CONSTRAINED: 'Khung giờ trong ngày giới hạn số điểm có thể xếp',
  STOP_LIMIT_REACHED: 'Đã đạt số điểm tối đa trong ngày',
  MAX_STOPS_APPLIED: 'Đã áp dụng giới hạn số điểm mỗi ngày',
  UNSCHEDULED_POI: 'Một địa điểm chưa thể xếp vào khung giờ đã chọn',
};

const REASON_LABELS: Record<string, string> = {
  CATEGORY_MATCH: 'Phù hợp sở thích',
  QUERY_MATCH: 'Khớp nhu cầu chuyến đi',
  TEXT_MATCH: 'Nội dung phù hợp',
  HIGH_RATING: 'Được đánh giá tốt',
  RATING_SIGNAL: 'Có tín hiệu đánh giá tốt',
  REVIEW_SIGNAL: 'Có nhiều lượt quan tâm',
  DISTANCE_MATCH: 'Phù hợp về khoảng cách',
  DISTANCE_UNKNOWN: 'Chưa có khoảng cách từ điểm xuất phát',
  NEARBY: 'Thuận tiện trong khu vực',
  INTENT_MATCH: 'Phù hợp ý định chuyến đi',
  QUERY_TEXT_MATCH: 'Khớp mô tả của bạn',
  MUST_INCLUDE: 'Địa điểm bạn đã chọn',
  DIVERSITY: 'Giúp lịch trình đa dạng hơn',
  SOURCE_MATCH: 'Thông tin đã được đối chiếu',
};

const FEASIBILITY_LABELS: Record<string, string> = {
  FEASIBLE: 'Lịch trình khả thi',
  FEASIBLE_WITH_WARNINGS: 'Khả thi, có một vài lưu ý',
  PARTIALLY_FEASIBLE: 'Một phần lịch trình cần điều chỉnh',
  INFEASIBLE: 'Chưa thể xếp đủ lịch trình',
  UNKNOWN: 'Chưa xác định mức độ khả thi',
};

function fallbackLabel(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .toLocaleLowerCase('vi-VN')
    .replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('vi-VN'));
}

export function humanizeWarning(value?: string | null) {
  if (!value) return '';
  const normalized = value.trim();
  return WARNING_LABELS[normalized.toUpperCase()] || fallbackLabel(normalized);
}

export function humanizeReasonCode(value?: string | null) {
  if (!value) return '';
  const normalized = value.trim();
  return REASON_LABELS[normalized.toUpperCase()] || fallbackLabel(normalized);
}

export function humanizeFeasibility(value?: string | null) {
  if (!value) return FEASIBILITY_LABELS.UNKNOWN;
  const normalized = value.trim();
  return FEASIBILITY_LABELS[normalized.toUpperCase()] || fallbackLabel(normalized);
}

export function uniquePresentationLabels(values: Array<string | null | undefined>, mapper: (value: string) => string) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)).map(mapper).filter(Boolean)));
}
