import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../utils/apiClient';

export type ServiceStatus = 'active' | 'waiting' | 'unavailable' | 'unknown';

export interface SafeAdminSnapshot {
  loading: boolean;
  checkedAt: Date | null;
  canonicalPois: number | null;
  canonicalHeaderValid: boolean | null;
  backendStatus: ServiceStatus;
  firebaseStatus: ServiceStatus;
  firestoreStatus: ServiceStatus;
}
const initialSnapshot: SafeAdminSnapshot = {
  loading: true,
  checkedAt: null,
  canonicalPois: null,
  canonicalHeaderValid: null,
  backendStatus: 'unknown',
  firebaseStatus: 'unknown',
  firestoreStatus: 'unknown',
};

async function fetchSafeAdminSnapshot(): Promise<SafeAdminSnapshot> {
  const [qualityResult, firebaseResult] = await Promise.allSettled([
    apiClient.get('/api/pois/data-quality'),
    apiClient.get('/api/health/firebase'),
  ]);
  const quality = qualityResult.status === 'fulfilled' ? qualityResult.value : null;
  const firebase = firebaseResult.status === 'fulfilled' ? firebaseResult.value : null;
  return {
    loading: false,
    checkedAt: new Date(),
    canonicalPois: typeof quality?.totals?.applicationPois === 'number' ? quality.totals.applicationPois : null,
    canonicalHeaderValid: typeof quality?.schema?.headerMatchesExpected === 'boolean'
      ? quality.schema.headerMatchesExpected
      : typeof quality?.headerMatchesExpected === 'boolean'
        ? quality.headerMatchesExpected
        : null,
    backendStatus: quality ? 'active' : 'unavailable',
    firebaseStatus: firebase ? (firebase.firebaseAdminReady ? 'active' : 'waiting') : 'unknown',
    firestoreStatus: firebase ? (firebase.firestoreReady ? 'active' : 'waiting') : 'unknown',
  };
}

export function useSafeAdminSnapshot() {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  const refresh = useCallback(async () => {
    setSnapshot((current) => ({ ...current, loading: true }));
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
