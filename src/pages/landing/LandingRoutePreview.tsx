import { Fragment, useEffect, useState } from 'react';
import L from 'leaflet';
import { Clock, Footprints, MapPin, Route } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Language } from '../../i18n/LanguageContext';
import { routeCasingOptions, routeLineOptions } from '../urban-agent/routeVisuals';

type PreviewStop = {
  id: string;
  name: string;
  category: string;
  position: [number, number];
};

type PreviewLeg = {
  path: [number, number][];
  distance: number;
  duration: number;
};

type PreviewRoute = {
  legs: PreviewLeg[];
  distance: number;
  duration: number;
};

const SESSION_CACHE_KEY = 'urbanagent_landing_osrm_preview_v1';
const OSRM_ENDPOINT = 'https://router.project-osrm.org/route/v1/driving';

const previewStops: PreviewStop[] = [
  { id: 'google_maps_1730', name: 'Cửa Ngõ Café', category: 'Cà phê', position: [16.061310117251, 108.230460837883] },
  { id: 'google_maps_1733', name: 'Meow Coffee', category: 'Cà phê', position: [16.058019405344, 108.238847056799] },
  { id: 'google_maps_1691', name: 'Hải sản Mộc quán Đà Nẵng', category: 'Hải sản', position: [16.063968020521, 108.241513459124] },
];

let routePreviewPromise: Promise<PreviewRoute> | null = null;

function markerIcon(order: number) {
  return L.divIcon({
    className: 'ua-landing-map-marker',
    html: `<span>${order}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function validCachedRoute(value: unknown): value is PreviewRoute {
  const route = value as PreviewRoute;
  return Array.isArray(route?.legs)
    && route.legs.length === previewStops.length - 1
    && route.legs.every((leg) => Array.isArray(leg.path) && leg.path.length > 1)
    && Number.isFinite(route.distance)
    && Number.isFinite(route.duration);
}

async function fetchOsrmLeg(origin: PreviewStop, destination: PreviewStop) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  const coordinates = `${origin.position[1]},${origin.position[0]};${destination.position[1]},${destination.position[0]}`;
  try {
    const response = await fetch(
      `${OSRM_ENDPOINT}/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=false`,
      { signal: controller.signal, headers: { Accept: 'application/json' } },
    );
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const payload = await response.json();
    const route = payload?.routes?.[0];
    const coordinatesResult = route?.geometry?.coordinates;
    if (payload?.code !== 'Ok' || !Array.isArray(coordinatesResult) || coordinatesResult.length < 2) {
      throw new Error('OSRM route geometry unavailable');
    }
    return {
      path: coordinatesResult.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]),
      distance: Number(route.distance),
      duration: Number(route.duration),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadRoutePreview() {
  const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (validCachedRoute(parsed)) return parsed;
    } catch {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  }

  const legs = await Promise.all(
    previewStops.slice(1).map((destination, index) => fetchOsrmLeg(previewStops[index], destination)),
  );
  const result = {
    legs,
    distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
    duration: legs.reduce((sum, leg) => sum + leg.duration, 0),
  };
  sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(result));
  return result;
}

function LandingMapBounds({ route }: { route: PreviewRoute | null }) {
  const map = useMap();
  const path = route?.legs.flatMap((leg) => leg.path) || previewStops.map((stop) => stop.position);
  const key = path.map((position) => position.join(',')).join('|');

  useEffect(() => {
    const points = key.split('|').filter(Boolean).map((value) => value.split(',').map(Number) as [number, number]);
    window.requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 15, animate: false });
    });
  }, [key, map]);
  return null;
}

const copy = {
  vi: {
    title: 'Một buổi chiều ở Đà Nẵng',
    loading: 'Đang tải tuyến đường thực tế...',
    unavailable: 'Không thể tải bản xem trước tuyến đường lúc này.',
    stops: '3 điểm dừng',
    open: 'Mở trình lập kế hoạch',
    disclaimer: 'Đường đi thực tế được tải từ OSRM. Thời gian di chuyển là ước tính.',
  },
  en: {
    title: 'An afternoon in Da Nang',
    loading: 'Loading the real road route...',
    unavailable: 'The route preview is unavailable right now.',
    stops: '3 stops',
    open: 'Open trip planner',
    disclaimer: 'Road geometry is loaded from OSRM. Travel time is an estimate.',
  },
} satisfies Record<Language, Record<string, string>>;

export function LandingRoutePreview({ language, onOpenPlanner }: { language: Language; onOpenPlanner: () => void }) {
  const [route, setRoute] = useState<PreviewRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const text = copy[language];

  useEffect(() => {
    let active = true;
    routePreviewPromise ||= loadRoutePreview().catch((error) => {
      routePreviewPromise = null;
      throw error;
    });
    routePreviewPromise
      .then((result) => {
        if (active) setRoute(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="ua-landing-route-showcase relative h-[420px] overflow-hidden rounded-[24px] shadow-[0_30px_70px_-30px_rgba(14,32,56,0.3)] ring-1 ring-[#0E2038]/8 sm:h-[520px]">
      <MapContainer center={previewStops[0].position} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LandingMapBounds route={route} />
        {route?.legs.map((leg, index) => (
          <Fragment key={`landing-leg-${index + 1}`}>
            <Polyline positions={leg.path} pathOptions={routeCasingOptions()} />
            <Polyline positions={leg.path} pathOptions={routeLineOptions()} />
          </Fragment>
        ))}
        {previewStops.map((stop, index) => (
          <Marker key={stop.id} position={stop.position} icon={markerIcon(index + 1)}>
            <Popup><strong>{index + 1}. {stop.name}</strong><br />{stop.category}</Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="ua-route-showcase-summary absolute left-4 top-4 z-[500] w-[min(300px,calc(100%-2rem))] rounded-[18px] bg-white/95 p-4 shadow-lg backdrop-blur sm:left-5 sm:top-5 sm:p-5">
        <h3 className="text-[17px] font-semibold">{text.title}</h3>
        <div className="mt-3 space-y-2 text-[13px] text-[#607086]">
          <p className="flex items-center gap-2"><MapPin size={15} className="text-[#087EA4]" /> {text.stops}</p>
          {route && <p className="flex items-center gap-2"><Footprints size={15} className="text-[#087EA4]" /> {(route.distance / 1000).toFixed(1)} km</p>}
          {route && <p className="flex items-center gap-2"><Clock size={15} className="text-[#087EA4]" /> {Math.max(1, Math.round(route.duration / 60))} phút</p>}
          {loading && <p className="font-medium text-[#087EA4]">{text.loading}</p>}
          {failed && <p role="status" className="font-medium text-amber-700">{text.unavailable}</p>}
        </div>
        <button type="button" onClick={onOpenPlanner} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#0767C8] text-[14px] font-medium text-white">
          <Route size={15} /> {text.open}
        </button>
        <p className="mt-3 text-[11px] leading-4 text-[#607086]">{text.disclaimer}</p>
      </div>
    </div>
  );
}
