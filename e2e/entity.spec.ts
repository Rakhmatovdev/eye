import { test, expect } from '@playwright/test';

// ent-001 (Alisher Karimov) is seeded by backend/internal/seed/seed.go.
test('entity dossier renders attributes, sightings, and connections', async ({ page }) => {
  await page.goto('/entity/ent-001');

  // Identity header.
  await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

  // Section headers (Attributes, Sightings, Connections, Timeline) share a
  // stable class regardless of locale copy — assert all four rendered.
  const sectionHeaders = page.locator('h2.uppercase.tracking-wider');
  await expect(sectionHeaders).toHaveCount(4);
  for (const header of await sectionHeaders.all()) {
    await expect(header).toBeVisible();
  }

  // Attributes section: at least one key/value row from entity.properties.
  await expect(page.locator('span.text-gray-300').first()).toBeVisible();

  await page.screenshot({ path: 'test-results/screens/entity-dossier.png', fullPage: true });
});
