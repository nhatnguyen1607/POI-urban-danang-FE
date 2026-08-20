import { useEffect } from 'react';
import L from 'leaflet';
import { Clock3, MapPin, Navigation, Route, TriangleAlert, X } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  buildGoogleMapsDirectionsUrl,
  hasValidPoiCoordinates,
  routeCoordinates,
  type TravelerActionPoi,
  type TravelerRouteResult,
} from './travelerCapabilities';

function numberedIcon(order: number, tone: 'teal' | 'coral' = 'teal') {
  const background = tone === 'coral' ? '#E76F51' : '#0F766E';
  return L.divIcon({
    className: 'urbanagent-route-marker',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;background:${background};color:white;border:3px solid #CCFBF1;font-size:13px;font-weight:800;box-shadow:0 8px 18px rgba(15,118,110,.28);">${order}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function RouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const key = positions.map(([lat, lon]) => `${lat},${lon}`).join('|');

  useEffect(() => {
    const next = key
      .split('|')
      .filter(Boolean)
      .map((value) => value.split(',').map(Number) as [number, number])
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
    if (!next.length) return;
    map.stop();
    if (next.length === 1) map.setView(next[0], 14, { animate: false });
    else map.fitBounds(L.latLngBounds(next), { padding: [36, 36], maxZoom: 16, animate: false });
  }, [key, map]);

  return null;
}

function formatDistance(meters?: number) {
  if (!Number.isFinite(meters) || !meters) return 'Chưa rõ';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds?: number) {
  if (!Number.isFinite(seconds) || !seconds) return 'Chưa rõ';
  return `${Math.max(1, Math.round(seconds / 60))} phút`;
}

export function TravelerRouteModal({
  open,
  title,
  routes,
  selectedRouteIndex,
  routeStops,
  origin,
  loading,
  error,
  onClose,
  onSelectRoute,
}: {
  open: boolean;
  title: string;
  routes: TravelerRouteResult[];
  selectedRouteIndex: number;
  routeStops: TravelerActionPoi[];
  origin: [number, number] | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSelectRoute: (index: number) => void;
}) {
  if (!open) return null;
  const validStops = routeStops.filter(hasValidPoiCoordinates);
  const selectedRoute = routes[selectedRouteIndex] || routes[0] || null;
  const selectedCoordinates = routeCoordinates(selectedRoute);
  const illustrative = Boolean(selectedRoute?.illustrative);
  const positions = selectedCoordinates.length
    ? selectedCoordinates
    : validStops.map((poi) => [poi.lat, poi.lon] as [number, number]);
  const center = origin || positions[0];
  const destination = validStops[validStops.length - 1];
  const directionsUrl = destination ? buildGoogleMapsDirectionsUrl(destination) : null;

  if (!center) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5" onClick={onClose}>
      <div
        className="flex h-[92vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {!selectedRoute
                ? 'Vị trí địa điểm trên bản đồ. Bạn có thể mở Google Maps để bắt đầu điều hướng.'
                : illustrative
                ? 'Đường nối minh họa giữa các điểm, không phải chỉ đường theo đường bộ. Thời gian di chuyển là ước tính.'
                : 'Tuyến đường bộ tham khảo từ hệ thống hiện có. Hãy mở ứng dụng bản đồ để bắt đầu điều hướng.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bản đồ lớn"
            className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <X size={20} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(320px,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1">
          <div className="relative min-h-[320px] bg-slate-100">
            {loading && (
              <div className="absolute inset-x-4 top-4 z-[1000] rounded-xl border border-sky-200 bg-white/95 px-4 py-3 text-sm font-semibold text-sky-800 shadow-sm">
                Đang tìm tuyến đường phù hợp...
              </div>
            )}
            <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RouteBounds positions={[...(origin && !illustrative ? [origin] : []), ...positions]} />
              {selectedCoordinates.length > 1 && (
                <Polyline
                  positions={selectedCoordinates}
                  pathOptions={{ color: illustrative ? '#0F766E' : '#0B3B60', weight: 6, opacity: 0.88 }}
                />
              )}
              {origin && !illustrative && (
                <Marker position={origin} icon={numberedIcon(0, 'coral')}>
                  <Popup>Vị trí hiện tại</Popup>
                </Marker>
              )}
              {validStops.map((poi, index) => (
                <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={numberedIcon(index + 1)}>
                  <Popup>
                    <strong>{index + 1}. {poi.title}</strong>
                    <br />
                    {poi.category}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <aside className="max-h-72 overflow-y-auto border-t border-slate-200 bg-slate-50 p-4 lg:max-h-none lg:border-l lg:border-t-0">
            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
                {error}
              </div>
            )}
            {routes.length > 1 && !illustrative && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Các tuyến đường">
                {routes.map((route, index) => (
                  <button
                    key={`${route.distance}-${index}`}
                    type="button"
                    onClick={() => onSelectRoute(index)}
                    className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      selectedRouteIndex === index
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-teal-500'
                    }`}
                  >
                    Tuyến {index + 1}
                  </button>
                ))}
              </div>
            )}
            {selectedRoute && <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <MapPin className="mb-2 text-teal-700" size={16} />
                <div className="text-slate-500">Khoảng cách</div>
                <strong className="mt-1 block text-slate-950">{illustrative ? 'Minh họa' : formatDistance(selectedRoute?.distance)}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <Clock3 className="mb-2 text-teal-700" size={16} />
                <div className="text-slate-500">Thời gian</div>
                <strong className="mt-1 block text-slate-950">{illustrative ? 'Ước tính trong lịch' : formatDuration(selectedRoute?.duration)}</strong>
              </div>
            </div>}

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                <Navigation size={16} />
                Mở Google Maps để chỉ đường
              </a>
            )}

            {!illustrative && Boolean(selectedRoute?.esValidation?.warnings?.length) && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <h3 className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} /> Lưu ý trên tuyến</h3>
                <div className="mt-2 space-y-1 leading-6">
                  {selectedRoute?.esValidation.warnings.slice(0, 5).map((warning, index) => (
                    <p key={`${warning.message || warning.law}-${index}`}>{warning.message || warning.law || 'Có lưu ý cần kiểm tra trên tuyến.'}</p>
                  ))}
                </div>
              </div>
            )}

            {!illustrative && Boolean(selectedRoute?.steps?.length) && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="flex items-center gap-2 font-semibold text-slate-950"><Route size={16} /> Các chặng chính</h3>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {selectedRoute?.steps.slice(0, 10).map((step, index) => (
                    <div key={`${step.instruction || step.instructions}-${index}`} className="flex gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-800">{index + 1}</span>
                      <span>{step.instruction || step.instructions || 'Tiếp tục theo tuyến được đề xuất.'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {illustrative && (
              <div className="mt-4 space-y-2">
                {validStops.map((poi, index) => (
                  <div key={poi.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{index + 1}</span>
                    <div className="min-w-0">
                      <div className="break-words text-sm font-semibold text-slate-950">{poi.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{poi.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
