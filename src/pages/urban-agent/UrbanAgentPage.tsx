import { useEffect, useMemo, useState } from 'react';
import {
  Car,
  CheckCircle2,
  CloudSun,
  Compass,
  Loader2,
  Map,
  MapPin,
  Plus,
  Route,
  Save,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
  UploadCloud,
  X,
} from 'lucide-react';
import { useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../../utils/apiClient';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/useAuth';
import { incrementPoiCounter } from '../../services/poiExperienceService';

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
  suggestedStayMinutes?: number;
  travelFromPrevious?: {
    distanceKm: number;
    estimatedMinutes: number;
    transport: string;
  };
  reason: string;
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

interface RouteResult {
  route: { coordinates: number[][] };
  distance: number;
  duration: number;
  steps: { instruction?: string; instructions?: string }[];
  esValidation: {
    valid: boolean;
    warnings: { message?: string; law?: string; severity?: string; location?: { lat: number; lng: number } }[];
    ruleTrace?: { step?: string; description?: string }[];
    fuzzyInsights?: { road?: string; label?: string }[];
    totalRulesChecked?: number;
  };
}

interface AgentTrainingStatus {
  backend?: {
    synthetic?: { sample_count?: number; expected_poi_count?: number; hard_negative_count?: number };
    representationData?: { record_count?: number; by_record_type?: Record<string, number> };
    learningLoop?: {
      before?: Record<string, number>;
      after?: Record<string, number>;
      delta?: Record<string, number>;
    };
  };
  research?: {
    twoTowerMetrics?: {
      test?: Record<string, number>;
      data?: { pair_records?: number; positive_records?: number; negative_records?: number };
    };
    rerankerMetrics?: { test?: Record<string, number> };
  };
}

interface SavedItinerary {
  itineraryId: string;
  query: string;
  durationMinutes: number;
  transport: string;
  stops: {
    poiId: string;
    order: number;
    stayMinutes: number;
    reason: string;
    addedBy: 'agent' | 'user';
    poiSnapshot?: Partial<PoiResult>;
  }[];
  routeSummary?: {
    totalDistanceKm?: number;
    totalDurationMinutes?: number;
    warnings?: string[];
  };
  updatedAt?: string;
  createdAt?: string;
}

const DA_NANG_CENTER = { lat: 16.0544, lon: 108.2022 };
const ROUTE_REROUTE_DISTANCE_M = 35;
const ROUTE_REROUTE_MIN_INTERVAL_MS = 12000;
const ROUTE_MAX_GPS_ACCURACY_M = 100;
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const stopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const warningIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    window.requestAnimationFrame(() => {
      try {
        map.fitBounds(bounds, { padding: [44, 44] });
      } catch {
        // Leaflet can throw if the modal/map is unmounting while fitBounds runs.
      }
    });
  }, [bounds, map]);
  return null;
}

function isFiniteCoord(lat?: number, lon?: number) {
  return Number.isFinite(lat) && Number.isFinite(lon);
}

function haversineMeters(
  a: { lat: number; lon?: number; lng?: number },
  b: { lat: number; lon?: number; lng?: number },
) {
  const earthRadiusM = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians((b.lon ?? b.lng ?? 0) - (a.lon ?? a.lng ?? 0));
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function routeCoordinates(route?: RouteResult) {
  return (route?.route?.coordinates || [])
    .filter((coord: number[]) => Array.isArray(coord) && Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
    .map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
}

function normalizeRouteResult(input: any): RouteResult | null {
  const coordinates = input?.route?.coordinates || input?.geometry?.coordinates || input?.coordinates || [];
  if (!Array.isArray(coordinates) || !coordinates.length) return null;
  return {
    route: { coordinates },
    distance: Number(input?.distance) || 0,
    duration: Number(input?.duration) || 0,
    steps: Array.isArray(input?.steps) ? input.steps : [],
    esValidation: {
      valid: Boolean(input?.esValidation?.valid),
      warnings: Array.isArray(input?.esValidation?.warnings) ? input.esValidation.warnings : [],
      ruleTrace: Array.isArray(input?.esValidation?.ruleTrace) ? input.esValidation.ruleTrace : [],
      fuzzyInsights: Array.isArray(input?.esValidation?.fuzzyInsights) ? input.esValidation.fuzzyInsights : [],
      totalRulesChecked: Number(input?.esValidation?.totalRulesChecked) || 0,
    },
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
function getCurrentLocationOnce(language: 'vi' | 'en' = 'vi') {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(language === 'vi' ? 'Trình duyệt không hỗ trợ Geolocation.' : 'This browser does not support Geolocation.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(error.message || (language === 'vi' ? 'Không lấy được vị trí GPS hiện tại.' : 'Could not get the current GPS location.'))),
      { enableHighAccuracy: true, maximumAge: 2500, timeout: 12000 },
    );
  });
}

function openGrabBooking(params: {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  dropoffName: string;
  dropoffAddress: string;
}) {
  const grabUrl =
    `grab://open?screenType=BOOKING` +
    `&pickupLatitude=${params.pickupLat}` +
    `&pickupLongitude=${params.pickupLng}` +
    `&dropOffLatitude=${params.dropoffLat}` +
    `&dropOffLongitude=${params.dropoffLng}` +
    `&dropOffAddress=${encodeURIComponent(params.dropoffAddress)}` +
    `&dropOffName=${encodeURIComponent(params.dropoffName)}`;

  window.location.href = grabUrl;
}

const copy = {
  vi: {
    heroBadge: 'Intent - Plan - Tools - Route - Memory - Market Signal',
    title: 'Danang UrbanAgent AI',
    subtitle:
      'Agent đô thị cho Đà Nẵng: khách du lịch tạo lịch trình có quán ăn, cafe, điểm chơi; người kinh doanh phân tích vị trí bằng demand proxy và cạnh tranh.',
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
    run: 'Chạy agent',
    principle:
      'Agent học từ phản hồi người dùng. MVP ghi lại lựa chọn, like/dislike và chỉnh sửa lịch trình để sau này huấn luyện reranker/fine-tune. Chỉ số kinh doanh là demand proxy, không phải mật độ khách thật.',
    itinerary: 'Lịch trình agent đề xuất',
    editable: 'Có thể thêm/xóa điểm trong MVP',
    emptyItinerary: 'Chạy agent để tạo lịch trình.',
    addable: 'POI có thể thêm',
    multimodalSearch: 'Tìm địa điểm bằng mô tả hoặc ảnh',
    imageHint: 'Thêm ảnh phong cách/quán mẫu',
    chooseImage: 'Chọn ảnh',
    changeImage: 'Đổi ảnh',
    routeMapTitle: 'Bản đồ chỉ đường AI',
    routeMapHint: 'Hệ chuyên gia phân tích tuyến đường, luật giao thông và cảnh báo rủi ro.',
    routeLegal: 'Hợp pháp',
    routeWarnings: 'cảnh báo',
    tripDuration: 'Thời lượng đi chơi',
    fullRoute: 'Xem toàn bộ lộ trình',
    fullRouteTitle: 'Toàn bộ lộ trình',
    hours2: '2 giờ',
    hours3: '3 giờ',
    hours4: '4 giờ',
    hours6: '6 giờ',
    stopLabel: 'Điểm dừng',
    avoidSegment: 'Đoạn cần lưu ý',
    routeSteps: 'Hướng dẫn từng bước',
    routeFuzzy: 'Đánh giá giao thông',
    routePanel: 'Route hệ chuyên gia',
    routeHint: 'Bấm “Route AI” ở từng POI để xem hướng dẫn nội bộ trước khi mở Google Maps.',
    routeAi: 'Route AI',
    openMaps: 'Google Maps',
    add: 'Thêm',
    remove: 'Xóa khỏi lịch trình',
    useful: 'Hữu ích',
    notFit: 'Không phù hợp',
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
    noExtra: 'Chưa có địa điểm bổ sung không trùng lịch trình.',
    travelerMode: 'Chế độ khách du lịch',
    saveItinerary: 'Lưu lịch trình',
    savedItineraries: 'Lịch trình đã lưu',
    noSavedItineraries: 'Chưa có lịch trình đã lưu.',
    defaultSavedTitle: 'Lịch trình Đà Nẵng',
    savedOpened: 'Đã mở lại lịch trình đã lưu.',
    saveSuccess: 'Đã lưu thành công.',
    saveFailed: 'Không thể lưu lịch trình.',
    bookGrab: 'Đặt xe ngay',
    bookingGrab: 'Đang mở Grab...',
    grabNoDestination: 'Lịch trình đã lưu chưa có điểm đến hợp lệ để đặt xe.',
    grabGpsFailed: 'Không lấy được vị trí GPS hiện tại để mở Grab.',
    suggestedPlace: 'Địa điểm gợi ý',
    genericPlace: 'Địa điểm',
    defaultDistrict: 'Đà Nẵng',
    stopUnit: 'điểm dừng',
    segmentLabel: 'Chặng',
    segmentStart: 'Đầu chặng',
    segmentEnd: 'Cuối chặng',
    currentLocation: 'Vị trí hiện tại',
    previousStop: 'Điểm trước',
  },
  en: {
    heroBadge: 'Intent - Plan - Tools - Route - Memory - Market Signal',
    title: 'Danang UrbanAgent AI',
    subtitle:
      'An urban agent for Danang: travelers build food, cafe and attraction itineraries; business users analyze locations with demand proxy and competition signals.',
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
    run: 'Run agent',
    principle:
      'The agent learns from user feedback. The MVP records choices, likes/dislikes and itinerary edits for later reranking/fine-tuning. Business metrics are demand proxies, not real footfall.',
    itinerary: 'Agent itinerary',
    editable: 'Stops can be added or removed in the MVP',
    emptyItinerary: 'Run the agent to create an itinerary.',
    addable: 'Places you can add to the trip',
    multimodalSearch: 'Find places by text or image',
    imageHint: 'Add a style/reference image',
    chooseImage: 'Choose image',
    changeImage: 'Change image',
    routeMapTitle: 'AI route map',
    routeMapHint: 'The expert system analyzes route geometry, traffic rules and risk warnings.',
    routeLegal: 'Valid',
    routeWarnings: 'warnings',
    tripDuration: 'Trip duration',
    fullRoute: 'View full route',
    fullRouteTitle: 'Full itinerary route',
    hours2: '2 hours',
    hours3: '3 hours',
    hours4: '4 hours',
    hours6: '6 hours',
    stopLabel: 'Stop',
    avoidSegment: 'Segment warning',
    routeSteps: 'Step-by-step directions',
    routeFuzzy: 'Traffic assessment',
    routePanel: 'Expert route',
    routeHint: 'Press “AI Route” on a POI to inspect in-app route guidance before opening Google Maps.',
    routeAi: 'AI Route',
    openMaps: 'Google Maps',
    add: 'Add',
    remove: 'Remove from itinerary',
    useful: 'Useful',
    notFit: 'Not a fit',
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
    noExtra: 'No additional non-duplicate places yet.',
    travelerMode: 'Traveler mode',
    saveItinerary: 'Save itinerary',
    savedItineraries: 'Saved itineraries',
    noSavedItineraries: 'No saved itineraries yet.',
    defaultSavedTitle: 'Danang itinerary',
    savedOpened: 'Saved itinerary reopened.',
    saveSuccess: 'Saved successfully.',
    saveFailed: 'Could not save itinerary.',
    bookGrab: 'Book Grab now',
    bookingGrab: 'Opening Grab...',
    grabNoDestination: 'This saved itinerary does not have a valid destination for booking.',
    grabGpsFailed: 'Could not get your current GPS location to open Grab.',
    suggestedPlace: 'Suggested place',
    genericPlace: 'Place',
    defaultDistrict: 'Danang',
    stopUnit: 'stops',
    segmentLabel: 'Segment',
    segmentStart: 'Segment start',
    segmentEnd: 'Segment end',
    currentLocation: 'Current location',
    previousStop: 'Previous stop',
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
  const [tripDurationMinutes, setTripDurationMinutes] = useState(240);
  const [loading, setLoading] = useState(false);
  const [routeLoadingId, setRouteLoadingId] = useState('');
  const [error, setError] = useState('');
  const [poiResults, setPoiResults] = useState<PoiResult[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [businessAreas, setBusinessAreas] = useState<BusinessArea[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [modelVersion, setModelVersion] = useState('v4');
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeRoutes, setRouteRoutes] = useState<RouteResult[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeBounds, setRouteBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [selectedRoutePoi, setSelectedRoutePoi] = useState<PoiResult | null>(null);
  const [routeStops, setRouteStops] = useState<PoiResult[]>([]);
  const [routeOrigin, setRouteOrigin] = useState<[number, number]>([DA_NANG_CENTER.lat, DA_NANG_CENTER.lon]);
  const [currentLocation, setCurrentLocation] = useState(DA_NANG_CENTER);
  const [liveRouteEnabled, setLiveRouteEnabled] = useState(false);
  const [routeGpsAccuracy, setRouteGpsAccuracy] = useState<number | null>(null);
  const [routeGpsError, setRouteGpsError] = useState('');
  const [trainingStatus, setTrainingStatus] = useState<AgentTrainingStatus | null>(null);
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [savedRouteSummary, setSavedRouteSummary] = useState<SavedItinerary['routeSummary'] | null>(null);
  const [openedSavedItineraryId, setOpenedSavedItineraryId] = useState('');
  const [savingItinerary, setSavingItinerary] = useState(false);
  const [bookingGrabId, setBookingGrabId] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const routeWatchIdRef = useRef<number | null>(null);
  const lastReroutePositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRerouteAtRef = useRef(0);
  const rerouteInFlightRef = useRef(false);

  useEffect(() => {
    setQuery(roleCopy[role].sample);
    setError('');
    setPoiResults([]);
    setItinerary([]);
    setBusinessAreas([]);
    setRouteModalOpen(false);
    setRouteStops([]);
    setSavedRouteSummary(null);
    setOpenedSavedItineraryId('');
  }, [role, roleCopy]);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get('/api/agent/training-status')
      .then((data) => {
        if (mounted) setTrainingStatus(data);
      })
      .catch(() => {
        if (mounted) setTrainingStatus(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    apiClient
      .get('/api/agent/itineraries')
      .then((data) => {
        if (mounted) setSavedItineraries(data?.itineraries || []);
      })
      .catch(() => {
        if (mounted) setSavedItineraries([]);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

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

  const recordFeedback = async (eventType: string, payload: Record<string, unknown>) => {
    if (!user) return;
    try {
      await apiClient.post('/api/agent/feedback', { role, eventType, query, payload });
    } catch {
      // Feedback must never block the user flow in the MVP.
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const convertLegacyResults = (items: any[] = []): PoiResult[] =>
    items.map((item, index) => ({
      id: item.id || `legacy-${index}`,
      type: 'poi',
      title: item.name || item.title || `${t.genericPlace} ${index + 1}`,
      name: item.name || item.title || `${t.genericPlace} ${index + 1}`,
      address: item.address || item.formatted_address,
      category: item.category || item.district || t.suggestedPlace,
      district: item.district || t.defaultDistrict,
      lat: Number(item.lat) || DA_NANG_CENTER.lat,
      lon: Number(item.lon || item.lng) || DA_NANG_CENTER.lon,
      hasCoordinates: Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon || item.lng)),
      rating: item.rating,
      score: Math.round(Number(item.score || 0)),
      reason: item.desc || item.reason || 'Gợi ý từ mô hình đa phương thức Version 4.',
      actions: [
        {
          type: 'map',
          label: 'Google Maps',
          url: `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon || item.lng}`,
        },
      ],
    }));

  const runAgent = async () => {
    setLoading(true);
    setError('');
    setOpenedSavedItineraryId('');
    try {
      if (role === 'traveler') {
        const gpsLocation = await getCurrentLocationOnce(language).catch(() => ({
          lat: currentLocation.lat,
          lng: currentLocation.lon,
        }));
        const nextLocation = { lat: gpsLocation.lat, lon: gpsLocation.lng };
        setCurrentLocation(nextLocation);
        const semanticModel = {
          enabled: modelVersion === 'v2' || modelVersion === 'v4',
          version: modelVersion,
          topK: 200,
          candidateLimit: 200,
        };
        const liveContext = { location: nextLocation, durationMinutes: tripDurationMinutes };
        const formData = new FormData();
        formData.append('concept', query);
        formData.append('modelVersion', modelVersion);
        if (imageFile) formData.append('image', imageFile);
        const itineraryRequest = user
          ? apiClient.post('/api/agent/create-itinerary', {
              query,
              context: { ...liveContext, semanticModel },
              transport,
              limit: 6,
              durationMinutes: tripDurationMinutes,
            })
          : Promise.resolve({ itinerary: [] });
        const [itineraryData, recommendationData, weatherData, multimodalData] = await Promise.allSettled([
          itineraryRequest,
          apiClient.post('/api/agent/recommend-poi', {
            query,
            context: {
              ...liveContext,
              semanticModel: user ? { enabled: false, version: modelVersion } : semanticModel,
            },
            limit: 14,
          }),
          apiClient.get(`/api/weather/forecast?lat=${nextLocation.lat}&lon=${nextLocation.lon}`),
          imageFile ? apiClient.post('/api/recommend', formData) : Promise.resolve([]),
        ]);

        if (itineraryData.status !== 'fulfilled') throw itineraryData.reason;
        const nextItinerary = itineraryData.value.itinerary || [];
        const usedIds = new Set(nextItinerary.map((item: ItineraryItem) => item.poi.id));
        const semanticExtras =
          recommendationData.status === 'fulfilled'
            ? (recommendationData.value.results || []).filter((poi: PoiResult) => !usedIds.has(poi.id))
            : [];
        const multimodalExtras =
          multimodalData.status === 'fulfilled'
            ? convertLegacyResults(multimodalData.value || []).filter((poi) => !usedIds.has(poi.id))
            : [];
        const mergedExtras = [...semanticExtras, ...multimodalExtras].filter(
          (poi, index, items) => items.findIndex((item) => item.id === poi.id) === index,
        );

        setItinerary(nextItinerary);
        setSavedRouteSummary(null);
        if (weatherData.status === 'fulfilled') setWeather(weatherData.value);
        setPoiResults(mergedExtras);
        recordFeedback('agent_run_traveler', {
          itinerarySize: nextItinerary.length,
          extraSize: mergedExtras.length,
          multimodalSize: multimodalExtras.length,
          hasImage: Boolean(imageFile),
        });
      } else {
        const canRunBusiness = await requireAuthFor(
          language === 'vi'
            ? 'Đăng nhập để chạy phân tích vị trí kinh doanh.'
            : 'Sign in to run business location analysis.',
        );
        if (!canRunBusiness) return;
        const data = await apiClient.post('/api/agent/business-insight', {
          concept: query,
          limit: 5,
          language,
        });
        setBusinessAreas(data.areas || []);
        recordFeedback('agent_run_business_insight', {
          areaSize: data.areas?.length || 0,
          guardrails: data.guardrails,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể gọi agent.');
    } finally {
      setLoading(false);
    }
  };

  const removeFromItinerary = (poiId: string) => {
    if (!user) {
      requireAuthFor(
        language === 'vi'
          ? 'Đăng nhập để sửa lịch trình và ghi tín hiệu học.'
          : 'Sign in to edit itineraries and record learning signals.',
      );
      return;
    }
    const removed = itinerary.find((item) => item.poi.id === poiId)?.poi;
    setSavedRouteSummary(null);
    setItinerary((items) =>
      items.filter((item) => item.poi.id !== poiId).map((item, index) => ({ ...item, order: index + 1 })),
    );
    if (removed) {
      setPoiResults((items) => [removed, ...items.filter((poi) => poi.id !== removed.id)]);
      recordFeedback('remove_from_itinerary', { poiId });
    }
  };

  const addPoiToItinerary = (poi: PoiResult) => {
    if (!user) {
      requireAuthFor(
        language === 'vi'
          ? 'Đăng nhập để thêm POI vào lịch trình và ghi tín hiệu học.'
          : 'Sign in to add POIs to an itinerary and record learning signals.',
      );
      return;
    }
    if (itinerary.some((item) => item.poi.id === poi.id)) return;
    setSavedRouteSummary(null);
    setItinerary((items) => [
      ...items,
      {
        order: items.length + 1,
        poi,
        suggestedStayMinutes: 55,
        reason: language === 'vi' ? 'Người dùng thêm vào lịch trình.' : 'Added by the user.',
      },
    ]);
    setPoiResults((items) => items.filter((item) => item.id !== poi.id));
    recordFeedback('add_to_itinerary', { poiId: poi.id, category: poi.category });
    void incrementPoiCounter(poi.id, 'timesAddedToItinerary');
  };

  const saveCurrentItinerary = async () => {
    if (!itinerary.length) return;
    const canSave = await requireAuthFor(
      language === 'vi' ? 'Đăng nhập để lưu lịch trình vào tài khoản của bạn.' : 'Sign in to save this itinerary.',
    );
    if (!canSave) return;
    setSavingItinerary(true);
    setSaveMessage('');
    try {
      const result = await apiClient.post('/api/agent/itineraries', {
        query,
        durationMinutes: tripDurationMinutes,
        transport,
        origin: { ...currentLocation, label: 'Vị trí hiện tại' },
        itinerary,
        routeSummary: {
          totalDurationMinutes: itinerary.reduce((sum, item) => sum + (item.travelFromPrevious?.estimatedMinutes || 0), 0),
          totalDistanceKm: itinerary.reduce((sum, item) => sum + (item.travelFromPrevious?.distanceKm || 0), 0),
          warnings: [],
        },
        status: 'saved',
      });
      if (result?.itinerary) {
        setSavedItineraries((items) => [result.itinerary, ...items.filter((item) => item.itineraryId !== result.itinerary.itineraryId)]);
      }
      setSaveMessage(t.saveSuccess);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : t.saveFailed);
    } finally {
      setSavingItinerary(false);
    }
  };

  const openSavedItinerary = (saved: SavedItinerary) => {
    setQuery(saved.query || query);
    setTripDurationMinutes(saved.durationMinutes || tripDurationMinutes);
    setTransport(saved.transport || transport);
    setItinerary(
      (saved.stops || []).map((stop, index) => {
        const snapshot = stop.poiSnapshot || {};
        const snapshotLat = Number(snapshot.lat);
        const snapshotLon = Number(snapshot.lon);
        const hasCoordinates = Number.isFinite(snapshotLat) && Number.isFinite(snapshotLon);
        return {
          order: stop.order || index + 1,
          poi: {
            id: snapshot.id || stop.poiId,
            title: snapshot.title || snapshot.name || `${t.stopLabel} ${index + 1}`,
            name: snapshot.name || snapshot.title || `${t.stopLabel} ${index + 1}`,
            address: snapshot.address,
            category: snapshot.category || t.genericPlace,
            district: snapshot.district || t.defaultDistrict,
            lat: hasCoordinates ? snapshotLat : DA_NANG_CENTER.lat,
            lon: hasCoordinates ? snapshotLon : DA_NANG_CENTER.lon,
            hasCoordinates,
            score: Number(snapshot.score) || 0,
            rating: Number(snapshot.rating) || undefined,
            reason: stop.reason || '',
          },
          suggestedStayMinutes: stop.stayMinutes,
          reason: stop.reason,
        };
      }),
    );
    setSavedRouteSummary(saved.routeSummary || null);
    setOpenedSavedItineraryId(saved.itineraryId);
    setSaveMessage(t.savedOpened);
  };

  const handleBookGrab = async (destination: PoiResult) => {
    if (!openedSavedItineraryId) return;
    if (destination.hasCoordinates === false || !isFiniteCoord(destination.lat, destination.lon)) {
      setSaveMessage(t.grabNoDestination);
      return;
    }
    setBookingGrabId(destination.id);
    setSaveMessage('');
    try {
      const pickup = await getCurrentLocationOnce(language);
      setCurrentLocation({ lat: pickup.lat, lon: pickup.lng });
      openGrabBooking({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: destination.lat,
        dropoffLng: destination.lon,
        dropoffName: destination.name || destination.title,
        dropoffAddress: destination.address || destination.district || destination.title,
      });
      recordFeedback('grab_booking_opened', {
        itineraryId: openedSavedItineraryId,
        poiId: destination.id,
        category: destination.category,
      });
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : t.grabGpsFailed);
    } finally {
      setBookingGrabId('');
    }
  };

  const loadExpertRoute = async (poi: PoiResult) => {
    const canRoute = await requireAuthFor(
      language === 'vi'
        ? 'Đăng nhập để dùng route chuyên gia và ghi agentEvents.'
        : 'Sign in to use expert routing and record agentEvents.',
    );
    if (!canRoute) return;
    if (!isFiniteCoord(poi.lat, poi.lon)) {
      setError('Selected place does not have valid coordinates for routing.');
      return;
    }
    setRouteLoadingId(poi.id);
    setSelectedRoutePoi(poi);
    setRouteRoutes([]);
    setRouteBounds(null);
    setSelectedRouteIndex(0);
    setRouteStops([]);
    try {
      const origin = await getCurrentLocationOnce(language).catch(() => ({ lat: DA_NANG_CENTER.lat, lng: DA_NANG_CENTER.lon }));
      setCurrentLocation({ lat: origin.lat, lon: origin.lng });
      setRouteOrigin([origin.lat, origin.lng]);
      lastReroutePositionRef.current = origin;
      lastRerouteAtRef.current = Date.now();
      const data = await apiClient.post('/api/route', {
        origin,
        destination: { lat: poi.lat, lng: poi.lon },
      });
      void incrementPoiCounter(poi.id, 'timesRouted');
      const routes = (data.routes || [data]).map(normalizeRouteResult).filter(Boolean) as RouteResult[];
      if (!routes.length) {
        throw new Error('No valid route geometry returned for this place.');
      }
      const bestRoute = routes[0];
      setRouteStops([poi]);
      setRouteRoutes(routes);
      const coords = routeCoordinates(bestRoute);
      if (coords.length) setRouteBounds(L.latLngBounds(coords));
      setRouteModalOpen(true);
      recordFeedback('route_requested', { poiId: poi.id, category: poi.category });
    } catch (err: any) {
      setRouteModalOpen(false);
      setError(err?.message || 'Không thể tính route bằng hệ chuyên gia.');
    } finally {
      setRouteLoadingId('');
    }
  };

  const loadFullItineraryRoute = async () => {
    if (!itinerary.length) return;
    const canRoute = await requireAuthFor(
      language === 'vi'
        ? 'Đăng nhập để xem route chuyên sâu cho toàn bộ lịch trình.'
        : 'Sign in to inspect the full expert itinerary route.',
    );
    if (!canRoute) return;
    setSelectedRoutePoi(null);
    setRouteStops([]);
    setRouteRoutes([]);
    setRouteBounds(null);
    setSelectedRouteIndex(0);
    setRouteLoadingId('full-itinerary');
    try {
      const segments: RouteResult[] = [];
      let origin = await getCurrentLocationOnce(language);
      setCurrentLocation({ lat: origin.lat, lon: origin.lng });
      setRouteOrigin([origin.lat, origin.lng]);
      lastReroutePositionRef.current = origin;
      lastRerouteAtRef.current = Date.now();
      for (const item of itinerary) {
        if (!isFiniteCoord(item.poi.lat, item.poi.lon)) continue;
        const data = await apiClient.post('/api/route', {
          origin,
          destination: { lat: item.poi.lat, lng: item.poi.lon },
        });
        void incrementPoiCounter(item.poi.id, 'timesRouted');
        const best = normalizeRouteResult(data.routes?.[0] || data);
        if (best && routeCoordinates(best).length) segments.push(best);
        origin = { lat: item.poi.lat, lng: item.poi.lon };
      }
      if (!segments.length) {
        throw new Error('No valid route geometry returned for the itinerary.');
      }
      const stops = itinerary.map((item) => item.poi).filter((poi) => isFiniteCoord(poi.lat, poi.lon));
      setRouteStops(stops);
      setRouteRoutes(segments);
      const allCoords = segments.flatMap((segment) => routeCoordinates(segment));
      if (allCoords.length) setRouteBounds(L.latLngBounds(allCoords));
      setRouteModalOpen(true);
      recordFeedback('full_itinerary_route_requested', { stopCount: itinerary.length });
    } catch (err: any) {
      setError(err?.message || 'Không thể tính toàn bộ lộ trình.');
    } finally {
      setRouteLoadingId('');
    }
  };

  useEffect(() => {
    if (!routeModalOpen || !navigator.geolocation || !routeStops.length) {
      if (routeWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(routeWatchIdRef.current);
      }
      routeWatchIdRef.current = null;
      setLiveRouteEnabled(false);
      return undefined;
    }

    setRouteGpsError('');
    setLiveRouteEnabled(true);
    routeWatchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setRouteOrigin([next.lat, next.lng]);
        setCurrentLocation({ lat: next.lat, lon: next.lng });
        setRouteGpsAccuracy(position.coords.accuracy);
        setRouteGpsError('');

        if (position.coords.accuracy > ROUTE_MAX_GPS_ACCURACY_M) return;
        const previous = lastReroutePositionRef.current;
        const movedMeters = previous ? haversineMeters(previous, next) : Number.POSITIVE_INFINITY;
        const enoughTimePassed = Date.now() - lastRerouteAtRef.current >= ROUTE_REROUTE_MIN_INTERVAL_MS;
        if (movedMeters < ROUTE_REROUTE_DISTANCE_M || !enoughTimePassed || rerouteInFlightRef.current) return;

        const target = selectedRoutePoi || routeStops[0];
        if (!target || !isFiniteCoord(target.lat, target.lon)) return;
        rerouteInFlightRef.current = true;
        setRouteLoadingId('live-reroute');
        try {
          const data = await apiClient.post('/api/route', {
            origin: next,
            destination: { lat: target.lat, lng: target.lon },
          });
          const recalculated = (data.routes || [data]).map(normalizeRouteResult).filter(Boolean) as RouteResult[];
          if (!recalculated.length) return;

          if (selectedRoutePoi) {
            setRouteRoutes(recalculated);
            setSelectedRouteIndex(0);
          } else {
            setRouteRoutes((existing) => [recalculated[0], ...existing.slice(1)]);
          }
          const coords = routeCoordinates(recalculated[0]);
          if (coords.length) setRouteBounds(L.latLngBounds([[next.lat, next.lng], ...coords]));
          lastReroutePositionRef.current = next;
          lastRerouteAtRef.current = Date.now();
          void recordFeedback('route_recalculated', {
            targetPoiId: target.id,
            movedMeters: Math.round(movedMeters),
            accuracy: Math.round(position.coords.accuracy),
          });
        } catch (routeError) {
          setRouteGpsError(routeError instanceof Error ? routeError.message : 'Không thể cập nhật route real-time.');
        } finally {
          rerouteInFlightRef.current = false;
          setRouteLoadingId('');
        }
      },
      (gpsError) => {
        setRouteGpsError(gpsError.message || 'Không thể theo dõi GPS real-time.');
        setLiveRouteEnabled(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 },
    );

    return () => {
      if (routeWatchIdRef.current !== null) navigator.geolocation.clearWatch(routeWatchIdRef.current);
      routeWatchIdRef.current = null;
      rerouteInFlightRef.current = false;
    };
  }, [routeModalOpen, routeStops, selectedRoutePoi]);

  const itineraryMoveMinutes = itinerary.reduce((sum, item) => sum + (item.travelFromPrevious?.estimatedMinutes || 0), 0);
  const totalMoveMinutes = itineraryMoveMinutes || Number(savedRouteSummary?.totalDurationMinutes || 0);
  const weatherText = formatCurrentWeather(weather, t.waiting, language);

  return (
    <div className="customer-agent min-h-full space-y-6 text-slate-700">
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
              <Sparkles size={16} />
              {t.heroBadge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{t.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-300">{t.subtitle}</p>
          </div>

          <div className="inline-flex min-w-[260px] items-center justify-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">
            <Users size={18} />
            {t.travelerMode}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
              <Compass />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{roleCopy[role].title}</h2>
              <p className="text-sm leading-6 text-slate-400">{roleCopy[role].subtitle}</p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-300">{t.prompt}</label>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-[150px] w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-400"
          />

          {role === 'traveler' && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">{t.transport}</label>
                <select
                  value={transport}
                  onChange={(event) => setTransport(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value="motorbike">{t.motorbike}</option>
                  <option value="car">{t.car}</option>
                  <option value="walking">{t.walking}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">{t.tripDuration}</label>
                <select
                  value={tripDurationMinutes}
                  onChange={(event) => setTripDurationMinutes(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                >
                  <option value={120}>{t.hours2}</option>
                  <option value={180}>{t.hours3}</option>
                  <option value={240}>{t.hours4}</option>
                  <option value={360}>{t.hours6}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">{t.multimodalSearch}</label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <label className="flex min-h-[92px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-3 text-sm text-slate-400 transition hover:border-cyan-400 hover:bg-slate-800">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                    ) : (
                      <span className="rounded-xl bg-slate-800 p-3 text-cyan-200">
                        <UploadCloud size={22} />
                      </span>
                    )}
                    <span>
                      <span className="block font-medium text-slate-200">
                        {imagePreview ? t.changeImage : t.chooseImage}
                      </span>
                      <span>{t.imageHint}</span>
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <select
                value={modelVersion}
                onChange={(event) => setModelVersion(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="v4">Version 4 - multimodal recommended</option>
                <option value="v3">Version 3</option>
                <option value="v2">Version 2</option>
                <option value="v1">Version 1</option>
              </select>
            </div>
          )}

          <button
            onClick={runAgent}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {t.run}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!user && (
            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm leading-6 text-cyan-100">
              {language === 'vi'
                ? 'Chưa đăng nhập: bạn vẫn có thể khám phá POI cơ bản. Đăng nhập để tạo/lưu lịch trình, dùng route chuyên gia, gửi phản hồi và phân tích seller.'
                : 'Signed out: basic POI exploration still works. Sign in for saved itineraries, expert routes, feedback and seller analysis.'}
            </div>
          )}

          {/* <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-6 text-slate-400">
            <strong className="text-slate-200">Learning loop:</strong> {t.principle}
          </div> */}

          <AgentLearningPanel status={trainingStatus} />
        </div>

        {role === 'traveler' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<MapPin />} label={t.inPlan} value={itinerary.length || 0} />
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

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">{t.itinerary}</h2>
                  <span className="text-sm text-slate-400">{t.editable}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={saveCurrentItinerary}
                    disabled={!itinerary.length || savingItinerary}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"
                  >
                    {savingItinerary ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {t.saveItinerary}
                  </button>
                  <button
                    onClick={loadFullItineraryRoute}
                    disabled={!itinerary.length || Boolean(routeLoadingId)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"
                  >
                    {routeLoadingId === 'full-itinerary' ? <Loader2 className="animate-spin" size={16} /> : <Route size={16} />}
                    {t.fullRoute}
                  </button>
                </div>
              </div>
              {saveMessage && (
                <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
                  {saveMessage}
                </div>
              )}
              <div className="space-y-3">
                {itinerary.length === 0 && <EmptyState text={t.emptyItinerary} />}
                {itinerary.map((item) => (
                  <div key={item.poi.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">
                            {item.order}
                          </span>
                          <h3 className="font-semibold text-white">{item.poi.title}</h3>
                        </div>
                        <p className="text-sm text-slate-400">{item.poi.category}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.reason}</p>
                        {item.travelFromPrevious && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                            <Badge icon={<Car size={14} />}>
                              {item.travelFromPrevious.estimatedMinutes} {t.minutes}
                            </Badge>
                            <Badge icon={<Map size={14} />}>
                              {item.travelFromPrevious.distanceKm} km
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {openedSavedItineraryId && (
                          <button
                            onClick={() => handleBookGrab(item.poi)}
                            disabled={item.poi.hasCoordinates === false || !isFiniteCoord(item.poi.lat, item.poi.lon) || bookingGrabId === item.poi.id}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
                            aria-label={t.bookGrab}
                          >
                            {bookingGrabId === item.poi.id ? <Loader2 className="animate-spin" size={16} /> : <Car size={16} />}
                            <span className="hidden sm:inline">{bookingGrabId === item.poi.id ? t.bookingGrab : t.bookGrab}</span>
                          </button>
                        )}
                        <button
                          onClick={() => loadExpertRoute(item.poi)}
                          className="rounded-lg p-2 text-cyan-200 hover:bg-slate-800"
                          aria-label={t.routeAi}
                        >
                          {routeLoadingId === item.poi.id ? <Loader2 className="animate-spin" size={18} /> : <Route size={18} />}
                        </button>
                        <button
                          onClick={() => removeFromItinerary(item.poi.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-300"
                          aria-label={t.remove}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">{t.savedItineraries}</h2>
              {savedItineraries.length === 0 && <EmptyState text={t.noSavedItineraries} />}
              <div className="grid gap-3 md:grid-cols-2">
                {savedItineraries.map((saved) => (
                  <button
                    key={saved.itineraryId}
                    onClick={() => openSavedItinerary(saved)}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                  >
                    <div className="font-semibold text-white">{saved.query || t.defaultSavedTitle}</div>
                    <div className="mt-2 text-sm text-slate-400">
                      {saved.stops?.length || 0} {t.stopUnit} · {saved.durationMinutes || '--'} {t.minutes} · {saved.transport || 'motorbike'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">{t.addable}</h2>
              {poiResults.length === 0 && <EmptyState text={t.noExtra} />}
              <div className="grid gap-3 md:grid-cols-2">
                {poiResults.map((poi) => (
                  <PoiCard
                    key={poi.id}
                    poi={poi}
                    text={t}
                    routeLoading={routeLoadingId === poi.id}
                    onAdd={() => addPoiToItinerary(poi)}
                    onRoute={() => loadExpertRoute(poi)}
                    onFeedback={(eventType) => recordFeedback(eventType, { poiId: poi.id, category: poi.category })}
                  />
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
      <RouteMapModal
        open={routeModalOpen}
        routes={routeRoutes}
        selectedIndex={selectedRouteIndex}
        selectedPoi={selectedRoutePoi}
        routeStops={routeStops}
        origin={routeOrigin}
        bounds={routeBounds}
        loading={Boolean(routeLoadingId)}
        liveRouteEnabled={liveRouteEnabled}
        gpsAccuracy={routeGpsAccuracy}
        gpsError={routeGpsError}
        text={t}
        onClose={() => setRouteModalOpen(false)}
        onSelectRoute={(index) => {
          setSelectedRouteIndex(index);
          const coords = routeCoordinates(routeRoutes[index]);
          if (coords?.length) setRouteBounds(L.latLngBounds(coords));
        }}
      />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 text-cyan-300">{icon}</div>
      <div className="break-words text-xl font-bold leading-snug text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

function formatMetric(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return '--';
  return value <= 1 ? `${Math.round(value * 100)}%` : String(Math.round(value));
}

function AgentLearningPanel({ status }: { status: AgentTrainingStatus | null }) {
  const synthetic = status?.backend?.synthetic;
  const representation = status?.backend?.representationData;
  const backendRecall = status?.backend?.learningLoop?.after?.recallAtReturnedK;
  const twoTowerAuc = status?.research?.twoTowerMetrics?.test?.roc_auc;
  const pairRecords = status?.research?.twoTowerMetrics?.data?.pair_records;

  return (
    <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-cyan-100">Agent learning</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Grounded synthetic data, feedback memory, and representation metrics for the trained agent.
          </p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
          {twoTowerAuc !== undefined ? 'trained' : 'pending'}
        </span>
      </div>

      {status ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <LearningStat label="Synthetic" value={synthetic?.sample_count} />
          <LearningStat label="Train records" value={representation?.record_count || pairRecords} />
          <LearningStat label="BE recall" value={formatMetric(backendRecall)} />
          <LearningStat label="Two-tower AUC" value={formatMetric(twoTowerAuc)} />
        </div>
      ) : (
        <p className="text-xs leading-5 text-slate-400">
          No training status yet. Run the agent training pipeline and refresh.
        </p>
      )}
    </div>
  );
}

function LearningStat({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <div className="text-lg font-bold text-white">{value ?? '--'}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function Badge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1">
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
    <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-4 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function RouteMapModal({
  open,
  routes,
  selectedIndex,
  selectedPoi,
  routeStops,
  origin,
  bounds,
  loading,
  liveRouteEnabled,
  gpsAccuracy,
  gpsError,
  text,
  onClose,
  onSelectRoute,
}: {
  open: boolean;
  routes: RouteResult[];
  selectedIndex: number;
  selectedPoi: PoiResult | null;
  routeStops: PoiResult[];
  origin: [number, number];
  bounds: L.LatLngBoundsExpression | null;
  loading: boolean;
  liveRouteEnabled: boolean;
  gpsAccuracy: number | null;
  gpsError: string;
  text: typeof copy.vi;
  onClose: () => void;
  onSelectRoute: (index: number) => void;
}) {
  if (!open) return null;
  const selectedRoute = routes[selectedIndex];
  const isFullItinerary = !selectedPoi && routeStops.length > 1;
  const selectedSegmentStart =
    selectedIndex === 0
      ? { lat: origin[0], lon: origin[1], title: 'Start' }
      : routeStops[selectedIndex - 1]
        ? {
            lat: routeStops[selectedIndex - 1].lat,
            lon: routeStops[selectedIndex - 1].lon,
            title: routeStops[selectedIndex - 1].title,
          }
        : { lat: origin[0], lon: origin[1], title: 'Start' };
  const selectedSegmentEnd = routeStops[selectedIndex];
  const formatDistance = (meters?: number) => {
    if (!meters) return '--';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  };
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    return `${Math.round(seconds / 60)} ${text.minutes}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[90vh] w-[96vw] max-w-[1360px] flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">
              {selectedPoi ? `${text.routeMapTitle}: ${selectedPoi.title}` : text.fullRouteTitle}
            </h2>
            <p className="truncate text-sm text-slate-400">{text.routeMapHint}</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={liveRouteEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                {liveRouteEnabled ? 'GPS real-time đang bật' : 'GPS real-time đang tắt'}
              </span>
              {gpsAccuracy !== null && <span className="text-slate-500">±{Math.round(gpsAccuracy)} m</span>}
              {loading && <span className="text-cyan-400">Đang cập nhật route...</span>}
            </div>
            {gpsError && <p className="mt-1 text-xs text-amber-400">{gpsError}</p>}
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_380px]">
          <div className="relative min-h-[420px] bg-slate-100">
            {loading && !selectedRoute && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="text-center font-semibold text-slate-700">
                  <Loader2 className="mx-auto mb-3 animate-spin text-cyan-600" size={34} />
                  {text.routeMapHint}
                </div>
              </div>
            )}
            <MapContainer center={origin} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds bounds={bounds} />
              {!isFullItinerary && (
                <Marker position={origin} icon={originIcon}>
                  <Popup>Start</Popup>
                </Marker>
              )}
              {isFullItinerary && isFiniteCoord(selectedSegmentStart.lat, selectedSegmentStart.lon) && (
                <Marker position={[selectedSegmentStart.lat, selectedSegmentStart.lon]} icon={originIcon}>
                  <Popup>
                    <strong>{text.segmentStart} {selectedIndex + 1}</strong>
                    <br />
                    {selectedSegmentStart.title}
                  </Popup>
                </Marker>
              )}
              {routeStops.filter((poi) => isFiniteCoord(poi.lat, poi.lon)).map((poi, index) => {
                const isSegmentEnd = isFullItinerary && index === selectedIndex;
                const isSegmentStart = isFullItinerary && index === selectedIndex - 1;
                const icon = isSegmentEnd ? destIcon : isSegmentStart ? originIcon : stopIcon;
                return (
                  <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={icon}>
                    <Popup>
                      <strong>
                        {isSegmentStart ? `${text.segmentStart} ${selectedIndex + 1}` : isSegmentEnd ? `${text.segmentEnd} ${selectedIndex + 1}` : `${text.stopLabel} ${index + 1}`}
                      </strong>
                      <br />
                      {poi.title}
                    </Popup>
                  </Marker>
                );
              })}
              {routes.map((route, index) => {
                const coords = routeCoordinates(route);
                if (!coords.length) return null;
                const isSelected = index === selectedIndex;
                return (
                  <Polyline
                    key={`route-${index}`}
                    positions={coords}
                    pathOptions={{
                      color: isSelected ? (route.esValidation?.valid ? '#a855f7' : '#f59e0b') : '#64748b',
                      weight: isSelected ? 7 : 3,
                      opacity: isSelected ? 1 : 0.18,
                      dashArray: isSelected ? undefined : '8 10',
                    }}
                    eventHandlers={{ click: () => onSelectRoute(index) }}
                  />
                );
              })}
              {routes.flatMap((route, routeIndex) =>
                (route.esValidation?.warnings || [])
                  .filter((warning) => isFiniteCoord(warning.location?.lat, warning.location?.lng))
                  .map((warning, warningIndex) => (
                    <Marker
                      key={`warning-${routeIndex}-${warningIndex}`}
                      position={[warning.location!.lat, warning.location!.lng]}
                      icon={warningIcon}
                    >
                      <Popup>
                        <strong>{text.avoidSegment}</strong>
                        <br />
                        {warning.message || JSON.stringify(warning)}
                      </Popup>
                    </Marker>
                  )),
              )}
            </MapContainer>
          </div>

          <aside className="min-h-0 overflow-y-auto border-l border-slate-800 bg-slate-900/60 p-4">
            {routes.length > 1 && (
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-2">
                {routes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectRoute(index)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      index === selectedIndex ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {text.segmentLabel} {index + 1}
                  </button>
                ))}
              </div>
            )}

            {isFullItinerary && selectedSegmentEnd && (
              <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
                <div className="font-semibold">{text.segmentLabel} {selectedIndex + 1}</div>
                <div className="mt-1 leading-6">
                  {selectedIndex === 0 ? text.currentLocation : routeStops[selectedIndex - 1]?.title || text.previousStop} → {selectedSegmentEnd.title}
                </div>
              </div>
            )}

            {selectedRoute ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Signal label="Distance" value={formatDistance(selectedRoute.distance)} />
                  <Signal label="Time" value={formatDuration(selectedRoute.duration)} />
                  <Signal
                    label="AI"
                    value={
                      selectedRoute.esValidation?.valid
                        ? text.routeLegal
                        : `${selectedRoute.esValidation?.warnings?.length || 0} ${text.routeWarnings}`
                    }
                  />
                </div>

                {!!selectedRoute.esValidation?.warnings?.length && (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
                    <h3 className="mb-2 font-semibold text-amber-900">{text.risks}</h3>
                    <div className="space-y-2 text-sm text-amber-950">
                      {selectedRoute.esValidation.warnings.map((warning, index) => (
                        <p key={`${warning.message}-${index}`}>{warning.message || JSON.stringify(warning)}</p>
                      ))}
                    </div>
                  </div>
                )}

                {!!selectedRoute.esValidation?.fuzzyInsights?.length && (
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                    <h3 className="mb-2 font-semibold text-cyan-900">{text.routeFuzzy}</h3>
                    <div className="space-y-2 text-sm text-slate-700">
                      {selectedRoute.esValidation.fuzzyInsights.map((item, index) => (
                        <p key={`${item.road}-${index}`}>
                          <strong>{item.road}</strong>: {item.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <h3 className="mb-3 font-semibold text-slate-100">{text.routeSteps}</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    {(selectedRoute.steps || []).slice(0, 12).map((step, index) => (
                      <div key={`${step.instruction}-${index}`} className="flex gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-100">
                          {index + 1}
                        </span>
                        <span>{step.instruction || step.instructions || JSON.stringify(step)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text={text.routeMapHint} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function PoiCard({
  poi,
  text,
  routeLoading,
  onAdd,
  onRoute,
  onFeedback,
}: {
  poi: PoiResult;
  text: typeof copy.vi;
  routeLoading: boolean;
  onAdd: () => void;
  onRoute: () => void;
  onFeedback: (eventType: string) => void;
}) {
  const mapAction = poi.actions?.find((action) => action.type === 'map');
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{poi.title}</h3>
          <p className="text-sm text-slate-400">{poi.category}</p>
        </div>
        <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-sm font-semibold text-cyan-200">
          {poi.score}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-300">{poi.reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
        >
          <Plus size={15} />
          {text.add}
        </button>
        <button
          onClick={onRoute}
          className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400/20"
        >
          {routeLoading ? <Loader2 className="animate-spin" size={15} /> : <Route size={15} />}
          {text.routeAi}
        </button>
        {mapAction?.url && (
          <a
            href={mapAction.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          >
            <MapPin size={15} />
            {text.openMaps}
          </a>
        )}
        <button
          onClick={() => onFeedback('poi_useful')}
          className="rounded-lg bg-slate-800 p-2 text-emerald-200 hover:bg-slate-700"
          aria-label={text.useful}
        >
          <ThumbsUp size={15} />
        </button>
        <button
          onClick={() => onFeedback('poi_not_fit')}
          className="rounded-lg bg-slate-800 p-2 text-red-200 hover:bg-slate-700"
          aria-label={text.notFit}
        >
          <ThumbsDown size={15} />
        </button>
      </div>
    </div>
  );
}

