const { test, expect } = require('@playwright/test');
test.use({ baseURL: 'http://127.0.0.1:4173' });

async function seed(page) {
  await page.goto('/mimir-hud.html');
  await page.evaluate(() => localStorage.setItem('exit_control_sprint_v1', JSON.stringify({
    startedAt: new Date().toISOString().slice(0,10),
    baseline: 5,
    priority: 'Protect focus',
    protect: 'Recovery',
    checkins: [],
    reviews: [],
    controlRoom: { activeFriction: { statement: 'Too many open loops', nextAction: 'Close one loop', status: 'active' } }
  })));
  await page.reload();
}

for (const width of [390, 768, 1440]) {
  test('Mimir HUD renders at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await seed(page);
    await expect(page.locator('[data-now]')).toContainText("Set today's operating state");
    await expect(page.locator('[data-friction]')).toHaveText('Too many open loops');
    await expect(page.locator('[data-command-input]')).toBeVisible();
    await expect(page.locator('[data-mic]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}

test('Mimir HUD ships bounded command routes', async ({ page }) => {
  await page.goto('/mimir-hud.html');
  const source = await page.locator('script[src="mimir-hud.js"]').getAttribute('src');
  expect(source).toBe('mimir-hud.js');
  await expect(page.locator('[data-exec-title]')).toContainText('provisioned');
});