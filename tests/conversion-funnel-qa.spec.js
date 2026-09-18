const { test, expect } = require('@playwright/test');

test.use({ baseURL: 'http://127.0.0.1:4173' });

const widths = [390, 430, 768, 1440];

async function noOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const width of widths) {
  test('free to paid Sprint funnel at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const path of ['/chaos-audit.html', '/minimum-viable-day.html', '/daily-mission.html']) {
      await page.goto(path);
      const link = page.locator('[data-sprint-interest]').first();
      await expect(link).toHaveAttribute('href', /control-sprint\.html/);
      await noOverflow(page);
    }

    await page.goto('/control-sprint.html?utm_source=qa');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Install control');
    await expect(page.locator('[data-exit-price]')).toHaveText('NOK 499 / one-time');
    await noOverflow(page);

    const events = [];
    await page.evaluate(() => {
      window.__qaEvents = [];
      window.addEventListener('exit:metric', event => window.__qaEvents.push(event.detail));
    });
    await page.locator('[data-sprint-checkout]').click();
    await expect(page.locator('[data-checkout-status]')).toContainText('Checkout is not connected yet');
    const checkoutEvents = await page.evaluate(() => window.__qaEvents);
    expect(checkoutEvents.some(event => event.event === 'exit_sprint_checkout_click')).toBeTruthy();
    expect(checkoutEvents.some(event => event.event === 'exit_sprint_checkout_unavailable')).toBeTruthy();

    await page.goto('/sprint-access.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
    await expect(page.getByRole('link', { name: /Start Day 0/i })).toHaveAttribute('href', '30-day-control-sprint.html');
    await noOverflow(page);

    await page.goto('/');
    await expect(page.locator('#paid')).toContainText('30-Day Control Sprint');
    await expect(page.locator('#paid')).toContainText('NOK 499 / one-time');
    await expect(page.locator('#paid [data-sprint-interest]')).toHaveAttribute('href', /control-sprint\.html/);
    await noOverflow(page);
  });
}
