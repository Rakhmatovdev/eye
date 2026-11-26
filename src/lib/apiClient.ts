import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// Empty by default so the base URL is relative (`/api/v1`) and requests go
// same-origin through the Next.js rewrite proxy — no CORS. Override with an
// absolute URL only if calling the backend directly cross-origin.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_PATH = `${API_URL}/api/v1`;

// Shared axios instance. Base points at the versioned API so callers use
// short paths like `/auth/login`, `/entities`, `/graph/expand`. Auth rides on
// the HttpOnly access_token/refresh_token cookies the backend sets on
// login/refresh (see backend's internal/auth/handler.go) — withCredentials
// is what makes the browser actually attach/accept them.
export const apiClient = axios.create({
  baseURL: BASE_PATH,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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
    const message=err.response?.data?.error?.message || err.message || fallback;
    const requestID=err.response?.headers?.['x-request-id'];
    return typeof requestID==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(requestID)?message+' · Request ID: '+requestID:message;
  }
  return fallback;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function isAuthBootstrapEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  );
}

function forceLogout() {
  useAuthStore.getState().logout();
  const publicPages = ['/login', '/forgot-password', '/reset-password'];
  if (typeof window !== 'undefined' && !publicPages.includes(window.location.pathname.replace(/\/$/, ''))) {
    window.location.href = '/login';
  }
}

// Single-flight refresh: concurrent 401s share one in-flight refresh call
// instead of each firing their own POST /auth/refresh.
let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  // No body, no response tokens to read — the browser sends the
  // refresh_token cookie automatically (it's scoped to Path=/api/v1/auth)
  // and the backend responds with fresh Set-Cookie headers for both
  // cookies. Plain axios (not `apiClient`) so this call never re-enters the
  // response interceptor below and can't recurse into itself on a 401.
  await axios.post(`${BASE_PATH}/auth/refresh`, undefined, { withCredentials: true, timeout: 15000 });
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
            refreshPromise = refreshSession().finally(() => {
              refreshPromise = null;
            });
          }
          await refreshPromise;
          return apiClient(originalRequest);
        } catch (refreshError) {
          if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
            forceLogout();
            return Promise.reject(error);
          }
          // A network outage or server failure is not an expired session.
          return Promise.reject(refreshError);
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
