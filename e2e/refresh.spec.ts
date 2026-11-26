import { test, expect } from '@playwright/test';
import path from 'node:path';

// Verifies the silent-refresh path in apiClient.ts (401 -> POST
// /auth/refresh -> retry original request once) end to end in a real
// browser: corrupt only the access_token cookie (leave the real, valid
// refresh_token cookie alone), then load a data page and confirm it recovers
// transparently — real data renders, no bounce to /login — and that a new
// access_token cookie actually got set.
//
// This spec loads e2e/.auth/user.json (the admin storageState the other 11
// specs share) into a *fresh* context via `storageState: AUTH_FILE`.
// context.addCookies() below mutates only this context's in-memory cookie
// jar, never writing back to that file, so it cannot affect any other spec.
//
// Targets /watchlist rather than /alerts on purpose: watchlist rows are
// static seed data no other spec mutates, whereas alerts.spec.ts
// acknowledges alerts (one-directional — no unack API), so after enough
// runs /alerts can render zero rows and make this spec's "real data
// rendered" assertion fail for a reason that has nothing to do with the
// refresh path this spec actually tests (see kamchilik #23 in
// docs/02-KAMCHILIKLAR.md).
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');
const CORRUPTED_TOKEN = 'corrupted.invalid.accesstoken';

test('recovers transparently from a corrupted access token via silent refresh', async ({ browser }) => {
  const context = await browser.newContext({ storageState: AUTH_FILE });

  // Read the original cookies straight from the context (not via the live
  // page — access_token/refresh_token are HttpOnly, invisible to
  // page.evaluate, but context.cookies()/addCookies() operate below page JS
  // and see them fine) so we have a baseline to diff against later.
  const originalCookies = await context.cookies();
  const originalAccess = originalCookies.find((c) => c.name === 'access_token');
  const originalRefresh = originalCookies.find((c) => c.name === 'refresh_token');
  expect(originalAccess?.value, 'baseline admin access_token cookie must be present').toBeTruthy();
  expect(originalRefresh?.value, 'baseline admin refresh_token cookie must be present').toBeTruthy();

  // Corrupt only the access_token cookie, leaving refresh_token intact.
  await context.addCookies([{ ...originalAccess!, value: CORRUPTED_TOKEN }]);

  const page = await context.newPage();
  await page.goto('/watchlist');

  // Confirm the corruption really landed (otherwise this test would pass
  // vacuously without ever exercising the refresh path).
  const afterLoadCookies = await context.cookies();
  expect(afterLoadCookies.find((c) => c.name === 'access_token')?.value).toBe(CORRUPTED_TOKEN);

  // The corrupted access_token 401s the first authenticated request
  // (watchlistApi.list -> GET /watchlist). apiClient's response interceptor
  // should silently POST /auth/refresh (the browser attaches the still-valid
  // refresh_token cookie automatically), then retry the original request —
  // so real watchlist rows render and we never bounce to /login.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });
  const rows = page.locator('[data-testid="watchlist-row"]');
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  expect(await rows.count()).toBeGreaterThan(0);

  // A brand-new access_token cookie must now be set — proving the refresh
  // (not e.g. a cached response) is what made this work.
  const finalCookies = await context.cookies();
  const finalAccess = finalCookies.find((c) => c.name === 'access_token');
  const finalRefresh = finalCookies.find((c) => c.name === 'refresh_token');
  expect(finalAccess?.value).toBeTruthy();
  expect(finalAccess?.value).not.toBe(CORRUPTED_TOKEN);
  expect(finalAccess?.value).not.toBe(originalAccess?.value);
  // JWT shape sanity check (header.payload.signature).
  expect(finalAccess!.value.split('.')).toHaveLength(3);
  // Refresh token is rotated server-side on every /auth/refresh call.
  expect(finalRefresh?.value).toBeTruthy();

  await page.screenshot({ path: 'test-results/screens/refresh-recovered.png', fullPage: true });

  await context.close();
});
