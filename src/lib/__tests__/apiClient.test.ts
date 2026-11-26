import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, unwrap, apiErrorMessage, type Envelope } from '../apiClient';
import { useAuthStore } from '../../store/authStore';

describe('unwrap()', () => {
  it('returns the `data` field of a success envelope', () => {
    const envelope: Envelope<{ id: string }> = { success: true, data: { id: 'abc' } };
    expect(unwrap(envelope)).toEqual({ id: 'abc' });
  });

  it('tolerates a null data payload', () => {
    const envelope: Envelope<null> = { success: true, data: null };
    expect(unwrap(envelope)).toBeNull();
  });

  it('passes through array payloads unchanged', () => {
    const envelope: Envelope<number[]> = { success: true, data: [1, 2, 3] };
    expect(unwrap(envelope)).toEqual([1, 2, 3]);
  });
});

describe('apiErrorMessage()', () => {
  it('prefers the backend envelope error message on an axios error', () => {
    const err = {
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: { data: { error: { message: 'Email already in use' } } },
    };
    expect(apiErrorMessage(err)).toBe('Email already in use');
  });

  it('falls back to the axios error message when there is no envelope error', () => {
    const err = {
      isAxiosError: true,
      message: 'Network Error',
      response: undefined,
    };
    expect(apiErrorMessage(err)).toBe('Network Error');
  });

  it('falls back to the provided default message for non-axios errors', () => {
    expect(apiErrorMessage(new Error('boom'), 'Request failed')).toBe('Request failed');
  });

  it('falls back to the generic default message when none is supplied', () => {
    expect(apiErrorMessage('not an error object')).toBe('Request failed');
  });
});

// Auth now rides entirely on HttpOnly cookies the real browser attaches
// automatically — there's no token in JS to inspect or swap, so these tests
// simulate "cookie became valid after a refresh" purely via response
// sequencing (401 then 200) rather than by asserting on request headers.
describe('apiClient response interceptor (silent refresh on 401)', () => {
  let apiMock: MockAdapter;
  let rootMock: MockAdapter;

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    apiMock = new MockAdapter(apiClient);
    // refreshSession() inside apiClient.ts calls the *default* axios export
    // directly (not the `apiClient` instance) so it never re-enters this same
    // response interceptor. Mock that default instance separately.
    rootMock = new MockAdapter(axios);
    useAuthStore.getState().login({ id: 'u1', name: 'Analyst', email: 'a@b.com', role: 'analyst', clearance: 'SECRET' });
    // forceLogout() (exercised below) does `window.location.href = '/login'`
    // on a genuine logout — jsdom doesn't implement real navigation and logs
    // a "Not implemented" console.error for it. That's expected test noise,
    // not a bug, so silence it for this block only.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    apiMock.restore();
    rootMock.restore();
    useAuthStore.getState().logout();
    consoleErrorSpy.mockRestore();
  });

  it('retries the original request after a silent refresh', async () => {
    apiMock
      .onGet('/entities')
      .replyOnce(401)
      .onGet('/entities')
      .replyOnce(200, { success: true, data: [{ id: 'e1' }] });

    rootMock.onPost(/\/auth\/refresh$/).replyOnce(200, { success: true, data: {} });

    const res = await apiClient.get('/entities');

    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([{ id: 'e1' }]);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('shares a single in-flight refresh across concurrent 401s', async () => {
    let entitiesCalls = 0;
    apiMock.onGet('/entities').reply(() => {
      entitiesCalls += 1;
      return entitiesCalls === 1 ? [401] : [200, { success: true, data: 'ok-entities' }];
    });
    let casesCalls = 0;
    apiMock.onGet('/cases').reply(() => {
      casesCalls += 1;
      return casesCalls === 1 ? [401] : [200, { success: true, data: 'ok-cases' }];
    });

    let refreshCalls = 0;
    rootMock.onPost(/\/auth\/refresh$/).reply(() => {
      refreshCalls += 1;
      return [200, { success: true, data: {} }];
    });

    const [r1, r2] = await Promise.all([apiClient.get('/entities'), apiClient.get('/cases')]);

    expect(r1.data.data).toBe('ok-entities');
    expect(r2.data.data).toBe('ok-cases');
    expect(refreshCalls).toBe(1);
  });

  it('logs out and rejects when the refresh itself fails (e.g. no valid refresh cookie)', async () => {
    apiMock.onGet('/entities').reply(401);
    rootMock.onPost(/\/auth\/refresh$/).replyOnce(401);

    await expect(apiClient.get('/entities')).rejects.toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it.each(['/login', '/forgot-password', '/reset-password?token=example'])('keeps the public %s page open after an expired session', async path => {
    window.history.replaceState(null, '', path);
    apiMock.onGet('/auth/me').reply(401);
    rootMock.onPost(/\/auth\/refresh$/).reply(401);
    await expect(apiClient.get('/auth/me')).rejects.toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(window.location.pathname + window.location.search).toBe(path);
    // jsdom reports navigation attempts to console.error; public pages should not navigate.
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it.each(['/auth/login', '/auth/forgot-password', '/auth/reset-password'])('does not attempt a refresh for a 401 on %s itself', async endpoint => {
    apiMock.onPost(endpoint).reply(401, { success: false, error: { message: 'request rejected' } });

    await expect(apiClient.post(endpoint, {})).rejects.toBeTruthy();
    // Public auth endpoints must never trigger the silent-refresh loop.
    expect(rootMock.history.post?.length ?? 0).toBe(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it.each([500, 503, 429])('preserves the session when refresh returns %s', async (status) => {
    apiMock.onGet('/entities').reply(401);
    rootMock.onPost(/\/auth\/refresh$/).replyOnce(status);
    await expect(apiClient.get('/entities')).rejects.toMatchObject({ response: { status } });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('bounds a refresh timeout and allows a later request to recover', async () => {
    apiMock.onGet('/entities').replyOnce(401);
    rootMock.onPost(/\/auth\/refresh$/).timeoutOnce();
    await expect(apiClient.get('/entities')).rejects.toMatchObject({ code: 'ECONNABORTED' });
    expect(rootMock.history.post[0].timeout).toBe(15000);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    apiMock.onGet('/entities').replyOnce(401).onGet('/entities').replyOnce(200, { data: [] });
    rootMock.onPost(/\/auth\/refresh$/).replyOnce(200);
    await expect(apiClient.get('/entities')).resolves.toMatchObject({ status: 200 });
  });
});
