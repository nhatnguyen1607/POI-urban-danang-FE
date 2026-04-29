/**
 * API client utility for backend requests
 */

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    console.warn('VITE_API_URL not configured, using localhost:3000');
    return 'http://localhost:7860';
  }
  return apiUrl;
};

export const apiClient = {
  get: async (endpoint: string, options?: RequestInit) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text);
  },

  post: async (endpoint: string, body?: any, options?: RequestInit) => {
    const url = `${getApiUrl()}${endpoint}`;
    const isFormData = body instanceof FormData;
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
      body: isFormData ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text);
  },
};
