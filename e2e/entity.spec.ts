import { test, expect } from '@playwright/test';

// ent-001 (Alisher Karimov) is seeded by backend/internal/seed/seed.go.
test('entity dossier renders attributes, sightings, and connections', async ({ page }) => {
  await page.goto('/entity/ent-001');

  // Identity header.
  await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

  // Section headers (Attributes, Sightings, Connections, Timeline,
  // Attachments) share a stable class regardless of locale copy — assert
  // all five rendered.
  const sectionHeaders = page.locator('h2.uppercase.tracking-wider');
  await expect(sectionHeaders).toHaveCount(5);
  for (const header of await sectionHeaders.all()) {
    await expect(header).toBeVisible();
  }

  // Attributes section: at least one key/value row from entity.properties.
  // A data-testid, not a Tailwind color class — the class was
  // `text-gray-300` before the dark/light theme migration replaced every
  // hardcoded color with a CSS-variable class (`text-[var(--chrome-text-300)]`),
  // which silently broke this exact locator (the test failed to find any
  // match rather than erroring, so it went unnoticed until this spec was
  // actually run against current `frontend/src`).
  await expect(page.getByTestId('entity-attr-value').first()).toBeVisible();

  await page.screenshot({ path: 'test-results/screens/entity-dossier.png', fullPage: true });
});
