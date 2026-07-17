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
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const STORAGE_KEY = 'nexus.auth';

function loadInitial(): { user: AuthUser | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw);
    return { user: parsed.user ?? null, token: parsed.token ?? null };
  } catch {
    return { user: null, token: null };
  }
}

function persist(user: AuthUser | null, token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user && token) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
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
  isAuthenticated: !!initial.token,
  login: (user, token) => {
    persist(user, token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    persist(null, null);
    set({ user: null, token: null, isAuthenticated: false });
  },
  // Patches the cached user (e.g. after enabling/disabling MFA) without a
  // fresh login round-trip.
  updateUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...patch };
    persist(updated, get().token);
    set({ user: updated });
  },
}));
