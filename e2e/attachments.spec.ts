import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Full upload -> list -> download -> delete round trip against the entity
// dossier's Attachments section (real backend GridFS storage, internal/attachments).
// ent-001 (Alisher Karimov) is seeded by backend/internal/seed/seed.go.
test('entity attachments: upload, download, and delete a file', async ({ page }) => {
  const filePath = path.join(os.tmpdir(), `e2e-attachment-${Date.now()}.txt`);
  const fileContent = 'e2e attachment test content';
  fs.writeFileSync(filePath, fileContent);

  try {
    await page.goto('/entity/ent-001');
    await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

    const fileName = path.basename(filePath);
    const fileInput = page.getByTestId('attachments-file-input');
    const uploadButton = page.getByTestId('attachments-upload-btn');
    await fileInput.setInputFiles({
      name: 'oversized.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
    });
    await expect(page.getByRole('alert').filter({ hasText: '20 MiB' })).toBeVisible();
    await expect(uploadButton).toBeDisabled();

    await fileInput.setInputFiles(filePath);
    await uploadButton.click();

    // The uploaded row should appear in the list with the right filename.
    const row = page.locator('[data-testid="attachments-list"]').getByText(fileName);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(fileInput).toHaveValue('');

    // Download it and verify the browser actually received the file with
    // the right content — not just that a click fired.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('attachments-download-btn').first().click(),
    ]);
    expect(download.suggestedFilename()).toBe(fileName);
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const downloadedContent = fs.readFileSync(downloadedPath!, 'utf-8');
    expect(downloadedContent).toBe(fileContent);

    // Delete it (confirm dialog) and verify the row disappears.
    await page.getByTestId('attachments-delete-btn').first().click();
    await page.getByTestId('confirm-dialog-confirm-btn').click();
    await expect(row).not.toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: 'test-results/screens/entity-attachments.png', fullPage: true });
  } finally {
    fs.rmSync(filePath, { force: true });
  }
});
