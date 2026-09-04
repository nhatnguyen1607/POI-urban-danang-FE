import { useEffect, useRef, useState } from 'react';

type MapPoint = { lat: number; lon: number };
type MapListener = { remove: () => void };
type GoogleMapInstance = {
  addListener: (event: string, listener: (event: GoogleMapClickEvent) => void) => MapListener;
  fitBounds: (bounds: GoogleLatLngBounds, padding: number) => void;
  setCenter: (center: GoogleLatLngLiteral) => void;
  setOptions: (options: Record<string, unknown>) => void;
};
type GoogleMapClickEvent = { latLng?: { lat: () => number; lng: () => number } };
type GoogleLatLngLiteral = { lat: number; lng: number };
type GoogleLatLngBounds = {
  extend: (point: GoogleLatLngLiteral) => void;
  isEmpty: () => boolean;
};
type GoogleMapOverlay = {
  addListener?: (event: string, listener: () => void) => MapListener;
  setMap: (map: GoogleMapInstance | null) => void;
};
type GoogleMapsApi = {
  LatLngBounds: new () => GoogleLatLngBounds;
  Map: new (host: HTMLDivElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMapOverlay;
  Polyline: new (options: Record<string, unknown>) => GoogleMapOverlay;
  SymbolPath: { CIRCLE: unknown };
};

type GoogleDiscoveryMapProps = {
  center: MapPoint;
  destination: (MapPoint & { label: string }) | null;
  results: (MapPoint & { id: string; label: string })[];
  userPosition: MapPoint | null;
  routePath: [number, number][];
  pinMode: boolean;
  onPick: (lat: number, lon: number) => void;
  onSelectResult: (id: string) => void;
  currentLocationLabel: string;
  unavailableLabel: string;
};

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    __urbanAgentGoogleMapsPromise?: Promise<GoogleMapsApi>;
  }
}

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__urbanAgentGoogleMapsPromise) return window.__urbanAgentGoogleMapsPromise;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const explicitlyEnabled = import.meta.env.VITE_GOOGLE_PLACES_ENABLED === 'true';
  if (!apiKey || !explicitlyEnabled) {
    return Promise.reject(new Error('GOOGLE_MAPS_PLATFORM_CONFIGURATION_REQUIRED'));
  }
  window.__urbanAgentGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-urbanagent-google-map]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error('GOOGLE_MAP_LOAD_FAILED'));
      }, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.dataset.urbanagentGoogleMap = 'true';
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
    script.onload = () => window.google?.maps ? resolve(window.google.maps) : reject(new Error('GOOGLE_MAP_LOAD_FAILED'));
    script.onerror = () => reject(new Error('GOOGLE_MAP_LOAD_FAILED'));
    document.head.appendChild(script);
  });
  return window.__urbanAgentGoogleMapsPromise;
}

export function GoogleDiscoveryMap({
  center,
  destination,
  results,
  userPosition,
  routePath,
  pinMode,
  onPick,
  onSelectResult,
  currentLocationLabel,
  unavailableLabel,
}: GoogleDiscoveryMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const initialCenterRef = useRef(center);
  const selectResultRef = useRef(onSelectResult);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const destinationMarkerRef = useRef<GoogleMapOverlay | null>(null);
  const resultMarkersRef = useRef<GoogleMapOverlay[]>([]);
  const resultListenersRef = useRef<MapListener[]>([]);
  const userMarkerRef = useRef<GoogleMapOverlay | null>(null);
  const routeRef = useRef<GoogleMapOverlay | null>(null);
  const clickListenerRef = useRef<MapListener | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    selectResultRef.current = onSelectResult;
  }, [onSelectResult]);

  useEffect(() => {
    let active = true;
    void loadGoogleMaps().then((maps) => {
      if (!active || !hostRef.current) return;
      mapRef.current = new maps.Map(hostRef.current, {
        center: { lat: initialCenterRef.current.lat, lng: initialCenterRef.current.lon },
        zoom: 14,
        clickableIcons: false,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
      });
      setReady(true);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      clickListenerRef.current?.remove?.();
      destinationMarkerRef.current?.setMap?.(null);
      resultMarkersRef.current.forEach((marker) => marker.setMap(null));
      resultListenersRef.current.forEach((listener) => listener.remove());
      userMarkerRef.current?.setMap?.(null);
      routeRef.current?.setMap?.(null);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!map || !maps) return;
    clickListenerRef.current?.remove?.();
    clickListenerRef.current = pinMode
      ? map.addListener('click', (event: GoogleMapClickEvent) => {
          const lat = event.latLng?.lat?.();
          const lon = event.latLng?.lng?.();
          if (typeof lat === 'number' && Number.isFinite(lat) && typeof lon === 'number' && Number.isFinite(lon)) {
            onPick(lat, lon);
          }
        })
      : null;
    map.setOptions({ draggableCursor: pinMode ? 'crosshair' : null });
    return () => clickListenerRef.current?.remove?.();
  }, [onPick, pinMode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!map || !maps) return;
    destinationMarkerRef.current?.setMap?.(null);
    destinationMarkerRef.current = destination ? new maps.Marker({
      map,
      position: { lat: destination.lat, lng: destination.lon },
      title: destination.label,
    }) : null;
    resultMarkersRef.current.forEach((marker) => marker.setMap(null));
    resultListenersRef.current.forEach((listener) => listener.remove());
    resultListenersRef.current = [];
    resultMarkersRef.current = results.map((result, index) => {
      const marker = new maps.Marker({
        map,
        position: { lat: result.lat, lng: result.lon },
        title: result.label,
        label: String(index + 1),
      });
      const listener = marker.addListener?.('click', () => selectResultRef.current(result.id));
      if (listener) resultListenersRef.current.push(listener);
      return marker;
    });
    userMarkerRef.current?.setMap?.(null);
    userMarkerRef.current = userPosition ? new maps.Marker({
      map,
      position: { lat: userPosition.lat, lng: userPosition.lon },
      title: currentLocationLabel,
      icon: {
        path: maps.SymbolPath.CIRCLE,
        fillColor: '#0891b2',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 8,
      },
    }) : null;
    routeRef.current?.setMap?.(null);
    routeRef.current = routePath.length ? new maps.Polyline({
      map,
      path: routePath.map(([lat, lon]) => ({ lat, lng: lon })),
      strokeColor: '#7c3aed',
      strokeOpacity: 0.95,
      strokeWeight: 6,
    }) : null;
    const bounds = new maps.LatLngBounds();
    if (destination) bounds.extend({ lat: destination.lat, lng: destination.lon });
    if (userPosition) bounds.extend({ lat: userPosition.lat, lng: userPosition.lon });
    results.forEach((result) => bounds.extend({ lat: result.lat, lng: result.lon }));
    routePath.forEach(([lat, lon]) => bounds.extend({ lat, lng: lon }));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 64);
    else map.setCenter({ lat: center.lat, lng: center.lon });
  }, [center.lat, center.lon, currentLocationLabel, destination, ready, results, routePath, userPosition]);

  if (failed) {
    return <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600">{unavailableLabel}</div>;
  }
  return <div ref={hostRef} className="h-full w-full" aria-label="Google Maps" />;
}
