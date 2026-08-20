import { apiClient } from '../../utils/apiClient';

export type TravelerRouteResult = {
  route: { coordinates: number[][] };
  distance: number;
  duration: number;
  steps: { instruction?: string; instructions?: string; name?: string }[];
  calculationSource?: string;
  illustrative?: boolean;
  esValidation: {
    valid: boolean;
    warnings: { message?: string; law?: string; severity?: string; location?: { lat: number; lng: number } }[];
    ruleTrace?: { step?: string; description?: string }[];
    fuzzyInsights?: { road?: string; label?: string; score?: number }[];
    totalRulesChecked?: number;
  };
};

export type TravelerActionPoi = {
  id: string;
  title: string;
  name: string;
  address?: string;
  category: string;
  district: string;
  lat: number;
  lon: number;
  hasCoordinates?: boolean;
};

export function normalizeCoordinatePair(latValue: unknown, lonValue: unknown) {
  const lat = latValue === null || latValue === undefined || latValue === ''
    ? Number.NaN
    : Number(latValue);
  const lon = lonValue === null || lonValue === undefined || lonValue === ''
    ? Number.NaN
    : Number(lonValue);
  const hasCoordinates = Number.isFinite(lat)
    && Number.isFinite(lon)
    && !(lat === 0 && lon === 0)
    && lat >= -90
    && lat <= 90
    && lon >= -180
    && lon <= 180;
  return { lat, lon, hasCoordinates };
}

export function hasValidPoiCoordinates(poi: Pick<TravelerActionPoi, 'lat' | 'lon' | 'hasCoordinates'>) {
  return poi.hasCoordinates !== false && normalizeCoordinatePair(poi.lat, poi.lon).hasCoordinates;
}

export function routeCoordinates(route?: TravelerRouteResult | null) {
  return (route?.route?.coordinates || [])
    .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
    .map((coordinate) => normalizeCoordinatePair(coordinate[1], coordinate[0]))
    .filter((coordinate) => coordinate.hasCoordinates)
    .map(({ lat, lon }) => [lat, lon] as [number, number]);
}

function valueRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function normalizeTravelerRoute(input: unknown): TravelerRouteResult | null {
  const source = valueRecord(input);
  const route = valueRecord(source.route);
  const geometry = valueRecord(source.geometry);
  const validation = valueRecord(source.esValidation);
  const coordinates = route.coordinates || geometry.coordinates || source.coordinates || [];
  if (!Array.isArray(coordinates) || routeCoordinates({ route: { coordinates } } as TravelerRouteResult).length < 2) {
    return null;
  }
  return {
    route: { coordinates },
    distance: Number(source.distance) || 0,
    duration: Number(source.duration) || 0,
    steps: Array.isArray(source.steps) ? source.steps : [],
    calculationSource: typeof source.calculationSource === 'string' ? source.calculationSource : undefined,
    illustrative: Boolean(source.illustrative),
    esValidation: {
      valid: validation.valid !== false,
      warnings: Array.isArray(validation.warnings) ? validation.warnings : [],
      ruleTrace: Array.isArray(validation.ruleTrace) ? validation.ruleTrace : [],
      fuzzyInsights: Array.isArray(validation.fuzzyInsights) ? validation.fuzzyInsights : [],
      totalRulesChecked: Number(validation.totalRulesChecked) || 0,
    },
  };
}

export async function requestTravelerRoadRoute({
  origin,
  destination,
  transport,
}: {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  transport?: string;
}) {
  const normalizedOrigin = normalizeCoordinatePair(origin.lat, origin.lon);
  const normalizedDestination = normalizeCoordinatePair(destination.lat, destination.lon);
  if (!normalizedOrigin.hasCoordinates || !normalizedDestination.hasCoordinates) {
    throw new Error('Không có đủ tọa độ hợp lệ để tính tuyến đường.');
  }

  const response = await apiClient.post('/api/route', {
    origin: { lat: normalizedOrigin.lat, lng: normalizedOrigin.lon },
    destination: { lat: normalizedDestination.lat, lng: normalizedDestination.lon },
    transport,
  });
  const responseRecord = valueRecord(response);
  const routes = Array.isArray(responseRecord.routes) ? responseRecord.routes : [];
  const route = normalizeTravelerRoute(routes[0] ?? response);
  if (!route || route.illustrative || routeCoordinates(route).length < 2) {
    throw new Error('Máy chủ chưa trả về tuyến đường bộ hợp lệ.');
  }
  return route;
}

export function getCurrentLocationOnce(language: 'vi' | 'en' = 'vi') {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(language === 'vi' ? 'Trình duyệt không hỗ trợ định vị.' : 'This browser does not support geolocation.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(error.message || (language === 'vi' ? 'Không lấy được vị trí hiện tại.' : 'Could not get your current location.'))),
      { enableHighAccuracy: true, maximumAge: 2500, timeout: 12000 },
    );
  });
}

export function buildGoogleMapsDirectionsUrl(poi: TravelerActionPoi) {
  if (!hasValidPoiCoordinates(poi)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}&travelmode=driving`;
}

export function buildGrabBookingUrl(
  poi: TravelerActionPoi,
  pickup?: { lat: number; lng: number } | null,
) {
  if (!hasValidPoiCoordinates(poi)) return null;
  const normalizedPickup = pickup ? normalizeCoordinatePair(pickup.lat, pickup.lng) : null;
  const pickupParams = normalizedPickup?.hasCoordinates
    ? `&pickupLatitude=${normalizedPickup.lat}&pickupLongitude=${normalizedPickup.lon}`
    : '';
  return `grab://open?screenType=BOOKING${pickupParams}`
    + `&dropOffLatitude=${poi.lat}`
    + `&dropOffLongitude=${poi.lon}`
    + `&dropOffAddress=${encodeURIComponent(poi.address || poi.district || poi.title)}`
    + `&dropOffName=${encodeURIComponent(poi.name || poi.title)}`;
}
