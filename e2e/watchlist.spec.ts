import { test, expect } from '@playwright/test';

// ent-009 (Timur Umarov) and ent-011 (Hassan Al-Rashidi) are seeded
// watchlist entries (backend/internal/seed/seed.go).
test('watchlist page renders seeded entries', async ({ page }) => {
  await page.goto('/watchlist');

  await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

  const rows = page.locator('[data-testid="watchlist-row"]');
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  expect(await rows.count()).toBeGreaterThanOrEqual(1);

  // A seeded entry's label links to its entity dossier.
  await expect(page.getByRole('link', { name: /Timur Umarov|Hassan Al-Rashidi/ }).first()).toBeVisible();

  await page.screenshot({ path: 'test-results/screens/watchlist.png', fullPage: true });
});
