import { test, expect } from '@playwright/test';

test('map page renders leaflet map with markers', async ({ page }) => {
  await page.goto('/map');

  const container = page.locator('.leaflet-container');
  await expect(container).toBeVisible({ timeout: 30_000 });

  // Tile images: don't hard-fail the suite if the CartoDB CDN is unreachable
  // from this environment — assert the container + at least one interactive
  // marker path instead, and only require tiles when they do come through.
  const tileImgs = page.locator('.leaflet-tile-container img, img.leaflet-tile-loaded');
  const markers = page.locator('path.leaflet-interactive');

  // Give the map a moment to fetch entities/sensors and paint markers.
  await expect(markers.first()).toBeVisible({ timeout: 30_000 });
  const markerCount = await markers.count();
  expect(markerCount).toBeGreaterThan(0);

  const tileCount = await tileImgs.count();
  if (tileCount === 0) {
    test.info().annotations.push({
      type: 'note',
      description: 'No leaflet tile images detected — CartoDB CDN likely unreachable from this environment. Container + markers verified instead.',
    });
  } else {
    await expect(tileImgs.first()).toBeVisible();
  }

  await page.screenshot({ path: 'test-results/screens/map.png', fullPage: true });
});
