import { Fragment, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, Car, Clock3, MapPin, Navigation, Route, X } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useTripRoadRoutes, roadRoutePoint, type TripRoadRouteSegment, type TripRoadRouteStop } from './tripRoadRoutes';
import { ROUTE_VISUALS, routeCasingOptions, routeColorForDay, routeLineOptions } from './routeVisuals';

function routeMarker(order: number, dayNumber: number, selected: boolean) {
  const color = selected ? ROUTE_VISUALS.selected : routeColorForDay(dayNumber);
  return L.divIcon({
    className: 'urbanagent-full-route-marker',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:${color};color:white;border:3px solid white;font-size:12px;font-weight:800;box-shadow:0 5px 14px rgba(15,23,42,.3)">${order}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FullRouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const key = positions.map((point) => point.join(',')).join('|');
  useEffect(() => {
    const points = key.split('|').filter(Boolean).map((item) => item.split(',').map(Number) as [number, number]);
    window.requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      if (points.length === 1) map.setView(points[0], 14, { animate: false });
      else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15, animate: false });
    });
  }, [key, map]);
  return null;
}

function distanceText(meters?: number) {
  return Number.isFinite(meters) && Number(meters) > 0 ? `${(Number(meters) / 1000).toFixed(1)} km` : 'Chưa rõ';
}

function durationText(seconds?: number) {
  return Number.isFinite(seconds) && Number(seconds) > 0 ? `${Math.max(1, Math.round(Number(seconds) / 60))} phút` : 'Chưa rõ';
}

export function TravelerFullRouteModal({
  open,
  stops,
  dayNumbers,
  authenticated,
  transport,
  onClose,
  onStartNavigation,
  onBookRide,
}: {
  open: boolean;
  stops: TripRoadRouteStop[];
  dayNumbers: number[];
  authenticated: boolean;
  transport: string;
  onClose: () => void;
  onStartNavigation: (segment: TripRoadRouteSegment) => void;
  onBookRide: (destination: TripRoadRouteSegment['destination']) => void;
}) {
  const [dayFilter, setDayFilter] = useState<number | 'all'>('all');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const { segments, loading } = useTripRoadRoutes({ stops, transport, authenticated, enabled: open });
  const visibleSegments = useMemo(() => segments.filter((segment) => dayFilter === 'all' || segment.dayNumber === dayFilter), [dayFilter, segments]);
  const visibleStops = useMemo(() => stops
    .filter((stop) => dayFilter === 'all' || stop.dayNumber === dayFilter)
    .map((stop, index) => roadRoutePoint(stop, index))
    .filter((point) => point.hasCoordinates), [dayFilter, stops]);
  const selectedSegment = visibleSegments.find((segment) => segment.id === selectedSegmentId) || visibleSegments[0] || null;
  const roadSegments = visibleSegments.filter((segment) => segment.status === 'road' && segment.route);
  const totalSegmentCount = visibleSegments.length;
  const routedSegmentCount = roadSegments.length;
  const unresolvedSegmentCount = Math.max(0, totalSegmentCount - routedSegmentCount);
  const allSegmentsRouted = totalSegmentCount > 0 && unresolvedSegmentCount === 0;
  const totalDistance = roadSegments.reduce((sum, segment) => sum + Number(segment.route?.distance || 0), 0);
  const totalDuration = roadSegments.reduce((sum, segment) => sum + Number(segment.route?.duration || 0), 0);
  const positions = visibleSegments.flatMap((segment) => segment.path.length ? segment.path : segment.fallbackPath);

  if (!open) return null;
  const warnings = selectedSegment?.route?.esValidation?.warnings || [];
  const steps = selectedSegment?.route?.steps || [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5" onClick={onClose}>
      <div className="flex h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">Toàn bộ lộ trình</h2>
            <p className="mt-1 text-sm text-slate-600">Tuyến đường bộ theo từng chặng, không nối giả giữa hai ngày.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X /></button>
        </header>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setDayFilter('all')} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${dayFilter === 'all' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Tất cả</button>
          {dayNumbers.map((dayNumber) => (
            <button key={dayNumber} type="button" onClick={() => setDayFilter(dayNumber)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${dayFilter === dayNumber ? 'text-white' : 'bg-slate-100 text-slate-700'}`} style={dayFilter === dayNumber ? { backgroundColor: routeColorForDay(dayNumber) } : undefined}>Ngày {dayNumber}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-5 sm:px-6">
          <Summary icon={<Route size={16} />} label="Tuyến đường đã tính" value={`${routedSegmentCount}/${totalSegmentCount} chặng`} />
          <Summary icon={<Route size={16} />} label={allSegmentsRouted ? 'Tổng quãng đường' : 'Quãng đường đã tính'} value={distanceText(totalDistance)} />
          <Summary icon={<Clock3 size={16} />} label={allSegmentsRouted ? 'Thời gian di chuyển' : 'Thời gian đã tính'} value={durationText(totalDuration)} />
          <Summary icon={<MapPin size={16} />} label="Điểm dừng" value={String(visibleStops.length)} />
          <Summary icon={<Car size={16} />} label="Số ngày" value={String(dayFilter === 'all' ? dayNumbers.length : 1)} />
        </div>
        {!loading && unresolvedSegmentCount > 0 && (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-6">
            {unresolvedSegmentCount} chặng chưa lấy được tuyến đường bộ nên quãng đường và thời gian hiển thị mới bao gồm {routedSegmentCount}/{totalSegmentCount} chặng.
          </p>
        )}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="relative min-h-[340px] border-b border-slate-200 lg:border-b-0 lg:border-r">
            {visibleStops.length ? (
              <MapContainer center={[visibleStops[0].lat, visibleStops[0].lon]} zoom={13} scrollWheelZoom style={{ height: '100%', minHeight: '340px', width: '100%' }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FullRouteBounds positions={positions.length ? positions : visibleStops.map((point) => [point.lat, point.lon])} />
                {visibleSegments.map((segment) => {
                  const selected = selectedSegment?.id === segment.id;
                  const path = segment.status === 'road' ? segment.path : segment.fallbackPath;
                  if (path.length < 2) return null;
                  const fallback = segment.status !== 'road';
                  return (
                    <Fragment key={segment.id}>
                      {!fallback && <Polyline positions={path} pathOptions={routeCasingOptions(selected)} />}
                      <Polyline
                        positions={path}
                        eventHandlers={{ click: () => setSelectedSegmentId(segment.id) }}
                        pathOptions={routeLineOptions({ dayNumber: segment.dayNumber, selected, fallback })}
                      />
                    </Fragment>
                  );
                })}
                {visibleStops.map((point) => (
                  <Marker key={point.stopId} position={[point.lat, point.lon]} icon={routeMarker(point.order, point.dayNumber, selectedSegment?.origin.stopId === point.stopId || selectedSegment?.destination.stopId === point.stopId)}>
                    <Popup><strong>{point.order}. {point.title}</strong><br />Ngày {point.dayNumber}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : <div className="flex h-full min-h-[340px] items-center justify-center p-8 text-center text-sm text-slate-600">Chưa có điểm dừng đủ tọa độ để hiển thị.</div>}
            {loading && <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow">Đang tải các tuyến đường bộ...</div>}
          </div>

          <aside className="min-h-0 overflow-y-auto p-4 sm:p-5">
            <h3 className="font-semibold text-slate-950">Các chặng</h3>
            <div className="mt-3 space-y-2">
              {visibleSegments.map((segment) => (
                <button key={segment.id} type="button" onClick={() => setSelectedSegmentId(segment.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedSegment?.id === segment.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300'}`}>
                  <div className="text-xs font-semibold text-slate-500">Ngày {segment.dayNumber} · Chặng {segment.segmentNumber}</div>
                  <div className="mt-1 font-semibold text-slate-950">{segment.origin.title} → {segment.destination.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{segment.status === 'road' ? `${distanceText(segment.route?.distance)} · ${durationText(segment.route?.duration)}` : segment.message}</div>
                  {(segment.route?.esValidation?.warnings?.length || segment.status === 'fallback') ? <AlertTriangle className="mt-2 text-amber-600" size={16} /> : null}
                </button>
              ))}
            </div>

            {selectedSegment && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-950">{selectedSegment.origin.title} → {selectedSegment.destination.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{selectedSegment.status === 'road' ? `${distanceText(selectedSegment.route?.distance)} · ${durationText(selectedSegment.route?.duration)}` : selectedSegment.message}</p>
                {selectedSegment.status === 'fallback' && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Chưa lấy được tuyến đường bộ cho chặng này. Đường nét đứt chỉ nối hai tọa độ để nhận biết chặng.</p>}
                {!!warnings.length && <div className="mt-3 space-y-1 text-sm text-amber-900">{warnings.map((warning, index) => <p key={`${warning.message || warning.law}-${index}`}>• {warning.message || warning.law || 'Lưu ý trên tuyến'}</p>)}</div>}
                {!!steps.length && <details className="mt-3 text-sm text-slate-700"><summary className="cursor-pointer font-semibold">Hướng dẫn chính</summary><ol className="mt-2 space-y-1">{steps.slice(0, 8).map((step, index) => <li key={index}>{index + 1}. {step.instruction || step.instructions || step.name || 'Tiếp tục theo tuyến'}</li>)}</ol></details>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={selectedSegment.status !== 'road'} onClick={() => onStartNavigation(selectedSegment)} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Navigation size={15} /> Bắt đầu chỉ đường</button>
                  <button type="button" disabled={!selectedSegment.destination.hasCoordinates} onClick={() => onBookRide(selectedSegment.destination)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"><Car size={15} /> Đặt xe</button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}
