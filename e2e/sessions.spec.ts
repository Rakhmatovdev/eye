import { test, expect } from '@playwright/test';

// Uses the analyst account (not the shared admin storageState the other
// specs depend on) — logs in fresh from two separate browser contexts to
// simulate two devices, then verifies the Settings "Active Sessions" list
// and revoke flow end to end against the real backend.
test('settings: active sessions lists both devices and revoking one takes effect', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    const login = async (page: typeof pageA) => {
      await page.goto('/login');
      await page.getByPlaceholder('analyst@platform.io').fill('analyst@platform.io');
      await page.getByPlaceholder('••••••••').fill('Analyst123!');
      await page.locator('form button[type="submit"]').click();
      await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    };

    await login(pageA);
    // The analyst account accumulates sessions across this whole e2e run
    // (mfa.spec.ts logs in repeatedly too) — clean up everything but this
    // one first so the count assertions below are exact, not "at least".
    await ctxA.request.post('/api/v1/auth/sessions/revoke-others', {
      headers: { Origin: 'http://localhost:3001' },
    });
    await login(pageB);

    await pageA.goto('/settings');
    const rows = pageA.locator('[data-testid="sessions-list"] > div');
    await expect(rows).toHaveCount(2, { timeout: 15_000 });

    // Exactly one row is device A's own (its revoke button is disabled — see
    // `disabled={s.isCurrent}` in SessionsCard, settings/page.tsx — a
    // locale-independent signal, unlike the "this device" badge text, which
    // defaults to Uzbek). Revoke the other one (device B) and confirm it
    // disappears.
    const otherRow = rows.filter({ has: pageA.locator('[data-testid="sessions-revoke-btn"]:not([disabled])') });
    await expect(otherRow).toHaveCount(1);

    await otherRow.getByTestId('sessions-revoke-btn').click();
    await pageA.getByTestId('confirm-dialog-confirm-btn').click();

    await expect(rows).toHaveCount(1, { timeout: 15_000 });
    // The one remaining row must be device A's own — its revoke button is
    // still disabled (see the locale-independence note above).
    await expect(rows.getByTestId('sessions-revoke-btn')).toBeDisabled();

    // Device B's session is gone server-side — its next refresh must fail
    // (the access token itself stays valid until its own ~15min expiry, so
    // this isn't observable as an instant UI kick — see the "Yopildi" note
    // for this feature in docs/02-KAMCHILIKLAR.md).
    const refreshRes = await ctxB.request.post('/api/v1/auth/refresh', {
      headers: { Origin: 'http://localhost:3001' },
    });
    expect(refreshRes.status()).toBe(401);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
