import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  CloudSun,
  Compass,
  Loader2,
  Map,
  MapPin,
  Play,
  Route,
  Save,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../../utils/apiClient';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/useAuth';
import { TripPreviewDayMap } from './TripPreviewDayMap';
import { TripPreviewStopActions } from './TripPreviewStopActions';
import { TravelerItineraryViewSwitch, type TravelerItineraryView } from './TravelerItineraryViewSwitch';
import {
  TravelerRecommendationPanel,
  type TravelerRecommendationCandidate,
} from './TravelerRecommendationPanel';
import {
  humanizeFeasibility,
  humanizeReasonCode,
  humanizeWarning,
  uniquePresentationLabels,
} from './travelerPresentation';
import { TravelerRouteModal } from './TravelerRouteModal';
import { TravelerStopTravelActions } from './TravelerStopTravelActions';
import {
  buildGrabBookingUrl,
  getCurrentLocationOnce,
  normalizeTravelerRoute,
  normalizeCoordinatePair,
  type TravelerRouteResult,
} from './travelerCapabilities';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type Role = 'traveler' | 'business';

interface PoiResult {
  id: string;
  title: string;
  name: string;
  address?: string;
  category: string;
  district: string;
  lat: number;
  lon: number;
  hasCoordinates?: boolean;
  score: number;
  rating?: number;
  reason: string;
  warnings?: string[];
  actions?: { type: string; label: string; url?: string }[];
}

interface ItineraryItem {
  order: number;
  poi: PoiResult;
  dayNumber?: number;
  arrivalTime?: string | null;
  departureTime?: string | null;
  suggestedStayMinutes?: number;
  travelFromPrevious?: {
    distanceKm: number | null;
    estimatedMinutes: number | null;
    transport: string;
    distanceKnown?: boolean;
    travelTimeKnown?: boolean;
    source?: string;
  };
  reason: string;
}

interface TravelerRecommendationV2 {
  poi: unknown;
  score: number;
  reason: string;
  reasonCodes?: string[];
  warnings?: string[];
}

interface TripPreviewStop {
  stopId: string;
  order: number;
  dayNumber: number;
  poi: unknown;
  arrivalTime: string | null;
  departureTime: string | null;
  durationMinutes: number;
  travelFromPrevious?: {
    distanceKm?: number | null;
    travelDurationMinutes?: number | null;
    estimatedMinutes?: number | null;
    distanceKnown?: boolean;
    travelTimeKnown?: boolean;
    calculationSource?: string;
    source?: string;
  };
  reason?: string;
  reasonCodes?: string[];
  warnings?: string[];
}

interface TripPreviewDay {
  dayNumber: number;
  date?: string | null;
  dailyWindow?: { start: string; end: string } | null;
  feasibilityStatus: string;
  stops?: string[];
  stopCount?: number;
  warnings?: { code: string; message?: string; scope?: string }[];
  unscheduled?: { poiId?: string | null; reasonCode: string; message: string }[];
}

interface TripPreviewResponse {
  feasibilityStatus: string;
  dayCount: number;
  dailyWindow?: { start: string; end: string } | null;
  days: TripPreviewDay[];
  stops: TripPreviewStop[];
  warnings?: { code: string; message?: string; scope?: string }[];
  unscheduled?: { poiId?: string | null; reasonCode: string; message: string }[];
  routeSummary?: {
    totalDistanceKm?: number | null;
    totalTravelMinutes?: number | null;
    totalStayMinutes?: number | null;
    totalPlanMinutes?: number | null;
    status?: string;
  };
  provenance?: { source?: string; externalLiveDataUsed?: boolean };
}

interface TripDayWindow {
  dayNumber: number;
  startTime: string;
  endTime: string;
}

interface BusinessArea {
  id: string;
  lat: number;
  lon: number;
  score: number;
  reason: string;
  warnings: string[];
  signals: {
    demandProxy: number;
    competitionPenalty: number;
    complementary: number;
    accessibility: number;
    conceptFit: number;
    directCompetitors: number;
    semanticHits: number;
  };
  topCategories: { category: string; count: number }[];
  samplePOIs: { id: string; name: string; category: string; rating: number }[];
  evidence?: {
    rawCounts: {
      poiTotalInArea: number;
      directCompetitorsInArea: number;
      semanticHitsInArea: number;
      complementaryCandidates: number;
    };
    complementaryPOIs: { evidenceId: string; name: string; category: string; rating: number; distanceKm: number }[];
    competitors: { evidenceId: string; name: string; category: string; rating: number; distanceKm: number }[];
    routeWarnings: { evidenceId: string; warning: string }[];
  };
  llmInsight?: {
    summary: string;
    area_potential: string;
    complementary_poi_analysis: string;
    risk_warnings: string[];
    recommended_actions: string[];
    used_evidence_ids: string[];
    missing_evidence: string[];
  };
  guardrail?: {
    hallucinationChecked: boolean;
    passed: boolean;
    unsupportedClaims: string[];
  };
}

interface SavedItinerary {
  tripId: string;
  title: string;
  cityId?: string;
  query: string;
  startDate?: string;
  dayCount?: number;
  dailyWindow?: { startTime?: string; endTime?: string; start?: string; end?: string } | null;
  dayWindows?: TripDayWindow[];
  pace?: string;
  transport: string;
  includedPoiIds?: string[];
  excludedPoiIds?: string[];
  request?: unknown;
  preview?: TripPreviewResponse | null;
  itinerary?: ItineraryItem[];
  stops?: {
    stopId?: string;
    poiId: string;
    order: number;
    dayNumber?: number;
    stayMinutes: number;
    reason: string;
    addedBy: 'agent' | 'user';
    poiSnapshot?: Partial<PoiResult>;
  }[];
  warnings?: unknown[];
  needsReplan?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

const DA_NANG_CENTER = { lat: 16.0544, lon: 108.2022 };
const TRAVEL_INTERESTS = [
  'cafe yên tĩnh',
  'ẩm thực địa phương',
  'gần biển',
  'điểm chụp ảnh',
  'văn hóa - bảo tàng',
  'phù hợp gia đình',
];

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysIso(dateText: string, dayOffset: number) {
  const [year, month, day] = dateText.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatVietnameseDate(dateText?: string | null) {
  if (!dateText) return '';
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return dateText;
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function minutesOf(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTripPreviewTransport(value: string) {
  return value === 'walking' ? 'walk' : value;
}

function toUiTransport(value: string) {
  return value === 'walk' ? 'walking' : value;
}

function createTripDayWindows(dayCount: number, startTime: string, endTime: string, current: TripDayWindow[] = []) {
  return Array.from({ length: dayCount }, (_, index) => {
    const dayNumber = index + 1;
    const existing = current.find((item) => item.dayNumber === dayNumber);
    return {
      dayNumber,
      startTime: existing?.startTime || startTime,
      endTime: existing?.endTime || endTime,
    };
  });
}

function isFiniteCoord(lat?: number | null, lon?: number | null) {
  return normalizeCoordinatePair(lat, lon).hasCoordinates;
}

function valueRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function poiFromV2(input: unknown, fallbackIndex = 0): PoiResult {
  const source = valueRecord(input);
  const poi = valueRecord(source.poi || input);
  const location = valueRecord(poi.location);
  const address = valueRecord(poi.address);
  const rating = valueRecord(poi.rating);
  const normalizedRating = valueRecord(rating.normalized);
  const coordinates = normalizeCoordinatePair(location.lat ?? poi.lat, location.lon ?? poi.lon ?? poi.lng);
  const id = String(poi.globalId || poi.id || `v2-poi-${fallbackIndex}`);
  const score = Number(source.score || poi.score || 0);
  return {
    id,
    title: stringValue(poi.name) || stringValue(poi.title) || `POI ${fallbackIndex + 1}`,
    name: stringValue(poi.name) || stringValue(poi.title) || `POI ${fallbackIndex + 1}`,
    address: stringValue(address.current) || stringValue(address.raw) || stringValue(poi.address) || stringValue(poi.addressRaw),
    category: stringValue(poi.category) || stringValue(poi.categoryNormalized) || 'place',
    district: stringValue(address.district) || stringValue(poi.district) || 'Đà Nẵng',
    lat: coordinates.lat,
    lon: coordinates.lon,
    hasCoordinates: location.hasCoordinates !== false && coordinates.hasCoordinates,
    rating: Number(normalizedRating.value ?? poi.rating) || undefined,
    score: Math.round(score <= 1 ? score * 100 : score),
    reason: stringValue(source.reason) || stringValue(poi.reason) || 'Phù hợp với nhu cầu chuyến đi.',
    warnings: Array.isArray(source.warnings) ? source.warnings.map(String) : [],
    actions: coordinates.hasCoordinates
      ? [
          {
            type: 'map',
            label: 'Google Maps',
            url: `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`,
          },
        ]
      : [],
  };
}

function poiIdFromTripStop(stop: TripPreviewStop, fallbackIndex = 0) {
  const poi = valueRecord(stop.poi);
  return String(poi.globalId || poi.id || stop.stopId || `trip-stop-${fallbackIndex}`);
}

function renumberTripPreview(preview: TripPreviewResponse): TripPreviewResponse {
  const sortedStops = [...preview.stops].sort((a, b) => (
    a.dayNumber - b.dayNumber ||
    a.order - b.order ||
    a.stopId.localeCompare(b.stopId)
  ));
  const renumberedStops = preview.days.flatMap((day) =>
    sortedStops
      .filter((stop) => stop.dayNumber === day.dayNumber)
      .map((stop, index) => ({ ...stop, order: index + 1 })),
  );
  const knownDayNumbers = new Set(preview.days.map((day) => day.dayNumber));
  const extraStops = sortedStops
    .filter((stop) => !knownDayNumbers.has(stop.dayNumber))
    .map((stop, index) => ({ ...stop, order: index + 1 }));
  const stops = [...renumberedStops, ...extraStops];
  return {
    ...preview,
    stops,
    days: preview.days.map((day) => {
      const dayStops = stops.filter((stop) => stop.dayNumber === day.dayNumber);
      return {
        ...day,
        stops: dayStops.map((stop) => stop.stopId),
        stopCount: dayStops.length,
      };
    }),
  };
}

function getWeatherDescription(code: number | undefined, language: 'vi' | 'en') {
  if (code === undefined || code === null) return '';
  const vi = language === 'vi';
  if (code === 0) return vi ? 'Trời quang' : 'Clear sky';
  if ([1, 2, 3].includes(code)) return vi ? 'Có mây' : 'Cloudy';
  if ([45, 48].includes(code)) return vi ? 'Có sương mù' : 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return vi ? 'Mưa phùn' : 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return vi ? 'Có mưa' : 'Rain';
  if ([95, 96, 99].includes(code)) return vi ? 'Có dông' : 'Thunderstorm';
  return vi ? 'Thời tiết hiện tại' : 'Current weather';
}

function formatCurrentWeather(weather: any, waitingText: string, language: 'vi' | 'en') {
  const current = weather?.current;
  if (!current) return waitingText;
  const temperature = Number(current.temperature_2m);
  const precipitation = Number(current.precipitation || 0);
  const description = getWeatherDescription(Number(current.weather_code), language);
  const tempText = Number.isFinite(temperature) ? `${Math.round(temperature)}°C` : '';
  const rainText = precipitation > 0
    ? (language === 'vi' ? `Mưa ${precipitation} mm` : `Rain ${precipitation} mm`)
    : (language === 'vi' ? 'Không mưa' : 'No rain');
  return [tempText, description, rainText].filter(Boolean).join(' · ');
}
const copy = {
  vi: {
    heroBadge: 'Lịch trình thông minh cho Đà Nẵng',
    title: 'UrbanAgent',
    subtitle:
      'Tìm địa điểm hợp sở thích, sắp xếp lịch trình theo từng ngày và theo dõi chuyến đi trên bản đồ.',
    travelerTitle: 'Khách đi chơi',
    travelerSubtitle: 'Tạo lịch trình, tìm quán hợp gu, chỉnh điểm đến và xem route bằng hệ chuyên gia.',
    travelerSample: 'Tạo cho tôi một lộ trình đi chơi tối nay có quán ăn, quán cafe yên tĩnh gần biển, đi bằng xe máy.',
    businessTitle: 'Người kinh doanh',
    businessSubtitle: 'Nhập concept để xem khu vực phù hợp, demand proxy, cạnh tranh và POI bổ trợ.',
    businessSample: 'Tôi muốn mở cafe học bài cho sinh viên tại Đà Nẵng.',
    prompt: 'Nhu cầu / concept',
    transport: 'Phương tiện',
    motorbike: 'Xe máy',
    car: 'Ô tô / Grab',
    walking: 'Đi bộ',
    inPlan: 'Điểm trong lịch',
    totalMove: 'Tổng di chuyển',
    weather: 'Thời tiết',
    stable: 'Ổn định',
    caution: 'Cần lưu ý',
    waiting: 'Đang chờ',
    minutes: 'phút',
    businessEmpty: 'Chạy agent để xem khu vực kinh doanh phù hợp.',
    businessReport: 'Báo cáo quyết định kinh doanh',
    potential: 'Tiềm năng khu vực',
    complementaryPoi: 'POI bổ trợ',
    risks: 'Rủi ro / điểm yếu',
    nextActions: 'Hành động tiếp theo',
    evidence: 'Bằng chứng dữ liệu',
    guardrailOk: 'Grounded',
    missingEvidence: 'Dữ liệu còn thiếu',
    area: 'Khu vực',
    opportunity: 'Opportunity',
    demand: 'Demand',
    conceptFit: 'Concept fit',
    complementary: 'Bổ trợ',
    accessibility: 'Tiếp cận',
    competition: 'Cạnh tranh',
    topCategories: 'Danh mục nổi bật',
    samplePois: 'POI mẫu',
    travelerMode: 'Chế độ khách du lịch',
    saveItinerary: 'Lưu lịch trình',
    saveChanges: 'Lưu thay đổi',
    savedItineraries: 'Lịch trình đã lưu',
    myTrips: 'Lịch trình của tôi',
    noSavedItineraries: 'Chưa có lịch trình đã lưu.',
    defaultSavedTitle: 'Lịch trình Đà Nẵng',
    savedOpened: 'Đã mở lại lịch trình đã lưu.',
    saveSuccess: 'Đã lưu thành công.',
    updateSuccess: 'Đã lưu thay đổi.',
    saveFailed: 'Không thể lưu lịch trình.',
    deleteTrip: 'Xóa',
    openTrip: 'Mở',
    dayUnit: 'ngày',
    deleteTripConfirm: 'Xóa lịch trình đã lưu này?',
    deleteSuccess: 'Đã xóa lịch trình.',
    deleteFailed: 'Không thể xóa lịch trình.',
    suggestedPlace: 'Địa điểm gợi ý',
    genericPlace: 'Địa điểm',
    defaultDistrict: 'Đà Nẵng',
    stopUnit: 'điểm dừng',
  },
  en: {
    heroBadge: 'Smart itineraries for Da Nang',
    title: 'UrbanAgent',
    subtitle:
      'Find places that fit your preferences, organize each day, and follow the trip on a map.',
    travelerTitle: 'Traveler',
    travelerSubtitle: 'Build itineraries, find matching POIs, edit stops, and inspect expert-system routes.',
    travelerSample: 'Create an evening itinerary with a restaurant, a quiet beach-side cafe, and motorbike routing.',
    businessTitle: 'Business owner',
    businessSubtitle: 'Describe a concept to score areas by demand proxy, competition and complementary POIs.',
    businessSample: 'I want to open a study cafe for students in Danang.',
    prompt: 'Need / concept',
    transport: 'Transport',
    motorbike: 'Motorbike',
    car: 'Car / Grab',
    walking: 'Walking',
    inPlan: 'Stops',
    totalMove: 'Travel time',
    weather: 'Weather',
    stable: 'Stable',
    caution: 'Caution',
    waiting: 'Waiting',
    minutes: 'min',
    businessEmpty: 'Run the agent to see suitable business areas.',
    businessReport: 'Business decision report',
    potential: 'Area potential',
    complementaryPoi: 'Complementary POIs',
    risks: 'Risks / weaknesses',
    nextActions: 'Next actions',
    evidence: 'Data evidence',
    guardrailOk: 'Grounded',
    missingEvidence: 'Missing evidence',
    area: 'Area',
    opportunity: 'Opportunity',
    demand: 'Demand',
    conceptFit: 'Concept fit',
    complementary: 'Complementary',
    accessibility: 'Access',
    competition: 'Competition',
    topCategories: 'Top categories',
    samplePois: 'Sample POIs',
    travelerMode: 'Traveler mode',
    saveItinerary: 'Save itinerary',
    saveChanges: 'Save changes',
    savedItineraries: 'Saved itineraries',
    myTrips: 'My trips',
    noSavedItineraries: 'No saved itineraries yet.',
    defaultSavedTitle: 'Danang itinerary',
    savedOpened: 'Saved itinerary reopened.',
    saveSuccess: 'Saved successfully.',
    updateSuccess: 'Changes saved.',
    saveFailed: 'Could not save itinerary.',
    deleteTrip: 'Delete',
    openTrip: 'Open',
    dayUnit: 'days',
    deleteTripConfirm: 'Delete this saved trip?',
    deleteSuccess: 'Trip deleted.',
    deleteFailed: 'Could not delete trip.',
    suggestedPlace: 'Suggested place',
    genericPlace: 'Place',
    defaultDistrict: 'Danang',
    stopUnit: 'stops',
  },
};

function percent(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

export default function UrbanAgentPage() {
  const { language } = useLanguage();
  const { user, firebaseReady, signInWithGoogle } = useAuth();
  const t = copy[language];
  const roleCopy = useMemo(
    () => ({
      traveler: { title: t.travelerTitle, subtitle: t.travelerSubtitle, sample: t.travelerSample },
      business: { title: t.businessTitle, subtitle: t.businessSubtitle, sample: t.businessSample },
    }),
    [t],
  );
  const [role] = useState<Role>('traveler');
  const [query, setQuery] = useState(t.travelerSample);
  const [transport, setTransport] = useState('motorbike');
  const [tripStartDate, setTripStartDate] = useState(todayIso);
  const [tripDayCount, setTripDayCount] = useState(2);
  const [defaultStartTime, setDefaultStartTime] = useState('09:00');
  const [defaultEndTime, setDefaultEndTime] = useState('20:00');
  const [tripDayWindows, setTripDayWindows] = useState<TripDayWindow[]>(() => createTripDayWindows(2, '09:00', '20:00'));
  const [pace, setPace] = useState('balanced');
  const [maxStopsPerDay, setMaxStopsPerDay] = useState(3);
  const [mustIncludePoiIds, setMustIncludePoiIds] = useState<string[]>([]);
  const [excludePoiIds, setExcludePoiIds] = useState<string[]>([]);
  const [travelerRecommendations, setTravelerRecommendations] = useState<TravelerRecommendationV2[]>([]);
  const [tripPreview, setTripPreview] = useState<TripPreviewResponse | null>(null);
  const [editableTripPreview, setEditableTripPreview] = useState<TripPreviewResponse | null>(null);
  const [tripPreviewDirty, setTripPreviewDirty] = useState(false);
  const [tripEditMessage, setTripEditMessage] = useState('');
  const [travelerRequestId, setTravelerRequestId] = useState('');
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationsRequested, setRecommendationsRequested] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [recommendationPanelOpen, setRecommendationPanelOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<'idle' | 'discovering' | 'scheduling' | 'updating'>('idle');
  const [previewError, setPreviewError] = useState('');
  const [selectedPreviewDay, setSelectedPreviewDay] = useState(1);
  const [selectedPreviewStopId, setSelectedPreviewStopId] = useState('');
  const [mobilePreviewView, setMobilePreviewView] = useState<TravelerItineraryView>('timeline');
  const [error, setError] = useState('');
  const [businessAreas, setBusinessAreas] = useState<BusinessArea[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeModalTitle, setRouteModalTitle] = useState('Bản đồ chuyến đi');
  const [routeRoutes, setRouteRoutes] = useState<TravelerRouteResult[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeOrigin, setRouteOrigin] = useState<[number, number] | null>(null);
  const [routeLoadingId, setRouteLoadingId] = useState('');
  const [routeError, setRouteError] = useState('');
  const [routeStops, setRouteStops] = useState<PoiResult[]>([]);
  const [bookingGrabId, setBookingGrabId] = useState('');
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [openedSavedItineraryId, setOpenedSavedItineraryId] = useState('');
  const [savingItinerary, setSavingItinerary] = useState(false);
  const [tripLifecycleLoading, setTripLifecycleLoading] = useState(false);
  const [savedTripsLoading, setSavedTripsLoading] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const previewStopRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const recommendationPanelRef = useRef<HTMLDivElement | null>(null);
  const schedulerRequestIdRef = useRef(0);
  const recommendationRequestIdRef = useRef(0);
  const routeRequestIdRef = useRef(0);

  useEffect(() => {
    schedulerRequestIdRef.current += 1;
    recommendationRequestIdRef.current += 1;
    routeRequestIdRef.current += 1;
    setQuery(roleCopy[role].sample);
    setError('');
    setTripPreview(null);
    setEditableTripPreview(null);
    setTripPreviewDirty(false);
    setTripEditMessage('');
    setRecommendationPanelOpen(false);
    setBusinessAreas([]);
    setRouteModalOpen(false);
    setRouteStops([]);
    setPreviewLoading(false);
    setRecommendationLoading(false);
    setRouteLoadingId('');
    setOpenedSavedItineraryId('');
  }, [role, roleCopy]);

  useEffect(() => {
    setTripDayWindows((current) => createTripDayWindows(tripDayCount, defaultStartTime, defaultEndTime, current));
  }, [defaultEndTime, defaultStartTime, tripDayCount]);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get(`/api/weather/forecast?lat=${DA_NANG_CENTER.lat}&lon=${DA_NANG_CENTER.lon}`)
      .then((data) => {
        if (mounted) setWeather(data);
      })
      .catch(() => {
        if (mounted) setWeather(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedItineraries([]);
      return;
    }
    let mounted = true;
    setSavedTripsLoading(true);
    apiClient
      .get('/api/v2/trips')
      .then((data) => {
        if (mounted) setSavedItineraries(data?.data?.trips || []);
      })
      .catch(() => {
        if (mounted) setSavedItineraries([]);
        if (mounted) setSaveMessage(language === 'vi' ? 'Không tải được lịch trình đã lưu.' : 'Could not load saved trips.');
      })
      .finally(() => {
        if (mounted) setSavedTripsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [language, user]);

  const requireAuthFor = async (message: string) => {
    if (user) return true;
    if (!firebaseReady) {
      setError('Firebase is not configured. Add VITE_FIREBASE_* values to the frontend .env file.');
      return false;
    }
    setError(message);
    try {
      await signInWithGoogle();
      setError('');
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : message);
      return false;
    }
  };

  const tripCalendarDays = useMemo(
    () => tripDayWindows.map((window) => ({
      ...window,
      date: tripStartDate ? addDaysIso(tripStartDate, window.dayNumber - 1) : '',
    })),
    [tripDayWindows, tripStartDate],
  );

  const activeDayWindowOverrides = useMemo(
    () => tripDayWindows
      .filter((window) => window.startTime !== defaultStartTime || window.endTime !== defaultEndTime)
      .map((window) => ({
        dayNumber: window.dayNumber,
        startTime: window.startTime,
        endTime: window.endTime,
      })),
    [defaultEndTime, defaultStartTime, tripDayWindows],
  );

  const activeTripPreview = editableTripPreview || tripPreview;
  const scheduledPoiIds = useMemo(() => new Set(
    (activeTripPreview?.stops || []).map((stop, index) => poiIdFromTripStop(stop, index)),
  ), [activeTripPreview]);
  const recommendationCandidates = useMemo<TravelerRecommendationCandidate[]>(() => (
    travelerRecommendations.map((item, index) => {
      const poi = poiFromV2(item, index);
      const status = scheduledPoiIds.has(poi.id)
        ? 'scheduled'
        : excludePoiIds.includes(poi.id)
          ? 'excluded'
          : mustIncludePoiIds.includes(poi.id)
            ? 'included'
            : 'recommended';
      return {
        id: poi.id,
        title: poi.title,
        category: poi.category,
        address: poi.address,
        reason: item.reason || poi.reason,
        reasonLabels: uniquePresentationLabels(item.reasonCodes || [], humanizeReasonCode),
        warningLabels: uniquePresentationLabels(item.warnings || [], humanizeWarning),
        score: poi.score,
        hasCoordinates: poi.hasCoordinates !== false && isFiniteCoord(poi.lat, poi.lon),
        status,
      };
    })
  ), [excludePoiIds, mustIncludePoiIds, scheduledPoiIds, travelerRecommendations]);

  const travelerValidationError = useMemo(() => {
    if (!query.trim()) return language === 'vi' ? 'Nhập nhu cầu chuyến đi trước.' : 'Enter trip preferences first.';
    if (!tripStartDate) return language === 'vi' ? 'Chọn ngày bắt đầu chuyến đi trước.' : 'Select the trip start date first.';
    if (minutesOf(defaultEndTime) <= minutesOf(defaultStartTime)) {
      return language === 'vi' ? 'Giờ kết thúc mặc định phải sau giờ bắt đầu.' : 'Default end time must be after start time.';
    }
    const invalid = tripDayWindows.find((window) => minutesOf(window.endTime) <= minutesOf(window.startTime));
    if (invalid) {
      return language === 'vi'
        ? `Ngày ${invalid.dayNumber} có giờ kết thúc không hợp lệ.`
        : `Day ${invalid.dayNumber} has an invalid end time.`;
    }
    return '';
  }, [defaultEndTime, defaultStartTime, language, query, tripDayWindows, tripStartDate]);

  useEffect(() => {
    if (!selectedPreviewStopId || mobilePreviewView === 'map') return;
    previewStopRefs.current[selectedPreviewStopId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [mobilePreviewView, selectedPreviewStopId]);

  const tripRequestBody = (overrides: {
    mustIncludePoiIds?: string[];
    excludePoiIds?: string[];
  } = {}) => ({
    cityId: 'da-nang',
    query: query.trim(),
    trip: {
      date: tripStartDate,
      dayCount: tripDayCount,
      dailyWindow: {
        startTime: defaultStartTime,
        endTime: defaultEndTime,
      },
      dayWindows: activeDayWindowOverrides,
      transport: toTripPreviewTransport(transport),
      pace,
      budget: 'unknown',
    },
    constraints: {
      maxStopsPerDay,
      mustIncludePoiIds: overrides.mustIncludePoiIds ?? mustIncludePoiIds,
      excludePoiIds: overrides.excludePoiIds ?? excludePoiIds,
    },
    recommendationOptions: {
      limit: Math.min(12, tripDayCount * maxStopsPerDay + 3),
    },
  });

  const markTripDirty = (message = 'Bạn đã thay đổi chuyến đi. Cập nhật lịch trình để tính toán lại.') => {
    if (!activeTripPreview) return;
    setTripPreviewDirty(true);
    setTripEditMessage(message);
  };

  const removeTripConstraintPoi = (poiId: string) => {
    const affectsCurrentTrip = scheduledPoiIds.has(poiId) || mustIncludePoiIds.includes(poiId);
    setMustIncludePoiIds((items) => items.filter((id) => id !== poiId));
    setExcludePoiIds((items) => items.filter((id) => id !== poiId));
    if (affectsCurrentTrip) markTripDirty();
  };

  const tripConstraintLabel = (poiId: string) => {
    const recommendation = travelerRecommendations.find((item, index) => poiFromV2(item, index).id === poiId);
    if (!recommendation) return poiId;
    return poiFromV2(recommendation).title;
  };

  const toggleInterest = (interest: string) => {
    setQuery((current) => {
      const terms = current.split(',').map((item) => item.trim()).filter(Boolean);
      if (terms.some((item) => item.toLocaleLowerCase('vi-VN') === interest.toLocaleLowerCase('vi-VN'))) {
        return terms.filter((item) => item.toLocaleLowerCase('vi-VN') !== interest.toLocaleLowerCase('vi-VN')).join(', ');
      }
      return [...terms, interest].join(', ');
    });
    markTripDirty();
  };

  const selectPreviewDay = (dayNumber: number, preview = activeTripPreview) => {
    setSelectedPreviewDay(dayNumber);
    setMobilePreviewView('timeline');
    const firstStop = preview?.stops
      .filter((stop) => stop.dayNumber === dayNumber)
      .sort((a, b) => a.order - b.order)[0];
    setSelectedPreviewStopId(firstStop?.stopId || '');
  };

  const previewToItinerary = (preview: TripPreviewResponse) => preview.stops.map((stop, index) => {
    const poi = poiFromV2({ poi: stop.poi, reason: stop.reason }, index);
    const leg = stop.travelFromPrevious || {};
    return {
      order: index + 1,
      dayNumber: stop.dayNumber,
      arrivalTime: stop.arrivalTime,
      departureTime: stop.departureTime,
      poi,
      suggestedStayMinutes: stop.durationMinutes,
      travelFromPrevious: {
        distanceKm: leg.distanceKm ?? null,
        estimatedMinutes: leg.travelDurationMinutes ?? leg.estimatedMinutes ?? null,
        transport,
        distanceKnown: leg.distanceKnown,
        travelTimeKnown: leg.travelTimeKnown,
        source: leg.calculationSource || leg.source,
      },
      reason: stop.reason || poi.reason,
    };
  });

  const applyEditableTripPreview = (preview: TripPreviewResponse, message: string) => {
    const nextPreview = renumberTripPreview(preview);
    setEditableTripPreview(nextPreview);
    setTripPreviewDirty(true);
    setTripEditMessage(message);
    const selectedDayStillExists = nextPreview.days.some((day) => day.dayNumber === selectedPreviewDay);
    const nextDay = selectedDayStillExists ? selectedPreviewDay : nextPreview.days[0]?.dayNumber || 1;
    setSelectedPreviewDay(nextDay);
    const selectedStillExists = nextPreview.stops.some((stop) => stop.stopId === selectedPreviewStopId && stop.dayNumber === nextDay);
    const firstStop = nextPreview.stops
      .filter((stop) => stop.dayNumber === nextDay)
      .sort((a, b) => a.order - b.order)[0];
    setSelectedPreviewStopId(selectedStillExists ? selectedPreviewStopId : firstStop?.stopId || '');
  };

  const applySavedTripLifecycleState = (savedTrip: SavedItinerary, message: string) => {
    setSavedItineraries((items) => [savedTrip, ...items.filter((item) => item.tripId !== savedTrip.tripId)]);
    setOpenedSavedItineraryId(savedTrip.tripId);
    setMustIncludePoiIds(savedTrip.includedPoiIds || []);
    setExcludePoiIds(savedTrip.excludedPoiIds || []);
    if (savedTrip.preview) {
      const preview = renumberTripPreview(savedTrip.preview);
      setTripPreview(preview);
      setEditableTripPreview(preview);
      const selectedDayStillExists = preview.days.some((day) => day.dayNumber === selectedPreviewDay);
      const nextDay = selectedDayStillExists ? selectedPreviewDay : preview.days[0]?.dayNumber || 1;
      setSelectedPreviewDay(nextDay);
      const selectedStillExists = preview.stops.some((stop) => stop.stopId === selectedPreviewStopId && stop.dayNumber === nextDay);
      const firstStop = preview.stops
        .filter((stop) => stop.dayNumber === nextDay)
        .sort((a, b) => a.order - b.order)[0];
      setSelectedPreviewStopId(selectedStillExists ? selectedPreviewStopId : firstStop?.stopId || '');
    }
    const needsReplan = Boolean(savedTrip.needsReplan);
    setTripPreviewDirty(needsReplan);
    setTripEditMessage(needsReplan ? message : '');
    setSaveMessage(message);
  };

  const applyCalculatedTripPreview = (preview: TripPreviewResponse, requestId = '') => {
    const calculated = renumberTripPreview(preview);
    setTripPreview(calculated);
    setEditableTripPreview(calculated);
    setTripPreviewDirty(false);
    setTripEditMessage('');
    if (requestId) setTravelerRequestId(requestId);
    const selectedStillValid = calculated.days.some((day) => day.dayNumber === selectedPreviewDay);
    const nextDay = selectedStillValid ? selectedPreviewDay : calculated.days[0]?.dayNumber || 1;
    setSelectedPreviewDay(nextDay);
    setSelectedPreviewStopId(calculated.stops
      .filter((stop) => stop.dayNumber === nextDay)
      .sort((a, b) => a.order - b.order)[0]?.stopId || '');
  };

  async function runTripScheduler({
    nextMustIncludePoiIds = mustIncludePoiIds,
    nextExcludePoiIds = excludePoiIds,
    successMessage = '',
  }: {
    nextMustIncludePoiIds?: string[];
    nextExcludePoiIds?: string[];
    successMessage?: string;
  } = {}) {
    const requestId = ++schedulerRequestIdRef.current;
    setPreviewLoading(true);
    setPreviewPhase(activeTripPreview ? 'updating' : 'scheduling');
    setPreviewError('');
    setError('');
    try {
      if (openedSavedItineraryId) {
        await apiClient.patch(
          `/api/v2/trips/${openedSavedItineraryId}`,
          currentTripPayload({
            mustIncludePoiIds: nextMustIncludePoiIds,
            excludePoiIds: nextExcludePoiIds,
            needsReplan: true,
          }),
        );
        const response = await apiClient.post(`/api/v2/trips/${openedSavedItineraryId}/replan`);
        const savedTrip = response?.data?.trip as SavedItinerary | undefined;
        if (!savedTrip) {
          throw new Error(language === 'vi' ? 'Chưa cập nhật được lịch trình đã lưu.' : 'Could not update the saved trip.');
        }
        if (requestId !== schedulerRequestIdRef.current) return null;
        applySavedTripLifecycleState(
          savedTrip,
          successMessage || (language === 'vi' ? 'Đã cập nhật lịch trình đã lưu.' : 'Saved trip updated.'),
        );
        setTravelerRequestId(response?.meta?.requestId || '');
        return savedTrip.preview || null;
      }

      const response = await apiClient.post('/api/v2/trips/preview', tripRequestBody({
        mustIncludePoiIds: nextMustIncludePoiIds,
        excludePoiIds: nextExcludePoiIds,
      }));
      const preview = response?.data?.trip as TripPreviewResponse | undefined;
      if (!preview) throw new Error('Chưa tạo được lịch trình từ phản hồi máy chủ.');
      if (requestId !== schedulerRequestIdRef.current) return null;
      applyCalculatedTripPreview(preview, response?.meta?.requestId || '');
      if (successMessage) setSaveMessage(successMessage);
      return preview;
    } catch (caught) {
      if (requestId !== schedulerRequestIdRef.current) return null;
      const message = caught instanceof Error ? caught.message : 'Chưa thể cập nhật lịch trình. Vui lòng thử lại.';
      setPreviewError(message);
      throw caught;
    } finally {
      if (requestId === schedulerRequestIdRef.current) {
        setPreviewLoading(false);
        setPreviewPhase('idle');
      }
    }
  }

  const includeRecommendationPoi = async (poiId: string) => {
    const existsInRecommendations = travelerRecommendations.some((item, index) => poiFromV2(item, index).id === poiId);
    if (
      previewLoading ||
      !existsInRecommendations ||
      excludePoiIds.includes(poiId) ||
      scheduledPoiIds.has(poiId) ||
      mustIncludePoiIds.includes(poiId)
    ) return;
    const nextMustIncludePoiIds = [...mustIncludePoiIds, poiId];
    setMustIncludePoiIds(nextMustIncludePoiIds);
    markTripDirty('Đang thêm địa điểm và tính toán lại thời gian cho chuyến đi.');
    try {
      const preview = await runTripScheduler({
        nextMustIncludePoiIds,
      });
      if (!preview) return;
      const scheduled = preview?.stops.some((stop, index) => poiIdFromTripStop(stop, index) === poiId);
      if (!scheduled) {
        setTripPreviewDirty(true);
        setTripEditMessage('Địa điểm đã được giữ trong lựa chọn nhưng chưa thể xếp vào khung giờ hiện tại.');
        setSaveMessage('Chưa thể xếp địa điểm đã chọn vào lịch trình hiện tại.');
        return;
      }
      setSaveMessage('Đã thêm địa điểm và cập nhật lại lịch trình.');
    } catch {
      setTripPreviewDirty(true);
      setTripEditMessage('Đã giữ lựa chọn mới. Hãy thử cập nhật lịch trình lại.');
    }
  };

  const excludeRecommendationPoi = async (poiId: string) => {
    const existsInRecommendations = travelerRecommendations.some((item, index) => poiFromV2(item, index).id === poiId);
    if (!existsInRecommendations || excludePoiIds.includes(poiId)) return;
    const scheduledStop = activeTripPreview?.stops.find((stop, index) => poiIdFromTripStop(stop, index) === poiId);
    if (scheduledStop) {
      await removeScheduledStop(scheduledStop);
      return;
    }
    setMustIncludePoiIds((items) => items.filter((id) => id !== poiId));
    setExcludePoiIds((items) => [...items, poiId]);
  };

  const removeScheduledStop = async (stop: TripPreviewStop) => {
    if (!activeTripPreview || previewLoading) return;
    const poiId = poiIdFromTripStop(stop);
    const nextMustIncludePoiIds = mustIncludePoiIds.filter((id) => id !== poiId);
    const nextExcludePoiIds = poiId && !excludePoiIds.includes(poiId) ? [...excludePoiIds, poiId] : excludePoiIds;
    const nextPreview = {
      ...activeTripPreview,
      stops: activeTripPreview.stops.filter((item) => item.stopId !== stop.stopId),
    };
    if (poiId) {
      setMustIncludePoiIds(nextMustIncludePoiIds);
      setExcludePoiIds(nextExcludePoiIds);
    }
    applyEditableTripPreview(nextPreview, 'Đang bỏ địa điểm và tính toán lại thời gian cho chuyến đi.');
    try {
      await runTripScheduler({
        nextMustIncludePoiIds,
        nextExcludePoiIds,
        successMessage: 'Đã bỏ địa điểm và cập nhật lại lịch trình.',
      });
    } catch {
      setTripPreviewDirty(true);
      setTripEditMessage('Địa điểm đã được bỏ khỏi bản chỉnh sửa. Hãy thử cập nhật lịch trình lại.');
    }
  };

  const moveScheduledStop = async (stop: TripPreviewStop, direction: -1 | 1) => {
    if (!activeTripPreview) return;
    const dayStops = activeTripPreview.stops
      .filter((item) => item.dayNumber === stop.dayNumber)
      .sort((a, b) => a.order - b.order);
    const index = dayStops.findIndex((item) => item.stopId === stop.stopId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= dayStops.length) return;
    const reorderedDayStops = [...dayStops];
    [reorderedDayStops[index], reorderedDayStops[nextIndex]] = [reorderedDayStops[nextIndex], reorderedDayStops[index]];
    const hasPersistedStopIds = reorderedDayStops.every((item) => item.stopId && !item.stopId.startsWith('saved-'));
    if (openedSavedItineraryId && hasPersistedStopIds) {
      setTripLifecycleLoading(true);
      setSaveMessage('');
      try {
        const response = await apiClient.patch(`/api/v2/trips/${openedSavedItineraryId}/stops/reorder`, {
          dayNumber: stop.dayNumber,
          stopIds: reorderedDayStops.map((item) => item.stopId),
        });
        const savedTrip = response?.data?.trip as SavedItinerary | undefined;
        if (savedTrip) {
          applySavedTripLifecycleState(
            savedTrip,
            language === 'vi'
              ? 'Lịch đã lưu được sắp xếp thủ công và chưa được tính toán lại.'
              : 'Saved trip order was changed manually and has not been recalculated.',
          );
        }
      } catch (error) {
        setSaveMessage(error instanceof Error ? error.message : t.saveFailed);
      } finally {
        setTripLifecycleLoading(false);
      }
      return;
    }
    const reorderedIds = new globalThis.Map(reorderedDayStops.map((item, itemIndex) => [item.stopId, itemIndex + 1]));
    const nextPreview = {
      ...activeTripPreview,
      stops: activeTripPreview.stops.map((item) => (
        item.dayNumber === stop.dayNumber && reorderedIds.has(item.stopId)
          ? { ...item, order: reorderedIds.get(item.stopId) || item.order }
          : item
      )),
    };
    applyEditableTripPreview(nextPreview, 'Lịch trình đã được chỉnh thủ công và chưa được tính toán lại.');
  };

  const requestTravelerRecommendations = async () => {
    const requestId = ++recommendationRequestIdRef.current;
    const response = await apiClient.post('/api/v2/recommendations', {
      cityId: 'da-nang',
      query: query.trim(),
      limit: Math.min(12, tripDayCount * maxStopsPerDay + 6),
      context: {},
    });
    const recommendations = response?.data?.recommendations || [];
    if (requestId !== recommendationRequestIdRef.current) return [] as TravelerRecommendationV2[];
    setTravelerRecommendations(recommendations);
    setTravelerRequestId(response?.meta?.requestId || '');
    setRecommendationsRequested(true);
    return recommendations as TravelerRecommendationV2[];
  };

  const loadTravelerRecommendations = async () => {
    if (travelerValidationError) {
      setError(travelerValidationError);
      return;
    }
    setRecommendationPanelOpen(true);
    setRecommendationLoading(true);
    setRecommendationsRequested(true);
    setRecommendationError('');
    setError('');
    try {
      await requestTravelerRecommendations();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Chưa lấy được gợi ý điểm đến. Vui lòng thử lại.';
      setRecommendationError(message);
    } finally {
      setRecommendationLoading(false);
      window.requestAnimationFrame(() => recommendationPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const openRecommendationMap = (poiId: string) => {
    const recommendationIndex = travelerRecommendations.findIndex((item, index) => poiFromV2(item, index).id === poiId);
    if (recommendationIndex < 0) return;
    const poi = poiFromV2(travelerRecommendations[recommendationIndex], recommendationIndex);
    if (poi.hasCoordinates === false || !isFiniteCoord(poi.lat, poi.lon)) return;
    routeRequestIdRef.current += 1;
    setRouteLoadingId('');
    setRouteModalTitle(poi.title);
    setRouteStops([poi]);
    setRouteRoutes([]);
    setSelectedRouteIndex(0);
    setRouteOrigin(null);
    setRouteError('');
    setRouteModalOpen(true);
  };

  const createTripPreview = async () => {
    if (travelerValidationError) {
      setError(travelerValidationError);
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    setError('');
    const stateVersion = schedulerRequestIdRef.current;
    try {
      if (!activeTripPreview) {
        setPreviewPhase('discovering');
        setRecommendationError('');
        await requestTravelerRecommendations();
        if (stateVersion !== schedulerRequestIdRef.current) return;
      }
      await runTripScheduler({
        successMessage: activeTripPreview ? 'Đã cập nhật lịch trình theo các thay đổi mới.' : '',
      });
    } catch (caught) {
      setPreviewError(caught instanceof Error ? caught.message : 'Chưa thể tạo lịch trình. Vui lòng thử lại.');
    } finally {
      setPreviewLoading(false);
      setPreviewPhase('idle');
    }
  };

  function currentTripPayload(overrides: {
    mustIncludePoiIds?: string[];
    excludePoiIds?: string[];
    preview?: TripPreviewResponse | null;
    needsReplan?: boolean;
  } = {}) {
    const nextMustIncludePoiIds = overrides.mustIncludePoiIds ?? mustIncludePoiIds;
    const nextExcludePoiIds = overrides.excludePoiIds ?? excludePoiIds;
    const nextPreview = overrides.preview === undefined ? activeTripPreview : overrides.preview;
    return {
      title: query.trim() || t.defaultSavedTitle,
      cityId: 'da-nang',
      query,
      startDate: tripStartDate,
      dayCount: tripDayCount,
      dailyWindow: {
        startTime: defaultStartTime,
        endTime: defaultEndTime,
      },
      dayWindows: tripDayWindows,
      pace,
      transport: toTripPreviewTransport(transport),
      includedPoiIds: nextMustIncludePoiIds,
      excludedPoiIds: nextExcludePoiIds,
      request: tripRequestBody({
        mustIncludePoiIds: nextMustIncludePoiIds,
        excludePoiIds: nextExcludePoiIds,
      }),
      preview: nextPreview,
      itinerary: nextPreview ? previewToItinerary(nextPreview) : [],
      warnings: nextPreview?.warnings || [],
      status: 'saved',
      needsReplan: overrides.needsReplan ?? tripPreviewDirty,
    };
  }

  const saveCurrentItinerary = async () => {
    if (!activeTripPreview?.stops.length) return;
    if (!user) {
      setSaveMessage(language === 'vi' ? 'Đăng nhập để lưu lịch trình' : 'Sign in to save this itinerary');
      return;
    }
    setSavingItinerary(true);
    setSaveMessage('');
    try {
      const canSave = await requireAuthFor(
        language === 'vi' ? 'Đăng nhập để lưu lịch trình vào tài khoản của bạn.' : 'Sign in to save this itinerary.',
      );
      if (!canSave) return;
      const payload = currentTripPayload();
      const result = openedSavedItineraryId
        ? await apiClient.patch(`/api/v2/trips/${openedSavedItineraryId}`, payload)
        : await apiClient.post('/api/v2/trips', payload);
      const savedTrip = result?.data?.trip as SavedItinerary | undefined;
      if (savedTrip) {
        setSavedItineraries((items) => [savedTrip, ...items.filter((item) => item.tripId !== savedTrip.tripId)]);
        setOpenedSavedItineraryId(savedTrip.tripId);
      }
      setTripPreviewDirty(false);
      setTripEditMessage('');
      setSaveMessage(openedSavedItineraryId ? t.updateSuccess : t.saveSuccess);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : t.saveFailed);
    } finally {
      setSavingItinerary(false);
    }
  };

  const openSavedItinerary = async (saved: SavedItinerary) => {
    setSaveMessage('');
    try {
      const response = await apiClient.get(`/api/v2/trips/${saved.tripId}`);
      const loaded = (response?.data?.trip || saved) as SavedItinerary;
      const loadedRequest = valueRecord(loaded.request);
      const loadedConstraints = valueRecord(loadedRequest.constraints);
      const loadedMaxStopsPerDay = Number(loadedConstraints.maxStopsPerDay);
      setQuery(loaded.query || query);
      setTripStartDate(loaded.startDate || tripStartDate);
      setTripDayCount(loaded.dayCount || tripDayCount);
      if (loaded.dailyWindow) {
        setDefaultStartTime(loaded.dailyWindow.startTime || loaded.dailyWindow.start || defaultStartTime);
        setDefaultEndTime(loaded.dailyWindow.endTime || loaded.dailyWindow.end || defaultEndTime);
      }
      if (loaded.dayWindows?.length) setTripDayWindows(loaded.dayWindows);
      setPace(loaded.pace || pace);
      setTransport(toUiTransport(loaded.transport || transport));
      if (Number.isInteger(loadedMaxStopsPerDay) && loadedMaxStopsPerDay >= 1 && loadedMaxStopsPerDay <= 6) {
        setMaxStopsPerDay(loadedMaxStopsPerDay);
      }
      setMustIncludePoiIds(loaded.includedPoiIds || []);
      setExcludePoiIds(loaded.excludedPoiIds || []);
      if (loaded.preview) {
        const preview = renumberTripPreview(loaded.preview);
        setTripPreview(preview);
        setEditableTripPreview(preview);
        setSelectedPreviewDay(preview.days[0]?.dayNumber || 1);
        setSelectedPreviewStopId(preview.stops[0]?.stopId || '');
      } else {
        const fallbackPreview = savedTripFallbackPreview(loaded);
        setTripPreview(fallbackPreview);
        setEditableTripPreview(fallbackPreview);
        setSelectedPreviewDay(fallbackPreview.days[0]?.dayNumber || 1);
        setSelectedPreviewStopId(fallbackPreview.stops[0]?.stopId || '');
      }
      setTripPreviewDirty(Boolean(loaded.needsReplan));
      setTripEditMessage(
        loaded.needsReplan
          ? language === 'vi'
            ? 'Lịch trình đã có thay đổi và cần tạo lại để hệ thống tính toán lại.'
            : 'This itinerary has saved changes and needs to be recalculated.'
          : '',
      );
      setOpenedSavedItineraryId(loaded.tripId);
      setSaveMessage(t.savedOpened);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : language === 'vi' ? 'Không mở được lịch trình đã lưu.' : 'Could not open saved trip.');
    }
  };

  const deleteSavedItinerary = async (saved: SavedItinerary) => {
    if (!window.confirm(t.deleteTripConfirm)) return;
    setDeletingTripId(saved.tripId);
    setSaveMessage('');
    try {
      await apiClient.delete(`/api/v2/trips/${saved.tripId}`);
      setSavedItineraries((items) => items.filter((item) => item.tripId !== saved.tripId));
      if (openedSavedItineraryId === saved.tripId) {
        setOpenedSavedItineraryId('');
      }
      setSaveMessage(t.deleteSuccess);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : t.deleteFailed);
    } finally {
      setDeletingTripId('');
    }
  };

  const recordFeedback = async (eventType: string, payload: Record<string, unknown>) => {
    if (!user) return;
    try {
      await apiClient.post('/api/agent/feedback', { role, eventType, query, payload });
    } catch {
      // Feedback is useful context, but it must never interrupt trip planning.
    }
  };

  const handleBookGrab = async (destination: PoiResult) => {
    if (destination.hasCoordinates === false || !isFiniteCoord(destination.lat, destination.lon)) {
      setSaveMessage('Địa điểm này chưa có tọa độ hợp lệ để mở Grab.');
      return;
    }
    setBookingGrabId(destination.id);
    setSaveMessage('');
    try {
      const pickup = await getCurrentLocationOnce(language);
      const url = buildGrabBookingUrl(destination, pickup);
      if (url) window.location.href = url;
      void recordFeedback('grab_booking_opened', {
        tripId: openedSavedItineraryId || null,
        poiId: destination.id,
        category: destination.category,
        pickupSource: 'browser_gps',
      });
    } catch {
      const url = buildGrabBookingUrl(destination);
      if (url) window.location.href = url;
      setSaveMessage('Grab sẽ yêu cầu bạn xác nhận điểm đón trong ứng dụng.');
      void recordFeedback('grab_booking_opened', {
        tripId: openedSavedItineraryId || null,
        poiId: destination.id,
        category: destination.category,
        pickupSource: 'grab_app',
        gpsUnavailable: true,
      });
    } finally {
      setBookingGrabId('');
    }
  };

  const loadExpertRoute = async (destination: PoiResult) => {
    if (destination.hasCoordinates === false || !isFiniteCoord(destination.lat, destination.lon)) {
      setError('Địa điểm này chưa có tọa độ hợp lệ để xem tuyến đường.');
      return;
    }
    const requestId = ++routeRequestIdRef.current;
    const canRoute = await requireAuthFor('Đăng nhập để xem tuyến đường bộ tham khảo trong UrbanAgent.');
    if (!canRoute || requestId !== routeRequestIdRef.current) return;

    setRouteLoadingId(destination.id);
    setRouteModalTitle(`Tuyến đường đến ${destination.title}`);
    setRouteStops([destination]);
    setRouteRoutes([]);
    setSelectedRouteIndex(0);
    setRouteOrigin(null);
    setRouteError('');
    setRouteModalOpen(true);
    try {
      const origin = await getCurrentLocationOnce(language);
      if (requestId !== routeRequestIdRef.current) return;
      setRouteOrigin([origin.lat, origin.lng]);
      const response = await apiClient.post('/api/route', {
        origin,
        destination: { lat: destination.lat, lng: destination.lon },
      });
      const routePayloads: unknown[] = Array.isArray(response?.routes) ? response.routes : [response];
      const routes = routePayloads
        .map((route: unknown) => normalizeTravelerRoute(route))
        .filter((route): route is TravelerRouteResult => route !== null);
      if (!routes.length) throw new Error('Máy chủ chưa trả về tuyến đường hợp lệ.');
      if (requestId !== routeRequestIdRef.current) return;
      setRouteRoutes(routes);
      void recordFeedback('route_requested', { poiId: destination.id, category: destination.category });
    } catch (caught) {
      if (requestId !== routeRequestIdRef.current) return;
      setRouteError(
        caught instanceof Error
          ? caught.message
          : 'Không thể tính tuyến đường. Bạn vẫn có thể mở Google Maps để chỉ đường.',
      );
    } finally {
      if (requestId === routeRequestIdRef.current) setRouteLoadingId('');
    }
  };

  const closeRouteModal = () => {
    routeRequestIdRef.current += 1;
    setRouteLoadingId('');
    setRouteModalOpen(false);
  };

  const itineraryMoveMinutes = (activeTripPreview?.stops || []).reduce((sum, stop) => (
    sum + Number(stop.travelFromPrevious?.travelDurationMinutes ?? stop.travelFromPrevious?.estimatedMinutes ?? 0)
  ), 0);
  const totalMoveMinutes = Number(activeTripPreview?.routeSummary?.totalTravelMinutes ?? itineraryMoveMinutes);
  const weatherText = formatCurrentWeather(weather, t.waiting, language);
  const previewLoadingLabel = previewPhase === 'discovering'
    ? 'Đang tìm địa điểm phù hợp...'
    : previewPhase === 'updating'
      ? 'Đang cập nhật lịch trình...'
      : 'Đang tạo lịch trình...';
  const plannerBusy = previewLoading || recommendationLoading || tripLifecycleLoading || savingItinerary;

  return (
    <div className="customer-agent min-h-full space-y-6 text-slate-700">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
              <Sparkles size={16} />
              {t.heroBadge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{t.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{t.subtitle}</p>
          </div>

          <div className="inline-flex min-w-[260px] items-center justify-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">
            <Users size={18} />
            {t.travelerMode}
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-800">
              <Compass />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Lên lịch trình Đà Nẵng</h2>
              <p className="text-sm leading-6 text-slate-600">
                Chọn ngày đi, thời gian rảnh và sở thích; UrbanAgent sẽ gợi ý điểm phù hợp rồi xếp thành lịch trình có thể theo được.
              </p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-700">Bạn muốn chuyến đi như thế nào?</label>
          <textarea
            value={query}
            disabled={plannerBusy}
            onChange={(event) => {
              setQuery(event.target.value);
              markTripDirty();
            }}
            placeholder="Ví dụ: cafe yên tĩnh gần biển, món địa phương, một vài điểm chụp ảnh nhẹ nhàng"
            className="min-h-[140px] w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {TRAVEL_INTERESTS.map((interest) => {
              const selected = query.toLocaleLowerCase('vi-VN').includes(interest.toLocaleLowerCase('vi-VN'));
              return (
                  <button
                    key={interest}
                    type="button"
                    disabled={plannerBusy}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-800'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          {role === 'traveler' && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t.transport}</label>
                <select
                  value={transport}
                  disabled={plannerBusy}
                  onChange={(event) => {
                    setTransport(event.target.value);
                    markTripDirty();
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="motorbike">{t.motorbike}</option>
                  <option value="car">{t.car}</option>
                  <option value="walking">{t.walking}</option>
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CalendarDays size={17} />
                  Thông tin chuyến đi
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Điểm đến</span>
                    <input
                      value="Đà Nẵng"
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Ngày bắt đầu</span>
                    <input
                      type="date"
                      value={tripStartDate}
                      disabled={plannerBusy}
                      onChange={(event) => {
                        setTripStartDate(event.target.value);
                        markTripDirty();
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Số ngày</span>
                    <select
                      value={tripDayCount}
                      disabled={plannerBusy}
                      onChange={(event) => {
                        setTripDayCount(Number(event.target.value));
                        markTripDirty();
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                        <option key={value} value={value}>{value} ngày</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Giờ bắt đầu mặc định</span>
                    <input
                      type="time"
                      value={defaultStartTime}
                      disabled={plannerBusy}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setTripDayWindows((items) => items.map((item) => (
                          item.startTime === defaultStartTime ? { ...item, startTime: nextValue } : item
                        )));
                        setDefaultStartTime(nextValue);
                        markTripDirty();
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Giờ kết thúc mặc định</span>
                    <input
                      type="time"
                      value={defaultEndTime}
                      disabled={plannerBusy}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setTripDayWindows((items) => items.map((item) => (
                          item.endTime === defaultEndTime ? { ...item, endTime: nextValue } : item
                        )));
                        setDefaultEndTime(nextValue);
                        markTripDirty();
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Nhịp đi</span>
                    <select
                      value={pace}
                      disabled={plannerBusy}
                      onChange={(event) => {
                        setPace(event.target.value);
                        markTripDirty();
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    >
                      <option value="relaxed">Thong thả</option>
                      <option value="balanced">Cân bằng</option>
                      <option value="packed">Đi nhiều điểm</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Số điểm tối đa mỗi ngày</span>
                    <select
                      value={maxStopsPerDay}
                      disabled={plannerBusy}
                      onChange={(event) => {
                        setMaxStopsPerDay(Number(event.target.value));
                        markTripDirty();
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    >
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-800">Thời gian rảnh theo ngày</div>
                  {tripCalendarDays.map((window) => (
                    <div key={window.dayNumber} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_92px_92px] sm:items-center">
                      <div className="min-w-0 text-xs text-slate-700">
                        <span className="font-semibold text-slate-950">{formatVietnameseDate(window.date)}</span>
                        <span className="ml-2 text-slate-500">Ngày {window.dayNumber}</span>
                      </div>
                      <input
                        type="time"
                        value={window.startTime}
                        disabled={plannerBusy}
                        onChange={(event) => {
                          setTripDayWindows((items) => items.map((item) => (
                            item.dayNumber === window.dayNumber ? { ...item, startTime: event.target.value } : item
                          )));
                          markTripDirty();
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none focus:border-teal-600"
                      />
                      <input
                        type="time"
                        value={window.endTime}
                        disabled={plannerBusy}
                        onChange={(event) => {
                          setTripDayWindows((items) => items.map((item) => (
                            item.dayNumber === window.dayNumber ? { ...item, endTime: event.target.value } : item
                          )));
                          markTripDirty();
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none focus:border-teal-600"
                      />
                    </div>
                  ))}
                </div>
                {travelerValidationError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    <AlertTriangle className="mt-0.5 shrink-0" size={15} />
                    {travelerValidationError}
                  </div>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={createTripPreview}
                    disabled={plannerBusy || Boolean(travelerValidationError)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {previewLoading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                    {previewLoading ? previewLoadingLabel : activeTripPreview ? 'Cập nhật lịch trình' : 'Tạo lịch trình'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {!user && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-800">
              {language === 'vi'
                ? 'Bạn có thể tạo và chỉnh lịch trình ngay. Đăng nhập khi muốn lưu chuyến đi vào tài khoản.'
                : 'You can create and edit a trip now. Sign in when you want to save it to your account.'}
            </div>
          )}
        </div>

        {role === 'traveler' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<MapPin />} label={t.inPlan} value={activeTripPreview?.stops.length || 0} />
              <MetricCard
                icon={<Route />}
                label={t.totalMove}
                value={`${Math.round(totalMoveMinutes)} ${t.minutes}`}
              />
              <MetricCard
                icon={<CloudSun />}
                label={t.weather}
                value={weatherText}
              />
            </div>

            {activeTripPreview && recommendationPanelOpen && (
              <div ref={recommendationPanelRef}>
                <TravelerRecommendationPanel
                  candidates={recommendationCandidates}
                  loading={recommendationLoading}
                  requested={recommendationsRequested}
                  error={recommendationError}
                  disabled={plannerBusy || Boolean(travelerValidationError)}
                  onRefresh={loadTravelerRecommendations}
                  onInclude={(poiId) => void includeRecommendationPoi(poiId)}
                  onExclude={(poiId) => void excludeRecommendationPoi(poiId)}
                  onRestore={removeTripConstraintPoi}
                  onInspectMap={openRecommendationMap}
                  onClose={() => setRecommendationPanelOpen(false)}
                />
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                    <CheckCircle2 size={14} />
                    Kế hoạch chuyến đi
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">Lịch trình của bạn</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Xem theo từng ngày và chọn cùng một điểm trên lịch trình hoặc bản đồ.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeTripPreview && (
                    <button
                      type="button"
                      onClick={() => void loadTravelerRecommendations()}
                      disabled={plannerBusy || Boolean(travelerValidationError)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-700 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {recommendationLoading ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                      {recommendationLoading ? 'Đang tìm địa điểm...' : 'Gợi ý thêm địa điểm'}
                    </button>
                  )}
                  {activeTripPreview && (
                    <button
                      type="button"
                      onClick={saveCurrentItinerary}
                      disabled={savingItinerary || plannerBusy}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-700 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingItinerary ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                      {openedSavedItineraryId ? t.saveChanges : t.saveItinerary}
                    </button>
                  )}
                </div>
              </div>

              {saveMessage && (
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 sm:flex-row sm:items-center sm:justify-between">
                  <span>{saveMessage}</span>
                  {!user && saveMessage.toLowerCase().includes(language === 'vi' ? 'đăng nhập' : 'sign in') && firebaseReady && (
                    <button
                      type="button"
                      onClick={() => void signInWithGoogle()}
                      className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                    >
                      {language === 'vi' ? 'Đăng nhập' : 'Sign in'}
                    </button>
                  )}
                </div>
              )}

              {previewError && (
                <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {previewError}
                </div>
              )}

              {(mustIncludePoiIds.length > 0 || excludePoiIds.length > 0) && (
                <div className="mb-4 flex flex-wrap gap-2 text-xs">
                  {mustIncludePoiIds.map((poiId) => (
                    <button
                      key={`include-${poiId}`}
                      type="button"
                      disabled={plannerBusy}
                      onClick={() => removeTripConstraintPoi(poiId)}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Thêm {tripConstraintLabel(poiId)}
                      <X size={12} />
                    </button>
                  ))}
                  {excludePoiIds.map((poiId) => (
                    <button
                      key={`exclude-${poiId}`}
                      type="button"
                      disabled={plannerBusy}
                      onClick={() => removeTripConstraintPoi(poiId)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Loại {tripConstraintLabel(poiId)}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              {activeTripPreview ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                      {humanizeFeasibility(activeTripPreview.feasibilityStatus)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                      {activeTripPreview.stops.length} điểm dừng
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                      Thời gian di chuyển ước tính: {activeTripPreview.routeSummary?.totalTravelMinutes ?? '--'} phút
                    </span>
                    {uniquePresentationLabels(
                      (activeTripPreview.warnings || []).map((warning) => warning.code),
                      humanizeWarning,
                    ).slice(0, 4).map((warningLabel) => (
                      <span key={warningLabel} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                        {warningLabel}
                      </span>
                    ))}
                    {travelerRequestId && <span className="text-slate-400">Mã yêu cầu {travelerRequestId}</span>}
                  </div>
                  {tripPreviewDirty && (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
                      <span>{tripEditMessage || 'Bạn đã thay đổi lịch trình. Hãy tạo lại lịch trình để hệ thống tính toán lại.'}</span>
                      <button
                        type="button"
                        onClick={createTripPreview}
                        disabled={plannerBusy || Boolean(travelerValidationError)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {previewLoading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        {previewLoading ? 'Đang cập nhật...' : 'Cập nhật lịch trình'}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {activeTripPreview.days.map((day) => (
                      <button
                        key={day.dayNumber}
                        type="button"
                        onClick={() => selectPreviewDay(day.dayNumber)}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${
                          selectedPreviewDay === day.dayNumber
                            ? 'border-teal-600 bg-teal-50 text-teal-800'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                        }`}
                      >
                        <span className="block font-semibold">{formatVietnameseDate(day.date || addDaysIso(tripStartDate, day.dayNumber - 1))}</span>
                        <span>Ngày {day.dayNumber}</span>
                      </button>
                    ))}
                  </div>

                  {activeTripPreview.days.map((day) => {
                    if (day.dayNumber !== selectedPreviewDay) return null;
                    const dayStops = activeTripPreview.stops
                      .filter((stop) => stop.dayNumber === day.dayNumber)
                      .sort((a, b) => a.order - b.order);
                    return (
                      <div key={day.dayNumber} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">
                              {formatVietnameseDate(day.date || addDaysIso(tripStartDate, day.dayNumber - 1))}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {day.dailyWindow ? `${day.dailyWindow.start} - ${day.dailyWindow.end}` : 'Khung giờ chưa biết'} · {humanizeFeasibility(day.feasibilityStatus)}
                            </p>
                          </div>
                        </div>
                        <TravelerItineraryViewSwitch value={mobilePreviewView} onChange={setMobilePreviewView} />
                        <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(320px,1fr)_420px]">
                          <div className={`${mobilePreviewView === 'timeline' ? 'block' : 'hidden'} space-y-3 md:block`}>
                            {dayStops.length === 0 && <EmptyState text="Ngày này chưa có điểm dừng phù hợp." />}
                            {dayStops.map((stop, stopIndex) => {
                              const poi = poiFromV2({ poi: stop.poi, reason: stop.reason }, stop.order - 1);
                              const leg = stop.travelFromPrevious;
                              const travelKnown = leg?.distanceKnown !== false && leg?.travelTimeKnown !== false;
                              const selected = selectedPreviewStopId === stop.stopId;
                              return (
                                <div
                                  key={stop.stopId}
                                  ref={(node) => {
                                    previewStopRefs.current[stop.stopId] = node;
                                  }}
                                  onClick={() => {
                                    setSelectedPreviewStopId(stop.stopId);
                                    setMobilePreviewView('timeline');
                                  }}
                                  className={`trip-preview-stop-card w-full cursor-pointer rounded-xl border p-4 text-left transition ${
                                    selected
                                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                                      : 'border-slate-200 bg-white hover:border-teal-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                                          selected ? 'bg-teal-700 text-white' : 'bg-sky-100 text-sky-900'
                                        }`}
                                        >
                                          {stop.order}
                                        </span>
                                        <h4 className="font-semibold text-slate-950">{poi.title}</h4>
                                      </div>
                                      <p className="mt-1 text-xs text-slate-500">{poi.category}</p>
                                    </div>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                      {stop.arrivalTime || '--'} - {stop.departureTime || '--'}
                                    </span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
                                    <Badge icon={<Clock3 size={14} />}>{stop.durationMinutes} phút tham quan</Badge>
                                    <Badge icon={<Car size={14} />}>
                                      {travelKnown && typeof (leg?.travelDurationMinutes ?? leg?.estimatedMinutes) === 'number'
                                        ? `${leg?.travelDurationMinutes ?? leg?.estimatedMinutes} phút di chuyển`
                                        : 'di chuyển chưa rõ'}
                                    </Badge>
                                    <Badge icon={<Map size={14} />}>
                                      {travelKnown && typeof leg?.distanceKm === 'number' ? `${leg.distanceKm} km` : 'khoảng cách chưa rõ'}
                                    </Badge>
                                  </div>
                                  <p className="mt-3 text-sm leading-6 text-slate-700">{stop.reason || poi.reason}</p>
                                  {Boolean(stop.reasonCodes?.length) && (
                                    <details className="mt-2 text-xs text-slate-600">
                                      <summary className="cursor-pointer">Tín hiệu phù hợp</summary>
                                      <p className="mt-1 text-teal-800">{uniquePresentationLabels(stop.reasonCodes || [], humanizeReasonCode).join(' · ')}</p>
                                    </details>
                                  )}
                                  {Boolean(stop.warnings?.length) && (
                                    <p className="mt-2 text-xs text-amber-800">{uniquePresentationLabels(stop.warnings || [], humanizeWarning).join(' · ')}</p>
                                  )}
                                  <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                                    <TripPreviewStopActions
                                      canMoveUp={stopIndex > 0}
                                      canMoveDown={stopIndex < dayStops.length - 1}
                                      onMoveUp={() => moveScheduledStop(stop, -1)}
                                      onMoveDown={() => moveScheduledStop(stop, 1)}
                                      onRemove={() => removeScheduledStop(stop)}
                                      disabled={plannerBusy}
                                    />
                                    <TravelerStopTravelActions
                                      poi={poi}
                                      routeLoading={routeLoadingId === poi.id}
                                      grabLoading={bookingGrabId === poi.id}
                                      disabled={plannerBusy}
                                      canSendFeedback={Boolean(user)}
                                      onInspectRoute={() => void loadExpertRoute(poi)}
                                      onBookRide={() => void handleBookGrab(poi)}
                                      onFeedback={(eventType) => void recordFeedback(eventType, {
                                        poiId: poi.id,
                                        category: poi.category,
                                      })}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className={`${mobilePreviewView === 'map' ? 'block' : 'hidden'} md:block`}>
                            <TripPreviewDayMap
                              dayStops={dayStops}
                              selectedStopId={selectedPreviewStopId}
                              authenticated={Boolean(user)}
                              transport={toTripPreviewTransport(transport)}
                              onSelectStop={(stopId) => {
                                setSelectedPreviewStopId(stopId);
                                setMobilePreviewView('timeline');
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="Chọn ngày đi và tạo lịch trình để xem kế hoạch theo từng ngày." />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{t.myTrips}</h2>
                  <p className="mt-1 text-sm text-slate-600">Mở lại chuyến đi đã lưu để tiếp tục chỉnh sửa.</p>
                </div>
                {savedTripsLoading && <Loader2 className="animate-spin text-teal-700" size={18} />}
              </div>
              {savedItineraries.length === 0 && <EmptyState text={t.noSavedItineraries} />}
              <div className="grid gap-3 md:grid-cols-2">
                {savedItineraries.map((saved) => (
                  <div
                    key={saved.tripId}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-300"
                  >
                    <button
                      type="button"
                      onClick={() => openSavedItinerary(saved)}
                      disabled={plannerBusy}
                      className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="font-semibold text-slate-950">{saved.title || saved.query || t.defaultSavedTitle}</div>
                      <div className="mt-2 text-sm text-slate-600">
                        {saved.startDate || '--'} · {saved.dayCount || saved.preview?.dayCount || 1} {t.dayUnit} · {saved.updatedAt ? new Date(saved.updatedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '--'}
                      </div>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openSavedItinerary(saved)}
                        disabled={plannerBusy}
                        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t.openTrip}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedItinerary(saved)}
                        disabled={deletingTripId === saved.tripId || plannerBusy}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingTripId === saved.tripId ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                        {t.deleteTrip}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="space-y-4">
            {businessAreas.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
                <EmptyState text={t.businessEmpty} />
              </div>
            )}
            {businessAreas.map((area, index) => (
              <div key={area.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-bold text-slate-950">
                        Top {index + 1}
                      </span>
                      <h3 className="text-xl font-semibold text-white">
                        {t.area} {area.lat.toFixed(3)}, {area.lon.toFixed(3)}
                      </h3>
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{area.reason}</p>
                    {area.warnings?.map((warning) => (
                      <p key={warning} className="mt-2 text-sm text-amber-200">
                        {warning}
                      </p>
                    ))}
                  </div>
                  <div className="rounded-xl bg-emerald-400/10 px-5 py-4 text-center">
                    <div className="text-3xl font-bold text-emerald-300">{area.score}</div>
                    <div className="text-xs uppercase tracking-wide text-emerald-100/70">{t.opportunity}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  <Signal label={t.demand} value={percent(area.signals.demandProxy)} />
                  <Signal label={t.conceptFit} value={percent(area.signals.conceptFit)} />
                  <Signal label={t.complementary} value={percent(area.signals.complementary)} />
                  <Signal label={t.accessibility} value={percent(area.signals.accessibility)} />
                  <Signal label={t.competition} value={percent(area.signals.competitionPenalty)} />
                </div>

                {area.llmInsight && (
                  <BusinessInsightPanel area={area} text={t} />
                )}

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-200">{t.topCategories}</h4>
                    <div className="flex flex-wrap gap-2">
                      {area.topCategories.map((item) => (
                        <span key={item.category} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {item.category}: {item.count}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-200">{t.samplePois}</h4>
                    <div className="space-y-1 text-sm text-slate-400">
                      {area.samplePOIs.slice(0, 3).map((poi) => (
                        <div key={poi.id}>
                          {poi.name} - {poi.category}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <TravelerRouteModal
        open={routeModalOpen}
        title={routeModalTitle}
        routes={routeRoutes}
        selectedRouteIndex={selectedRouteIndex}
        routeStops={routeStops}
        origin={routeOrigin}
        loading={Boolean(routeLoadingId)}
        error={routeError}
        onClose={closeRouteModal}
        onSelectRoute={setSelectedRouteIndex}
      />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-teal-700">{icon}</div>
      <div className="break-words text-xl font-bold leading-snug text-slate-950">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}

function savedTripFallbackPreview(saved: SavedItinerary): TripPreviewResponse {
  const defaultWindow = {
    start: saved.dailyWindow?.startTime || saved.dailyWindow?.start || '09:00',
    end: saved.dailyWindow?.endTime || saved.dailyWindow?.end || '18:00',
  };
  const sourceItems = saved.itinerary?.length
    ? saved.itinerary.map((item) => ({
        stopId: undefined,
        poiId: item.poi.id,
        order: item.order,
        dayNumber: item.dayNumber || 1,
        stayMinutes: item.suggestedStayMinutes || 60,
        reason: item.reason,
        poiSnapshot: item.poi,
        arrivalTime: item.arrivalTime || null,
        departureTime: item.departureTime || null,
        travelFromPrevious: item.travelFromPrevious,
      }))
    : (saved.stops || []).map((stop) => ({
        ...stop,
        dayNumber: stop.dayNumber || 1,
        arrivalTime: null,
        departureTime: null,
        travelFromPrevious: undefined,
      }));
  const dayCount = Math.max(
    saved.dayCount || 1,
    ...sourceItems.map((item) => item.dayNumber || 1),
  );
  const stops: TripPreviewStop[] = sourceItems.map((item, index) => {
    const snapshot = item.poiSnapshot || {};
    const snapshotRecord = valueRecord(snapshot);
    const snapshotLocation = valueRecord(snapshotRecord.location);
    const coordinates = normalizeCoordinatePair(
      snapshotLocation.lat ?? snapshotRecord.lat,
      snapshotLocation.lon ?? snapshotRecord.lon ?? snapshotRecord.lng,
    );
    const { lat, lon, hasCoordinates } = coordinates;
    return {
      stopId: item.stopId || `saved-${saved.tripId}-${item.poiId}-${index + 1}`,
      order: item.order || index + 1,
      dayNumber: item.dayNumber || 1,
      poi: {
        ...snapshot,
        id: snapshot.id || item.poiId,
        name: snapshot.name || snapshot.title || `Điểm dừng ${index + 1}`,
        lat: hasCoordinates ? lat : null,
        lon: hasCoordinates ? lon : null,
        location: { lat: hasCoordinates ? lat : null, lon: hasCoordinates ? lon : null, hasCoordinates },
      },
      arrivalTime: item.arrivalTime,
      departureTime: item.departureTime,
      durationMinutes: item.stayMinutes,
      travelFromPrevious: item.travelFromPrevious
        ? {
            distanceKm: item.travelFromPrevious.distanceKm,
            estimatedMinutes: item.travelFromPrevious.estimatedMinutes,
            distanceKnown: item.travelFromPrevious.distanceKnown,
            travelTimeKnown: item.travelFromPrevious.travelTimeKnown,
            source: item.travelFromPrevious.source,
          }
        : undefined,
      reason: item.reason,
      warnings: hasCoordinates ? [] : ['COORDINATES_UNKNOWN'],
    };
  });
  const days: TripPreviewDay[] = Array.from({ length: dayCount }, (_, index) => {
    const dayNumber = index + 1;
    const override = saved.dayWindows?.find((window) => window.dayNumber === dayNumber);
    const dayStops = stops.filter((stop) => stop.dayNumber === dayNumber);
    return {
      dayNumber,
      date: saved.startDate ? addDaysIso(saved.startDate, index) : null,
      dailyWindow: {
        start: override?.startTime || defaultWindow.start,
        end: override?.endTime || defaultWindow.end,
      },
      feasibilityStatus: saved.needsReplan ? 'FEASIBLE_WITH_WARNINGS' : 'FEASIBLE',
      stops: dayStops.map((stop) => stop.stopId),
      stopCount: dayStops.length,
      warnings: [],
      unscheduled: [],
    };
  });
  return renumberTripPreview({
    feasibilityStatus: saved.needsReplan ? 'FEASIBLE_WITH_WARNINGS' : 'FEASIBLE',
    dayCount,
    dailyWindow: defaultWindow,
    days,
    stops,
    warnings: saved.needsReplan
      ? [{ code: 'SAVED_TRIP_NEEDS_REPLAN', message: 'Lịch trình đã lưu có thay đổi và cần được cập nhật.' }]
      : [],
    unscheduled: [],
    provenance: { source: 'saved-trip-compatibility', externalLiveDataUsed: false },
  });
}

function Badge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700">
      {icon}
      {children}
    </span>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function BusinessInsightPanel({ area, text }: { area: BusinessArea; text: typeof copy.vi }) {
  const insight = area.llmInsight;
  if (!insight) return null;

  return (
    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white">{text.businessReport}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-300">{insight.summary}</p>
        </div>
        {area.guardrail?.hallucinationChecked && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              area.guardrail.passed
                ? 'bg-emerald-400/15 text-emerald-200'
                : 'bg-amber-400/15 text-amber-200'
            }`}
          >
            <CheckCircle2 size={14} />
            {text.guardrailOk}
          </span>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <InsightBlock title={text.potential} body={insight.area_potential} />
        <InsightBlock title={text.complementaryPoi} body={insight.complementary_poi_analysis} />
        <InsightList title={text.risks} items={insight.risk_warnings} tone="warning" />
        <InsightList title={text.nextActions} items={insight.recommended_actions} tone="action" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <h5 className="mb-2 text-sm font-semibold text-slate-200">{text.evidence}</h5>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <span>POI: {area.evidence?.rawCounts.poiTotalInArea ?? area.samplePOIs.length}</span>
            <span>Semantic: {area.evidence?.rawCounts.semanticHitsInArea ?? area.signals.semanticHits}</span>
            <span>Competitors: {area.evidence?.rawCounts.directCompetitorsInArea ?? area.signals.directCompetitors}</span>
            <span>Complementary: {area.evidence?.rawCounts.complementaryCandidates ?? 0}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {insight.used_evidence_ids.slice(0, 8).map((id) => (
              <span key={id} className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                {id}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <h5 className="mb-2 text-sm font-semibold text-slate-200">{text.missingEvidence}</h5>
          <div className="flex flex-wrap gap-2">
            {insight.missing_evidence.map((item) => (
              <span key={item} className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <h5 className="mb-2 text-sm font-semibold text-cyan-100">{title}</h5>
      <p className="text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: 'warning' | 'action' }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <h5 className={`mb-2 text-sm font-semibold ${tone === 'warning' ? 'text-amber-100' : 'text-emerald-100'}`}>
        {title}
      </h5>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}

