const { test, expect } = require('@playwright/test');

test.use({ baseURL: 'http://127.0.0.1:4173' });

const widths = [390, 430, 768, 1440];

async function noOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const width of widths) {
  test('open EXIT core at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    await page.goto('/framework.html');
    await expect(page.locator('#open-core')).toContainText('Founder status is scarce');
    await expect(page.getByRole('link', { name: /Run EXIT free/i })).toHaveAttribute('href', '30-day-control-sprint.html');
    await noOverflow(page);

    await page.goto('/control-sprint.html');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Install control');
    await expect(page.getByRole('link', { name: /Start Day 0/i })).toHaveAttribute('href', '30-day-control-sprint.html');
    await expect(page.locator('body')).not.toContainText('$49');
    await noOverflow(page);

    await page.goto('/30-day-control-sprint.html');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await noOverflow(page);

    await page.goto('/control-room.html');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await noOverflow(page);

    await page.goto('/lexicon.html');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('human autonomy under load');
    await expect(page.locator('#re-entry')).toContainText('No restart ritual');
    await noOverflow(page);

    await page.goto('/founders.html');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Never expanded');
    await expect(page.locator('body')).toContainText('100 means 100');
    await noOverflow(page);
  });
}