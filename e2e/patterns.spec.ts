import { test, expect } from '@playwright/test';

// hub_entity and threat_correlation patterns fire deterministically on the
// seeded graph (Alisher Karimov's degree vs. mean, and the watchlisted
// Timur Umarov linked to hostile track HOSTILE-01) — see GET
// /analytics/patterns. Assert both show up among the rendered rows.
test('AI patterns page renders detected patterns', async ({ page }) => {
  await page.goto('/patterns');

  await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

  const rows = page.locator('[data-testid="pattern-row"]');
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  expect(await rows.count()).toBeGreaterThan(0);

  const types = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-pattern-type')));
  expect(types).toEqual(expect.arrayContaining(['hub_entity', 'threat_correlation']));

  await page.screenshot({ path: 'test-results/screens/patterns.png', fullPage: true });
});
