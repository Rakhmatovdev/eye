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
  isAuthenticated: boolean;
  // True once the app-start session bootstrap (GET /auth/me) has resolved,
  // one way or the other. Route guards should wait on this before deciding
  // to redirect to /login, since — unlike the old token-in-localStorage
  // design — there's no way to know synchronously at store-init time whether
  // a valid session cookie exists (it's HttpOnly, invisible to JS).
  hasCheckedSession: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const STORAGE_KEY = 'nexus.auth';

// Only ever a display cache (show the cached name/role while the session
// bootstrap is in flight) — never used to decide isAuthenticated. The
// backend cookie is the only real source of truth for that now.
function loadCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.user ?? null;
  } catch {
    return null;
  }
}

function persistCachedUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user }));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadCachedUser(),
  isAuthenticated: false,
  hasCheckedSession: false,
  login: (user) => {
    persistCachedUser(user);
    set({ user, isAuthenticated: true, hasCheckedSession: true });
  },
  logout: () => {
    persistCachedUser(null);
    set({ user: null, isAuthenticated: false, hasCheckedSession: true });
  },
  // Patches the cached user (e.g. after enabling/disabling MFA) without a
  // fresh login round-trip.
  updateUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...patch };
    persistCachedUser(updated);
    set({ user: updated });
  },
}));
