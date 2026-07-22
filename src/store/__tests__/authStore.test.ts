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

  it('starts logged out with no user/token', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('login() sets user/token/isAuthenticated', () => {
    useAuthStore.getState().login(user, 'access-1', 'refresh-1');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(state.token).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
  });

  it('login() persists the session to localStorage', () => {
    useAuthStore.getState().login(user, 'access-1', 'refresh-1');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.user).toEqual(user);
    expect(parsed.token).toBe('access-1');
    expect(parsed.refreshToken).toBe('refresh-1');
  });

  it('login() defaults refreshToken to null when omitted', () => {
    useAuthStore.getState().login(user, 'access-1');
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('logout() clears state and localStorage', () => {
    useAuthStore.getState().login(user, 'access-1', 'refresh-1');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('updateUser() patches the cached user without touching tokens', () => {
    useAuthStore.getState().login(user, 'access-1', 'refresh-1');
    useAuthStore.getState().updateUser({ mfaEnabled: true });

    const state = useAuthStore.getState();
    expect(state.user?.mfaEnabled).toBe(true);
    expect(state.user?.name).toBe(user.name);
    expect(state.token).toBe('access-1');
  });

  it('updateUser() is a no-op when logged out', () => {
    useAuthStore.getState().updateUser({ mfaEnabled: true });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setAccessToken() rotates the access token and refresh token', () => {
    useAuthStore.getState().login(user, 'access-1', 'refresh-1');
    useAuthStore.getState().setAccessToken('access-2', 'refresh-2');

    const state = useAuthStore.getState();
    expect(state.token).toBe('access-2');
    expect(state.refreshToken).toBe('refresh-2');
    expect(state.user).toEqual(user); // user untouched
  });

  it('setAccessToken() keeps the existing refresh token when none is provided', () => {
    useAuthStore.getState().login(user, 'access-1', 'refresh-1');
    useAuthStore.getState().setAccessToken('access-2');

    expect(useAuthStore.getState().token).toBe('access-2');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-1');
  });

  it('setAccessToken() persists the rotated token to localStorage', () => {
    useAuthStore.getState().login(user, 'access-1', 'refresh-1');
    useAuthStore.getState().setAccessToken('access-2', 'refresh-2');

    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(parsed.token).toBe('access-2');
    expect(parsed.refreshToken).toBe('refresh-2');
  });

  it('loadInitial() hydrates isAuthenticated from a pre-existing localStorage session on module load', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, token: 'persisted-token', refreshToken: 'persisted-refresh' })
    );

    // The store's initial state is computed once at import time, so re-import
    // the module fresh (via jest.resetModules + isolateModules) to exercise
    // `loadInitial()` reading the value we just seeded.
    let freshStore: typeof useAuthStore;
    await jest.isolateModulesAsync(async () => {
      freshStore = require('../authStore').useAuthStore;
    });

    const state = freshStore!.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('persisted-token');
    expect(state.user).toEqual(user);
  });
});
