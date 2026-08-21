import type { SearchDestination } from '../../services/poiExperienceService';

const PENDING_PLACE_KEY = 'urbanagent:pending-trip-place:v1';
const ACTIVE_TRIP_KEY = 'urbanagent:active-trip-session:v1';

export type TripPlaceSelection = {
  id: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lon: number;
  source: 'canonical' | 'photon' | 'manual_pin' | 'request_time_geocoder';
  canonical: boolean;
  attribution?: string | null;
};

export type TemporaryTripPlace = TripPlaceSelection & {
  canonical: false;
  source: 'photon' | 'manual_pin' | 'request_time_geocoder';
};

function safeSessionStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

function temporaryId(destination: SearchDestination) {
  const existingId = String(destination.id || '').trim();
  if (existingId.startsWith('temporary:')) return existingId.slice(0, 160);
  const sourceId = String(destination.id || `${destination.lat}:${destination.lon}`)
    .replace(/[^a-zA-Z0-9:._-]/g, '-')
    .slice(0, 120);
  return `temporary:${destination.source === 'manual_pin' ? 'pin' : 'geocode'}:${sourceId}`.slice(0, 160);
}

export function destinationToTripPlace(destination: SearchDestination): TripPlaceSelection {
  const canonicalId = destination.poi?.poiId || destination.poi?.id;
  if (destination.source === 'urbanagent' && canonicalId) {
    return {
      id: canonicalId,
      name: destination.label,
      address: destination.address || '',
      category: destination.category || 'Địa điểm',
      lat: destination.lat,
      lon: destination.lon,
      source: 'canonical',
      canonical: true,
    };
  }
  return {
    id: temporaryId(destination),
    name: destination.label,
    address: destination.address || destination.label,
    category: destination.category || 'Địa điểm đã chọn',
    lat: destination.lat,
    lon: destination.lon,
    source: destination.source === 'manual_pin' ? 'manual_pin' : 'photon',
    canonical: false,
    attribution: destination.attribution || null,
  };
}

export function queueTripPlace(place: TripPlaceSelection) {
  safeSessionStorage()?.setItem(PENDING_PLACE_KEY, JSON.stringify(place));
}

export function consumeQueuedTripPlace(): TripPlaceSelection | null {
  const storage = safeSessionStorage();
  const raw = storage?.getItem(PENDING_PLACE_KEY);
  if (!raw) return null;
  storage?.removeItem(PENDING_PLACE_KEY);
  try {
    return JSON.parse(raw) as TripPlaceSelection;
  } catch {
    return null;
  }
}

export function saveActiveTripSession(value: Record<string, unknown>) {
  safeSessionStorage()?.setItem(ACTIVE_TRIP_KEY, JSON.stringify(value));
}

export function readActiveTripSession<T>() {
  const raw = safeSessionStorage()?.getItem(ACTIVE_TRIP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
