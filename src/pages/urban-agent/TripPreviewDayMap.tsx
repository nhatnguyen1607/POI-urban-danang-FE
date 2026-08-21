import { useEffect } from 'react';
import L from 'leaflet';
import { AlertCircle, Expand, Loader2, Route } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { roadRoutePoint, useTripRoadRoutes, type TripRoadRouteStop } from './tripRoadRoutes';

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

function PreviewMapState({ positions, selectedPosition }: { positions: [number, number][]; selectedPosition: [number, number] | null }) {
  const map = useMap();
  const positionsKey = positions.map((position) => position.join(',')).join('|');
  const selectedKey = selectedPosition?.join(',') || '';
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(map.getContainer());
    window.requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      const points = positionsKey.split('|').filter(Boolean).map((item) => item.split(',').map(Number) as [number, number]);
      if (points.length === 1) map.setView(points[0], 14, { animate: false });
      else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15, animate: false });
    });
    return () => observer.disconnect();
  }, [map, positionsKey]);
  useEffect(() => {
    if (!selectedKey) return;
    const point = selectedKey.split(',').map(Number) as [number, number];
    map.setView(point, Math.max(map.getZoom(), 14), { animate: false });
  }, [map, selectedKey]);
  return null;
}

export function TripPreviewDayMap({
  dayStops,
  selectedStopId,
  authenticated,
  transport,
  isVisible,
  onSelectStop,
  onOpenFullRoute,
}: {
  dayStops: TripRoadRouteStop[];
  selectedStopId: string;
  authenticated: boolean;
  transport: string;
  isVisible: boolean;
  onSelectStop: (stopId: string) => void;
  onOpenFullRoute?: () => void;
}) {
  const { segments, loading } = useTripRoadRoutes({ stops: dayStops, transport, authenticated, enabled: true });
  const mappedStops = dayStops
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stop, index) => ({ stop, poi: roadRoutePoint(stop, index) }))
    .filter(({ poi }) => poi.hasCoordinates);
  const positions = mappedStops.map(({ poi }) => [poi.lat, poi.lon] as [number, number]);
  const selected = mappedStops.find(({ stop }) => stop.stopId === selectedStopId);
  const roadSegments = segments.filter((segment) => segment.status === 'road' && segment.route);
  const fallbackCount = segments.filter((segment) => segment.status === 'fallback').length;
  const distance = roadSegments.reduce((sum, segment) => sum + Number(segment.route?.distance || 0), 0);
  const duration = roadSegments.reduce((sum, segment) => sum + Number(segment.route?.duration || 0), 0);
  const routePositions = segments.flatMap((segment) => segment.path.length ? segment.path : segment.fallbackPath);
  const routeStatus = loading
    ? 'Đang tải tuyến đường bộ...'
    : !authenticated && positions.length > 1
      ? 'Đăng nhập để xem tuyến đường bộ.'
      : fallbackCount
        ? `${roadSegments.length} chặng đường bộ · ${fallbackCount} chặng chưa lấy được tuyến.`
        : roadSegments.length
          ? 'Tuyến đường bộ dự kiến giữa các điểm trong ngày.'
          : positions.length > 1
            ? 'Chưa có tuyến đường bộ để hiển thị.'
            : 'Cần ít nhất hai điểm có tọa độ để tính tuyến đường.';

  return (
    <div data-active-view={isVisible ? 'map' : 'timeline'} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="font-semibold text-slate-950">Bản đồ trong ngày</h3>
          <p className="text-xs leading-5 text-slate-600">{routeStatus}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800"><Loader2 className="animate-spin" size={13} /> Đang tính tuyến</span>
          ) : roadSegments.length ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"><Route size={13} /> {(distance / 1000).toFixed(1)} km · {Math.max(1, Math.round(duration / 60))} phút</span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"><AlertCircle size={13} /> Chưa có tuyến đường bộ</span>
          )}
          {onOpenFullRoute && <button type="button" onClick={onOpenFullRoute} className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"><Expand size={14} /> Xem toàn bộ lộ trình</button>}
        </div>
      </div>
      {positions.length ? (
        <div className="h-[420px] min-h-[320px]">
          <MapContainer center={positions[0]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <PreviewMapState positions={routePositions.length ? routePositions : positions} selectedPosition={selected ? [selected.poi.lat, selected.poi.lon] : null} />
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {segments.map((segment) => {
              const path = segment.status === 'road' ? segment.path : segment.fallbackPath;
              if (path.length < 2) return null;
              return <Polyline key={segment.id} positions={path} pathOptions={{ color: segment.status === 'road' ? '#0B3B60' : '#D97706', weight: segment.status === 'road' ? 5 : 4, opacity: 0.82, dashArray: segment.status === 'road' ? undefined : '8 10' }} />;
            })}
            {mappedStops.map(({ stop, poi }, index) => (
              <Marker key={stop.stopId} position={[poi.lat, poi.lon]} icon={numberedPreviewIcon(index + 1, selectedStopId === stop.stopId)} zIndexOffset={selectedStopId === stop.stopId ? 1000 : 0} eventHandlers={{ click: () => onSelectStop(stop.stopId) }}>
                <Popup><strong>{index + 1}. {poi.title}</strong><br />{poi.category}<br />{stop.arrivalTime || '--'} - {stop.departureTime || '--'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : <div className="flex min-h-[260px] items-center justify-center px-5 text-center text-sm leading-6 text-slate-600">Ngày này chưa có điểm dừng có tọa độ hợp lệ để hiển thị trên bản đồ.</div>}
      {fallbackCount > 0 && <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">Đường nét đứt là chặng chưa lấy được tuyến đường bộ, không phải đường đi thực tế.</p>}
    </div>
  );
}
