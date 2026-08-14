import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

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

const DA_NANG_CENTER = { lat: 16.0544, lon: 108.2022 };

function valueRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stopPoi(stop: TripPreviewDayMapStop, fallbackIndex: number): PoiMapPoint {
  const poi = valueRecord(stop.poi);
  const location = valueRecord(poi.location);
  const lat = Number(location.lat ?? poi.lat);
  const lon = Number(location.lon ?? poi.lon ?? poi.lng);

  return {
    id: String(poi.globalId || poi.id || `preview-poi-${fallbackIndex}`),
    title: stringValue(poi.name) || stringValue(poi.title) || `Điểm dừng ${fallbackIndex + 1}`,
    category: stringValue(poi.category) || stringValue(poi.categoryNormalized) || 'địa điểm',
    lat,
    lon,
    hasCoordinates: Boolean(location.hasCoordinates ?? (Number.isFinite(lat) && Number.isFinite(lon))),
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

export function TripPreviewDayMap({
  dayStops,
  selectedStopId,
  onSelectStop,
}: {
  dayStops: TripPreviewDayMapStop[];
  selectedStopId: string;
  onSelectStop: (stopId: string) => void;
}) {
  const mappedStops = dayStops
    .map((stop, index) => ({ stop, poi: stopPoi(stop, index) }))
    .filter(({ poi }) => poi.hasCoordinates && Number.isFinite(poi.lat) && Number.isFinite(poi.lon));
  const positions = mappedStops.map(({ poi }) => [poi.lat, poi.lon] as [number, number]);
  const selectedPosition = mappedStops.find(({ stop }) => stop.stopId === selectedStopId);
  const center = positions[0] || ([DA_NANG_CENTER.lat, DA_NANG_CENTER.lon] as [number, number]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="font-semibold text-slate-950">Bản đồ trong ngày</h3>
          <p className="text-xs leading-5 text-slate-600">Đường nối minh họa giữa các điểm, không phải chỉ đường theo đường bộ.</p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
          Thời gian di chuyển ước tính
        </span>
      </div>
      {positions.length ? (
        <div className="h-[420px] min-h-[320px]">
          <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <PreviewMapBounds positions={positions} />
            <SelectedStopPan selectedPosition={selectedPosition ? [selectedPosition.poi.lat, selectedPosition.poi.lon] : null} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positions.length > 1 && (
              <Polyline positions={positions} pathOptions={{ color: '#0B3B60', weight: 5, opacity: 0.82 }} />
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
