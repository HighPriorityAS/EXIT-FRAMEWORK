const { test, expect } = require('@playwright/test');

test.use({ baseURL: 'http://127.0.0.1:4173' });

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

const sampleState = (priority = 'Protect the first hour') => ({
  version: 2,
  startedAt: new Date().toISOString().slice(0, 10),
  constraint: 'Unstructured mornings',
  outcome: 'Start from one written mission',
  baseline: 4,
  protect: 'Sleep and recovery routine',
  priority,
  checkins: [],
  reviews: [],
  controlRoom: {
    activeFriction: {
      statement: 'Too many choices before action',
      nextAction: 'Remove optional morning decisions',
      status: 'active',
      updatedAt: new Date().toISOString().slice(0, 10)
    }
  },
  controlSystem: null,
  completedAt: null
});

async function installMock(page) {
  await page.addInitScript(({ userId }) => {
    const read = key => {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
    };
    const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    window.__EXIT_SUPABASE_FACTORY__ = () => {
      const auth = {
        async getSession() {
          const signedIn = read('__test_signed_in');
          return { data: { session: signedIn ? { user: { id: userId, email: 'operator@example.com' } } : null } };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe() {} } } };
        },
        async signInWithOtp({ email, options }) {
          write('__test_otp_request', { email, options });
          return { data: {}, error: null };
        },
        async signOut() {
          localStorage.removeItem('__test_signed_in');
          return { error: null };
        }
      };

      const from = () => ({
        select() {
          return {
            eq(_column, requestedUserId) {
              return {
                async maybeSingle() {
                  const remote = read('__test_remote');
                  if (!remote || remote.user_id !== requestedUserId) return { data: null, error: null };
                  return { data: {
                    state: remote.state,
                    schema_version: remote.schema_version,
                    revision: remote.revision,
                    updated_at: remote.updated_at
                  }, error: null };
                }
              };
            }
          };
        },
        insert(payload) {
          return {
            select() {
              return {
                async single() {
                  const row = Array.isArray(payload) ? payload[0] : payload;
                  const saved = { ...row, updated_at: row.updated_at || new Date().toISOString() };
                  write('__test_remote', saved);
                  return { data: { revision: saved.revision, updated_at: saved.updated_at }, error: null };
                }
              };
            }
          };
        },
        update(payload) {
          const conditions = {};
          const chain = {
            eq(column, value) {
              conditions[column] = value;
              return chain;
            },
            select() {
              return {
                async maybeSingle() {
                  const remote = read('__test_remote');
                  if (!remote || remote.user_id !== conditions.user_id || Number(remote.revision) !== Number(conditions.revision)) {
                    return { data: null, error: null };
                  }
                  const saved = { ...remote, ...payload };
                  write('__test_remote', saved);
                  return { data: { revision: saved.revision, updated_at: saved.updated_at }, error: null };
                }
              };
            }
          };
          return chain;
        },
        delete() {
          return {
            async eq(_column, requestedUserId) {
              const remote = read('__test_remote');
              if (remote?.user_id === requestedUserId) localStorage.removeItem('__test_remote');
              return { error: null };
            }
          };
        }
      });

      return { auth, from };
    };
  }, { userId: USER_ID });
}

test('anonymous mode stays local-only', async ({ page }) => {
  await installMock(page);
  await page.goto('/account.html');
  await page.evaluate(state => {
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(state));
    localStorage.removeItem('__test_signed_in');
    localStorage.removeItem('__test_remote');
  }, sampleState());
  await page.reload();

  await expect(page.locator('[data-account-signed-out]')).toBeVisible();
  const values = await page.evaluate(() => ({
    local: JSON.parse(localStorage.getItem('exit_control_sprint_v1')),
    remote: localStorage.getItem('__test_remote')
  }));
  expect(values.local.priority).toBe('Protect the first hour');
  expect(values.remote).toBeNull();
});

test('first sign-in uploads local state then clean device restores it', async ({ page }) => {
  await installMock(page);
  await page.goto('/account.html');
  await page.evaluate(({ state, userId }) => {
    localStorage.setItem('__test_signed_in', 'true');
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(state));
    localStorage.removeItem('exit_sync_meta_v1');
    localStorage.removeItem('__test_remote');
  }, { state: sampleState(), userId: USER_ID });
  await page.reload();

  await expect(page.locator('[data-account-signed-in]')).toBeVisible();
  await expect(page.locator('[data-account-sync-status]')).toHaveText(/Synced/);

  const uploaded = await page.evaluate(() => JSON.parse(localStorage.getItem('__test_remote')));
  expect(uploaded.state.priority).toBe('Protect the first hour');
  expect(uploaded.revision).toBe(1);

  await page.evaluate(() => {
    localStorage.removeItem('exit_control_sprint_v1');
    localStorage.removeItem('exit_sync_meta_v1');
  });
  await page.reload();

  await expect(page.locator('[data-account-sync-status]')).toHaveText(/Synced/);
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('exit_control_sprint_v1')));
  expect(restored.priority).toBe('Protect the first hour');
  expect(restored.controlRoom.activeFriction.statement).toContain('Too many choices');
});

test('remote-only change restores automatically without a false conflict', async ({ page }) => {
  await installMock(page);
  await page.goto('/account.html');
  const baseline = sampleState('Original priority');
  const remoteState = sampleState('Changed on Device B');

  await page.evaluate(({ baseline, remoteState, userId }) => {
    localStorage.setItem('__test_signed_in', 'true');
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(baseline));
    localStorage.setItem('exit_sync_meta_v1', JSON.stringify({
      userId,
      revision: 1,
      syncedHash: JSON.stringify(baseline),
      dirty: false,
      lastSyncedAt: new Date(Date.now() - 60000).toISOString()
    }));
    localStorage.setItem('__test_remote', JSON.stringify({
      user_id: userId,
      state: remoteState,
      schema_version: 1,
      revision: 2,
      updated_at: new Date().toISOString()
    }));
  }, { baseline, remoteState, userId: USER_ID });
  await page.reload();

  await expect(page.locator('[data-account-sync-status]')).toHaveText(/Synced/);
  await expect(page.locator('[data-account-conflict]')).toBeHidden();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('exit_control_sprint_v1')));
  expect(restored.priority).toBe('Changed on Device B');
});

test('divergent state creates an explicit conflict instead of overwriting', async ({ page }) => {
  await installMock(page);
  await page.goto('/account.html');
  const local = sampleState('Local priority');
  const remoteState = sampleState('Cloud priority');

  await page.evaluate(({ local, remoteState, userId }) => {
    localStorage.setItem('__test_signed_in', 'true');
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(local));
    localStorage.setItem('exit_sync_meta_v1', JSON.stringify({
      userId,
      revision: 1,
      syncedHash: JSON.stringify({ older: true }),
      dirty: true
    }));
    localStorage.setItem('__test_remote', JSON.stringify({
      user_id: userId,
      state: remoteState,
      schema_version: 1,
      revision: 2,
      updated_at: new Date().toISOString()
    }));
  }, { local, remoteState, userId: USER_ID });
  await page.reload();

  await expect(page.locator('[data-account-sync-status]')).toHaveText('Sync needs a choice');
  await expect(page.locator('[data-account-conflict]')).toBeVisible();

  const remoteBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('__test_remote')));
  expect(remoteBefore.state.priority).toBe('Cloud priority');

  await page.locator('[data-conflict-cloud]').click();
  await expect(page.locator('[data-account-sync-status]')).toHaveText(/Synced/);
  const localAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('exit_control_sprint_v1')));
  expect(localAfter.priority).toBe('Cloud priority');
});

test('offline Control Room save stays local and syncs after reconnect', async ({ page, context }) => {
  await installMock(page);
  await page.goto('/control-room.html');
  const state = sampleState();
  await page.evaluate(({ state, userId }) => {
    localStorage.setItem('__test_signed_in', 'true');
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(state));
    localStorage.setItem('exit_sync_meta_v1', JSON.stringify({
      userId,
      revision: 1,
      syncedHash: JSON.stringify(state),
      dirty: false
    }));
    localStorage.setItem('__test_remote', JSON.stringify({
      user_id: userId,
      state,
      schema_version: 1,
      revision: 1,
      updated_at: new Date().toISOString()
    }));
  }, { state, userId: USER_ID });
  await page.reload();
  await expect(page.locator('[data-cr-sync-status]')).toHaveText(/Synced/);

  await context.setOffline(true);
  await page.locator('[data-cr-primary]').click();
  await page.locator('input[name="state"][value="yellow"]').check();
  await page.locator('#cr-action').fill('Write one five-minute mission');
  await page.locator('input[name="mission"][value="completed"]').check();
  await page.getByRole('button', { name: /Save check-in/i }).click();

  await expect(page.locator('[data-cr-sync-status]')).toHaveText('Offline — saved locally');
  const localOffline = await page.evaluate(() => JSON.parse(localStorage.getItem('exit_control_sprint_v1')));
  expect(localOffline.checkins).toHaveLength(1);

  await context.setOffline(false);
  await expect(page.locator('[data-cr-sync-status]')).toHaveText(/Synced/);
  const remoteAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('__test_remote')));
  expect(remoteAfter.state.checkins).toHaveLength(1);
  expect(remoteAfter.revision).toBe(2);
});


test('deleting cloud state does not silently recreate it', async ({ page }) => {
  await installMock(page);
  await page.goto('/account.html');
  const state = sampleState();

  await page.evaluate(({ state, userId }) => {
    localStorage.setItem('__test_signed_in', 'true');
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(state));
    localStorage.setItem('exit_sync_meta_v1', JSON.stringify({
      userId,
      revision: 1,
      syncedHash: JSON.stringify(state),
      dirty: false
    }));
    localStorage.setItem('__test_remote', JSON.stringify({
      user_id: userId,
      state,
      schema_version: 1,
      revision: 1,
      updated_at: new Date().toISOString()
    }));
  }, { state, userId: USER_ID });
  await page.reload();
  await expect(page.locator('[data-account-sync-status]')).toHaveText(/Synced/);

  await page.locator('[data-delete-cloud]').click();
  await page.locator('[data-delete-confirm-button]').click();

  await expect(page.locator('[data-account-sync-status]')).toHaveText('Cloud sync paused');
  await page.locator('[data-account-sync-now]').click();
  await expect(page.locator('[data-account-sync-status]')).toHaveText('Cloud sync paused');

  const values = await page.evaluate(() => ({
    remote: localStorage.getItem('__test_remote'),
    local: JSON.parse(localStorage.getItem('exit_control_sprint_v1')),
    meta: JSON.parse(localStorage.getItem('exit_sync_meta_v1'))
  }));
  expect(values.remote).toBeNull();
  expect(values.local.priority).toBe('Protect the first hour');
  expect(values.meta.cloudSyncDisabled).toBe(true);
});

test('Sprint refreshes when cloud restore emits exit-state:changed', async ({ page }) => {
  await installMock(page);
  await page.goto('/30-day-control-sprint.html');
  const remoteState = sampleState('Cloud restored priority');

  await page.evaluate(({ remoteState, userId }) => {
    localStorage.setItem('__test_signed_in', 'true');
    localStorage.removeItem('exit_control_sprint_v1');
    localStorage.removeItem('exit_sync_meta_v1');
    localStorage.setItem('__test_remote', JSON.stringify({
      user_id: userId,
      state: remoteState,
      schema_version: 1,
      revision: 3,
      updated_at: new Date().toISOString()
    }));
  }, { remoteState, userId: USER_ID });
  await page.reload();

  await expect(page.locator('[data-sprint-active]')).toBeVisible();
  await expect(page.locator('[data-active-priority]')).toHaveText('Cloud restored priority');
});

test('Sprint and Control Room expose quiet human sync status', async ({ page }) => {
  await installMock(page);
  const state = sampleState();
  await page.goto('/30-day-control-sprint.html');
  await page.evaluate(({ state, userId }) => {
    localStorage.setItem('__test_signed_in', 'true');
    localStorage.setItem('exit_control_sprint_v1', JSON.stringify(state));
    localStorage.setItem('exit_sync_meta_v1', JSON.stringify({
      userId,
      revision: 1,
      syncedHash: JSON.stringify(state),
      dirty: false,
      lastSyncedAt: new Date().toISOString()
    }));
    localStorage.setItem('__test_remote', JSON.stringify({
      user_id: userId,
      state,
      schema_version: 1,
      revision: 1,
      updated_at: new Date().toISOString()
    }));
  }, { state, userId: USER_ID });
  await page.reload();
  await expect(page.locator('[data-sprint-sync-status]')).toHaveText(/Synced/);

  await page.goto('/control-room.html');
  await expect(page.locator('[data-cr-sync-status]')).toHaveText(/Synced/);
});

test('Account remains usable at 390px and returns to the active flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMock(page);
  await page.goto('/account.html?from=sprint');
  await expect(page.getByRole('heading', { name: 'Keep your state. Keep control.' })).toBeVisible();
  await expect(page.locator('[data-account-return]')).toHaveText('← Return to Sprint');
  await expect(page.getByRole('button', { name: /Send sign-in link/i })).toBeVisible();
});
