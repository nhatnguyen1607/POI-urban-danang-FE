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
  updateDoc,
  where,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, storage } from './firebase';
import { apiClient } from '../utils/apiClient';

const demoAuthMode = import.meta.env.VITE_DEMO_AUTH_MODE === 'true';
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
  source: 'urbanagent' | 'photon';
  label: string;
  address?: string;
  category?: string;
  lat: number;
  lon: number;
  poi?: SearchablePoi;
  attribution?: string;
}

export async function searchGeocodedDestinations(searchText: string) {
  const normalized = normalizeSearchText(searchText);
  if (normalized.length < 3) return [] as SearchDestination[];
  const response = await apiClient.get(
    `/api/geocode/search?q=${encodeURIComponent(searchText.trim())}&cityId=da-nang&limit=8`,
  );
  const results = Array.isArray(response?.results) ? response.results : [];
  return results.flatMap((item: unknown, index: number) => {
    const source = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const lat = Number(source.lat);
    const lon = Number(source.lon);
    if (
      !Number.isFinite(lat)
      || !Number.isFinite(lon)
      || (lat === 0 && lon === 0)
      || lat < -90
      || lat > 90
      || lon < -180
      || lon > 180
    ) return [];
    const type = source.type === 'place' ? 'place' : 'address';
    return [{
      id: String(source.id || `photon-result-${index}`),
      type,
      source: 'photon' as const,
      label: String(source.label || source.name || source.address || ''),
      address: String(source.address || ''),
      category: String(source.category || ''),
      lat,
      lon,
      attribution: String(source.attribution || '© OpenStreetMap contributors'),
    }];
  }).filter((item: SearchDestination) => item.label);
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
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return;
  await addDoc(collection(db, 'search_logs'), {
    userId: user?.uid || null,
    query: query.trim(),
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

export function uploadReviewImages({ files, poiId, userId }: { files: File[]; poiId: string; userId: string }) {
  if (!storage) throw new Error('Firebase Storage is not configured.');
  const activeStorage = storage;
  return Promise.all(
    files.map(async (file, index) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectPath = `reviews/${poiId}/${userId}/${Date.now()}-${index}-${safeName}`;
      const imageRef = ref(activeStorage, objectPath);
      await uploadBytes(imageRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: { poiId, userId },
      });
      return getDownloadURL(imageRef);
    }),
  );
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
}: {
  poi: SearchablePoi;
  user: User;
  rating: number;
  comment: string;
  imageFiles: File[];
  visitPurpose?: VisitPurpose | '';
  visitMood?: VisitMood | '';
  autoContext?: AutoContext;
}) {
  if (!db) throw new Error('Firestore is not configured.');
  const poiId = poi.poiId || poi.id;
  const imageUrls = imageFiles.length ? await uploadReviewImages({ files: imageFiles, poiId, userId: user.uid }) : [];
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
    imageCount: imageUrls.length,
    status: 'published',
    visibility: 'public',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'reviews'), payload);
  await updateDoc(doc(db, 'pois', poiId), {
    reviewCount: increment(1),
    ratingSum: increment(rating),
    updatedAt: serverTimestamp(),
  }).catch(() => undefined);
  return { id: ref.id, ...payload, imageUrls } as PoiReview;
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
