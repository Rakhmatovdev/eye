import { test, expect } from '@playwright/test';

// Explicit, standalone login-flow coverage. Overrides the project's
// storageState (populated by auth.setup.ts) with a clean, logged-out
// context so this test exercises the real login form end to end instead of
// starting pre-authenticated.
test.use({ storageState: { cookies: [], origins: [] } });

test('logs in with seeded admin credentials and lands on the dashboard', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('form button[type="submit"]')).toBeVisible();

  const emailField = page.getByPlaceholder('analyst@platform.io');
  const passwordField = page.getByPlaceholder('••••••••');

  // Fill-and-verify (see auth.setup.ts for why): a Next-dev Fast-Refresh
  // remount racing the first fill can reset these controlled inputs.
  await expect(async () => {
    await emailField.fill('admin@platform.io');
    await passwordField.fill('Admin123!');
    await expect(emailField).toHaveValue('admin@platform.io');
    await expect(passwordField).toHaveValue('Admin123!');
  }).toPass({ timeout: 15_000 });

  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // Sidebar (WorkspaceLayout) + dashboard content should be visible post-login.
  await expect(page.getByText(/BRAVE ANALYST/i)).toBeVisible();
  await expect(page.locator('h1')).toContainText(/.+/);

  await page.screenshot({ path: 'test-results/screens/login-then-dashboard.png', fullPage: true });
});
