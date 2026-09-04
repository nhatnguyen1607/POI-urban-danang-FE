import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, storage } from './firebase';
import { apiClient } from '../utils/apiClient';
import { demoAuthMode } from '../config/runtimeFlags';
import { validatePlaceSearchQuery } from '../utils/searchQueryValidation';
import {
  createReviewSubmissionId,
  uploadOptimizedReviewImages,
  type ReviewImageMetadata,
  type ReviewImageMetrics,
  type ReviewUploadProgress,
} from './reviewImageUpload';

const demoSessionKey = 'danang-urban-agent-demo-session';

export interface SearchablePoi {
  id: string;
  poiId?: string;
  title?: string;
  name: string;
  category?: string;
  district?: string;
  address?: string;
  lat: number;
  lon: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
  searchKeywords?: string[];
}

export interface SearchDestination {
  id: string;
  type: 'poi' | 'address' | 'place';
  source: 'urbanagent' | 'google_places' | 'google_geocoding' | 'photon' | 'manual_pin';
  label: string;
  address?: string;
  category?: string;
  lat: number;
  lon: number;
  poi?: SearchablePoi;
  attribution?: string;
  providerPlaceId?: string;
  googleMapsUri?: string | null;
  businessStatus?: string | null;
  distanceMeters?: number;
  exactness?: 'EXACT_ROOFTOP' | 'INTERPOLATED_ADDRESS' | 'STREET_LEVEL' | 'APPROXIMATE' | 'NAMED_PLACE';
  googleGranularity?: string;
  autoConfirmed?: boolean;
  requiresConfirmation?: boolean;
  addressMatch?: {
    requestedHouseNumber?: string | null;
    returnedHouseNumber?: string | null;
    requestedStreet?: string | null;
    returnedRoute?: string | null;
    cityConsistent?: boolean;
  };
  providerSources?: string[];
}

export interface SearchOriginInput {
  lat?: number;
  lon?: number;
  accuracy?: number;
  source?: 'live_gps' | 'active_trip' | 'map_context';
}

export interface DestinationSearchMeta {
  source?: string;
  queryIntent?: 'EXACT_ADDRESS' | 'NAMED_PLACE' | 'CATEGORY_NEARBY' | 'GENERAL_PLACE_QUERY';
  googleConfigured?: boolean;
  configurationRequired?: boolean;
  radiusM?: number | null;
  origin?: { lat: number; lon: number; source: string; scopeFallback?: boolean };
  fallbackReason?: string | null;
}

export interface GoogleAutocompleteSuggestion {
  placeId: string;
  text: string;
  attribution: 'Google Maps';
}

export const googleDiscoveryMapConfigured = import.meta.env.VITE_GOOGLE_PLACES_ENABLED === 'true'
  && Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

function searchContextParams(origin?: SearchOriginInput) {
  const params = new URLSearchParams({
    cityId: 'da-nang',
    googleMapCompliant: googleDiscoveryMapConfigured ? 'true' : 'false',
  });
  if (Number.isFinite(origin?.lat) && Number.isFinite(origin?.lon)) {
    params.set('lat', String(origin?.lat));
    params.set('lon', String(origin?.lon));
    if (Number.isFinite(origin?.accuracy)) params.set('accuracy', String(origin?.accuracy));
    if (origin?.source) params.set('originSource', origin.source);
  }
  return params;
}

function normalizeRequestTimeDestination(item: unknown, index: number): SearchDestination[] {
  const source = item && typeof item === 'object' ? item as Record<string, unknown> : {};
  const lat = Number(source.lat);
  const lon = Number(source.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)
    || lat < -90 || lat > 90 || lon < -180 || lon > 180) return [];
  const providerSource = ['google_places', 'google_geocoding', 'photon'].includes(String(source.source))
    ? source.source as SearchDestination['source']
    : 'photon';
  return [{
    id: String(source.id || `${providerSource}-result-${index}`),
    type: source.type === 'place' ? 'place' : 'address',
    source: providerSource,
    label: String(source.label || source.name || source.address || ''),
    address: String(source.address || ''),
    category: String(source.category || ''),
    lat,
    lon,
    attribution: String(source.attribution || (providerSource.startsWith('google_') ? 'Google Maps' : '© OpenStreetMap contributors')),
    providerPlaceId: source.providerPlaceId ? String(source.providerPlaceId) : undefined,
    googleMapsUri: source.googleMapsUri ? String(source.googleMapsUri) : null,
    businessStatus: source.businessStatus ? String(source.businessStatus) : null,
    distanceMeters: Number.isFinite(Number(source.distanceMeters)) ? Number(source.distanceMeters) : undefined,
    exactness: source.exactness as SearchDestination['exactness'],
    googleGranularity: source.googleGranularity ? String(source.googleGranularity) : undefined,
    autoConfirmed: source.autoConfirmed === true,
    requiresConfirmation: source.requiresConfirmation === true,
    addressMatch: source.addressMatch && typeof source.addressMatch === 'object'
      ? source.addressMatch as SearchDestination['addressMatch']
      : undefined,
  }];
}

export async function searchGeocodedDestinations(searchText: string, origin?: SearchOriginInput) {
  const validation = validatePlaceSearchQuery(searchText);
  if (!validation.valid) return { results: [] as SearchDestination[], meta: {} as DestinationSearchMeta };
  const params = searchContextParams(origin);
  params.set('q', validation.query);
  params.set('limit', '8');
  const response = await apiClient.get(`/api/geocode/search?${params.toString()}`);
  const results = Array.isArray(response?.results) ? response.results : [];
  return {
    results: results.flatMap(normalizeRequestTimeDestination).filter((item: SearchDestination) => item.label),
    meta: response?.meta && typeof response.meta === 'object' ? response.meta as DestinationSearchMeta : {},
  };
}

export async function autocompleteDestinations(searchText: string, sessionToken: string, origin?: SearchOriginInput) {
  if (!googleDiscoveryMapConfigured || !validatePlaceSearchQuery(searchText).valid) {
    return [] as GoogleAutocompleteSuggestion[];
  }
  const params = searchContextParams(origin);
  params.set('q', searchText.trim());
  params.set('sessionToken', sessionToken);
  const response = await apiClient.get(`/api/geocode/autocomplete?${params.toString()}`);
  return (Array.isArray(response?.suggestions) ? response.suggestions : []).flatMap((item: unknown) => {
    const suggestion = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const placeId = String(suggestion.placeId || '');
    const text = String(suggestion.text || '');
    return placeId && text ? [{ placeId, text, attribution: 'Google Maps' as const }] : [];
  });
}

export async function resolveAutocompleteDestination(placeId: string, sessionToken: string, origin?: SearchOriginInput) {
  const params = searchContextParams(origin);
  params.set('sessionToken', sessionToken);
  const response = await apiClient.get(`/api/geocode/place/${encodeURIComponent(placeId)}?${params.toString()}`);
  return normalizeRequestTimeDestination(response?.result, 0)[0] || null;
}

export interface PoiReview {
  id: string;
  poiId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  rating: number;
  comment: string;
  imageUrls: string[];
  imageMetadata?: ReviewImageMetadata[];
  status: 'published' | 'hidden';
  createdAt?: { toMillis?: () => number } | null;
}

export type VisitPurpose = 'work_study' | 'social' | 'date' | 'solo';
export type VisitMood = 'relaxed' | 'energetic' | 'tired';

export interface AutoContext {
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: {
    source?: string;
    temperature?: number | null;
    precipitation?: number | null;
    weatherCode?: number | null;
    description?: string;
  } | null;
}

interface WeatherContextInput {
  source?: unknown;
  warning?: unknown;
  current?: {
    temperature_2m?: unknown;
    precipitation?: unknown;
    weather_code?: unknown;
  };
}

export function normalizeSearchText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchKeywords(...values: string[]) {
  const tokens = normalizeSearchText(values.filter(Boolean).join(' '))
    .split(' ')
    .filter((token) => token.length >= 2);
  const prefixes = tokens.flatMap((token) => {
    const max = Math.min(token.length, 12);
    return Array.from({ length: max - 1 }, (_, index) => token.slice(0, index + 2));
  });
  return Array.from(new Set([...tokens, ...prefixes])).slice(0, 120);
}

const CATEGORY_INTENTS = [
  {
    id: 'restaurant',
    triggers: ['nha hang', 'restaurant'],
    include: ['nha hang', 'restaurant'],
    softInclude: [],
    exclude: ['quan nhau', 'nhau', 'bia', 'beer', 'bar', 'pub', 'lau nuong', 'karaoke'],
  },
  {
    id: 'cafe',
    triggers: ['cafe', 'ca phe', 'coffee', 'coffe'],
    include: ['cafe', 'ca phe', 'coffee'],
    softInclude: ['dessert', 'tra sua', 'bakery'],
    exclude: ['quan nhau', 'nhau', 'bia', 'beer', 'bar', 'pub'],
  },
  {
    id: 'food',
    triggers: ['quan an', 'an uong', 'food', 'mon an', 'do an'],
    include: ['quan an', 'an uong', 'food', 'restaurant', 'nha hang', 'am thuc'],
    softInclude: ['bun', 'mi quang', 'com', 'pho', 'banh', 'hai san'],
    exclude: ['quan nhau', 'nhau', 'bia', 'beer', 'bar', 'pub', 'karaoke'],
  },
  {
    id: 'hotel',
    triggers: ['khach san', 'hotel', 'homestay'],
    include: ['khach san', 'hotel', 'homestay', 'resort'],
    softInclude: [],
    exclude: ['restaurant', 'nha hang', 'quan an', 'cafe', 'bar'],
  },
] as const;

function findCategoryIntent(normalizedQuery: string) {
  return CATEGORY_INTENTS.find((intent) => intent.triggers.some((trigger) => normalizedQuery.includes(trigger)));
}

function fieldText(poi: SearchablePoi) {
  return {
    name: normalizeSearchText(`${poi.name || ''} ${poi.title || ''}`),
    category: normalizeSearchText(poi.category || ''),
    address: normalizeSearchText(`${poi.address || ''} ${poi.district || ''}`),
  };
}

function scorePoiForSearch(poi: SearchablePoi, normalizedQuery: string) {
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const fields = fieldText(poi);
  const haystack = `${fields.name} ${fields.category} ${fields.address}`;
  const intent = findCategoryIntent(normalizedQuery);
  let score = 0;

  if (fields.name.includes(normalizedQuery)) score += 70;
  if (fields.category.includes(normalizedQuery)) score += 90;
  if (fields.address.includes(normalizedQuery)) score += 25;
  score += tokens.reduce((sum, token) => {
    if (fields.name.includes(token)) return sum + 12;
    if (fields.category.includes(token)) return sum + 18;
    if (fields.address.includes(token)) return sum + 4;
    return sum;
  }, 0);

  if (intent) {
    const exactCategory = intent.include.some((term) => fields.category.includes(term));
    const exactName = intent.include.some((term) => fields.name.includes(term));
    const softCategory = intent.softInclude.some((term) => fields.category.includes(term));
    const excluded = intent.exclude.some((term) => fields.category.includes(term) || fields.name.includes(term));

    if (excluded) score -= 220;
    if (exactCategory) score += 180;
    if (exactName) score += 80;
    if (softCategory) score += 20;

    if (!exactCategory && !exactName) score -= 80;
  }

  score += Math.min(Number(poi.rating || 0), 5) * 2;
  score += Math.min(Number(poi.reviewCount || 0), 100) / 20;
  if (!tokens.every((token) => haystack.includes(token))) score -= 120;

  return score;
}

export function rankPoisForSearch(searchText: string, pois: SearchablePoi[], maxResults = 8) {
  const normalized = normalizeSearchText(searchText);
  if (normalized.length < 2) return [];
  const intent = findCategoryIntent(normalized);

  return pois
    .map((poi) => ({ poi, score: scorePoiForSearch(poi, normalized) }))
    .filter(({ poi, score }) => {
      if (score <= 0) return false;
      if (!intent) return true;
      const fields = fieldText(poi);
      const hasExactIntent =
        intent.include.some((term) => fields.category.includes(term) || fields.name.includes(term)) ||
        intent.softInclude.some((term) => fields.category.includes(term));
      const isExcluded = intent.exclude.some((term) => fields.category.includes(term) || fields.name.includes(term));
      return hasExactIntent && !isExcluded;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ poi }) => poi);
}

export function getAutoContext(weather?: WeatherContextInput): AutoContext {
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 11 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
  return {
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
    timeOfDay,
    weather: weather?.current
      ? {
          source: String(weather.source || 'open-meteo'),
          temperature: Number.isFinite(Number(weather.current.temperature_2m)) ? Number(weather.current.temperature_2m) : null,
          precipitation: Number.isFinite(Number(weather.current.precipitation)) ? Number(weather.current.precipitation) : null,
          weatherCode: Number.isFinite(Number(weather.current.weather_code)) ? Number(weather.current.weather_code) : null,
          description: String(weather.warning || ''),
        }
      : null,
  };
}

export function inferTransport(avgSpeedKmh: number) {
  if (avgSpeedKmh < 7) return 'walking';
  if (avgSpeedKmh < 18) return 'cycling';
  if (avgSpeedKmh < 55) return 'motorbike_or_car';
  return 'car';
}

function toPoi(docId: string, data: DocumentData): SearchablePoi {
  const location = data.location && typeof data.location === 'object'
    ? data.location as Record<string, unknown>
    : {};
  const latValue = location.lat ?? data.lat;
  const lonValue = location.lng ?? location.lon ?? data.lon ?? data.lng;
  return {
    id: data.poiId || docId,
    poiId: data.poiId || docId,
    title: data.name || data.title || 'POI',
    name: data.name || data.title || 'POI',
    category: data.category || '',
    district: String(location.district || data.district || ''),
    address: String(location.address || data.address || ''),
    lat: latValue === null || latValue === undefined || latValue === '' ? Number.NaN : Number(latValue),
    lon: lonValue === null || lonValue === undefined || lonValue === '' ? Number.NaN : Number(lonValue),
    rating: Number(data.rating || 0),
    reviewCount: Number(data.reviewCount || 0),
    searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
  };
}

export async function searchPoisByKeyword(searchText: string) {
  if (!db) return [];
  const normalized = normalizeSearchText(searchText);
  const [firstToken] = normalized.split(' ').filter(Boolean);
  if (!firstToken || firstToken.length < 2) return [];

  const poisRef = collection(db, 'pois');
  const snap = await getDocs(
    firestoreQuery(
      poisRef,
      where('status', '==', 'active'),
      where('searchKeywords', 'array-contains', firstToken.slice(0, 12)),
      limit(50),
    ),
  );
  return rankPoisForSearch(searchText, snap.docs.map((item) => toPoi(item.id, item.data())), 12);
}

export async function recordSearchLog({
  user,
  query,
  resultCount,
  selectedPoiId,
}: {
  user: User | null;
  query: string;
  resultCount: number;
  selectedPoiId?: string;
}) {
  if (!db) return;
  // House-number queries can identify a precise private address; keep only a
  // coarse event marker in analytics while the live search still uses the query.
  const analyticsQuery = /\d/.test(query) ? '[address-redacted]' : query.trim().slice(0, 120);
  const normalized = normalizeSearchText(analyticsQuery);
  if (normalized.length < 2) return;
  await addDoc(collection(db, 'search_logs'), {
    userId: user?.uid || null,
    query: analyticsQuery,
    normalizedQuery: normalized,
    tokens: normalized.split(' ').filter(Boolean).slice(0, 12),
    resultCount,
    selectedPoiId: selectedPoiId || null,
    source: 'poi_search',
    createdAt: serverTimestamp(),
  }).catch(() => undefined);
}

export async function incrementPoiCounter(poiId: string, field: 'timesAddedToItinerary' | 'timesVisited' | 'timesRouted') {
  if (!db || !poiId) return;
  await updateDoc(doc(db, 'pois', poiId), {
    [field]: increment(1),
    updatedAt: serverTimestamp(),
  }).catch(() => undefined);
}

function isTransientStorageError(error: unknown) {
  const code = String((error as { code?: unknown })?.code || '');
  return ![
    'storage/unauthorized',
    'storage/unauthenticated',
    'storage/invalid-argument',
    'storage/invalid-format',
    'storage/object-not-found',
    'storage/quota-exceeded',
  ].includes(code);
}

export function uploadReviewImages({
  files,
  poiId,
  userId,
  submissionId,
  onProgress,
}: {
  files: File[];
  poiId: string;
  userId: string;
  submissionId: string;
  onProgress?: (progress: ReviewUploadProgress) => void;
}) {
  if (!storage) throw new Error('Firebase Storage is not configured.');
  const activeStorage = storage;
  return uploadOptimizedReviewImages({
    files,
    poiId,
    userId,
    submissionId,
    onProgress,
    shouldRetry: isTransientStorageError,
    upload: ({ file, storagePath, signal, onProgress: reportBytes }) => {
      const imageRef = ref(activeStorage, storagePath);
      const task = uploadBytesResumable(imageRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: { poiId, userId, submissionId },
      });
      return new Promise<string>((resolve, reject) => {
        const abort = () => task.cancel();
        signal.addEventListener('abort', abort, { once: true });
        task.on(
          'state_changed',
          (snapshot) => reportBytes(snapshot.bytesTransferred),
          (error) => {
            signal.removeEventListener('abort', abort);
            reject(error);
          },
          async () => {
            signal.removeEventListener('abort', abort);
            try {
              resolve(await getDownloadURL(task.snapshot.ref));
            } catch (error) {
              reject(error);
            }
          },
        );
      });
    },
  });
}

export async function createPoiReview({
  poi,
  user,
  rating,
  comment,
  imageFiles,
  visitPurpose,
  visitMood,
  autoContext,
  submissionId = createReviewSubmissionId(),
  onProgress,
}: {
  poi: SearchablePoi;
  user: User;
  rating: number;
  comment: string;
  imageFiles: File[];
  visitPurpose?: VisitPurpose | '';
  visitMood?: VisitMood | '';
  autoContext?: AutoContext;
  submissionId?: string;
  onProgress?: (progress: ReviewUploadProgress) => void;
}) {
  if (!db) throw new Error('Firestore is not configured.');
  const totalStartedAt = performance.now();
  const poiId = poi.poiId || poi.id;
  const imageResult = imageFiles.length
    ? await uploadReviewImages({ files: imageFiles, poiId, userId: user.uid, submissionId, onProgress })
    : {
        uploads: [],
        metrics: { originalBytes: 0, optimizedBytes: 0, optimizationDurationMs: 0, uploadDurationMs: 0 },
      };
  const imageUrls = imageResult.uploads.map((item) => item.url);
  onProgress?.({
    phase: 'saving',
    completedFiles: imageFiles.length,
    totalFiles: imageFiles.length,
    uploadedBytes: imageResult.metrics.optimizedBytes,
    totalBytes: imageResult.metrics.optimizedBytes,
    percent: 100,
  });
  const payload = {
    poiId,
    poiName: poi.name || poi.title || '',
    userId: user.uid,
    userName: user.displayName || user.email || 'Urban explorer',
    userPhotoURL: user.photoURL || null,
    rating,
    comment: comment.trim(),
    visitPurpose: visitPurpose || null,
    visitMood: visitMood || null,
    context: autoContext || getAutoContext(),
    imageUrls,
    imageMetadata: imageResult.uploads.map((item) => item.metadata),
    imageCount: imageUrls.length,
    status: 'published',
    visibility: 'public',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const reviewRef = doc(db, 'reviews', submissionId);
  const writeStartedAt = performance.now();
  await setDoc(reviewRef, payload);
  const feedbackWriteDurationMs = performance.now() - writeStartedAt;
  await updateDoc(doc(db, 'pois', poiId), {
    reviewCount: increment(1),
    ratingSum: increment(rating),
    updatedAt: serverTimestamp(),
  }).catch(() => undefined);
  const submissionMetrics: ReviewImageMetrics & { feedbackWriteDurationMs: number; totalDurationMs: number } = {
    ...imageResult.metrics,
    feedbackWriteDurationMs,
    totalDurationMs: performance.now() - totalStartedAt,
  };
  return {
    id: reviewRef.id,
    ...payload,
    imageUrls,
    submissionMetrics,
  } as PoiReview & { submissionMetrics: typeof submissionMetrics };
}

export async function recordUserAnalyticsEvent(input: {
  eventType: 'poi_visit' | 'route_segment';
  user: User | null;
  poi?: SearchablePoi;
  fromPoi?: SearchablePoi | null;
  toPoi?: SearchablePoi | null;
  enterAt?: Date;
  exitAt?: Date;
  startAt?: Date;
  endAt?: Date;
  dwellMinutes?: number;
  distanceKm?: number;
  durationMinutes?: number;
  avgSpeedKmh?: number;
  inferredTransport?: string;
  gpsAccuracyAvg?: number | null;
  sampleCount?: number;
  autoContext?: AutoContext;
}) {
  if (!db) return;
  const payload = {
    eventType: input.eventType,
    userId: input.user?.uid || null,
    poiId: input.poi?.poiId || input.poi?.id || input.toPoi?.poiId || input.toPoi?.id || null,
    poiName: input.poi?.name || input.toPoi?.name || null,
    fromPoiId: input.fromPoi?.poiId || input.fromPoi?.id || null,
    fromPoiName: input.fromPoi?.name || null,
    toPoiId: input.toPoi?.poiId || input.toPoi?.id || null,
    toPoiName: input.toPoi?.name || null,
    enterAt: input.enterAt || null,
    exitAt: input.exitAt || null,
    startAt: input.startAt || null,
    endAt: input.endAt || null,
    dwellMinutes: Number(input.dwellMinutes || 0),
    distanceKm: Number(input.distanceKm || 0),
    durationMinutes: Number(input.durationMinutes || 0),
    avgSpeedKmh: Number(input.avgSpeedKmh || 0),
    inferredTransport: input.inferredTransport || null,
    gpsAccuracyAvg: input.gpsAccuracyAvg ?? null,
    sampleCount: Number(input.sampleCount || 0),
    context: input.autoContext || getAutoContext(),
    createdAt: serverTimestamp(),
  };
  await addDoc(collection(db, 'user_analytics'), payload).catch(() => undefined);
}

export function subscribePoiReviews(poiId: string, onChange: (reviews: PoiReview[]) => void): Unsubscribe {
  const isDemoSession = demoAuthMode && sessionStorage.getItem(demoSessionKey) === 'true';
  if (!db || !poiId || isDemoSession) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    firestoreQuery(collection(db, 'reviews'), where('poiId', '==', poiId)),
    (snapshot) => {
      const reviews = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as PoiReview)
        .filter((review) => review.status !== 'hidden')
        .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0));
      onChange(reviews);
    },
    () => onChange([]),
  );
}
