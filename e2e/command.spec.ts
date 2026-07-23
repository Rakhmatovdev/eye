import { test, expect } from '@playwright/test';

test('command post renders tactical map and threat board', async ({ page }) => {
  await page.goto('/command');

  const container = page.locator('.leaflet-container');
  await expect(container).toBeVisible({ timeout: 30_000 });

  const markers = page.locator('path.leaflet-interactive');
  await expect(markers.first()).toBeVisible({ timeout: 30_000 });
  expect(await markers.count()).toBeGreaterThan(0);

  // Tile images are best-effort (CDN may be unreachable) — see map.spec.ts.
  const tileImgs = page.locator('.leaflet-tile-container img, img.leaflet-tile-loaded');
  if ((await tileImgs.count()) === 0) {
    test.info().annotations.push({
      type: 'note',
      description: 'No leaflet tile images detected — CartoDB CDN likely unreachable from this environment. Container + markers verified instead.',
    });
  }

  // Stat tiles + threat board.
  const tiles = page.locator('div.grid.grid-cols-2.md\\:grid-cols-5 > div');
  expect(await tiles.count()).toBe(5);

  await page.screenshot({ path: 'test-results/screens/command.png', fullPage: true });
});
