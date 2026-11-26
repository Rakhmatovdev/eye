import { test, expect, type APIRequestContext, type Page, type Locator } from '@playwright/test';
import { computeTotp } from './helpers/totp';

// Full MFA enroll -> login-challenge -> disable round trip, driven through the
// real UI against the live backend (:8080 via the /api proxy). Uses the
// ANALYST account (never the admin used by e2e/.auth/user.json) so a failure
// here can't corrupt the storageState the other 11 specs depend on.
//
// This spec starts with no storageState (test.use below) and never writes
// e2e/.auth/user.json, so it can't affect the shared admin session either.
test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL = 'analyst@platform.io';
const PASSWORD = 'Analyst123!';

// Captured as soon as POST /auth/mfa/enroll succeeds (test 1) so the
// afterAll cleanup can compute a valid code even if a later step in this
// file fails outright.
let enrolledSecret: string | null = null;

async function fillLoginForm(page: Page, email: string, password: string) {
  const emailField = page.getByPlaceholder('analyst@platform.io');
  const passwordField = page.getByPlaceholder('••••••••');
  await expect(async () => {
    await emailField.fill(email);
    await passwordField.fill(password);
    await expect(emailField).toHaveValue(email);
    await expect(passwordField).toHaveValue(password);
  }).toPass({ timeout: 15_000 });
  await page.locator('form button[type="submit"]').click();
}

// Waits for the post-login SPA navigation to /dashboard, falling back to a
// hard navigation if it stalls. Rationale (seen in a real trace of this
// spec): POST /auth/login returned 200 (Set-Cookie'ing the session) and the
// /dashboard RSC payloads loaded, but the dev server stalled serving the lazy
// _next/static/chunks/app/dashboard/page.js request indefinitely — so the
// app-router never committed the URL change even though login fully
// succeeded. A hard goto re-requests the chunk fresh and renders the
// authenticated dashboard, which is the state this helper is asserting anyway.
async function expectDashboard(page: Page): Promise<void> {
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  } catch {
    await page.goto('/dashboard');
  }
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/BRAVE ANALYST/i)).toBeVisible();
}

// Full password-only login (no OTP expected): submits the form, confirms
// the /auth/login response actually carried tokens, then lands on the
// dashboard (with the stalled-chunk fallback above).
async function loginWithPassword(page: Page): Promise<void> {
  await page.goto('/login');

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST', {
      timeout: 30_000,
    }),
    fillLoginForm(page, EMAIL, PASSWORD),
  ]);
  expect(response.ok(), 'password login should succeed').toBe(true);
  const body = await response.json();
  // access_token/refresh_token are never in the JSON body (json:"-" on
  // LoginResponse — see backend internal/auth/models.go); they're set as
  // HttpOnly cookies instead. A password-only success is confirmed by the
  // absence of an MFA challenge plus the authenticated user coming back.
  expect(body?.data?.mfa_required, 'no MFA challenge expected on a fresh/disabled account').toBeFalsy();
  expect(body?.data?.user?.email, 'login response should carry the authenticated user').toBe(EMAIL);

  await expectDashboard(page);
}

// Submits one OTP code on the login challenge step and determines the
// outcome from the actual POST /auth/login network response (a 2xx carrying
// the authenticated user vs. a 4xx rejection) rather than inferring it from
// DOM state.
// This is what lets the retry loop safely move on to the next time-step:
// each call fully awaits its own request/response pair before returning, so
// there's never a stray in-flight request from a previous attempt still
// pending when the next one fires. (An earlier version of this spec waited
// on a fixed timeout instead, which let a *correct* first attempt's
// response land mid-retry — navigating the page out from under Playwright
// while it was mid-click on a second submission — and hung until the
// action timeout.)
async function submitLoginOtp(page: Page, otpField: Locator, code: string): Promise<'accepted' | 'rejected'> {
  await otpField.fill('');
  await otpField.fill(code);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST', {
      timeout: 20_000,
    }),
    page.locator('form button[type="submit"]').click(),
  ]);

  if (response.ok()) {
    const body = await response.json();
    if (body?.data?.user) {
      await expectDashboard(page);
      return 'accepted';
    }
  }
  return 'rejected';
}

// Logs in with password, then handles the OTP challenge step, trying t/t-1/t+1
// (30s steps) in case the test runner's clock is slightly out of sync with
// the backend — mirrors the server's default +/-1 step skew tolerance.
async function loginWithOtp(page: Page, secret: string): Promise<void> {
  await page.goto('/login');
  await fillLoginForm(page, EMAIL, PASSWORD);

  const otpField = page.getByPlaceholder('000000');
  await expect(otpField).toBeVisible({ timeout: 15_000 });

  for (const offset of [0, -1, 1]) {
    const code = computeTotp(secret, offset);
    const outcome = await submitLoginOtp(page, otpField, code);
    if (outcome === 'accepted') return;
  }
  throw new Error('OTP challenge rejected codes at t-1, t, and t+1.');
}

// Submits a 6-digit OTP field on the settings page (enroll-verify or
// disable), retrying with the adjacent 30s time-step if the backend rejects
// the code. Like submitLoginOtp above, the outcome is read directly off the
// mfa/verify or mfa/disable network response so each retry fully waits for
// its own request before firing the next one.
async function submitOtpWithRetry(
  page: Page,
  secret: string,
  otpInputTestId: string,
  submitButtonTestId: string,
  responseUrlSubstring: string
): Promise<void> {
  for (const offset of [0, -1, 1]) {
    const code = computeTotp(secret, offset);
    const otpField = page.getByTestId(otpInputTestId);
    await otpField.fill('');
    await otpField.fill(code);

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(responseUrlSubstring) && r.request().method() === 'POST',
        { timeout: 20_000 }
      ),
      page.getByTestId(submitButtonTestId).click(),
    ]);
    if (response.ok()) return;
  }
  throw new Error(`OTP rejected at t-1, t, and t+1 for ${responseUrlSubstring} — not just clock skew.`);
}

// Idempotent safety-net cleanup used in afterAll: logs in as the analyst
// (handling the OTP challenge if MFA is still enabled) and, only if MFA
// turns out to still be enabled, disables it via the API directly (same
// same-origin /api proxy the browser uses — see playwright.config.ts
// `use.baseURL`). No-ops cleanly if a prior test already disabled MFA via
// the UI, so this never throws just because there was nothing to clean up.
//
// Two things this must NOT do, both of which the original version of this
// helper got wrong (found when this spec was actually run against the
// current backend for the first time):
//   - Read `access_token` off the login response body to use as a bearer
//     token — that field is `json:"-"` now (HttpOnly-cookie auth; see
//     backend internal/auth/models.go), so it's always undefined, and
//   - Send it as an `Authorization: Bearer` header — bearer-token auth was
//     removed entirely when auth moved to cookies (pkg/middleware/auth.go
//     reads the session from the access_token cookie only).
// Playwright's APIRequestContext keeps its own cookie jar and resends it on
// every call made through the same `request` fixture, so the Set-Cookie
// headers from the login call below are all the authentication the
// mfa/disable call needs — no manual token plumbing.
// Every mutating call also needs an explicit Origin header: CSRFProtect
// (pkg/middleware/csrf.go) fails closed on a missing Origin, and unlike a
// real page load, APIRequestContext never sets one on its own.
async function ensureMfaDisabled(request: APIRequestContext, secret: string): Promise<void> {
  const ORIGIN = 'http://localhost:3001';
  const post = (url: string, data: Record<string, unknown>) =>
    request.post(url, { headers: { Origin: ORIGIN }, data });

  let loginRes = await post('/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
  let loginBody = await loginRes.json();

  if (!loginBody?.data?.mfa_required) {
    return; // already disabled (e.g. the UI-disable test already ran) — nothing to do
  }

  let loggedIn = false;
  for (const offset of [0, -1, 1]) {
    const otp = computeTotp(secret, offset);
    loginRes = await post('/api/v1/auth/login', { email: EMAIL, password: PASSWORD, otp });
    loginBody = await loginRes.json();
    if (loginRes.ok() && loginBody?.data?.user) {
      loggedIn = true;
      break;
    }
  }
  if (!loggedIn) {
    throw new Error(`Cleanup could not log in as analyst with any OTP offset: ${JSON.stringify(loginBody)}`);
  }

  for (const offset of [0, -1, 1]) {
    const otp = computeTotp(secret, offset);
    const res = await post('/api/v1/auth/mfa/disable', { otp });
    if (res.ok()) return;
  }
  throw new Error('Cleanup could not disable MFA via API with any of t-1/t/t+1.');
}

test.describe.serial('MFA enroll, login challenge, and disable (analyst account)', () => {
  // Dev-server stalls (webpack chunk requests taking 15-30s under load) can
  // eat most of the default 90s budget on these multi-login tests.
  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(180_000);
  });

  // Guaranteed to run even if the tests below fail partway through — the
  // analyst account must never be left with MFA enabled, or every later run
  // of this suite (and anyone else logging in as analyst) breaks.
  test.afterAll(async ({ request }) => {
    if (!enrolledSecret) return; // enrollment never even started — nothing to clean up
    try {
      await ensureMfaDisabled(request, enrolledSecret);
    } catch (err) {
      // Surface loudly — a failed cleanup needs a human to fix the account.
      console.error('[mfa.spec cleanup] FAILED to disable MFA for analyst account:', err);
      throw err;
    }
  });

  test('logs in fresh, enrolls MFA, and verifies with a computed TOTP code', async ({ page }) => {
    await loginWithPassword(page);

    await page.goto('/settings');
    await expect(page.getByTestId('mfa-status-badge')).toHaveAttribute('data-mfa-enabled', 'false');

    // Start enrollment; capture the secret straight from the network
    // response (robust against i18n/DOM copy — see src/app/settings/page.tsx
    // mfaApi.enroll) as well as from the on-screen field the analyst would
    // actually copy into an authenticator app.
    const [enrollResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/mfa/enroll') && r.request().method() === 'POST'),
      page.getByTestId('mfa-enroll-btn').click(),
    ]);
    const enrollBody = await enrollResponse.json();
    const secret: string = enrollBody.data.secret;
    expect(secret).toBeTruthy();
    enrolledSecret = secret;

    await expect(page.getByTestId('mfa-secret-value')).toHaveText(secret);
    await expect(page.getByTestId('mfa-otpauth-value')).toContainText('otpauth://');

    await submitOtpWithRetry(page, secret, 'mfa-enroll-otp-input', 'mfa-verify-btn', '/auth/mfa/verify');

    await expect(page.getByTestId('mfa-status-badge')).toHaveAttribute('data-mfa-enabled', 'true');
    await expect(page.getByText(/MFA enabled/i)).toBeVisible();
    await page.screenshot({
      path: 'test-results/screens/mfa-settings-enabled.png',
      fullPage: true,
    });
  });

  test('requires an OTP challenge on next login and completes it with a computed code', async ({ page }) => {
    expect(enrolledSecret, 'previous test must have captured the enrolled secret').toBeTruthy();
    const secret = enrolledSecret as string;

    await page.goto('/login');
    await fillLoginForm(page, EMAIL, PASSWORD);

    // Password was correct but MFA is enabled — expect the OTP challenge
    // step (see src/app/login/page.tsx: mfaRequired -> renders the 000000
    // input), not an immediate redirect to /dashboard.
    const otpField = page.getByPlaceholder('000000');
    await expect(otpField).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/dashboard/);

    await page.screenshot({
      path: 'test-results/screens/mfa-login-challenge.png',
      fullPage: true,
    });

    let landed = false;
    for (const offset of [0, -1, 1]) {
      const code = computeTotp(secret, offset);
      const outcome = await submitLoginOtp(page, otpField, code);
      if (outcome === 'accepted') {
        landed = true;
        break;
      }
    }
    expect(landed, 'a code from t-1/t/t+1 should have completed the OTP challenge').toBe(true);

    await expect(page.getByText(/BRAVE ANALYST/i)).toBeVisible();
  });

  test('disables MFA via the settings UI, restoring the account to its default state', async ({ page }) => {
    expect(enrolledSecret, 'first test must have captured the enrolled secret').toBeTruthy();
    const secret = enrolledSecret as string;

    await loginWithOtp(page, secret);

    await page.goto('/settings');
    await expect(page.getByTestId('mfa-status-badge')).toHaveAttribute('data-mfa-enabled', 'true');

    await submitOtpWithRetry(page, secret, 'mfa-disable-otp-input', 'mfa-disable-btn', '/auth/mfa/disable');

    await expect(page.getByTestId('mfa-status-badge')).toHaveAttribute('data-mfa-enabled', 'false');
    await expect(page.getByText(/MFA disabled/i)).toBeVisible();

    // Confirm a fresh login no longer requires an OTP step: the /auth/login
    // response must carry tokens directly (asserted inside the helper).
    await loginWithPassword(page);
  });
});
