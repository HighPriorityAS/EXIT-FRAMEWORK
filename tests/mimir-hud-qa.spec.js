const { test, expect } = require('@playwright/test');
test.use({ baseURL: 'http://127.0.0.1:4173' });

async function seed(page) {
  await page.goto('/mimir-hud.html');
  await page.evaluate(() => localStorage.setItem('exit_control_sprint_v1', JSON.stringify({
    startedAt:new Date().toISOString().slice(0,10),checkins:[],
    signals:[{text:'Relevant signal',status:'new'}],
    decisions:[{text:'Pending choice',status:'pending'},{text:'Past choice',status:'recorded'}],
    controlRoom:{activeFriction:{statement:'Too many open loops',nextAction:'Close one',status:'active'}}
  })));
  await page.reload();
}

for (const width of [390, 430, 768, 1440]) {
  test('HUD has one action and no horizontal overflow at ' + width, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await seed(page);
    await expect(page.locator('[data-now]')).toHaveCount(1);
    await expect(page.locator('[data-attention-item]:visible')).toHaveCount(3);
    await expect(page.locator('[data-next-link]')).toHaveAttribute('href','control-room.html');
    await expect(page.locator('[data-voice]')).toBeVisible();
    const overflow=await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('quiet state has no invented signals or status', async ({page}) => {
  await page.goto('/mimir-hud.html');
  await expect(page.locator('[data-attention-empty]')).toBeVisible();
  await expect(page.locator('[data-attention-item]:visible')).toHaveCount(0);
  await expect(page.locator('[data-next-link]')).toHaveAttribute('href','30-day-control-sprint.html');
  await expect(page.locator('body')).not.toContainText('72%');
  await expect(page.locator('body')).not.toContainText('LOQ online');
});

test('attention and commands reach their working surfaces', async ({page}) => {
  await seed(page);
  await page.locator('[data-open="friction"]').click();
  await expect(page.locator('[data-drawer-body]')).toContainText('Too many open loops');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-drawer]')).not.toHaveClass(/open/);
  await page.locator('[data-palette]').click();
  await page.locator('[data-cmd="what-now"]').click();
  await expect(page.locator('[data-mimir-response]')).toBeVisible();
  await page.locator('[data-command-input]').fill('fang dette: Minste steg fungerer');
  await page.locator('[data-command-form] button').click();
  await expect(page.locator('[data-archive-summary]')).toHaveText('1 fangst');
});

test('voice and account entry points remain available', async ({page}) => {
  await page.goto('/mimir-hud.html');
  await page.locator('[data-voice]').click();
  await expect(page.locator('[data-auth-dialog]')).toBeVisible();
  await page.locator('[data-auth-close]').click();
  await page.locator('[data-cloud-trigger]').click();
  await expect(page.locator('[data-auth-dialog]')).toBeVisible();
});
