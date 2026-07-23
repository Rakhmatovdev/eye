import { test, expect } from '@playwright/test';

// ent-001 (Alisher Karimov) is seeded by backend/internal/seed/seed.go.
test('entity report modal renders generated markdown and offers download', async ({ page }) => {
  await page.goto('/entity/ent-001');

  await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

  await page.locator('[data-testid="entity-report-btn"]').click();

  const modal = page.locator('[data-testid="report-modal"]');
  await expect(modal).toBeVisible({ timeout: 15_000 });
  // Report body renders once the markdown finishes fetching/parsing.
  await expect(modal.locator('h1, h2, h3').first()).toBeVisible({ timeout: 20_000 });

  await expect(page.locator('[data-testid="report-download-btn"]')).toBeEnabled();

  await page.screenshot({ path: 'test-results/screens/report-modal.png', fullPage: true });
});
