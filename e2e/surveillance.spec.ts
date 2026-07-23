import { test, expect } from '@playwright/test';

test('surveillance page renders sensor grid', async ({ page }) => {
  await page.goto('/surveillance');

  // Stat tiles row (sensors/online/degraded/offline/hits/identified).
  const tiles = page.locator('div.grid.grid-cols-2.md\\:grid-cols-6 > div');
  await expect(tiles.first()).toBeVisible({ timeout: 30_000 });
  expect(await tiles.count()).toBe(6);

  // Sensor grid: buttons rendered per sensor (from sensorsApi.list() or the
  // mockSensors fallback if the API errors — either way it should be non-empty).
  const sensorCards = page.locator('div.grid.grid-cols-1.sm\\:grid-cols-2 > button');
  await expect(sensorCards.first()).toBeVisible({ timeout: 30_000 });
  const count = await sensorCards.count();
  expect(count).toBeGreaterThan(0);

  await page.screenshot({ path: 'test-results/screens/surveillance.png', fullPage: true });
});
