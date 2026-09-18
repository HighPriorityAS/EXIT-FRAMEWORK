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

async function setupSprint(page) {
  await page.goto('/30-day-control-sprint.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: /Set Day 0 baseline/i }).click();
  await page.locator('#sprint-constraint').fill('Unstructured mornings');
  await page.getByRole('button', { name: /Next/i }).click();
  await page.locator('#sprint-outcome').fill('Start each day from one written mission');
  await page.getByRole('button', { name: /Next/i }).click();
  await page.locator('#sprint-baseline').fill('4');
  await page.getByRole('button', { name: /Next/i }).click();
  await page.locator('#sprint-protect').fill('Sleep and recovery routine');
  await page.getByRole('button', { name: /Start 30-day sprint/i }).click();

  await expect(page.locator('[data-sprint-day-label]')).toContainText('Day 1 / 30');
  await expect(page.locator('[data-active-priority]')).toHaveText('Unstructured mornings');
}

async function saveCheckin(page, { state, action, status, note = '' }) {
  await page.locator('[data-checkin-open]').click();
  await page.locator('input[name="state"][value="' + state + '"]' ).check();
  await page.locator('#checkin-action').fill(action);
  await page.locator('input[name="mission"][value="' + status + '"]' ).check();
  if (note) await page.locator('#checkin-note').fill(note);
  await page.getByRole('button', { name: /Save today's state/i }).click();
}

async function shiftSprintToDay(page, day) {
  await page.evaluate(({ startedAt }) => {
    const key = 'exit_control_sprint_v1';
    const state = JSON.parse(localStorage.getItem(key));
    state.startedAt = startedAt;
    localStorage.setItem(key, JSON.stringify(state));
  }, { startedAt: dateKeyOffset(day - 1) });
  await page.reload();
}

async function completeReview(page, week, priority) {
  await expect(page.locator('[data-review-open]')).toBeVisible();
  await page.locator('[data-review-open]').click();
  await expect(page.locator('[data-review-title]')).toContainText('Week ' + week);
  await page.locator('#review-improved').fill('Starting from one action reduced morning drift');
  await page.locator('#review-friction').fill('Too many open choices before the first action');
  await page.locator('#review-worked').fill('A small written next action still worked on low-capacity days');
  await page.locator('#review-remove').fill('Remove optional morning decisions');
  await page.locator('#review-priority').fill(priority);
  await page.getByRole('button', { name: /Save review \+ update priority/i }).click();
  await expect(page.locator('[data-active-priority]')).toHaveText(priority);
}

for (const width of viewports) {
  test('Control Sprint vertical slice at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupSprint(page);
    await noHorizontalOverflow(page);

    // Low-capacity behavior appears immediately after a RED check-in.
    await saveCheckin(page, {
      state: 'red',
      action: 'Write one 5-minute mission before opening messages',
      status: 'planned'
    });
    await expect(page.locator('[data-low-capacity-note]')).toBeVisible();
    await expect(page.locator('[data-next-action]')).toContainText('Write one 5-minute mission');

    // Same-day entry stays editable and becomes evidence of execution.
    await page.locator('[data-checkin-open]').click();
    await expect(page.locator('#checkin-action')).toHaveValue('Write one 5-minute mission before opening messages');
    await page.locator('input[name="mission"][value="completed"]').check();
    await page.locator('#checkin-note').fill('Completed the bounded action and stopped');
    await page.getByRole('button', { name: /Save today's state/i }).click();
    await expect(page.locator('[data-next-action]')).toContainText('Stop. Return');

    // Reload proves browser-local persistence.
    await page.reload();
    await expect(page.locator('[data-active-priority]')).toHaveText('Unstructured mornings');
    await expect(page.locator('[data-checkin-count]')).toHaveText('1');
    await noHorizontalOverflow(page);

    // Day 7 proves the weekly review changes system state instead of only summarizing it.
    await shiftSprintToDay(page, 7);
    await expect(page.locator('[data-sprint-day-label]')).toContainText('Day 7 / 30');
    await saveCheckin(page, {
      state: 'yellow',
      action: 'Prepare tomorrow morning mission card',
      status: 'completed'
    });
    await completeReview(page, 1, 'Protect the first hour of the morning');
    await noHorizontalOverflow(page);

    // Day 30 must gate completion behind final evidence + Week 4 review.
    await shiftSprintToDay(page, 30);
    await expect(page.locator('[data-sprint-day-label]')).toContainText('Day 30 / 30');
    await saveCheckin(page, {
      state: 'green',
      action: 'Write the next 30-day direction',
      status: 'completed',
      note: 'The daily loop now runs without adding a second task'
    });
    await expect(page.locator('[data-review-open]')).toBeVisible();
    await completeReview(page, 4, 'Keep one bounded daily mission');
    await expect(page.locator('[data-control-system-open]')).toBeVisible();

    await page.locator('[data-control-system-open]').click();
    await page.locator('#system-not-now').fill('New projects before the current priority is stable');
    await page.locator('#system-failure').fill('Protect sleep, reduce scope, choose one five-minute action');
    await page.locator('#system-decision').fill('When capacity is low, reduce scope before increasing effort');
    await page.locator('#system-daily').fill('State → priority → one bounded action → evidence');
    await page.locator('#system-weekly').fill('Review evidence → remove friction → choose one priority');
    await page.locator('#system-warning').fill('More open loops and repeated replanning without execution');
    await page.locator('#system-control').fill('The important action is clear and completed without sacrificing the base');
    await page.locator('#system-next30').fill('Make the daily control loop automatic');
    await page.getByRole('button', { name: /Complete Sprint \+ save Control System/i }).click();

    await expect(page.locator('[data-sprint-summary]')).toBeVisible();
    await expect(page.locator('[data-system-priority]')).toHaveText('Keep one bounded daily mission');
    await expect(page.locator('[data-system-failure]')).toContainText('Protect sleep');
    await noHorizontalOverflow(page);

     // Completed artifact survives a reload.
    await page.reload();
    await expect(page.locator('[data-sprint-summary]')).toBeVisible();
    await expect(page.locator('[data-system-next30]')).toHaveText('Make the daily control loop automatic');
    await noHorizontalOverflow(page);
  });
}
