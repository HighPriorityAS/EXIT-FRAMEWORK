const { test, expect } = require('@playwright/test');

test.use({ baseURL: 'http://127.0.0.1:4173' });

for (const width of [320, 390, 768, 1440]) {
  test('Launch 001: article -> audit -> optional email at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const events = [];
    await page.goto('/articles/chaos-is-not-random.html');
    await page.evaluate(() => { window.__exitEvents = []; window.addEventListener('exit:metric', e => window.__exitEvents.push(e.detail)); });
    await page.locator('[data-post001-audit]').click();
    await expect(page).toHaveURL(/chaos-audit\.html/);
    await expect(page.locator('[data-audit-intro]')).toBeVisible();
    await page.locator('[data-audit-start]').click();

    const choices = ['capacity', '2', 'avoid', 'rest', 'low', 'clarity'];
    for (let i = 0; i < 6; i++) {
      await expect(page.locator('[data-audit-progress]')).toHaveText((i + 1) + ' / 6');
      await page.locator('[data-audit-step="' + i + '"] input[value="' + choices[i] + '"]').check();
      await page.locator('[data-audit-next]').click();
    }

    await expect(page.locator('[data-audit-result]')).toBeVisible();
    await expect(page.locator('[data-result-action]')).toContainText('Protect the base');
    await expect(page.locator('[data-email-continue]')).toHaveAttribute('href', /exitframework\.substack\.com\/subscribe/);
    await expect(page.locator('[data-email-continue]')).toHaveAttribute('href', /utm_campaign=launch001/);
    const recorded = await page.evaluate(() => window.__exitEvents);
    expect(recorded.map(e => e.event)).toContain('exit_audit_complete');
    expect(recorded.map(e => e.event)).toContain('exit_result_view');
    expect(recorded.every(e => !('pressure' in e) && !('lever' in e) && !('answer' in e))).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}
