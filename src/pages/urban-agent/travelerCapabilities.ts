export type TravelerRouteResult = {
  route: { coordinates: number[][] };
  distance: number;
  duration: number;
  steps: { instruction?: string; instructions?: string }[];
  calculationSource?: string;
  illustrative?: boolean;
  esValidation: {
    valid: boolean;
    warnings: { message?: string; law?: string; severity?: string; location?: { lat: number; lng: number } }[];
    ruleTrace?: { step?: string; description?: string }[];
    fuzzyInsights?: { road?: string; label?: string }[];
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

export function hasValidPoiCoordinates(poi: Pick<TravelerActionPoi, 'lat' | 'lon' | 'hasCoordinates'>) {
  return poi.hasCoordinates !== false && Number.isFinite(poi.lat) && Number.isFinite(poi.lon);
}

export function routeCoordinates(route?: TravelerRouteResult | null) {
  return (route?.route?.coordinates || [])
    .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
    .map((coordinate) => [Number(coordinate[1]), Number(coordinate[0])] as [number, number])
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
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
  const pickupParams = pickup && Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng)
    ? `&pickupLatitude=${pickup.lat}&pickupLongitude=${pickup.lng}`
    : '';
  return `grab://open?screenType=BOOKING${pickupParams}`
    + `&dropOffLatitude=${poi.lat}`
    + `&dropOffLongitude=${poi.lon}`
    + `&dropOffAddress=${encodeURIComponent(poi.address || poi.district || poi.title)}`
    + `&dropOffName=${encodeURIComponent(poi.name || poi.title)}`;
}
