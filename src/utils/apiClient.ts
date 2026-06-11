/**
 * API client utility for backend requests
 */

import { getFirebaseIdToken } from '../services/firebase';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    console.warn('VITE_API_URL not configured, using localhost:3000');
    return 'http://localhost:7860';
  }
  return apiUrl;
};

const mergeHeaders = async (...headersList: Array<HeadersInit | undefined>) => {
  const merged = new Headers();
  headersList.forEach((headers) => {
    if (!headers) return;
    new Headers(headers).forEach((value, key) => merged.set(key, value));
  });

  const token = await getFirebaseIdToken();
  const localAdminToken = localStorage.getItem('danang-local-admin-token');
  if (token) merged.set('Authorization', `Bearer ${token}`);
  if (!token && localAdminToken) merged.set('Authorization', `Bearer ${localAdminToken}`);

  return Object.fromEntries(merged.entries());
};

export const apiClient = {
  get: async (endpoint: string, options?: RequestInit) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: await mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        const payload = text ? JSON.parse(text) : null;
        throw new Error(payload?.details || payload?.error || `API Error: ${response.status} ${response.statusText}`);
      } catch (error) {
        if (error instanceof Error && !error.message.startsWith('Unexpected token')) throw error;
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    }
    if (!text) {
      return null;
    }
    return JSON.parse(text);
  },

  post: async (endpoint: string, body?: unknown, options?: RequestInit) => {
    const url = `${getApiUrl()}${endpoint}`;
    const isFormData = body instanceof FormData;
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers: await mergeHeaders(isFormData ? undefined : { 'Content-Type': 'application/json' }, options?.headers),
      body: isFormData ? body : JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        const payload = text ? JSON.parse(text) : null;
        throw new Error(payload?.details || payload?.error || `API Error: ${response.status} ${response.statusText}`);
      } catch (error) {
        if (error instanceof Error && !error.message.startsWith('Unexpected token')) throw error;
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    }
    if (!text) {
      return null;
    }
    return JSON.parse(text);
  },
};
