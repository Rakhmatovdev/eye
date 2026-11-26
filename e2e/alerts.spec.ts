import { test, expect, type APIRequestContext } from '@playwright/test';

const ORIGIN = 'http://localhost:3001';

// Guarantees at least one unacked alert exists before the test runs, rather
// than assuming the seed data still has one. AckAlert is one-directional (no
// unack API — see backend internal/alerts/service.go), so repeatedly running
// this suite eventually acknowledges every seeded alert and this spec would
// otherwise fail for a reason that has nothing to do with the alert inbox
// itself (see kamchilik #23 in docs/02-KAMCHILIKLAR.md — this was found by
// running the suite many times in one session and exhausting the fixture).
// Mirrors the same fallback frontend-admin/e2e/smoke.spec.ts's "acknowledging
// an unacked alert" test already uses: a throwaway risk_threshold rule with
// a trivial min_score, then wait for the ~30s evaluator tick.
async function ensureUnackedAlertExists(request: APIRequestContext): Promise<string | null> {
  const existing = await request.get('/api/v1/alerts?acknowledged=false&limit=1');
  const existingBody = await existing.json();
  if ((existingBody?.data?.length ?? 0) > 0) return null;

  const ruleName = `E2E Alerts Fixture ${Date.now()}`;
  const createRes = await request.post('/api/v1/alerts/rules', {
    headers: { Origin: ORIGIN },
    data: { name: ruleName, type: 'risk_threshold', enabled: true, severity: 'low', params: { min_score: 1 } },
  });
  const rule = (await createRes.json())?.data;

  await expect
    .poll(
      async () => {
        const res = await request.get('/api/v1/alerts?acknowledged=false&limit=1');
        const body = await res.json();
        return body?.data?.length ?? 0;
      },
      { timeout: 45_000, intervals: [2_000] }
    )
    .toBeGreaterThan(0);

  return rule?.id ?? null;
}

// Alert Inbox — seeded alerts come from backend/internal/seed/seed.go's
// watchlist/risk/threat rules (topped up by ensureUnackedAlertExists above
// if a prior run already consumed all of them). Default tab is
// "unacknowledged" (see src/app/alerts/page.tsx), so the list should render
// at least one row out of the box.
test('alert inbox lists alerts and acknowledging one works', async ({ page, request }) => {
  const tempRuleId = await ensureUnackedAlertExists(request);

  try {
    await page.goto('/alerts');

    await expect(page.locator('h1')).toContainText(/.+/, { timeout: 30_000 });

    const rows = page.locator('[data-testid="alert-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThan(0);

    const ackBtn = page.locator('[data-testid="alert-ack-btn"]').first();
    // Default tab is "unacknowledged" — after ack + query invalidation the
    // server-reported unacknowledged total drops by one. Assert on the total
    // counter (not the row count): with more than a page of unacked alerts,
    // the refetched page refills to the limit so row count wouldn't change.
    const totalEl = page.locator('[data-testid="alerts-total"]');
    const before = parseInt((await totalEl.innerText()).trim(), 10);
    await ackBtn.click();
    await expect(totalEl).toHaveText(String(before - 1), { timeout: 15_000 });

    await page.screenshot({ path: 'test-results/screens/alerts.png', fullPage: true });
  } finally {
    if (tempRuleId) {
      await request.delete(`/api/v1/alerts/rules/${tempRuleId}`, { headers: { Origin: ORIGIN } });
    }
  }
});
