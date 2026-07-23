import { test, expect } from '@playwright/test';

// Alert Inbox — seeded alerts come from backend/internal/seed/seed.go's
// watchlist/risk/threat rules. Default tab is "unacknowledged" (see
// src/app/alerts/page.tsx), so the list should render at least one row out
// of the box.
test('alert inbox lists alerts and acknowledging one works', async ({ page }) => {
  await page.goto('/alerts');

  await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

  const rows = page.locator('[data-testid="alert-row"]');
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  expect(await rows.count()).toBeGreaterThan(0);

  const ackBtn = page.locator('[data-testid="alert-ack-btn"]').first();
  if ((await ackBtn.count()) > 0) {
    // Default tab is "unacknowledged" — after ack + query invalidation the
    // server-reported unacknowledged total drops by one. Assert on the total
    // counter (not the row count): with more than a page of unacked alerts,
    // the refetched page refills to the limit so row count wouldn't change.
    const totalEl = page.locator('[data-testid="alerts-total"]');
    const before = parseInt((await totalEl.innerText()).trim(), 10);
    await ackBtn.click();
    await expect(totalEl).toHaveText(String(before - 1), { timeout: 15_000 });
  } else {
    // Every alert already acknowledged (e.g. a prior run acked them all) —
    // fall back to asserting the acknowledged view renders correctly.
    await page.locator('[data-testid="alerts-tab-acknowledged"]').click();
    await expect(page.locator('[data-testid="alert-row"]').first()).toBeVisible();
  }

  await page.screenshot({ path: 'test-results/screens/alerts.png', fullPage: true });
});
