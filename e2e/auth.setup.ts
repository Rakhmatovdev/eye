import { test as setup, expect } from '@playwright/test';

// Runs once before the `chromium` project. Logs in through the real UI
// (not an API shortcut) so we also get first-ever visual coverage of the
// login screen itself, then persists localStorage (auth tokens live there,
// per src/store/authStore.ts) so every other test starts already signed in.
const authFile = 'e2e/.auth/user.json';

setup('authenticate as seeded admin', async ({ page }) => {
  await page.goto('/login');

  // Labels are localized (default locale is 'uz' — see localeStore.ts), so
  // target the literal, un-translated placeholders/attributes instead of copy.
  const emailField = page.getByPlaceholder('analyst@platform.io');
  const passwordField = page.getByPlaceholder('••••••••');

  // Defensive fill-and-verify: a Fast-Refresh remount racing the first fill
  // can silently reset these controlled inputs back to their default demo
  // values (global-setup.ts pre-warms routes to avoid this, but re-check and
  // retry here too so the test isn't flaky if a remount still slips in).
  await expect(async () => {
    await emailField.fill('admin@platform.io');
    await passwordField.fill('Admin123!');
    await expect(emailField).toHaveValue('admin@platform.io');
    await expect(passwordField).toHaveValue('Admin123!');
  }).toPass({ timeout: 15_000 });

  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByText(/BRAVE ANALYST/i)).toBeVisible();

  await page.context().storageState({ path: authFile });
});
