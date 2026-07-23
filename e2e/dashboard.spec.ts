import { test, expect } from '@playwright/test';

// Uses the storageState from auth.setup.ts — arrives already authenticated.
test('dashboard renders stat tiles and content', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByText(/BRAVE ANALYST/i)).toBeVisible();

  // Stat tiles grid: 3 cards, each with a bold value (h3) and a non-empty
  // label. See src/app/dashboard/page.tsx `stats` array. Scoped to the grid
  // container — "Active Cases"/"Activity" section titles are also <h3>s.
  const statCards = page.locator('div.grid.grid-cols-1.md\\:grid-cols-3.gap-4 h3');
  await expect(statCards).toHaveCount(3);
  for (const card of await statCards.all()) {
    await expect(card).toBeVisible();
    await expect(card).not.toHaveText('');
  }

  // Active case files + activity log sections both render list items.
  await expect(page.getByText('CASE-01')).toBeVisible();
  await expect(page.getByText('CASE-02')).toBeVisible();
  await expect(page.getByText('CASE-03')).toBeVisible();

  await page.screenshot({ path: 'test-results/screens/dashboard.png', fullPage: true });
});
