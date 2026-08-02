import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

type Pace = 'relaxed' | 'balanced' | 'packed';
type Transport = 'walk' | 'motorbike' | 'car' | 'taxi';
type Status = 'idle' | 'loading' | 'success' | 'error';

type DayWindow = {
  dayNumber: number;
  startTime: string;
  endTime: string;
};

type PublicPoi = {
  id?: string;
  globalId?: string;
  name?: string;
  category?: string | null;
  addressRaw?: string | null;
  district?: string | null;
};

type Recommendation = {
  poi: PublicPoi;
  score: number;
  reason: string;
  reasonCodes: string[];
  warnings: string[];
  provenance?: {
    source?: string | null;
  } | null;
};

type TravelLeg = {
  distanceKm?: number | null;
  travelDurationMinutes?: number | null;
  estimatedMinutes?: number | null;
  distanceKnown?: boolean;
  travelTimeKnown?: boolean;
  calculationSource?: string;
  source?: string;
};

type TripStop = {
  stopId: string;
  order: number;
  dayNumber: number;
  poi: PublicPoi;
  arrivalTime: string | null;
  departureTime: string | null;
  durationMinutes: number;
  travelFromPrevious?: TravelLeg;
  reason?: string;
  reasonCodes?: string[];
  warnings?: string[];
};

type TripDay = {
  dayNumber: number;
  dailyWindow?: { start: string; end: string } | null;
  feasibilityStatus: string;
  stops: string[];
  stopCount: number;
  unscheduled?: Array<{ poiId?: string | null; reasonCode: string; message: string }>;
  warnings?: Array<{ code: string; scope?: string }>;
};

type TripPreview = {
  tripId: string | null;
  persisted: boolean;
  feasibilityStatus: string;
  dayCount: number;
  dailyWindow?: { start: string; end: string } | null;
  days: TripDay[];
  stops: TripStop[];
  unscheduled: Array<{ poiId?: string | null; reasonCode: string; message: string }>;
  warnings: Array<{ code: string; scope?: string }>;
  routeSummary?: {
    totalDistanceKm?: number | null;
    totalTravelMinutes?: number | null;
    totalStayMinutes?: number | null;
    status?: string;
  };
  provenance?: {
    source?: string;
    externalLiveDataUsed?: boolean;
  };
};

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
  };
};

type Preset = {
  id: string;
  name: string;
  query: string;
  dayCount: number;
  defaultStart: string;
  defaultEnd: string;
  pace: Pace;
  transport: Transport;
  maxStopsPerDay: number;
  dayWindows?: DayWindow[];
};

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:7860').replace(/\/$/, '');
const CITY_ID = 'da-nang';

const presets: Preset[] = [
  {
    id: 'one-day-balanced',
    name: 'Một ngày cân bằng',
    query: 'quán cafe yên tĩnh, điểm check-in đẹp, ẩm thực địa phương',
    dayCount: 1,
    defaultStart: '09:00',
    defaultEnd: '18:00',
    pace: 'balanced',
    transport: 'motorbike',
    maxStopsPerDay: 3,
  },
  {
    id: 'two-days-custom',
    name: 'Hai ngày giờ khác nhau',
    query: 'cafe ven biển, bảo tàng, món địa phương, ngắm hoàng hôn',
    dayCount: 2,
    defaultStart: '09:00',
    defaultEnd: '20:00',
    pace: 'balanced',
    transport: 'motorbike',
    maxStopsPerDay: 3,
    dayWindows: [
      { dayNumber: 1, startTime: '09:00', endTime: '20:00' },
      { dayNumber: 2, startTime: '08:00', endTime: '16:00' },
    ],
  },
  {
    id: 'tight-window',
    name: 'Khung giờ hẹp',
    query: 'quán cafe nổi bật gần trung tâm',
    dayCount: 1,
    defaultStart: '10:00',
    defaultEnd: '10:30',
    pace: 'packed',
    transport: 'motorbike',
    maxStopsPerDay: 4,
  },
];

function createWindows(dayCount: number, startTime: string, endTime: string, overrides: DayWindow[] = []) {
  return Array.from({ length: dayCount }, (_, index) => {
    const dayNumber = index + 1;
    const override = overrides.find((item) => item.dayNumber === dayNumber);
    return {
      dayNumber,
      startTime: override?.startTime || startTime,
      endTime: override?.endTime || endTime,
    };
  });
}

function minutesOf(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function stopPoiId(poi: PublicPoi) {
  return poi.globalId || poi.id || '';
}

function formatCodes(codes?: string[]) {
  return codes?.length ? codes.join(', ') : 'canonical_dataset_match';
}

function formatTravel(leg?: TravelLeg) {
  if (!leg || leg.distanceKnown === false || leg.travelTimeKnown === false) {
    return 'không rõ';
  }
  const minutes = leg.travelDurationMinutes ?? leg.estimatedMinutes;
  const distance = leg.distanceKm;
  if (typeof minutes === 'number' && typeof distance === 'number') {
    return `${minutes} phút, ${distance.toFixed(2)} km`;
  }
  if (typeof minutes === 'number') return `${minutes} phút`;
  return 'không rõ';
}

async function postJson<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    throw new Error(`${message}${payload?.error?.code ? ` (${payload.error.code})` : ''}`);
  }
  return payload;
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'FEASIBLE'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : status === 'FEASIBLE_WITH_WARNINGS'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : status === 'PARTIAL'
        ? 'border-orange-200 bg-orange-50 text-orange-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

export default function DemoTripPlannerPage() {
  const [query, setQuery] = useState(presets[0].query);
  const [dayCount, setDayCount] = useState(presets[0].dayCount);
  const [defaultStart, setDefaultStart] = useState(presets[0].defaultStart);
  const [defaultEnd, setDefaultEnd] = useState(presets[0].defaultEnd);
  const [customDays, setCustomDays] = useState(false);
  const [dayWindows, setDayWindows] = useState(() => createWindows(1, '09:00', '18:00'));
  const [pace, setPace] = useState<Pace>('balanced');
  const [transport, setTransport] = useState<Transport>('motorbike');
  const [maxStopsPerDay, setMaxStopsPerDay] = useState(3);
  const [mustInclude, setMustInclude] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trip, setTrip] = useState<TripPreview | null>(null);
  const [recommendationStatus, setRecommendationStatus] = useState<Status>('idle');
  const [previewStatus, setPreviewStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const validationError = useMemo(() => {
    if (!query.trim()) return 'Nhập mô tả chuyến đi trước khi chạy demo.';
    if (minutesOf(defaultEnd) <= minutesOf(defaultStart)) return 'Giờ kết thúc mặc định phải sau giờ bắt đầu.';
    const invalidWindow = dayWindows.find((window) => minutesOf(window.endTime) <= minutesOf(window.startTime));
    if (customDays && invalidWindow) return `Ngày ${invalidWindow.dayNumber} có giờ kết thúc không hợp lệ.`;
    return null;
  }, [customDays, dayWindows, defaultEnd, defaultStart, query]);

  const activeDayWindows = useMemo(() => {
    if (!customDays) return [];
    return dayWindows
      .filter((window) => window.startTime !== defaultStart || window.endTime !== defaultEnd)
      .map((window) => ({
        dayNumber: window.dayNumber,
        startTime: window.startTime,
        endTime: window.endTime,
      }));
  }, [customDays, dayWindows, defaultEnd, defaultStart]);

  const day2EndsBy1600 = useMemo(() => {
    if (!trip) return null;
    const day2Stops = trip.stops.filter((stop) => stop.dayNumber === 2 && stop.departureTime);
    if (!day2Stops.length) return null;
    return day2Stops.every((stop) => stop.departureTime && stop.departureTime <= '16:00');
  }, [trip]);

  function updateDayCount(value: number) {
    const next = Math.min(7, Math.max(1, value));
    setDayCount(next);
    setDayWindows((current) => createWindows(next, defaultStart, defaultEnd, current));
  }

  function updateDefaultWindow(startTime: string, endTime: string) {
    setDefaultStart(startTime);
    setDefaultEnd(endTime);
    if (!customDays) {
      setDayWindows(createWindows(dayCount, startTime, endTime));
    }
  }

  function applyPreset(preset: Preset) {
    setQuery(preset.query);
    setDayCount(preset.dayCount);
    setDefaultStart(preset.defaultStart);
    setDefaultEnd(preset.defaultEnd);
    setPace(preset.pace);
    setTransport(preset.transport);
    setMaxStopsPerDay(preset.maxStopsPerDay);
    setCustomDays(Boolean(preset.dayWindows));
    setDayWindows(createWindows(preset.dayCount, preset.defaultStart, preset.defaultEnd, preset.dayWindows));
    setMustInclude([]);
    setExclude([]);
    setTrip(null);
    setError(null);
  }

  function addUnique(setter: (value: string[] | ((value: string[]) => string[])) => void, value: string) {
    if (!value) return;
    setter((items: string[]) => (items.includes(value) ? items : [...items, value]));
  }

  function requestBody() {
    return {
      cityId: CITY_ID,
      query: query.trim(),
      trip: {
        dayCount,
        dailyWindow: {
          startTime: defaultStart,
          endTime: defaultEnd,
        },
        dayWindows: activeDayWindows,
        transport,
        pace,
        budget: 'unknown',
      },
      constraints: {
        maxStopsPerDay,
        mustIncludePoiIds: mustInclude,
        excludePoiIds: exclude,
      },
      recommendationOptions: {
        limit: Math.min(12, dayCount * maxStopsPerDay + 3),
      },
    };
  }

  async function loadRecommendations() {
    if (validationError) {
      setError(validationError);
      return;
    }
    setRecommendationStatus('loading');
    setError(null);
    try {
      const response = await postJson<{ recommendations: Recommendation[] }>('/api/v2/recommendations', {
        cityId: CITY_ID,
        query: query.trim(),
        limit: 6,
        context: {},
      });
      setRecommendations(response.data?.recommendations || []);
      setRequestId(response.meta?.requestId || null);
      setRecommendationStatus('success');
    } catch (caught) {
      setRecommendationStatus('error');
      setError(caught instanceof Error ? caught.message : 'Không gọi được backend demo.');
    }
  }

  async function createPreview() {
    if (validationError) {
      setError(validationError);
      return;
    }
    setPreviewStatus('loading');
    setError(null);
    try {
      const response = await postJson<{ trip: TripPreview }>('/api/v2/trips/preview', requestBody());
      setTrip(response.data?.trip || null);
      setRequestId(response.meta?.requestId || null);
      setPreviewStatus('success');
    } catch (caught) {
      setPreviewStatus('error');
      setError(caught instanceof Error ? caught.message : 'Không tạo được lịch trình demo.');
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">UrbanAgent demo - Da Nang</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Lập lịch trình du lịch từ POI canonical</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Demo cục bộ dùng CSV runtime mặc định, không đăng nhập, không lưu chuyến đi và không gọi dữ liệu ngoài.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-4 lg:w-[520px]">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-slate-500">City Pack</div>
              <div>Đà Nẵng</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-slate-500">POI</div>
              <div>4166</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-slate-500">Runtime</div>
              <div>CSV</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-slate-500">API</div>
              <div>v2 preview</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-700" />
              <h2 className="text-base font-bold">Preset quay video</h2>
            </div>
            <div className="grid gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                >
                  {preset.name}
                  <Play className="h-4 w-4" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal-700" />
              <h2 className="text-base font-bold">Thông tin chuyến đi</h2>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              Mô tả sở thích
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Số ngày
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={dayCount}
                  onChange={(event) => updateDayCount(Number(event.target.value))}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Điểm/ngày
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={maxStopsPerDay}
                  onChange={(event) => setMaxStopsPerDay(Math.min(6, Math.max(1, Number(event.target.value))))}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Nhịp đi
                <select
                  value={pace}
                  onChange={(event) => setPace(event.target.value as Pace)}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="relaxed">Thư thả</option>
                  <option value="balanced">Cân bằng</option>
                  <option value="packed">Dày lịch</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Di chuyển
                <select
                  value={transport}
                  onChange={(event) => setTransport(event.target.value as Transport)}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="walk">Đi bộ</option>
                  <option value="motorbike">Xe máy</option>
                  <option value="car">Ô tô</option>
                  <option value="taxi">Taxi</option>
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Clock3 className="h-4 w-4 text-teal-700" />
                  Giờ mặc định mỗi ngày
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomDays(!customDays);
                    setDayWindows(createWindows(dayCount, defaultStart, defaultEnd, dayWindows));
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-white"
                >
                  {customDays ? 'Tắt tùy chỉnh' : 'Tùy chỉnh ngày'}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  aria-label="Giờ bắt đầu mặc định"
                  type="time"
                  value={defaultStart}
                  onChange={(event) => updateDefaultWindow(event.target.value, defaultEnd)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  aria-label="Giờ kết thúc mặc định"
                  type="time"
                  value={defaultEnd}
                  onChange={(event) => updateDefaultWindow(defaultStart, event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {customDays ? (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setDayWindows(createWindows(dayCount, defaultStart, defaultEnd))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-teal-300"
                  >
                    Áp dụng mặc định cho mọi ngày
                  </button>
                  {dayWindows.map((window) => (
                    <div key={window.dayNumber} className="grid grid-cols-[64px_1fr_1fr] items-center gap-2 text-sm">
                      <span className="font-semibold text-slate-600">Ngày {window.dayNumber}</span>
                      <input
                        type="time"
                        value={window.startTime}
                        onChange={(event) => setDayWindows((items) => items.map((item) => (
                          item.dayNumber === window.dayNumber ? { ...item, startTime: event.target.value } : item
                        )))}
                        className="rounded-md border border-slate-300 px-2 py-1.5"
                      />
                      <input
                        type="time"
                        value={window.endTime}
                        onChange={(event) => setDayWindows((items) => items.map((item) => (
                          item.dayNumber === window.dayNumber ? { ...item, endTime: event.target.value } : item
                        )))}
                        className="rounded-md border border-slate-300 px-2 py-1.5"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={loadRecommendations}
                disabled={recommendationStatus === 'loading'}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {recommendationStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gợi ý điểm đến
              </button>
              <button
                type="button"
                onClick={createPreview}
                disabled={previewStatus === 'loading'}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {previewStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
                Tạo lịch trình
              </button>
            </div>

            {validationError || error ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error || validationError}</span>
                </div>
              </div>
            ) : null}
          </section>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Kết quả API thật</h2>
                <p className="text-sm text-slate-600">Backend: {API_BASE} {requestId ? `- request ${requestId}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {mustInclude.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMustInclude((items) => items.filter((item) => item !== id))}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                  >
                    Bắt buộc {id}<X className="h-3 w-3" />
                  </button>
                ))}
                {exclude.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setExclude((items) => items.filter((item) => item !== id))}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800"
                  >
                    Loại {id}<X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold">Gợi ý điểm đến</h2>
                {recommendationStatus === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
              </div>
              <div className="space-y-3">
                {recommendations.length ? recommendations.map((item, index) => {
                  const id = stopPoiId(item.poi);
                  return (
                    <article key={`${id}-${index}`} className="rounded-md border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold">{item.poi.name || id}</h3>
                          <p className="mt-1 text-xs text-slate-500">{item.poi.category || 'Chưa rõ danh mục'} - {id}</p>
                        </div>
                        <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800">
                          {item.score.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{item.reason}</p>
                      <p className="mt-1 text-xs text-slate-500">Reason codes: {formatCodes(item.reasonCodes)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addUnique(setMustInclude, id)}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                        >
                          <Plus className="h-3 w-3" /> Bắt buộc
                        </button>
                        <button
                          type="button"
                          onClick={() => addUnique(setExclude, id)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" /> Loại khỏi lịch
                        </button>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="rounded-md border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                    Chạy preset hoặc nhấn gợi ý điểm đến để xem top POI.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold">Lịch trình preview</h2>
                {trip ? <StatusPill status={trip.feasibilityStatus} /> : null}
              </div>
              {trip ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                    <div className="rounded-md bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Persisted</div>
                      <div className="font-bold">{trip.persisted ? 'Có' : 'Không'}</div>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Stop</div>
                      <div className="font-bold">{trip.stops.length}</div>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Di chuyển</div>
                      <div className="font-bold">{trip.routeSummary?.totalTravelMinutes ?? 'unknown'} phút</div>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Nguồn ngoài</div>
                      <div className="font-bold">{trip.provenance?.externalLiveDataUsed ? 'Có' : 'Không'}</div>
                    </div>
                  </div>

                  {day2EndsBy1600 !== null ? (
                    <div className={`rounded-md border p-3 text-sm font-semibold ${day2EndsBy1600 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                      Ngày 2 kết thúc trước 16:00: {day2EndsBy1600 ? 'Đạt' : 'Không đạt'}
                    </div>
                  ) : null}

                  {trip.days.map((day) => {
                    const stops = trip.stops.filter((stop) => stop.dayNumber === day.dayNumber);
                    return (
                      <div key={day.dayNumber} className="rounded-md border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="font-bold">Ngày {day.dayNumber}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Clock3 className="h-4 w-4" />
                            {day.dailyWindow ? `${day.dailyWindow.start} - ${day.dailyWindow.end}` : 'Không rõ giờ'}
                          </div>
                          <StatusPill status={day.feasibilityStatus} />
                        </div>
                        <div className="divide-y divide-slate-100">
                          {stops.map((stop) => (
                            <article key={stop.stopId} className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                                  {stop.order}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="min-w-0 truncate text-sm font-bold">{stop.poi.name || stop.poi.globalId}</h3>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                      {stop.durationMinutes} phút
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {stop.arrivalTime || '--:--'} đến {stop.departureTime || '--:--'} - {stop.poi.category || 'Chưa rõ danh mục'}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                    <MapPin className="h-3 w-3" />
                                    {stop.poi.addressRaw || stop.poi.district || 'Địa chỉ chưa rõ'}
                                  </p>
                                  <p className="mt-2 text-sm text-slate-700">{stop.reason}</p>
                                  <p className="mt-1 text-xs text-slate-500">Reason codes: {formatCodes(stop.reasonCodes)}</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-600">
                                    Thời gian di chuyển ước tính: {formatTravel(stop.travelFromPrevious)}
                                  </p>
                                  {stop.warnings?.length ? (
                                    <p className="mt-1 text-xs text-amber-700">Warnings: {stop.warnings.join(', ')}</p>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          ))}
                          {!stops.length ? (
                            <div className="p-3 text-sm text-slate-500">Không có stop được xếp trong ngày này.</div>
                          ) : null}
                        </div>
                        {day.unscheduled?.length ? (
                          <div className="border-t border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
                            Chưa xếp được: {day.unscheduled.map((item) => item.reasonCode).join(', ')}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {trip.warnings?.length ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Warnings: {trip.warnings.map((item) => item.code).join(', ')}
                    </div>
                  ) : null}
                  {trip.unscheduled?.length ? (
                    <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                      Unscheduled: {trip.unscheduled.map((item) => item.reasonCode).join(', ')}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 p-8 text-center">
                  <RefreshCw className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm text-slate-500">Chọn preset, lấy gợi ý rồi tạo lịch trình preview.</p>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
