import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  clearance: string;
  mfaEnabled?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string, refreshToken?: string | null) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  // Swaps in a freshly-minted access token after a silent refresh. The backend
  // rotates the refresh token on every /auth/refresh, so the new one must be
  // stored too — the old one is already revoked server-side.
  setAccessToken: (token: string, refreshToken?: string | null) => void;
}

const STORAGE_KEY = 'nexus.auth';

function loadInitial(): { user: AuthUser | null; token: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null, refreshToken: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      token: parsed.token ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { user: null, token: null, refreshToken: null };
  }
}

function persist(user: AuthUser | null, token: string | null, refreshToken: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user && token) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, refreshToken }));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
}

const initial = loadInitial();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  token: initial.token,
  refreshToken: initial.refreshToken,
  isAuthenticated: !!initial.token,
  login: (user, token, refreshToken) => {
    persist(user, token, refreshToken ?? null);
    set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true });
  },
  logout: () => {
    persist(null, null, null);
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
  // Patches the cached user (e.g. after enabling/disabling MFA) without a
  // fresh login round-trip.
  updateUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...patch };
    persist(updated, get().token, get().refreshToken);
    set({ user: updated });
  },
  setAccessToken: (token, refreshToken) => {
    const nextRefresh = refreshToken ?? get().refreshToken;
    persist(get().user, token, nextRefresh);
    set({ token, refreshToken: nextRefresh });
  },
}));
