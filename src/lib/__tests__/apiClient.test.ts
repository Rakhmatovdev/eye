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

describe('apiClient response interceptor (silent refresh on 401)', () => {
  let apiMock: MockAdapter;
  let rootMock: MockAdapter;

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    apiMock = new MockAdapter(apiClient);
    // `refreshAccessToken()` inside apiClient.ts calls the *default* axios
    // export directly (not the `apiClient` instance) so it never re-enters
    // this same response interceptor. Mock that default instance separately.
    rootMock = new MockAdapter(axios);
    useAuthStore.getState().login(
      { id: 'u1', name: 'Analyst', email: 'a@b.com', role: 'analyst', clearance: 'SECRET' },
      'expired-access-token',
      'valid-refresh-token'
    );
    // forceLogout() (exercised below) does `window.location.href = '/login'`
    // on a genuine logout — jsdom doesn't implement real navigation and logs
    // a "Not implemented" console.error for it. That's expected test noise,
    // not a bug, so silence it for this block only.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    apiMock.restore();
    rootMock.restore();
    useAuthStore.getState().logout();
    consoleErrorSpy.mockRestore();
  });

  it('retries the original request with a new token after a silent refresh', async () => {
    apiMock
      .onGet('/entities')
      .replyOnce(401)
      .onGet('/entities')
      .replyOnce(200, { success: true, data: [{ id: 'e1' }] });

    rootMock.onPost(/\/auth\/refresh$/).replyOnce(200, {
      success: true,
      data: { access_token: 'new-access-token', refresh_token: 'new-refresh-token' },
    });

    const res = await apiClient.get('/entities');

    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([{ id: 'e1' }]);
    expect(useAuthStore.getState().token).toBe('new-access-token');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh-token');
  });

  it('shares a single in-flight refresh across concurrent 401s', async () => {
    apiMock
      .onGet('/entities')
      .reply(function respond(config) {
        // First call to each URL 401s once; the retried call (marked via the
        // Authorization header having been swapped) succeeds.
        const isRetry = config.headers?.Authorization === 'Bearer new-access-token';
        return isRetry ? [200, { success: true, data: 'ok-entities' }] : [401];
      });
    apiMock
      .onGet('/cases')
      .reply(function respond(config) {
        const isRetry = config.headers?.Authorization === 'Bearer new-access-token';
        return isRetry ? [200, { success: true, data: 'ok-cases' }] : [401];
      });

    let refreshCalls = 0;
    rootMock.onPost(/\/auth\/refresh$/).reply(() => {
      refreshCalls += 1;
      return [200, { success: true, data: { access_token: 'new-access-token', refresh_token: 'new-refresh-token' } }];
    });

    const [r1, r2] = await Promise.all([apiClient.get('/entities'), apiClient.get('/cases')]);

    expect(r1.data.data).toBe('ok-entities');
    expect(r2.data.data).toBe('ok-cases');
    expect(refreshCalls).toBe(1);
  });

  it('logs out and rejects when the refresh token itself is invalid', async () => {
    apiMock.onGet('/entities').reply(401);
    rootMock.onPost(/\/auth\/refresh$/).replyOnce(401);

    await expect(apiClient.get('/entities')).rejects.toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('does not attempt a refresh for a 401 on /auth/login itself', async () => {
    apiMock.onPost('/auth/login').reply(401, { success: false, error: { message: 'bad creds' } });

    await expect(apiClient.post('/auth/login', {})).rejects.toBeTruthy();
    // No refresh call should have been made for the login endpoint's own 401.
    expect(rootMock.history.post?.length ?? 0).toBe(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
