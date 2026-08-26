import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../utils/apiClient';

export type ServiceStatus = 'active' | 'waiting' | 'unavailable' | 'unknown';

interface AdminCapabilities {
  identity?: { read?: boolean };
  users?: { read?: boolean; write?: boolean };
  pois?: { read?: boolean; write?: boolean };
  trips?: { read?: boolean; write?: boolean };
  analytics?: { read?: boolean };
  agentTelemetry?: { read?: boolean };
  integrations?: { read?: boolean; write?: boolean };
  health?: { read?: boolean };
  logs?: { read?: boolean };
}

interface AdminHealthServices {
  backend?: { status?: string };
  googleMaps?: { status?: string };
  photon?: { status?: string };
  osrm?: { status?: string };
  firebase?: { status?: string; firestoreReady?: boolean };
}

export interface SafeAdminSnapshot {
  loading: boolean;
  error: string | null;
  checkedAt: Date | null;
  canonicalPois: number | null;
  canonicalHeaderValid: boolean | null;
  invalidPoiRows: number | null;
  runtimeRepository: string | null;
  backendStatus: ServiceStatus;
  firebaseStatus: ServiceStatus;
  firestoreStatus: ServiceStatus;
  googleStatus: ServiceStatus;
  photonStatus: ServiceStatus;
  osrmStatus: ServiceStatus;
  capabilities: AdminCapabilities | null;
}

export interface SafeAdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  emailVerified: boolean;
  creationTime: string | null;
  lastSignInTime: string | null;
  admin: boolean;
}

export interface AdminCount {
  value: number | null;
  exact: boolean;
}

export interface AdminActivity {
  id: string;
  type: 'trip' | 'feedback';
  label: string;
  ownerId: string | null;
  occurredAt: string | null;
}

export interface AdminOverviewData {
  counts: { users: AdminCount; trips: AdminCount; feedback: AdminCount };
  recentActivity: AdminActivity[];
}

export interface AdminPoiRecord {
  poiId: string;
  name: string;
  category: string;
  address: string | null;
  district: string | null;
  source: string | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  location: { lat: number; lng: number } | null;
  coordinateStatus: string | null;
}

export interface AdminTripStop {
  stopId: string | null;
  dayNumber: number;
  order: number;
  arrivalTime: string | null;
  departureTime: string | null;
  poi: { poiId: string | null; name: string; category: string };
}

export interface AdminTripRecord {
  tripId: string;
  ownerId: string | null;
  title: string;
  cityId: string;
  startDate: string | null;
  dayCount: number;
  stopCount: number;
  status: string;
  needsReplan: boolean;
  transport: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  stops?: AdminTripStop[];
}

export interface AdminFeedbackRecord {
  eventId: string;
  userId: string | null;
  eventType: string;
  rating: number | null;
  message: string | null;
  poiId: string | null;
  itineraryId: string | null;
  createdAt: string | null;
}

const initialSnapshot: SafeAdminSnapshot = {
  loading: true,
  error: null,
  checkedAt: null,
  canonicalPois: null,
  canonicalHeaderValid: null,
  invalidPoiRows: null,
  runtimeRepository: null,
  backendStatus: 'unknown',
  firebaseStatus: 'unknown',
  firestoreStatus: 'unknown',
  googleStatus: 'waiting',
  photonStatus: 'unknown',
  osrmStatus: 'unknown',
  capabilities: null,
};

function serviceStatus(value?: string): ServiceStatus {
  if (value === 'active' || value === 'configured') return 'active';
  if (value === 'GOOGLE_LIVE_CONFIGURATION_PENDING') return 'waiting';
  if (value === 'unavailable' || value === 'degraded') return 'unavailable';
  return 'unknown';
}

async function fetchSafeAdminSnapshot(): Promise<SafeAdminSnapshot> {
  const [summaryResult, healthResult, capabilitiesResult] = await Promise.allSettled([
    apiClient.get('/api/admin/pois/summary'),
    apiClient.get('/api/admin/health'),
    apiClient.get('/api/admin/capabilities'),
  ]);
  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
  const health = healthResult.status === 'fulfilled' ? healthResult.value : null;
  const capabilities = capabilitiesResult.status === 'fulfilled' ? capabilitiesResult.value?.capabilities : null;
  const services = (health?.services || {}) as AdminHealthServices;
  const failed = [summaryResult, healthResult, capabilitiesResult].filter((result) => result.status === 'rejected').length;

  return {
    loading: false,
    error: failed ? `${failed} admin data source(s) unavailable` : null,
    checkedAt: new Date(),
    canonicalPois: typeof summary?.canonicalCount === 'number' ? summary.canonicalCount : null,
    canonicalHeaderValid: typeof summary?.quality?.headerMatchesExpected === 'boolean'
      ? summary.quality.headerMatchesExpected
      : null,
    invalidPoiRows: typeof summary?.quality?.invalidRows === 'number' ? summary.quality.invalidRows : null,
    runtimeRepository: typeof summary?.runtimeRepository === 'string' ? summary.runtimeRepository : null,
    backendStatus: serviceStatus(services.backend?.status),
    firebaseStatus: serviceStatus(services.firebase?.status),
    firestoreStatus: services.firebase
      ? (services.firebase.firestoreReady ? 'active' : 'waiting')
      : 'unknown',
    googleStatus: serviceStatus(services.googleMaps?.status),
    photonStatus: serviceStatus(services.photon?.status),
    osrmStatus: serviceStatus(services.osrm?.status),
    capabilities,
  };
}

export function useSafeAdminSnapshot() {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  const refresh = useCallback(async () => {
    setSnapshot((current) => ({ ...current, loading: true, error: null }));
    setSnapshot(await fetchSafeAdminSnapshot());
  }, []);

  useEffect(() => {
    let active = true;
    void fetchSafeAdminSnapshot().then((nextSnapshot) => {
      if (active) setSnapshot(nextSnapshot);
    });
    return () => {
      active = false;
    };
  }, []);

  return { snapshot, refresh };
}

export function useAdminUsers() {
  const [pageTokens, setPageTokens] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [users, setUsers] = useState<SafeAdminUser[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pageToken = pageTokens[pageIndex];

  useEffect(() => {
    let active = true;
    const query = pageToken ? `?limit=50&pageToken=${encodeURIComponent(pageToken)}` : '?limit=50';
    void apiClient.get(`/api/admin/users${query}`)
      .then((response) => {
        if (!active) return;
        setUsers(Array.isArray(response?.users) ? response.users : []);
        setNextPageToken(typeof response?.nextPageToken === 'string' ? response.nextPageToken : null);
      })
      .catch((reason) => {
        if (!active) return;
        setUsers([]);
        setNextPageToken(null);
        setError(reason instanceof Error ? reason.message : 'Admin users unavailable');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pageToken, refreshKey]);

  const next = () => {
    if (!nextPageToken) return;
    setLoading(true);
    setError(null);
    setPageTokens((current) => [...current.slice(0, pageIndex + 1), nextPageToken]);
    setPageIndex((current) => current + 1);
  };

  return {
    users,
    loading,
    error,
    page: pageIndex + 1,
    canPrevious: pageIndex > 0,
    canNext: Boolean(nextPageToken),
    previous: () => {
      setLoading(true);
      setError(null);
      setPageIndex((current) => Math.max(0, current - 1));
    },
    next,
    retry: () => {
      setLoading(true);
      setError(null);
      setRefreshKey((value) => value + 1);
    },
  };
}

function useAdminRequest<T>(endpoint: string | null, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!endpoint) return undefined;
    const controller = new AbortController();
    const requestTimer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void apiClient.get(endpoint, { signal: controller.signal })
        .then((response) => setData(response as T))
        .catch((reason) => {
          if (controller.signal.aborted) return;
          setError(reason instanceof Error ? reason.message : 'Admin data unavailable');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(requestTimer);
      controller.abort();
    };
  }, [endpoint, refreshKey]);

  return {
    data,
    loading: endpoint ? loading : false,
    error: endpoint ? error : null,
    retry: () => setRefreshKey((value) => value + 1),
  };
}

const emptyOverview: AdminOverviewData = {
  counts: {
    users: { value: null, exact: false },
    trips: { value: null, exact: false },
    feedback: { value: null, exact: false },
  },
  recentActivity: [],
};

export function useAdminOverview() {
  return useAdminRequest<AdminOverviewData>('/api/admin/overview', emptyOverview);
}

export function useAdminPois({ query = '', category = '', source = '' } = {}) {
  const params = new URLSearchParams({ limit: '60' });
  if (query.trim()) params.set('query', query.trim());
  if (category) params.set('category', category);
  if (source) params.set('source', source);
  return useAdminRequest<{
    pois: AdminPoiRecord[];
    total: number;
    filters: { categories: string[]; sources: string[] };
  }>(`/api/admin/pois?${params.toString()}`, {
    pois: [],
    total: 0,
    filters: { categories: [], sources: [] },
  });
}

export function useAdminTrips() {
  return useAdminRequest<{ trips: AdminTripRecord[] }>('/api/admin/trips?limit=60', { trips: [] });
}

export function useAdminTripDetail(tripId: string | null) {
  const endpoint = tripId ? `/api/admin/trips/${encodeURIComponent(tripId)}` : null;
  return useAdminRequest<{ trip: AdminTripRecord | null }>(endpoint, { trip: null });
}

export function useAdminFeedback() {
  return useAdminRequest<{ feedback: AdminFeedbackRecord[] }>('/api/admin/feedback?limit=60', { feedback: [] });
}
