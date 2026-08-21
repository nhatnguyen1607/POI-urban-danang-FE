import { useEffect, useMemo, useRef, useState } from 'react';
import {
  normalizeCoordinatePair,
  requestTravelerRoadRoute,
  routeCoordinates,
  type TravelerRouteResult,
} from './travelerCapabilities';

export type TripRoadRouteStop = {
  stopId: string;
  order: number;
  dayNumber: number;
  poi: unknown;
  arrivalTime?: string | null;
  departureTime?: string | null;
  warnings?: string[];
};

export type TripRoadRoutePoint = {
  stopId: string;
  order: number;
  dayNumber: number;
  id: string;
  title: string;
  category: string;
  address: string;
  lat: number;
  lon: number;
  hasCoordinates: boolean;
};

export type TripRoadRouteSegment = {
  id: string;
  dayNumber: number;
  segmentNumber: number;
  origin: TripRoadRoutePoint;
  destination: TripRoadRoutePoint;
  route: TravelerRouteResult | null;
  path: [number, number][];
  fallbackPath: [number, number][];
  status: 'loading' | 'road' | 'fallback' | 'auth_required' | 'missing_coordinates';
  message: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function roadRoutePoint(stop: TripRoadRouteStop, fallbackIndex = 0): TripRoadRoutePoint {
  const poi = record(stop.poi);
  const location = record(poi.location);
  const address = record(poi.address);
  const coordinates = normalizeCoordinatePair(location.lat ?? poi.lat, location.lon ?? poi.lon ?? poi.lng);
  return {
    stopId: stop.stopId,
    order: stop.order,
    dayNumber: stop.dayNumber,
    id: String(poi.globalId || poi.id || stop.stopId || `stop-${fallbackIndex + 1}`),
    title: text(poi.name) || text(poi.title) || `Điểm dừng ${fallbackIndex + 1}`,
    category: text(poi.category) || text(poi.categoryNormalized) || 'Địa điểm',
    address: text(address.current) || text(address.raw) || text(poi.address),
    lat: coordinates.lat,
    lon: coordinates.lon,
    hasCoordinates: location.hasCoordinates !== false && coordinates.hasCoordinates,
  };
}

export function buildTripRoadRouteSegments(stops: TripRoadRouteStop[]) {
  const groups = new Map<number, TripRoadRoutePoint[]>();
  stops
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber || a.order - b.order || a.stopId.localeCompare(b.stopId))
    .forEach((stop, index) => {
      const points = groups.get(stop.dayNumber) || [];
      points.push(roadRoutePoint(stop, index));
      groups.set(stop.dayNumber, points);
    });

  return Array.from(groups.entries()).flatMap(([dayNumber, points]) => points.slice(1).map((destination, index) => {
    const origin = points[index];
    const hasCoordinates = origin.hasCoordinates && destination.hasCoordinates;
    return {
      id: `day-${dayNumber}-segment-${index + 1}-${origin.stopId}-${destination.stopId}`,
      dayNumber,
      segmentNumber: index + 1,
      origin,
      destination,
      route: null,
      path: [],
      fallbackPath: hasCoordinates ? [[origin.lat, origin.lon], [destination.lat, destination.lon]] : [],
      status: hasCoordinates ? 'loading' : 'missing_coordinates',
      message: hasCoordinates ? 'Đang tải tuyến đường bộ...' : 'Chặng này thiếu tọa độ hợp lệ.',
    } satisfies TripRoadRouteSegment;
  }));
}

export function useTripRoadRoutes({
  stops,
  transport,
  authenticated,
  enabled = true,
}: {
  stops: TripRoadRouteStop[];
  transport: string;
  authenticated: boolean;
  enabled?: boolean;
}) {
  const requestIdRef = useRef(0);
  const skeleton = useMemo(() => buildTripRoadRouteSegments(stops), [stops]);
  const segmentKey = skeleton.map((segment) => segment.id).join('|');
  const [segments, setSegments] = useState<TripRoadRouteSegment[]>(skeleton);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    void Promise.resolve().then(async () => {
      if (requestId !== requestIdRef.current) return;
      setSegments(skeleton);
      if (!enabled || !skeleton.length) {
        setLoading(false);
        return;
      }
      if (!authenticated) {
        setSegments(skeleton.map((segment) => segment.status === 'missing_coordinates' ? segment : {
          ...segment,
          status: 'auth_required',
          message: 'Đăng nhập để tải tuyến đường bộ cho chặng này.',
        }));
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextSegments = await Promise.all(skeleton.map(async (segment) => {
        if (segment.status === 'missing_coordinates') return segment;
        try {
          const route = await requestTravelerRoadRoute({
            origin: { lat: segment.origin.lat, lon: segment.origin.lon },
            destination: { lat: segment.destination.lat, lon: segment.destination.lon },
            transport,
          });
          const path = routeCoordinates(route);
          if (path.length < 2) throw new Error('invalid route geometry');
          return {
            ...segment,
            route,
            path,
            status: 'road' as const,
            message: 'Tuyến đường bộ đã sẵn sàng.',
          };
        } catch {
          return {
            ...segment,
            route: null,
            path: [],
            status: 'fallback' as const,
            message: 'Chưa lấy được tuyến đường bộ cho chặng này.',
          };
        }
      }));
      if (requestId === requestIdRef.current) setSegments(nextSegments);
      if (requestId === requestIdRef.current) setLoading(false);
    });

    return () => {
      requestIdRef.current += 1;
    };
  // The stable segment key prevents refetches caused only by object identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, enabled, segmentKey, transport]);

  return { segments, loading };
}
