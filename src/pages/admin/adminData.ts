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
