import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Shared axios instance. Base points at the versioned API so callers use
// short paths like `/auth/login`, `/entities`, `/graph/expand`.
export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the bearer token from the auth store on every request.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, drop the session and bounce to login (client-side only).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Standard success envelope: { success, data, meta }.
export interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: { page?: number; total?: number };
  error?: { message: string; detail?: string };
}

// Unwrap `res.data.data`, tolerating a null data payload.
export function unwrap<T>(payload: Envelope<T>): T {
  return payload.data;
}

// Human-readable message out of an axios error following our envelope.
export function apiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message || err.message || fallback;
  }
  return fallback;
}

export default apiClient;
