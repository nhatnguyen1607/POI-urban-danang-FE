import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertCircle, Loader2, Route } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  normalizeCoordinatePair,
  requestTravelerRoadRoute,
  routeCoordinates,
} from './travelerCapabilities';

type TripPreviewDayMapStop = {
  stopId: string;
  order: number;
  poi: unknown;
  arrivalTime: string | null;
  departureTime: string | null;
  reason?: string;
};

type PoiMapPoint = {
  id: string;
  title: string;
  category: string;
  lat: number;
  lon: number;
  hasCoordinates: boolean;
};

function valueRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stopPoi(stop: TripPreviewDayMapStop, fallbackIndex: number): PoiMapPoint {
  const poi = valueRecord(stop.poi);
  const location = valueRecord(poi.location);
  const coordinates = normalizeCoordinatePair(location.lat ?? poi.lat, location.lon ?? poi.lon ?? poi.lng);

  return {
    id: String(poi.globalId || poi.id || `preview-poi-${fallbackIndex}`),
    title: stringValue(poi.name) || stringValue(poi.title) || `Điểm dừng ${fallbackIndex + 1}`,
    category: stringValue(poi.category) || stringValue(poi.categoryNormalized) || 'địa điểm',
    lat: coordinates.lat,
    lon: coordinates.lon,
    hasCoordinates: location.hasCoordinates !== false && coordinates.hasCoordinates,
  };
}

function numberedPreviewIcon(order: number, selected: boolean) {
  const background = selected ? '#E76F51' : '#0B3B60';
  const ring = selected ? '#F4EDE2' : '#2A9D8F';
  return L.divIcon({
    className: 'urbanagent-preview-marker',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:${background};color:#FFFDF9;border:3px solid ${ring};font-size:13px;font-weight:800;box-shadow:0 8px 20px rgba(11,59,96,.25);">${order}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function PreviewMapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const positionsKey = positions.map(([lat, lon]) => `${lat},${lon}`).join('|');

  useEffect(() => {
    const nextPositions = positionsKey
      .split('|')
      .filter(Boolean)
      .map((position) => position.split(',').map(Number) as [number, number]);
    if (!nextPositions.length) return;

    map.stop();
    if (nextPositions.length === 1) {
      map.setView(nextPositions[0], 14, { animate: false });
      return;
    }
    map.fitBounds(L.latLngBounds(nextPositions), { padding: [28, 28], maxZoom: 15, animate: false });
  }, [map, positionsKey]);

  return null;
}

function SelectedStopPan({
  selectedPosition,
}: {
  selectedPosition: [number, number] | null;
}) {
  const map = useMap();
  const selectedLat = selectedPosition?.[0] ?? null;
  const selectedLon = selectedPosition?.[1] ?? null;

  useEffect(() => {
    if (selectedLat === null || selectedLon === null) return;
    map.stop();
    map.setView([selectedLat, selectedLon], Math.max(map.getZoom(), 14), { animate: false });
  }, [map, selectedLat, selectedLon]);

  return null;
}

function PreviewMapResize({ isVisible }: { isVisible: boolean }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const invalidateSize = () => {
      window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    };
    const observer = new ResizeObserver(invalidateSize);

    observer.observe(container);
    window.addEventListener('resize', invalidateSize);
    invalidateSize();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', invalidateSize);
    };
  }, [isVisible, map]);

  return null;
}

export function TripPreviewDayMap({
  dayStops,
  selectedStopId,
  authenticated,
  transport,
  isVisible,
  onSelectStop,
}: {
  dayStops: TripPreviewDayMapStop[];
  selectedStopId: string;
  authenticated: boolean;
  transport: string;
  isVisible: boolean;
  onSelectStop: (stopId: string) => void;
}) {
  const routeRequestIdRef = useRef(0);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const mappedStops = useMemo(() => dayStops
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stop, index) => ({ stop, poi: stopPoi(stop, index) }))
    .filter(({ poi }) => poi.hasCoordinates && Number.isFinite(poi.lat) && Number.isFinite(poi.lon)), [dayStops]);
  const positions = mappedStops.map(({ poi }) => [poi.lat, poi.lon] as [number, number]);
  const selectedPosition = mappedStops.find(({ stop }) => stop.stopId === selectedStopId);
  const routePointsKey = positions.map(([lat, lon]) => `${lat},${lon}`).join('|');

  useEffect(() => {
    const requestId = ++routeRequestIdRef.current;
    // Clear previous geometry immediately so a changed day/order never shows a stale route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutePath([]);
    setRouteDistance(0);
    setRouteDuration(0);
    setRouteError('');

    const points = routePointsKey
      .split('|')
      .filter(Boolean)
      .map((value) => value.split(',').map(Number) as [number, number]);
    if (points.length < 2 || !authenticated) {
      setRouteLoading(false);
      return undefined;
    }

    setRouteLoading(true);
    const loadRoadGeometry = async () => {
      const nextPath: [number, number][] = [];
      let nextDistance = 0;
      let nextDuration = 0;
      for (let index = 1; index < points.length; index += 1) {
        const [originLat, originLon] = points[index - 1];
        const [destinationLat, destinationLon] = points[index];
        const leg = await requestTravelerRoadRoute({
          origin: { lat: originLat, lon: originLon },
          destination: { lat: destinationLat, lon: destinationLon },
          transport,
        });
        const legPath = routeCoordinates(leg);
        if (legPath.length < 2) throw new Error('Chưa tải được đầy đủ tuyến đường bộ trong ngày.');
        nextPath.push(...(nextPath.length ? legPath.slice(1) : legPath));
        nextDistance += leg.distance;
        nextDuration += leg.duration;
      }
      if (requestId !== routeRequestIdRef.current) return;
      setRoutePath(nextPath);
      setRouteDistance(nextDistance);
      setRouteDuration(nextDuration);
    };

    void loadRoadGeometry()
      .catch((error) => {
        if (requestId !== routeRequestIdRef.current) return;
        setRoutePath([]);
        setRouteError(error instanceof Error ? error.message : 'Chưa tải được tuyến đường bộ.');
      })
      .finally(() => {
        if (requestId === routeRequestIdRef.current) setRouteLoading(false);
      });

    return () => {
      routeRequestIdRef.current += 1;
    };
  }, [authenticated, routePointsKey, transport]);

  const boundsPositions = routePath.length ? [...routePath, ...positions] : positions;
  const routeStatus = routeLoading
    ? 'Đang tải tuyến đường bộ...'
    : !authenticated && positions.length > 1
      ? 'Đăng nhập để xem tuyến đường bộ.'
      : routeError
        ? 'Chưa tải được tuyến đường bộ.'
        : routePath.length
          ? 'Tuyến đường dự kiến giữa các điểm trong ngày.'
          : positions.length > 1
            ? 'Chưa có tuyến đường bộ để hiển thị.'
            : 'Cần ít nhất hai điểm có tọa độ để tính tuyến đường.';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="font-semibold text-slate-950">Bản đồ trong ngày</h3>
          <p className="text-xs leading-5 text-slate-600">{routeStatus}</p>
        </div>
        {routeLoading ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            <Loader2 className="animate-spin" size={13} /> Đang tính tuyến
          </span>
        ) : routePath.length ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Route size={13} /> {(routeDistance / 1000).toFixed(1)} km · {Math.max(1, Math.round(routeDuration / 60))} phút
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <AlertCircle size={13} /> Không có đường nối giả lập
          </span>
        )}
      </div>
      {positions.length ? (
        <div className="h-[420px] min-h-[320px]">
          <MapContainer center={positions[0]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <PreviewMapResize isVisible={isVisible} />
            <PreviewMapBounds positions={boundsPositions} />
            <SelectedStopPan selectedPosition={selectedPosition ? [selectedPosition.poi.lat, selectedPosition.poi.lon] : null} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routePath.length > 1 && (
              <Polyline positions={routePath} pathOptions={{ color: '#0B3B60', weight: 5, opacity: 0.82 }} />
            )}
            {mappedStops.map(({ stop, poi }, index) => {
              const selected = selectedStopId === stop.stopId;
              const displayOrder = index + 1;
              return (
                <Marker
                  key={stop.stopId}
                  position={[poi.lat, poi.lon]}
                  icon={numberedPreviewIcon(displayOrder, selected)}
                  zIndexOffset={selected ? 1000 : 0}
                  eventHandlers={{ click: () => onSelectStop(stop.stopId) }}
                >
                  <Popup>
                    <strong>{displayOrder}. {poi.title}</strong>
                    <br />
                    {poi.category}
                    <br />
                    {stop.arrivalTime || '--'} - {stop.departureTime || '--'}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <div className="flex min-h-[260px] items-center justify-center px-5 text-center text-sm leading-6 text-slate-600">
          Ngày này chưa có điểm dừng có tọa độ hợp lệ để hiển thị trên bản đồ.
        </div>
      )}
    </div>
  );
}
