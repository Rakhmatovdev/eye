import { useAuthStore, type AuthUser } from '../authStore';

const STORAGE_KEY = 'nexus.auth';

const user: AuthUser = {
  id: 'u1',
  name: 'Jane Analyst',
  email: 'jane@platform.io',
  role: 'analyst',
  clearance: 'SECRET',
};

describe('authStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('logout() (also used by beforeEach to reset state) leaves a definitive "checked, not authenticated" state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.hasCheckedSession).toBe(true);
  });

  it('login() sets user/isAuthenticated/hasCheckedSession — no client-visible token, the backend sets that as an HttpOnly cookie', () => {
    useAuthStore.getState().login(user);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(state.hasCheckedSession).toBe(true);
  });

  it('login() persists only the user to localStorage, as a display cache', () => {
    useAuthStore.getState().login(user);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.user).toEqual(user);
    expect(parsed.token).toBeUndefined();
  });

  it('logout() clears state and localStorage, and marks the session as checked', () => {
    useAuthStore.getState().login(user);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.hasCheckedSession).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('updateUser() patches the cached user', () => {
    useAuthStore.getState().login(user);
    useAuthStore.getState().updateUser({ mfaEnabled: true });

    const state = useAuthStore.getState();
    expect(state.user?.mfaEnabled).toBe(true);
    expect(state.user?.name).toBe(user.name);
  });

  it('updateUser() is a no-op when logged out', () => {
    useAuthStore.getState().updateUser({ mfaEnabled: true });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('caches the user across a fresh module load, but never trusts it for isAuthenticated', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user }));

    // The store's initial state is computed once at import time, so re-import
    // the module fresh (via jest.resetModules + isolateModules) to exercise
    // loadCachedUser() reading the value we just seeded.
    let freshStore: typeof useAuthStore;
    await jest.isolateModulesAsync(async () => {
      freshStore = require('../authStore').useAuthStore;
    });

    const state = freshStore!.getState();
    // The cached user is available immediately for display...
    expect(state.user).toEqual(user);
    // ...but isAuthenticated/hasCheckedSession are NOT derived from it — only
    // an actual GET /auth/me bootstrap call (see app/providers.tsx) can set
    // those, since the real session lives in an HttpOnly cookie this code
    // can't see.
    expect(state.isAuthenticated).toBe(false);
    expect(state.hasCheckedSession).toBe(false);
  });
});
