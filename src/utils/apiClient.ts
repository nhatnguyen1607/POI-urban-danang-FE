/**
 * API client utility for backend requests
 */

import { getFirebaseIdToken } from '../services/firebase';

const demoSessionKey = 'danang-urban-agent-demo-session';
const demoAuthMode = import.meta.env.VITE_DEMO_AUTH_MODE === 'true';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    console.warn('VITE_API_BASE_URL/VITE_API_URL not configured, using localhost:7860');
    return 'http://localhost:7860';
  }
  return apiUrl;
};

export const getApiBaseUrl = getApiUrl;

export class ApiClientError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

const fetchWithNetworkMessage = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DEFAULT_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    }
    if (error instanceof TypeError) {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
};

const mergeHeaders = async (...headersList: Array<HeadersInit | undefined>) => {
  const merged = new Headers();
  headersList.forEach((headers) => {
    if (!headers) return;
    new Headers(headers).forEach((value, key) => merged.set(key, value));
  });

  const token = await getFirebaseIdToken();
  const demoToken = demoAuthMode && sessionStorage.getItem(demoSessionKey) === 'true'
    ? 'urbanagent-demo-local-token'
    : null;
  if (token) merged.set('Authorization', `Bearer ${token}`);
  if (!token && demoToken) merged.set('Authorization', `Bearer ${demoToken}`);

  return Object.fromEntries(merged.entries());
};

export const apiClient = {
  get: async (endpoint: string, options?: RequestInit) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetchWithNetworkMessage(url, {
      ...options,
      headers: await mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        const payload = text ? JSON.parse(text) : null;
        const code = typeof payload?.error === 'string' ? payload.error : payload?.error?.code || null;
        throw new ApiClientError(
          payload?.error?.message || payload?.details || code || `API Error: ${response.status} ${response.statusText}`,
          response.status,
          code,
        );
      } catch (error) {
        if (error instanceof ApiClientError) throw error;
        throw new ApiClientError(`API Error: ${response.status} ${response.statusText}`, response.status);
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
    const response = await fetchWithNetworkMessage(url, {
      ...options,
      method: 'POST',
      headers: await mergeHeaders(isFormData ? undefined : { 'Content-Type': 'application/json' }, options?.headers),
      body: isFormData ? body : JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        const payload = text ? JSON.parse(text) : null;
        throw new Error(payload?.error?.message || payload?.details || payload?.error || `API Error: ${response.status} ${response.statusText}`);
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

  patch: async (endpoint: string, body?: unknown, options?: RequestInit) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetchWithNetworkMessage(url, {
      ...options,
      method: 'PATCH',
      headers: await mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        const payload = text ? JSON.parse(text) : null;
        throw new Error(payload?.details || payload?.error?.message || payload?.error || `API Error: ${response.status} ${response.statusText}`);
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

  delete: async (endpoint: string, options?: RequestInit) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetchWithNetworkMessage(url, {
      ...options,
      method: 'DELETE',
      headers: await mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
    });

    const text = await response.text();
    if (!response.ok) {
      try {
        const payload = text ? JSON.parse(text) : null;
        throw new Error(payload?.details || payload?.error?.message || payload?.error || `API Error: ${response.status} ${response.statusText}`);
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
