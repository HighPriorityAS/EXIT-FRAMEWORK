const { test, expect } = require('@playwright/test');

test.use({ baseURL: 'http://127.0.0.1:4173' });

async function noHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const width of [390, 430, 768, 1440]) {
  test('Monetization Sprint v0 vertical slice at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/monetization-sprint.html');
    await page.evaluate(() => localStorage.removeItem('exit_monetization_sprint_v0'));
    await page.reload();

    await page.getByRole('button', { name: /Load Saksfremgang baseline/i }).click();
    await expect(page.locator('#ms-offer')).toHaveValue(/Saksfremgang/);
    await expect(page.locator('#ms-threshold')).toHaveValue(/NOK 499 purchase/);
    await page.getByRole('button', { name: /Start Monetization Sprint/i }).click();

    await expect(page.locator('[data-ms-day]')).toContainText('Day 1 / 7');
    await expect(page.locator('[data-ms-signal]')).toContainText('NO COMMERCIAL SIGNAL YET');
    await expect(page.locator('[data-ms-final-open]')).toBeDisabled();

    await page.getByRole('button', { name: /Define experiment/i }).click();
    await page.locator('#ms-exp-hypothesis-input').fill('High-intent search traffic will convert when the offer matches the query');
    await page.locator('#ms-exp-action-input').fill('Run the bounded 7-day Google Search campaign');
    await page.locator('#ms-exp-signal-input').fill('At least one confirmed NOK 499 purchase');
    await page.getByRole('button', { name: /Activate experiment/i }).click();

    await expect(page.locator('[data-ms-exp-action]')).toContainText('Google Search campaign');

    await page.getByRole('button', { name: 'Log evidence →' }).click();
    await page.locator('input[name="type"][value="checkout_started"]').check();
    await page.locator('#ms-evidence-count').fill('2');
    await page.locator('#ms-evidence-source').fill('Google Search ad');
    await page.locator('#ms-evidence-note').fill('Two high-intent visitors started checkout');
    await page.getByRole('button', { name: /Add evidence/i }).click();

    await expect(page.locator('[data-ms-checkouts]')).toHaveText('2');
    await expect(page.locator('[data-ms-signal]')).toContainText('CHECKOUT INTENT');
    await expect(page.locator('[data-ms-final-open]')).toBeEnabled();

    await page.locator('[data-ms-evidence-open-secondary]').click();
    await page.locator('input[name="type"][value="purchase"]').check();
    await page.locator('#ms-evidence-count').fill('1');
    await page.locator('#ms-evidence-revenue').fill('499');
    await page.locator('#ms-evidence-source').fill('Stripe');
    await page.locator('#ms-evidence-note').fill('One non-personal visitor completed payment');
    await page.getByRole('button', { name: /Add evidence/i }).click();

    await expect(page.locator('[data-ms-purchases]')).toHaveText('1');
    await expect(page.locator('[data-ms-revenue]')).toContainText('499');
    await expect(page.locator('[data-ms-signal]')).toContainText('PAID SIGNAL');

    await page.locator('[data-ms-exp-decision-open]').click();
    await page.locator('input[name="decision"][value="CONTINUE"]').check();
    await page.locator('#ms-exp-rationale').fill('The threshold was met by a confirmed purchase from non-personal traffic');
    await page.getByRole('button', { name: /Close experiment/i }).click();

    await page.locator('[data-ms-final-open]').click();
    await page.locator('#ms-final-reality').fill('One non-personal visitor paid NOK 499 after arriving from the test channel');
    await page.locator('[data-ms-final-form] input[name="decision"][value="CONTINUE"]').check();
    await page.locator('#ms-final-rationale').fill('The explicit success threshold was met with collected revenue');
    await page.locator('#ms-final-next').fill('Repeat the channel test before expanding product scope');
    await page.getByRole('button', { name: /Close sprint \+ save decision/i }).click();

    await expect(page.locator('[data-ms-summary]')).toBeVisible();
    await expect(page.locator('[data-ms-summary-decision]')).toContainText('CONTINUE');
    await expect(page.locator('[data-ms-summary-signal]')).toHaveText('PAID SIGNAL');

    await page.reload();
    await expect(page.locator('[data-ms-summary]')).toBeVisible();
    await expect(page.locator('[data-ms-summary-purchases]')).toHaveText('1');
    await noHorizontalOverflow(page);
  });
}
