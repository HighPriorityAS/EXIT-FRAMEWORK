const { test, expect } = require('@playwright/test');

test.use({ baseURL: 'http://127.0.0.1:4173' });

const viewports = [390, 430, 768, 1440];

function dateKeyOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

async function noHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function seedSprint(page, day = 7, latestDay = 6) {
  await page.goto('/control-room.html');
  await page.evaluate(({ startedAt, latestDate, latestDay }) => {
    const sprint = {
      version: 2,
      startedAt,
      constraint: 'Unstructured mornings',
      outcome: 'Start each day from one written mission',
      baseline: 4,
      protect: 'Sleep and recovery routine',
      priority: 'Protect the first hour',
      checkins: latestDay ? [{
        date: latestDate,
        day: latestDay,
        state: 'yellow',
        action: 'Write one bounded morning mission',
        mission: 'completed',
        control: 6,
        note: 'The first useful action happened before messages'
      }] : [],
      reviews: [],
      controlSystem: null,
      completedAt: null
    };
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(sprint));
  }, {
    startedAt: dateKeyOffset(day - 1),
    latestDate: dateKeyOffset(Math.max(0, day - latestDay)),
    latestDay
  });
  await page.reload();
}

test('Control Room first-use state points into the Sprint', async ({ page }) => {
  await page.goto('/control-room.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-cr-empty]')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start the 30-Day Control Sprint/i })).toHaveAttribute('href', '30-day-control-sprint.html');
});

for (const width of viewports) {
  test('Control Room runtime at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await seedSprint(page, 7, 6);

    await expect(page.locator('[data-cr-day-label]')).toContainText('Day 7 / 30');
    await expect(page.locator('[data-cr-next-action]')).toContainText("Set today's operating state");
    await expect(page.locator('[data-cr-last-meta]')).toContainText('Day 6');
    await noHorizontalOverflow(page);

    await page.locator('[data-cr-friction-start]').click();
    await page.locator('#cr-friction').fill('Too many choices before the first action');
    await page.locator('#cr-friction-next').fill('Remove optional morning decisions');
    await page.getByRole('button', { name: /Save friction/i }).click();
    await expect(page.locator('[data-cr-friction-statement]')).toHaveText('Too many choices before the first action');

    await page.locator('[data-cr-primary]').click();
    await page.locator('input[name="state"][value="red"]').check();
    await page.locator('#cr-action').fill('Prepare one five-minute mission card');
    await page.locator('input[name="mission"][value="completed"]').check();
    await page.locator('#cr-control').fill('5');
    await page.locator('#cr-note').fill('Reduced the morning to one bounded move');
    await page.getByRole('button', { name: /Save check-in/i }).click();

    await expect(page.locator('[data-cr-mode]')).toHaveText('LOW CAPACITY');
    await expect(page.locator('[data-cr-next-action]')).toContainText('Run Week 1 Control Review');
    await expect(page.locator('[data-cr-last-action]')).toHaveText('Prepare one five-minute mission card');

    await page.reload();
    await expect(page.locator('[data-cr-friction-statement]')).toHaveText('Too many choices before the first action');
    await expect(page.locator('[data-cr-last-note]')).toContainText('Reduced the morning');
    await noHorizontalOverflow(page);
  });
}

test('Control Room resumes after skipped days without catch-up debt', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await seedSprint(page, 10, 2);

  await expect(page.locator('[data-cr-day-label]')).toContainText('Day 10 / 30');
  await expect(page.locator('[data-cr-gap]')).toContainText('7 unrecorded days');
  await expect(page.locator('[data-cr-gap]')).toContainText('Nothing to repay');
  await expect(page.locator('[data-cr-next-action]')).toContainText("Set today's operating state");
  await noHorizontalOverflow(page);
});