import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { Camera, CheckCircle2, LocateFixed, Loader2, MapPin, Navigation, Route, Search, Star, X } from 'lucide-react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { apiClient } from '../../utils/apiClient';
import {
  createPoiReview,
  getAutoContext,
  incrementPoiCounter,
  inferTransport,
  normalizeSearchText,
  recordSearchLog,
  recordUserAnalyticsEvent,
  searchPoisByKeyword,
  subscribePoiReviews,
  type PoiReview,
  type SearchablePoi,
  type VisitMood,
  type VisitPurpose,
} from '../../services/poiExperienceService';

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

function FitPoiBounds({ userPosition, target }: { userPosition: { lat: number; lon: number } | null; target: SearchablePoi | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const points: [number, number][] = [[target.lat, target.lon]];
    if (userPosition) points.push([userPosition.lat, userPosition.lon]);
    map.fitBounds(points, { padding: [42, 42], maxZoom: 16 });
  }, [map, target, userPosition]);
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
    title: 'Trải nghiệm POI thời gian thực',
    subtitle: `Theo dõi GPS, tự mở review khi vào vùng ${GEOFENCE_RADIUS_M}m và dẫn đường bằng hệ chuyên gia.`,
    tracking: 'Đang theo dõi',
    enableGps: 'Bật GPS',
    confirmReview: 'Xác nhận đến / Đánh giá',
    route: 'Dẫn đường',
    searchLabel: 'Tìm POI',
    searchPlaceholder: 'Tên cửa hàng hoặc địa chỉ...',
    targetLabel: 'POI mục tiêu',
    selectPoi: 'Chọn POI để bắt đầu',
    noGps: 'Chưa có GPS',
    inRange: 'Trong vùng',
    outOfRange: 'Ngoài vùng',
    skipped: 'Bạn đã bỏ qua review POI này trong chuyến đi hiện tại.',
    currentLocation: 'Vị trí hiện tại',
    gpsUnsupported: 'Trình duyệt không hỗ trợ Geolocation.',
    gpsFailed: 'Không lấy được vị trí GPS.',
    invalidRoute: 'Không có route geometry hợp lệ từ hệ chuyên gia.',
    routeFailed: 'Không thể tính đường đi.',
    feedTitle: 'Feed đánh giá',
    feedEmpty: 'Chưa có đánh giá cho POI này.',
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
    title: 'Real-time POI experience',
    subtitle: `Track GPS, open reviews inside the ${GEOFENCE_RADIUS_M}m zone, and route with the expert system.`,
    tracking: 'Tracking',
    enableGps: 'Enable GPS',
    confirmReview: 'Confirm arrival / Review',
    route: 'Route',
    searchLabel: 'Search POIs',
    searchPlaceholder: 'Store name or address...',
    targetLabel: 'Target POI',
    selectPoi: 'Choose a POI to start',
    noGps: 'No GPS yet',
    inRange: 'Inside zone',
    outOfRange: 'Outside zone',
    skipped: 'You skipped this POI review for the current trip.',
    currentLocation: 'Current location',
    gpsUnsupported: 'This browser does not support Geolocation.',
    gpsFailed: 'Could not get GPS location.',
    invalidRoute: 'No valid route geometry from the expert system.',
    routeFailed: 'Could not calculate the route.',
    feedTitle: 'Review feed',
    feedEmpty: 'No reviews for this POI yet.',
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
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];
  const tokens = normalized.split(' ').filter(Boolean);
  return pois
    .map((poi) => {
      const haystack = normalizeSearchText(`${poi.name} ${poi.title || ''} ${poi.address || ''} ${poi.category || ''} ${poi.district || ''}`);
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { poi, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.poi);
}

function routeCoordinates(route: any) {
  const coordinates = route?.route?.coordinates || route?.geometry?.coordinates || route?.coordinates || [];
  return (coordinates || [])
    .filter((coord: number[]) => Array.isArray(coord) && Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
    .map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
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

export function PoiExperienceLayer({
  user,
  itineraryPois,
  extraPois,
  firebaseReady,
  showSearch = true,
  title,
  subtitle,
  language = 'vi',
}: {
  user: User | null;
  itineraryPois: SearchablePoi[];
  extraPois: SearchablePoi[];
  firebaseReady: boolean;
  showSearch?: boolean;
  title?: string;
  subtitle?: string;
  language?: 'vi' | 'en';
}) {
  const ui = uiCopy[language];
  const allPois = useMemo(() => {
    const map = new Map<string, SearchablePoi>();
    [...itineraryPois, ...extraPois]
      .filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lon))
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
  const [searchResults, setSearchResults] = useState<SearchablePoi[]>([]);
  const [selectedSearchPoi, setSelectedSearchPoi] = useState<SearchablePoi | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const visitRef = useRef<VisitState | null>(null);
  const travelRef = useRef<TravelState | null>(null);
  const loggedSearchRef = useRef('');

  const targetPoi = useMemo(
    () => selectedSearchPoi || allPois.find((poi) => (poi.poiId || poi.id) === activePoiId) || itineraryPois[0] || allPois[0] || null,
    [activePoiId, allPois, itineraryPois, selectedSearchPoi],
  );
  const distanceToTarget = displayPosition && targetPoi ? haversineMeters(displayPosition, targetPoi) : null;
  const hasSkipped = Boolean(user && targetPoi && localStorage.getItem(skipKey(user.uid, targetPoi.poiId || targetPoi.id)));

  useEffect(() => {
    if (!targetPoi && allPois[0]) setActivePoiId(allPois[0].poiId || allPois[0].id);
  }, [allPois, targetPoi]);

  useEffect(() => {
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
        setGpsError('');
        setRawPosition({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => setGpsError(error.message || ui.gpsFailed),
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 },
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [trackingEnabled, ui.gpsFailed, ui.gpsUnsupported]);

  useEffect(() => {
    if (!rawPosition) return undefined;
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
    if (!rawPosition || !targetPoi) return;
    const now = new Date();
    const poiId = targetPoi.poiId || targetPoi.id;
    const distanceToPoi = haversineMeters(rawPosition, targetPoi);
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
          toPoi: targetPoi,
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
        poi: targetPoi,
        enterAt: now,
        lastPosition: rawPosition,
        distanceM: 0,
        accuracySum: rawPosition.accuracy || 0,
        sampleCount: 1,
      };
      if (user && !hasSkipped && !reviewPoi) setReviewPoi(targetPoi);
    } else if (!currentVisit && travelRef.current) {
      const travel = travelRef.current;
      const delta = haversineMeters(travel.lastPosition, rawPosition);
      if (delta > 1 && delta < 500 && rawPosition.accuracy < 150) travel.distanceM += delta;
      travel.lastPosition = rawPosition;
      travel.accuracySum += rawPosition.accuracy || 0;
      travel.sampleCount += 1;
    }
  }, [hasSkipped, rawPosition, reviewPoi, targetPoi, user]);

  useEffect(() => {
    if (!targetPoi) {
      setReviews([]);
      return undefined;
    }
    return subscribePoiReviews(targetPoi.poiId || targetPoi.id, setReviews);
  }, [targetPoi]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const normalized = normalizeSearchText(searchText);
      if (normalized.length < 2) {
        setSearchResults([]);
        return;
      }
      if (!showSearch) return;
      setSearching(true);
      try {
        const remote = firebaseReady ? await searchPoisByKeyword(searchText) : [];
        const results = remote.length ? remote : fuzzyLocalSearch(searchText, allPois);
        setSearchResults(results);
        const normalized = normalizeSearchText(searchText);
        if (loggedSearchRef.current !== normalized) {
          loggedSearchRef.current = normalized;
          void recordSearchLog({ user, query: searchText, resultCount: results.length });
        }
      } catch {
        const results = fuzzyLocalSearch(searchText, allPois);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [allPois, firebaseReady, searchText, showSearch]);

  const openManualReview = () => {
    if (targetPoi) setReviewPoi(targetPoi);
  };

  const skipReview = (poi: SearchablePoi) => {
    if (user) localStorage.setItem(skipKey(user.uid, poi.poiId || poi.id), 'true');
    setReviewPoi(null);
  };

  const loadExpertRouteToTarget = async () => {
    if (!targetPoi) return;
    setRouteLoading(true);
    setGpsError('');
    try {
      const origin = rawPosition || (displayPosition ? { ...displayPosition, accuracy: 0 } : await getCurrentPositionOnce(ui));
      setRawPosition(origin);
      setDisplayPosition({ lat: origin.lat, lon: origin.lon });
      const data = await apiClient.post('/api/route', {
        origin: { lat: origin.lat, lng: origin.lon },
        destination: { lat: targetPoi.lat, lng: targetPoi.lon },
      });
      void incrementPoiCounter(targetPoi.poiId || targetPoi.id, 'timesRouted');
      const best = data.routes?.[0] || data;
      const coords = routeCoordinates(best);
      if (!coords.length) throw new Error(ui.invalidRoute);
      setRoutePath(coords);
      setTrackingEnabled(true);
    } catch (error) {
      setGpsError(error instanceof Error ? error.message : ui.routeFailed);
    } finally {
      setRouteLoading(false);
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
          <button
            onClick={openManualReview}
            disabled={!targetPoi}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {ui.confirmReview}
          </button>
          <button
            onClick={loadExpertRouteToTarget}
            disabled={!targetPoi || routeLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-400 disabled:opacity-50"
          >
            {routeLoading ? <Loader2 className="animate-spin" size={16} /> : <Route size={16} />}
            {ui.route}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="h-[360px]">
            <MapContainer
              center={[targetPoi?.lat || displayPosition?.lat || 16.0544, targetPoi?.lon || displayPosition?.lon || 108.2022]}
              zoom={14}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitPoiBounds userPosition={displayPosition} target={targetPoi} />
              {targetPoi && (
                <>
                  <Marker position={[targetPoi.lat, targetPoi.lon]}>
                    <Popup>{targetPoi.name}</Popup>
                  </Marker>
                  <Circle
                    center={[targetPoi.lat, targetPoi.lon]}
                    radius={GEOFENCE_RADIUS_M}
                    pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.12 }}
                  />
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
        </div>

        <div className="space-y-4">
          {showSearch && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-900">{ui.searchLabel}</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={ui.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-950 outline-none focus:border-cyan-400"
              />
              {searching && <Loader2 className="absolute right-3 top-3 animate-spin text-cyan-300" size={18} />}
            </div>
            {!!searchResults.length && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {searchResults.map((poi) => (
                  <button
                    key={poi.poiId || poi.id}
                    onClick={() => {
                      setSelectedSearchPoi(poi);
                      setActivePoiId(poi.poiId || poi.id);
                      setSearchText(poi.name);
                      setSearchResults([]);
                      setRoutePath([]);
                      void recordSearchLog({ user, query: searchText || poi.name, resultCount: searchResults.length, selectedPoiId: poi.poiId || poi.id });
                    }}
                    className="block w-full border-b border-slate-200 px-3 py-3 text-left last:border-b-0 hover:bg-cyan-50"
                  >
                    <div className="font-semibold text-slate-950">{poi.name}</div>
                    <div className="text-xs text-slate-500">{poi.address || poi.district || poi.category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">{ui.targetLabel}</div>
                <h3 className="mt-1 font-semibold text-slate-950">{targetPoi?.name || ui.selectPoi}</h3>
                <p className="mt-1 text-sm text-slate-500">{targetPoi?.category || targetPoi?.address || targetPoi?.district}</p>
              </div>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">
                {formatDistance(distanceToTarget)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <StatusPill icon={<Navigation size={15} />} label={rawPosition ? `GPS +/-${Math.round(rawPosition.accuracy)}m` : ui.noGps} />
              <StatusPill icon={<MapPin size={15} />} label={distanceToTarget !== null && distanceToTarget <= GEOFENCE_RADIUS_M ? ui.inRange : ui.outOfRange} />
            </div>
            {gpsError && <p className="mt-3 text-sm text-amber-700">{gpsError}</p>}
            {hasSkipped && <p className="mt-3 text-sm text-slate-500">{ui.skipped}</p>}
          </div>

          <ReviewFeed reviews={reviews} copy={ui} />
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


