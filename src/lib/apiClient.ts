import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// Empty by default so the base URL is relative (`/api/v1`) and requests go
// same-origin through the Next.js rewrite proxy — no CORS. Override with an
// absolute URL only if calling the backend directly cross-origin.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_PATH = `${API_URL}/api/v1`;

// Shared axios instance. Base points at the versioned API so callers use
// short paths like `/auth/login`, `/entities`, `/graph/expand`.
export const apiClient = axios.create({
  baseURL: BASE_PATH,
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

// Standard success envelope: { success, data, meta }.
export interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: { page?: number; total?: number; limit?: number };
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

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function isAuthBootstrapEndpoint(url?: string): boolean {
  if (!url) return false;
  return url.includes('/auth/refresh') || url.includes('/auth/login');
}

function forceLogout() {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// Single-flight refresh: concurrent 401s share one in-flight refresh call
// instead of each firing their own POST /auth/refresh.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  // Plain axios (not `apiClient`) so this call never re-enters the response
  // interceptor below and can't recurse into itself on a 401.
  const res = await axios.post<Envelope<{ access_token: string; refresh_token?: string }>>(
    `${BASE_PATH}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const accessToken = res.data?.data?.access_token;
  if (!accessToken) {
    throw new Error('Refresh response missing access_token');
  }
  // The backend rotates the refresh token on every refresh — persist the new
  // one or the next silent refresh would fail against the revoked old token.
  useAuthStore.getState().setAccessToken(accessToken, res.data?.data?.refresh_token ?? null);
  return accessToken;
}

// On 401: try a silent refresh + single retry of the original request before
// giving up and logging out. Skips the refresh dance entirely for the
// login/refresh calls themselves (those failing 401 just means "bad creds" /
// "refresh token expired" — not something a retry can fix).
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error?.response?.status;

    if (status === 401 && originalRequest && !isAuthBootstrapEndpoint(originalRequest.url)) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => {
              refreshPromise = null;
            });
          }
          const newToken = await refreshPromise;
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch {
          forceLogout();
          return Promise.reject(error);
        }
      }
      // Already retried once and still 401 — give up.
      forceLogout();
      return Promise.reject(error);
    }

    if (status === 401) {
      // 401 on /auth/login (bad credentials) or /auth/refresh (expired
      // refresh token) itself — drop any stale session client-side.
      forceLogout();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
