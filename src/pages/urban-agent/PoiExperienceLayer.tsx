import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertTriangle, Camera, Car, CheckCircle2, Clock, LocateFixed, Loader2, MapPin, MousePointer2, Navigation, Plus, Route, Search, ShieldCheck, Star, X } from 'lucide-react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { apiClient } from '../../utils/apiClient';
import {
  createPoiReview,
  getAutoContext,
  incrementPoiCounter,
  inferTransport,
  normalizeSearchText,
  rankPoisForSearch,
  recordSearchLog,
  recordUserAnalyticsEvent,
  searchGeocodedDestinations,
  searchPoisByKeyword,
  subscribePoiReviews,
  type PoiReview,
  type SearchDestination,
  type SearchablePoi,
  type VisitMood,
  type VisitPurpose,
} from '../../services/poiExperienceService';
import {
  buildGoogleMapsDirectionsUrl,
  buildGrabBookingUrl,
  normalizeCoordinatePair,
  requestTravelerRoadRoute,
  routeCoordinates,
  type TravelerRouteResult,
} from './travelerCapabilities';

const GEOFENCE_RADIUS_M = 45;
const REVIEW_SKIP_PREFIX = 'danang-poi-review-skip';

const userIcon = new L.DivIcon({
  className: 'urban-user-marker',
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#22d3ee;border:3px solid white;box-shadow:0 0 0 8px rgba(34,211,238,.22)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function interpolatePosition(from: { lat: number; lon: number }, to: { lat: number; lon: number }, amount: number) {
  return {
    lat: from.lat + (to.lat - from.lat) * amount,
    lon: from.lon + (to.lon - from.lon) * amount,
  };
}

function FitPoiBounds({
  userPosition,
  target,
  routePath,
}: {
  userPosition: { lat: number; lon: number } | null;
  target: SearchDestination | null;
  routePath: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const points: [number, number][] = routePath.length ? [...routePath] : [[target.lat, target.lon]];
    if (userPosition) points.push([userPosition.lat, userPosition.lon]);
    map.fitBounds(points, { padding: [42, 42], maxZoom: 16 });
  }, [map, routePath, target, userPosition]);
  return null;
}

function ManualPinPicker({ active, onPick }: { active: boolean; onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(event) {
      if (active) onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function skipKey(userId: string, poiId: string) {
  return `${REVIEW_SKIP_PREFIX}:${userId}:${poiId}`;
}

function formatDistance(distance: number | null) {
  if (distance === null) return '--';
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;
}

const uiCopy = {
  vi: {
    title: 'Khám phá địa điểm',
    subtitle: 'Tìm quán, địa chỉ và xem đường đi tại Đà Nẵng.',
    tracking: 'Đang theo dõi',
    enableGps: 'Bật GPS',
    confirmArrival: 'Xác nhận đã đến',
    arrived: 'Đã đến nơi',
    review: 'Đánh giá địa điểm',
    route: 'Chỉ đường',
    routePanelTitle: 'Tuyến đường dự kiến',
    routePanelHint: 'Chọn địa điểm và dùng vị trí hiện tại để tải tuyến đường bộ.',
    distance: 'Khoảng cách',
    time: 'Thời gian',
    minutes: 'phút',
    ai: 'AI',
    validRoute: 'Hợp lệ',
    routeWarnings: 'Cảnh báo tuyến',
    trafficAssessment: 'Đánh giá giao thông',
    routeSteps: 'Hướng dẫn từng bước',
    noTrafficWarning: 'Chưa có cảnh báo giao thông đáng kể.',
    searchLabel: 'Tìm kiếm địa điểm',
    searchPlaceholder: 'Nhập tên quán, địa điểm hoặc địa chỉ...',
    targetLabel: 'Địa điểm đã chọn',
    selectPoi: 'Chọn một địa điểm hoặc địa chỉ để bắt đầu',
    placeResult: 'Địa điểm',
    addressResult: 'Địa chỉ',
    searchEmpty: 'Không tìm thấy địa chỉ phù hợp.',
    searchFailed: 'Chưa thể tìm địa điểm. Vui lòng thử lại.',
    clearSearch: 'Xóa tìm kiếm',
    noGps: 'Chưa có GPS',
    inRange: 'Trong vùng',
    outOfRange: 'Ngoài vùng',
    skipped: 'Bạn đã bỏ qua đánh giá địa điểm này trong chuyến đi hiện tại.',
    currentLocation: 'Vị trí hiện tại',
    gpsUnsupported: 'Trình duyệt không hỗ trợ Geolocation.',
    gpsFailed: 'Không lấy được vị trí GPS.',
    invalidRoute: 'Chưa tải được tuyến đường bộ hợp lệ.',
    routeFailed: 'Không thể tính đường đi.',
    routeAuthRequired: 'Đăng nhập để xem tuyến đường bộ trong UrbanAgent.',
    openGoogleMaps: 'Mở Google Maps',
    addToTrip: 'Thêm vào lịch trình',
    addingToTrip: 'Đang thêm...',
    addedToTrip: 'Địa điểm đã được chuyển sang chuyến đi của bạn.',
    bookRide: 'Đặt xe',
    chooseOnMap: 'Chọn vị trí trên bản đồ',
    cancelPin: 'Hủy chọn ghim',
    pinHint: 'Chạm vào bản đồ để đặt ghim, sau đó chỉnh tên và địa chỉ trước khi thêm.',
    temporaryName: 'Địa điểm tự chọn',
    nameLabel: 'Tên địa điểm',
    addressLabel: 'Địa chỉ mô tả',
    gpsToConfirm: 'Bật GPS để xác nhận khi bạn đến nơi.',
    tooFarToConfirm: 'Bạn cần ở gần địa điểm để xác nhận đã đến.',
    addressNoReview: 'Địa chỉ này dùng để chỉ đường và không có hồ sơ đánh giá.',
    feedTitle: 'Đánh giá gần đây',
    feedEmpty: 'Chưa có đánh giá cho địa điểm này.',
    urbanExplorer: 'Urban explorer',
    arrivedNow: 'Vừa đến',
    now: 'bây giờ',
    reviewPrompt: 'Bạn thấy trải nghiệm này thế nào?',
    commentPlaceholder: 'Chia sẻ cảm nhận về',
    purposeTitle: 'Mục đích chuyến thăm',
    moodTitle: 'Tâm trạng hiện tại',
    addPhoto: 'Thêm ảnh',
    skip: 'Bỏ qua ngay',
    submit: 'Viết đánh giá',
    loginRequired: 'Bạn cần đăng nhập để viết đánh giá.',
    firebaseMissing: 'Firebase chưa được cấu hình ở frontend.',
    submitFailed: 'Không thể gửi đánh giá.',
    purposes: {
      work_study: 'Công việc/Học tập',
      social: 'Xã hội',
      date: 'Hẹn hò',
      solo: 'Một mình',
    },
    moods: {
      relaxed: 'Thư giãn',
      energetic: 'Năng động',
      tired: 'Mệt mỏi',
    },
  },  en: {
    title: 'Explore places',
    subtitle: 'Find venues, addresses, and directions in Da Nang.',
    tracking: 'Tracking',
    enableGps: 'Enable GPS',
    confirmArrival: 'Confirm arrival',
    arrived: 'Arrived',
    review: 'Review place',
    route: 'Directions',
    routePanelTitle: 'Suggested road route',
    routePanelHint: 'Select a destination and use your current location to load a road route.',
    distance: 'Distance',
    time: 'Time',
    minutes: 'min',
    ai: 'AI',
    validRoute: 'Valid',
    routeWarnings: 'Route warnings',
    trafficAssessment: 'Traffic assessment',
    routeSteps: 'Step-by-step directions',
    noTrafficWarning: 'No major traffic warning yet.',
    searchLabel: 'Search places',
    searchPlaceholder: 'Enter a venue, place, or address...',
    targetLabel: 'Selected destination',
    selectPoi: 'Choose a place or address to start',
    placeResult: 'Place',
    addressResult: 'Address',
    searchEmpty: 'No matching address found.',
    searchFailed: 'Could not search places. Please try again.',
    clearSearch: 'Clear search',
    noGps: 'No GPS yet',
    inRange: 'Inside zone',
    outOfRange: 'Outside zone',
    skipped: 'You skipped this place review for the current trip.',
    currentLocation: 'Current location',
    gpsUnsupported: 'This browser does not support Geolocation.',
    gpsFailed: 'Could not get GPS location.',
    invalidRoute: 'No valid road route is available.',
    routeFailed: 'Could not calculate the route.',
    routeAuthRequired: 'Sign in to view the road route in UrbanAgent.',
    openGoogleMaps: 'Open Google Maps',
    addToTrip: 'Add to itinerary',
    addingToTrip: 'Adding...',
    addedToTrip: 'The place was sent to your trip.',
    bookRide: 'Book a ride',
    chooseOnMap: 'Choose on map',
    cancelPin: 'Cancel pin selection',
    pinHint: 'Tap the map to drop a pin, then edit its name and address before adding it.',
    temporaryName: 'Custom place',
    nameLabel: 'Place name',
    addressLabel: 'Address description',
    gpsToConfirm: 'Enable GPS to confirm when you arrive.',
    tooFarToConfirm: 'Move near the destination to confirm arrival.',
    addressNoReview: 'This address supports directions but has no review profile.',
    feedTitle: 'Recent reviews',
    feedEmpty: 'No reviews for this place yet.',
    urbanExplorer: 'Urban explorer',
    arrivedNow: 'Just arrived at',
    now: 'now',
    reviewPrompt: 'How was this experience?',
    commentPlaceholder: 'Share your thoughts about',
    purposeTitle: 'Visit purpose',
    moodTitle: 'Current mood',
    addPhoto: 'Add photos',
    skip: 'Skip for now',
    submit: 'Write review',
    loginRequired: 'You need to sign in to write a review.',
    firebaseMissing: 'Firebase is not configured on the frontend.',
    submitFailed: 'Could not submit the review.',
    purposes: {
      work_study: 'Work/Study',
      social: 'Social',
      date: 'Date',
      solo: 'Solo',
    },
    moods: {
      relaxed: 'Relaxed',
      energetic: 'Energetic',
      tired: 'Tired',
    },
  },
} as const;

type PoiExperienceCopy = (typeof uiCopy)[keyof typeof uiCopy];

function fuzzyLocalSearch(query: string, pois: SearchablePoi[]) {
  return rankPoisForSearch(query, pois, 8);
}

function toSearchablePoi(item: any): SearchablePoi | null {
  const coordinates = normalizeCoordinatePair(
    item?.lat ?? item?.location?.lat,
    item?.lon ?? item?.lng ?? item?.location?.lon ?? item?.location?.lng,
  );
  if (!coordinates.hasCoordinates) return null;
  const { lat, lon } = coordinates;
  const id = String(item?.poiId || item?.id || item?.placeId || `${item?.name || item?.title}-${lat}-${lon}`);
  return {
    id,
    poiId: id,
    title: item?.title || item?.name || 'POI',
    name: item?.name || item?.title || 'POI',
    category: item?.category || '',
    district: item?.district || item?.location?.district || '',
    address: item?.address || item?.location?.address || item?.district || '',
    lat,
    lon,
    rating: Number(item?.rating || 0),
    reviewCount: Number(item?.reviewCount || 0),
  };
}

function poiDestination(poi: SearchablePoi): SearchDestination {
  return {
    id: `poi:${poi.poiId || poi.id}`,
    type: 'poi',
    source: 'urbanagent',
    label: poi.name || poi.title || 'Địa điểm',
    address: poi.address || poi.district || '',
    category: poi.category || '',
    lat: poi.lat,
    lon: poi.lon,
    poi,
  };
}

function destinationPoi(destination: SearchDestination): SearchablePoi {
  return destination.poi || {
    id: destination.id,
    poiId: destination.id,
    title: destination.label,
    name: destination.label,
    category: destination.category || 'Địa điểm đã chọn',
    district: destination.address || 'Đà Nẵng',
    address: destination.address || destination.label,
    lat: destination.lat,
    lon: destination.lon,
  };
}

async function searchPoisWithAgent(query: string, position: { lat: number; lon: number } | null) {
  const formData = new FormData();
  formData.append('concept', query);
  formData.append('modelVersion', 'v4');
  const [agentResponse, v4Response] = await Promise.allSettled([
    apiClient.post('/api/agent/recommend-poi', {
      query,
      context: position ? { location: { lat: position.lat, lon: position.lon } } : {},
      limit: 24,
    }),
    apiClient.post('/api/recommend', formData),
  ]);
  const agentResults = agentResponse.status === 'fulfilled' && Array.isArray(agentResponse.value?.results) ? agentResponse.value.results : [];
  const v4Results = v4Response.status === 'fulfilled' && Array.isArray(v4Response.value) ? v4Response.value : [];
  return [...agentResults, ...v4Results].map(toSearchablePoi).filter(Boolean) as SearchablePoi[];
}

function getCurrentPositionOnce(copy: PoiExperienceCopy) {
  return new Promise<{ lat: number; lon: number; accuracy: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(copy.gpsUnsupported));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => reject(new Error(error.message || copy.gpsFailed)),
      { enableHighAccuracy: true, maximumAge: 2500, timeout: 12000 },
    );
  });
}

interface VisitState {
  poi: SearchablePoi;
  enterAt: Date;
  lastPosition: { lat: number; lon: number; accuracy: number };
  distanceM: number;
  accuracySum: number;
  sampleCount: number;
}

interface TravelState {
  fromPoi: SearchablePoi;
  startAt: Date;
  lastPosition: { lat: number; lon: number; accuracy: number };
  distanceM: number;
  accuracySum: number;
  sampleCount: number;
}

type ExpertRouteResult = TravelerRouteResult;

function formatRouteDistance(meters?: number) {
  if (!meters) return '--';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatRouteDuration(seconds?: number, copy?: PoiExperienceCopy) {
  if (!seconds) return '--';
  return `${Math.round(seconds / 60)} ${copy?.minutes || 'min'}`;
}

export function PoiExperienceLayer({
  user,
  itineraryPois,
  extraPois,
  firebaseReady,
  showSearch = true,
  title,
  subtitle,
  language = 'vi',
  addingPlaceId = '',
  onAddToTrip,
}: {
  user: User | null;
  itineraryPois: SearchablePoi[];
  extraPois: SearchablePoi[];
  firebaseReady: boolean;
  showSearch?: boolean;
  title?: string;
  subtitle?: string;
  language?: 'vi' | 'en';
  addingPlaceId?: string;
  onAddToTrip?: (destination: SearchDestination) => void | Promise<void>;
}) {
  const ui = uiCopy[language];
  const allPois = useMemo(() => {
    const map = new Map<string, SearchablePoi>();
    [...itineraryPois, ...extraPois]
      .filter((poi) => normalizeCoordinatePair(poi.lat, poi.lon).hasCoordinates)
      .forEach((poi) => map.set(poi.poiId || poi.id, poi));
    return Array.from(map.values());
  }, [extraPois, itineraryPois]);

  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [rawPosition, setRawPosition] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [displayPosition, setDisplayPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [activePoiId, setActivePoiId] = useState('');
  const [reviewPoi, setReviewPoi] = useState<SearchablePoi | null>(null);
  const [reviews, setReviews] = useState<PoiReview[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchDestination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<SearchDestination | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searchRequested, setSearchRequested] = useState(false);
  const [highlightedResultIndex, setHighlightedResultIndex] = useState(0);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeResult, setRouteResult] = useState<ExpertRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [arrivalConfirmed, setArrivalConfirmed] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const watchSessionRef = useRef(0);
  const visitRef = useRef<VisitState | null>(null);
  const travelRef = useRef<TravelState | null>(null);
  const loggedSearchRef = useRef('');
  const searchPositionRef = useRef<{ lat: number; lon: number } | null>(null);
  const searchRequestIdRef = useRef(0);
  const routeRequestIdRef = useRef(0);

  const activePoi = useMemo(
    () => allPois.find((poi) => (poi.poiId || poi.id) === activePoiId) || null,
    [activePoiId, allPois],
  );
  const targetDestination = useMemo(
    () => selectedDestination || (activePoi ? poiDestination(activePoi) : null),
    [activePoi, selectedDestination],
  );
  const reviewablePoi = targetDestination ? destinationPoi(targetDestination) : null;
  const distanceToTarget = displayPosition && targetDestination ? haversineMeters(displayPosition, targetDestination) : null;
  const arrivalEligible = Boolean(
    reviewablePoi
    && rawPosition
    && rawPosition.accuracy <= 100
    && distanceToTarget !== null
    && distanceToTarget <= GEOFENCE_RADIUS_M + Math.min(rawPosition.accuracy, 25),
  );
  const hasSkipped = Boolean(user && reviewablePoi && localStorage.getItem(skipKey(user.uid, reviewablePoi.poiId || reviewablePoi.id)));

  useEffect(() => {
    routeRequestIdRef.current += 1;
    // A new explicit destination invalidates every route and arrival state from the old one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutePath([]);
    setRouteResult(null);
    setRouteLoading(false);
    setReviewPoi(null);
    setArrivalConfirmed(false);
    visitRef.current = null;
  }, [targetDestination?.id]);

  useEffect(() => {
    const watchSession = ++watchSessionRef.current;
    if (!trackingEnabled) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      return undefined;
    }
    if (!navigator.geolocation) {
      setGpsError(ui.gpsUnsupported);
      setTrackingEnabled(false);
      return undefined;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (watchSession !== watchSessionRef.current) return;
        setGpsError('');
        setRawPosition({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (watchSession !== watchSessionRef.current) return;
        setGpsError(error.message || ui.gpsFailed);
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 },
    );
    return () => {
      if (watchSessionRef.current === watchSession) watchSessionRef.current += 1;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [trackingEnabled, ui.gpsFailed, ui.gpsUnsupported]);

  useEffect(() => {
    if (!rawPosition) return undefined;
    searchPositionRef.current = rawPosition;
    let frame = 0;
    const start = displayPosition || rawPosition;
    const startedAt = performance.now();
    const animate = (time: number) => {
      const progress = Math.min((time - startedAt) / 700, 1);
      setDisplayPosition(interpolatePosition(start, rawPosition, progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [rawPosition]);

  useEffect(() => {
    if (!rawPosition || !reviewablePoi) return;
    const now = new Date();
    const poiId = reviewablePoi.poiId || reviewablePoi.id;
    const distanceToPoi = haversineMeters(rawPosition, reviewablePoi);
    const activeVisit = visitRef.current;

    const finalizeVisit = (exitPosition: { lat: number; lon: number; accuracy: number }) => {
      const visit = visitRef.current;
      if (!visit) return;
      const exitAt = new Date();
      const dwellMinutes = Math.max((exitAt.getTime() - visit.enterAt.getTime()) / 60000, 0);
      const durationHours = Math.max(dwellMinutes / 60, 0.001);
      const distanceKm = visit.distanceM / 1000;
      const avgSpeedKmh = distanceKm / durationHours;
      const gpsAccuracyAvg = visit.sampleCount ? visit.accuracySum / visit.sampleCount : null;
      void recordUserAnalyticsEvent({
        eventType: 'poi_visit',
        user,
        poi: visit.poi,
        enterAt: visit.enterAt,
        exitAt,
        dwellMinutes,
        distanceKm,
        durationMinutes: dwellMinutes,
        avgSpeedKmh,
        inferredTransport: inferTransport(avgSpeedKmh),
        gpsAccuracyAvg,
        sampleCount: visit.sampleCount,
        autoContext: getAutoContext(),
      });
      if (dwellMinutes >= 0.15) void incrementPoiCounter(visit.poi.poiId || visit.poi.id, 'timesVisited');
      travelRef.current = {
        fromPoi: visit.poi,
        startAt: exitAt,
        lastPosition: exitPosition,
        distanceM: 0,
        accuracySum: exitPosition.accuracy || 0,
        sampleCount: 1,
      };
      visitRef.current = null;
    };

    if (activeVisit) {
      const delta = haversineMeters(activeVisit.lastPosition, rawPosition);
      if (delta > 1 && delta < 500 && rawPosition.accuracy < 150) activeVisit.distanceM += delta;
      activeVisit.lastPosition = rawPosition;
      activeVisit.accuracySum += rawPosition.accuracy || 0;
      activeVisit.sampleCount += 1;
      const activeVisitPoiId = activeVisit.poi.poiId || activeVisit.poi.id;
      if (activeVisitPoiId !== poiId || distanceToPoi > GEOFENCE_RADIUS_M * 1.45) finalizeVisit(rawPosition);
    }

    const currentVisit = visitRef.current;
    if (!currentVisit && distanceToPoi <= GEOFENCE_RADIUS_M) {
      const travel = travelRef.current;
      if (travel && (travel.fromPoi.poiId || travel.fromPoi.id) !== poiId) {
        const durationMinutes = Math.max((now.getTime() - travel.startAt.getTime()) / 60000, 0);
        const distanceKm = travel.distanceM / 1000;
        const avgSpeedKmh = distanceKm / Math.max(durationMinutes / 60, 0.001);
        void recordUserAnalyticsEvent({
          eventType: 'route_segment',
          user,
          fromPoi: travel.fromPoi,
          toPoi: reviewablePoi,
          startAt: travel.startAt,
          endAt: now,
          durationMinutes,
          distanceKm,
          avgSpeedKmh,
          inferredTransport: inferTransport(avgSpeedKmh),
          gpsAccuracyAvg: travel.sampleCount ? travel.accuracySum / travel.sampleCount : null,
          sampleCount: travel.sampleCount,
          autoContext: getAutoContext(),
        });
        travelRef.current = null;
      }
      visitRef.current = {
        poi: reviewablePoi,
        enterAt: now,
        lastPosition: rawPosition,
        distanceM: 0,
        accuracySum: rawPosition.accuracy || 0,
        sampleCount: 1,
      };
    } else if (!currentVisit && travelRef.current) {
      const travel = travelRef.current;
      const delta = haversineMeters(travel.lastPosition, rawPosition);
      if (delta > 1 && delta < 500 && rawPosition.accuracy < 150) travel.distanceM += delta;
      travel.lastPosition = rawPosition;
      travel.accuracySum += rawPosition.accuracy || 0;
      travel.sampleCount += 1;
    }
  }, [rawPosition, reviewablePoi, user]);

  useEffect(() => {
    if (!reviewablePoi) {
      setReviews([]);
      return undefined;
    }
    return subscribePoiReviews(reviewablePoi.poiId || reviewablePoi.id, setReviews);
  }, [reviewablePoi]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const normalized = normalizeSearchText(searchText);
      if (normalized.length < 2) {
        searchRequestIdRef.current += 1;
        setSearchResults([]);
        setSearchError('');
        setSearchRequested(false);
        return;
      }
      if (!showSearch) return;
      const requestId = ++searchRequestIdRef.current;
      setSearching(true);
      setSearchError('');
      setSearchRequested(true);
      try {
        const [agentResponse, firebaseResponse, geocodeResponse] = await Promise.allSettled([
          searchPoisWithAgent(searchText, searchPositionRef.current),
          firebaseReady ? searchPoisByKeyword(searchText) : Promise.resolve([]),
          searchGeocodedDestinations(searchText),
        ]);
        if (requestId !== searchRequestIdRef.current) return;
        const agentResults = agentResponse.status === 'fulfilled' ? agentResponse.value : [];
        const remote = firebaseResponse.status === 'fulfilled' ? firebaseResponse.value : [];
        const geocoded = geocodeResponse.status === 'fulfilled' ? geocodeResponse.value : [];
        const merged = [...agentResults, ...remote, ...fuzzyLocalSearch(searchText, allPois)];
        const deduped = Array.from(new Map(merged.map((poi) => [poi.poiId || poi.id, poi])).values());
        const internalResults = rankPoisForSearch(searchText, deduped, 8).map(poiDestination);
        const looksLikeAddress = /\d/.test(searchText);
        const results = looksLikeAddress ? geocoded : [...internalResults, ...geocoded];
        setSearchResults(results);
        setHighlightedResultIndex(0);
        if (looksLikeAddress && geocodeResponse.status === 'rejected') {
          setSearchError(ui.searchFailed);
        } else if (
          !looksLikeAddress
          && agentResponse.status === 'rejected'
          && firebaseResponse.status === 'rejected'
          && geocodeResponse.status === 'rejected'
        ) {
          setSearchError(ui.searchFailed);
        }
        if (loggedSearchRef.current !== normalized) {
          loggedSearchRef.current = normalized;
          void recordSearchLog({ user, query: searchText, resultCount: results.length });
        }
      } catch {
        if (requestId !== searchRequestIdRef.current) return;
        setSearchResults([]);
        setSearchError(ui.searchFailed);
      } finally {
        if (requestId === searchRequestIdRef.current) setSearching(false);
      }
    }, 450);
    return () => window.clearTimeout(handle);
  }, [allPois, firebaseReady, searchText, showSearch, ui.searchFailed, user]);

  const confirmArrival = () => {
    if (!arrivalEligible || !reviewablePoi) return;
    setArrivalConfirmed(true);
  };

  const openManualReview = () => {
    if (arrivalConfirmed && reviewablePoi) setReviewPoi(reviewablePoi);
  };

  const skipReview = (poi: SearchablePoi) => {
    if (user) localStorage.setItem(skipKey(user.uid, poi.poiId || poi.id), 'true');
    setReviewPoi(null);
  };

  const selectDestination = (destination: SearchDestination) => {
    const selected = destination.poi ? destination : { ...destination, poi: destinationPoi(destination) };
    setSelectedDestination(selected);
    setActivePoiId(selected.poi?.poiId || selected.poi?.id || '');
    setSearchText(destination.label);
    setSearchResults([]);
    setSearchError('');
    setSearchRequested(false);
    setHighlightedResultIndex(0);
    setPinMode(false);
    setAddMessage('');
    void recordSearchLog({
      user,
      query: searchText || destination.label,
      resultCount: searchResults.length,
      selectedPoiId: destination.poi?.poiId || destination.poi?.id,
    });
  };

  const pickManualLocation = (lat: number, lon: number) => {
    const label = searchText.trim() || ui.temporaryName;
    selectDestination({
      id: `manual-pin:${lat.toFixed(6)}:${lon.toFixed(6)}`,
      type: 'address',
      source: 'manual_pin',
      label,
      address: searchText.trim(),
      category: ui.temporaryName,
      lat,
      lon,
    });
  };

  const updateTemporaryDestination = (field: 'label' | 'address', value: string) => {
    setSelectedDestination((current) => {
      if (!current || current.source === 'urbanagent') return current;
      const next = { ...current, [field]: value };
      return { ...next, poi: destinationPoi({ ...next, poi: undefined }) };
    });
  };

  const addSelectedToTrip = async (destination = targetDestination) => {
    if (!destination || !onAddToTrip) return;
    setAddMessage('');
    await onAddToTrip(destination);
    setAddMessage(ui.addedToTrip);
  };

  const clearSearch = () => {
    searchRequestIdRef.current += 1;
    setSearchText('');
    setSearchResults([]);
    setSearchError('');
    setSearchRequested(false);
    setSelectedDestination(null);
    setActivePoiId('');
  };

  const loadExpertRouteToTarget = async () => {
    if (!targetDestination) return;
    if (!user) {
      setGpsError(ui.routeAuthRequired);
      return;
    }
    const requestId = ++routeRequestIdRef.current;
    setRouteLoading(true);
    setGpsError('');
    try {
      const origin = rawPosition || (displayPosition ? { ...displayPosition, accuracy: 0 } : await getCurrentPositionOnce(ui));
      if (requestId !== routeRequestIdRef.current) return;
      setRawPosition(origin);
      setDisplayPosition({ lat: origin.lat, lon: origin.lon });
      setRouteResult(null);
      const best = await requestTravelerRoadRoute({
        origin: { lat: origin.lat, lon: origin.lon },
        destination: { lat: targetDestination.lat, lon: targetDestination.lon },
      });
      if (requestId !== routeRequestIdRef.current) return;
      const coords = routeCoordinates(best);
      if (!coords.length) throw new Error(ui.invalidRoute);
      setRoutePath(coords);
      setRouteResult(best);
      setTrackingEnabled(true);
      if (reviewablePoi) void incrementPoiCounter(reviewablePoi.poiId || reviewablePoi.id, 'timesRouted');
    } catch (error) {
      if (requestId !== routeRequestIdRef.current) return;
      setRoutePath([]);
      setRouteResult(null);
      setGpsError(error instanceof Error ? error.message : ui.routeFailed);
    } finally {
      if (requestId === routeRequestIdRef.current) setRouteLoading(false);
    }
  };

  const googleMapsUrl = targetDestination
    ? buildGoogleMapsDirectionsUrl({
        id: targetDestination.id,
        title: targetDestination.label,
        name: targetDestination.label,
        address: targetDestination.address,
        category: targetDestination.category || '',
        district: targetDestination.address || 'Đà Nẵng',
        lat: targetDestination.lat,
        lon: targetDestination.lon,
        hasCoordinates: true,
      })
    : null;
  const grabUrl = targetDestination
    ? buildGrabBookingUrl({
        id: targetDestination.id,
        title: targetDestination.label,
        name: targetDestination.label,
        address: targetDestination.address,
        category: targetDestination.category || '',
        district: targetDestination.address || 'Đà Nẵng',
        lat: targetDestination.lat,
        lon: targetDestination.lon,
        hasCoordinates: true,
      }, rawPosition ? { lat: rawPosition.lat, lng: rawPosition.lon } : null)
    : null;

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedResultIndex((index) => Math.min(index + 1, searchResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedResultIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectDestination(searchResults[highlightedResultIndex] || searchResults[0]);
    } else if (event.key === 'Escape') {
      setSearchResults([]);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-lg shadow-slate-200/70">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title || ui.title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle || ui.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTrackingEnabled((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              trackingEnabled ? 'bg-emerald-400 text-slate-950' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <LocateFixed size={16} />
            {trackingEnabled ? ui.tracking : ui.enableGps}
          </button>
          {reviewablePoi && arrivalEligible && !arrivalConfirmed && (
            <button
              onClick={confirmArrival}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <CheckCircle2 size={16} />
              {ui.confirmArrival}
            </button>
          )}
          {reviewablePoi && arrivalConfirmed && (
            <button
              onClick={openManualReview}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              <Star size={16} />
              {ui.review}
            </button>
          )}
          <button
            onClick={loadExpertRouteToTarget}
            disabled={!targetDestination || routeLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-400 disabled:opacity-50"
          >
            {routeLoading ? <Loader2 className="animate-spin" size={16} /> : <Route size={16} />}
            {ui.route}
          </button>
          {targetDestination && onAddToTrip && (
            <button
              type="button"
              onClick={() => void addSelectedToTrip()}
              disabled={addingPlaceId === targetDestination.id || !targetDestination.label.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {addingPlaceId === targetDestination.id ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              {addingPlaceId === targetDestination.id ? ui.addingToTrip : ui.addToTrip}
            </button>
          )}
          {grabUrl && (
            <a href={grabUrl} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-400 hover:text-teal-800">
              <Car size={16} /> {ui.bookRide}
            </a>
          )}
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-cyan-400 hover:text-cyan-800"
            >
              <Navigation size={16} />
              {ui.openGoogleMaps}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="h-[360px]">
            <MapContainer
              center={[targetDestination?.lat || displayPosition?.lat || 16.0544, targetDestination?.lon || displayPosition?.lon || 108.2022]}
              zoom={14}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ManualPinPicker active={pinMode} onPick={pickManualLocation} />
              <FitPoiBounds userPosition={displayPosition} target={targetDestination} routePath={routePath} />
              {targetDestination && (
                <>
                  <Marker position={[targetDestination.lat, targetDestination.lon]}>
                    <Popup>{targetDestination.label}</Popup>
                  </Marker>
                  {reviewablePoi && (
                    <Circle
                      center={[targetDestination.lat, targetDestination.lon]}
                      radius={GEOFENCE_RADIUS_M}
                      pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.12 }}
                    />
                  )}
                </>
              )}
              {displayPosition && (
                <Marker position={[displayPosition.lat, displayPosition.lon]} icon={userIcon}>
                  <Popup>{ui.currentLocation}</Popup>
                </Marker>
              )}
              {!!routePath.length && (
                <Polyline positions={routePath} pathOptions={{ color: '#7c3aed', weight: 6, opacity: 0.95 }} />
              )}
            </MapContainer>
          </div>
          {pinMode && <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><MousePointer2 size={16} /> {ui.pinHint}</div>}
          <ExpertRoutePanel route={routeResult} copy={ui} loading={routeLoading} />
        </div>

        <div className="space-y-4">
          {showSearch && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-900">{ui.searchLabel}</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setHighlightedResultIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={ui.searchPlaceholder}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-950 outline-none focus:border-cyan-400"
              />
              {searching ? (
                <Loader2 className="absolute right-3 top-3 animate-spin text-cyan-600" size={18} />
              ) : searchText ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  title={ui.clearSearch}
                  className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
            {!!searchResults.length && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {searchResults.map((destination, index) => (
                  <div
                    key={destination.id}
                    onMouseEnter={() => setHighlightedResultIndex(index)}
                    className={`border-b border-slate-200 px-3 py-3 last:border-b-0 ${
                      highlightedResultIndex === index ? 'bg-cyan-50' : 'bg-white'
                    }`}
                  >
                    <button type="button" onClick={() => selectDestination(destination)} className="block w-full text-left">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-slate-950">{destination.label}</div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{destination.type === 'address' ? ui.addressResult : ui.placeResult}</span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{destination.address || destination.category}</div>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => selectDestination(destination)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400">Xem trên bản đồ</button>
                      {onAddToTrip && <button type="button" onClick={() => void addSelectedToTrip(destination)} disabled={addingPlaceId === destination.id} className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{addingPlaceId === destination.id ? ui.addingToTrip : ui.addToTrip}</button>}
                    </div>
                  </div>
                ))}
                {searchResults.some((result) => result.source === 'photon') && (
                  <div className="px-3 py-2 text-[11px] text-slate-500">© OpenStreetMap contributors · Photon</div>
                )}
              </div>
            )}
            {!searching && searchRequested && !searchResults.length && !searchError && (
              <p className="mt-3 text-sm text-slate-600">{ui.searchEmpty}</p>
            )}
            {searchError && <p className="mt-3 text-sm text-rose-700">{searchError}</p>}
            <button type="button" onClick={() => setPinMode((current) => !current)} className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${pinMode ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-400'}`}>
              <MapPin size={16} /> {pinMode ? ui.cancelPin : ui.chooseOnMap}
            </button>
          </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-500">{ui.targetLabel}</div>
                {targetDestination && targetDestination.source !== 'urbanagent' ? (
                  <div className="mt-2 space-y-2">
                    <label className="block text-xs font-semibold text-slate-600">{ui.nameLabel}<input value={targetDestination.label} onChange={(event) => updateTemporaryDestination('label', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-cyan-400" /></label>
                    <label className="block text-xs font-semibold text-slate-600">{ui.addressLabel}<input value={targetDestination.address || ''} onChange={(event) => updateTemporaryDestination('address', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-400" /></label>
                  </div>
                ) : (
                  <><h3 className="mt-1 font-semibold text-slate-950">{targetDestination?.label || ui.selectPoi}</h3><p className="mt-1 text-sm text-slate-500">{targetDestination?.address || targetDestination?.category}</p></>
                )}
              </div>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">
                {formatDistance(distanceToTarget)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <StatusPill icon={<Navigation size={15} />} label={rawPosition ? `GPS +/-${Math.round(rawPosition.accuracy)}m` : ui.noGps} />
              <StatusPill icon={<MapPin size={15} />} label={arrivalEligible ? ui.inRange : ui.outOfRange} />
            </div>
            {reviewablePoi && arrivalConfirmed && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> {ui.arrived}
              </p>
            )}
            {reviewablePoi && !arrivalConfirmed && !rawPosition && (
              <p className="mt-3 text-sm text-slate-600">{ui.gpsToConfirm}</p>
            )}
            {reviewablePoi && !arrivalConfirmed && rawPosition && !arrivalEligible && (
              <p className="mt-3 text-sm text-slate-600">{ui.tooFarToConfirm}</p>
            )}
            {gpsError && <p className="mt-3 text-sm text-amber-700">{gpsError}</p>}
            {addMessage && <p className="mt-3 text-sm font-semibold text-emerald-700">{addMessage}</p>}
            {hasSkipped && <p className="mt-3 text-sm text-slate-500">{ui.skipped}</p>}
          </div>

          {reviewablePoi && <ReviewFeed reviews={reviews} copy={ui} />}
        </div>
      </div>

      {reviewPoi && (
        <ReviewModal
          poi={reviewPoi}
          user={user}
          firebaseReady={firebaseReady}
          autoContext={getAutoContext()}
          copy={ui}
          onClose={() => setReviewPoi(null)}
          onSkip={() => skipReview(reviewPoi)}
          onSubmitted={() => setReviewPoi(null)}
        />
      )}
    </section>
  );
}

function StatusPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
      <span className="text-cyan-600">{icon}</span>
      {label}
    </div>
  );
}

function ExpertRoutePanel({ route, copy, loading }: { route: ExpertRouteResult | null; copy: PoiExperienceCopy; loading: boolean }) {
  if (!route) {
    return (
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {loading ? <Loader2 className="animate-spin text-purple-500" size={16} /> : <ShieldCheck className="text-cyan-600" size={16} />}
          {copy.routePanelTitle}
        </div>
        <p className="mt-2 text-sm text-slate-500">{copy.routePanelHint}</p>
      </div>
    );
  }

  const warnings = route.esValidation?.warnings || [];
  const insights = route.esValidation?.fuzzyInsights || [];
  const steps = route.steps || [];

  return (
    <div className="space-y-4 border-t border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="text-cyan-600" size={16} />
            {copy.routePanelTitle}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {route.esValidation?.totalRulesChecked ? `${route.esValidation.totalRulesChecked} rules checked` : copy.routePanelHint}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            route.esValidation?.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {route.esValidation?.valid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {route.esValidation?.valid ? copy.validRoute : `${warnings.length} ${copy.routeWarnings}`}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <RouteMetric icon={<Navigation size={16} />} label={copy.distance} value={formatRouteDistance(route.distance)} />
        <RouteMetric icon={<Clock size={16} />} label={copy.time} value={formatRouteDuration(route.duration, copy)} />
        <RouteMetric
          icon={<ShieldCheck size={16} />}
          label={copy.ai}
          value={route.esValidation?.valid ? copy.validRoute : `${warnings.length} ${copy.routeWarnings}`}
        />
      </div>

      {!!warnings.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle size={16} />
            {copy.routeWarnings}
          </h3>
          <div className="space-y-1 text-sm text-amber-800">
            {warnings.slice(0, 4).map((warning, index) => (
              <p key={`${warning.message}-${index}`}>{warning.message || warning.law || copy.routeWarnings}</p>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
        <h3 className="mb-2 text-sm font-semibold text-cyan-950">{copy.trafficAssessment}</h3>
        {insights.length ? (
          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {insights.slice(0, 6).map((item, index) => (
              <p key={`${item.road}-${index}`}>
                <strong>{item.road || `Segment ${index + 1}`}</strong>: {item.label || copy.noTrafficWarning}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">{copy.noTrafficWarning}</p>
        )}
      </div>

      {!!steps.length && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-950">{copy.routeSteps}</h3>
          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {steps.slice(0, 8).map((step, index) => (
              <div key={`${step.instruction || step.name}-${index}`} className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
                  {index + 1}
                </span>
                <span>{step.instruction || step.instructions || step.name || `${copy.routeSteps} ${index + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-cyan-600">{icon}</div>
      <div className="text-base font-semibold text-slate-950">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ReviewModal({
  poi,
  user,
  firebaseReady,
  autoContext,
  copy,
  onClose,
  onSkip,
  onSubmitted,
}: {
  poi: SearchablePoi;
  user: User | null;
  firebaseReady: boolean;
  autoContext: ReturnType<typeof getAutoContext>;
  copy: PoiExperienceCopy;
  onClose: () => void;
  onSkip: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [visitPurpose, setVisitPurpose] = useState<VisitPurpose | ''>('');
  const [visitMood, setVisitMood] = useState<VisitMood | ''>('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(
    () => () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [previews],
  );

  const submit = async () => {
    if (!user) {
      setError(copy.loginRequired);
      return;
    }
    if (!firebaseReady) {
      setError(copy.firebaseMissing);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createPoiReview({ poi, user, rating, comment, imageFiles: files, visitPurpose, visitMood, autoContext });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-cyan-100">
              {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-bold text-cyan-800">{(user?.displayName || user?.email || 'U').slice(0, 1)}</div>}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-950">{user?.displayName || user?.email || copy.urbanExplorer}</div>
              <div className="text-xs text-slate-500">{copy.arrivedNow} {poi.name} · {copy.now}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-900">{copy.reviewPrompt}</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} onClick={() => setRating(value)} className="p-1 text-amber-300">
                  <Star size={26} fill={value <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder={`${copy.commentPlaceholder} ${poi.name}...`}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-950 outline-none focus:border-cyan-400"
          />

          <ChipGroup
            title={copy.purposeTitle}
            value={visitPurpose}
            items={[
              ['work_study', copy.purposes.work_study],
              ['social', copy.purposes.social],
              ['date', copy.purposes.date],
              ['solo', copy.purposes.solo],
            ]}
            onChange={(value) => setVisitPurpose(value as VisitPurpose)}
          />

          <ChipGroup
            title={copy.moodTitle}
            value={visitMood}
            items={[
              ['relaxed', copy.moods.relaxed],
              ['energetic', copy.moods.energetic],
              ['tired', copy.moods.tired],
            ]}
            onChange={(value) => setVisitMood(value as VisitMood)}
          />

          {!!previews.length && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((item) => (
                <img key={item.url} src={item.url} alt="" className="h-28 w-full rounded-xl object-cover" />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">
              <Camera size={16} />
              {copy.addPhoto}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 6))}
              />
            </label>
            <div className="flex gap-2">
              <button onClick={onSkip} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                {copy.skip}
              </button>
              <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
                {submitting && <Loader2 className="animate-spin" size={16} />}
                {copy.submit}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function ChipGroup({
  title,
  value,
  items,
  onChange,
}: {
  title: string;
  value: string;
  items: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(value === id ? '' : id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              value === id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewFeed({ reviews, copy }: { reviews: PoiReview[]; copy: PoiExperienceCopy }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 font-semibold text-slate-950">{copy.feedTitle}</h3>
      {!reviews.length && <p className="text-sm text-slate-500">{copy.feedEmpty}</p>}
      <div className="space-y-3">
        {reviews.slice(0, 5).map((review) => (
          <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-cyan-400/20">
                {review.userPhotoURL ? <img src={review.userPhotoURL} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <div className="font-semibold text-slate-950">{review.userName}</div>
                <div className="flex text-amber-300">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} size={14} fill={value <= review.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
              </div>
            </div>
            {review.comment && <p className="mb-3 text-sm leading-6 text-slate-700">{review.comment}</p>}
            {!!review.imageUrls?.length && (
              <div className={`grid gap-2 ${review.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {review.imageUrls.slice(0, 4).map((url) => (
                  <img key={url} src={url} alt="" className="h-32 w-full rounded-lg object-cover" />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}


