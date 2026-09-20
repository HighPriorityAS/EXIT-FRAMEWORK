(() => {
  const api = window.ExitState;
  const signedOut = document.querySelector('[data-account-signed-out]');
  const signedIn = document.querySelector('[data-account-signed-in]');
  const form = document.querySelector('[data-account-form]');
  if (!api || !signedOut || !signedIn || !form) return;

  const emailOut = document.querySelector('[data-account-email]');
  const stateTitle = document.querySelector('[data-account-state-title]');
  const syncOut = document.querySelector('[data-account-sync-status]');
  const syncCopy = document.querySelector('[data-account-sync-copy]');
  const formStatus = document.querySelector('[data-account-form-status]');
  const actionStatus = document.querySelector('[data-account-action-status]');
  const conflictBox = document.querySelector('[data-account-conflict]');
  const conflictStatus = document.querySelector('[data-conflict-status]');
  const cloudActive = document.querySelector('[data-account-cloud-active]');
  const cloudPaused = document.querySelector('[data-account-cloud-paused]');
  const syncNow = document.querySelector('[data-account-sync-now]');
  const resumeSync = document.querySelector('[data-account-resume-sync]');
  const deleteConfirm = document.querySelector('[data-delete-confirm]');
  const deleteStatus = document.querySelector('[data-delete-status]');

  const from = new URLSearchParams(window.location.search).get('from');
  const returnTarget = from === 'sprint'
    ? { href: '30-day-control-sprint.html', label: 'Sprint' }
    : { href: 'control-room.html', label: 'Control Room' };

  document.querySelectorAll('[data-account-return]').forEach(link => {
    link.href = returnTarget.href;
    link.textContent = `← Return to ${returnTarget.label}`;
  });
  document.querySelectorAll('[data-account-return-primary]').forEach(link => {
    link.href = returnTarget.href;
    link.textContent = `Return to ${returnTarget.label} →`;
  });

  const render = () => {
    const state = api.getStatus();
    signedOut.hidden = state.signedIn;
    signedIn.hidden = !state.signedIn;
    if (!state.signedIn) return;

    emailOut.textContent = state.email || 'Signed in';
    syncOut.textContent = api.getDisplayStatus?.() || 'Saved locally';
    conflictBox.hidden = !state.conflict;
    cloudActive.hidden = state.cloudSyncDisabled;
    cloudPaused.hidden = !state.cloudSyncDisabled;
    syncNow.hidden = state.cloudSyncDisabled;
    resumeSync.hidden = !state.cloudSyncDisabled;

    if (state.conflict) {
      stateTitle.textContent = 'Choose which version to keep.';
      syncCopy.textContent = 'Both versions are preserved until you make the choice.';
    } else if (state.cloudSyncDisabled) {
      stateTitle.textContent = 'Your state stays on this device.';
      syncCopy.textContent = 'Cloud sync is paused. Resume it only when you want a new cloud copy.';
    } else if (state.status === 'OFFLINE') {
      stateTitle.textContent = 'Exit is saving locally.';
      syncCopy.textContent = 'No connection is required to keep working. Changes will sync after reconnecting.';
    } else if (state.status === 'SYNC ISSUE') {
      stateTitle.textContent = 'Your local state is safe.';
      syncCopy.textContent = 'Exit could not sync right now. Your work remains saved on this device.';
    } else if (state.status === 'SYNCING') {
      stateTitle.textContent = 'Keeping your state current.';
      syncCopy.textContent = 'Your latest local changes are being synchronized.';
    } else {
      stateTitle.textContent = 'Your Exit state is available across devices.';
      syncCopy.textContent = 'Changes save on this device first, then sync when available.';
    }
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    formStatus.textContent = '';
    const email = String(form.elements.email.value || '').trim();
    if (!email) return;
    try {
      await api.signInWithEmail(email);
      formStatus.textContent = 'Check your email for the sign-in link. Your current Exit state stays on this device while you sign in.';
    } catch {
      formStatus.textContent = 'Could not send the sign-in link. Your Exit state is unchanged.';
    }
  });

  syncNow.addEventListener('click', async () => {
    actionStatus.textContent = 'Syncing…';
    try {
      await api.sync();
      actionStatus.textContent = api.getStatus().status === 'SYNC ISSUE' ? 'Sync could not complete. Your local state is safe.' : '';
    } catch {
      actionStatus.textContent = 'Sync could not complete. Your local state is safe.';
    }
    render();
  });

  resumeSync.addEventListener('click', async () => {
    actionStatus.textContent = 'Resuming sync…';
    try {
      await api.resumeCloudSync();
      actionStatus.textContent = 'Cloud sync resumed.';
    } catch {
      actionStatus.textContent = 'Cloud sync could not resume. Your local state is unchanged.';
    }
    render();
  });

  document.querySelector('[data-account-sign-out]').addEventListener('click', async () => {
    await api.signOut();
    render();
    formStatus.textContent = 'Signed out. Your Exit state remains saved on this device.';
  });

  document.querySelector('[data-conflict-local]').addEventListener('click', async () => {
    conflictStatus.textContent = 'Resolving…';
    const ok = await api.resolveConflict('local');
    conflictStatus.textContent = ok ? 'This device version is now synced.' : 'Could not resolve the conflict. Nothing was overwritten.';
    render();
  });

  document.querySelector('[data-conflict-cloud]').addEventListener('click', async () => {
    conflictStatus.textContent = 'Resolving…';
    const ok = await api.resolveConflict('cloud');
    conflictStatus.textContent = ok ? 'Cloud version restored to this device.' : 'Could not restore the cloud version. Nothing was overwritten.';
    render();
  });

  document.querySelector('[data-delete-cloud]').addEventListener('click', () => {
    deleteConfirm.hidden = false;
    document.querySelector('[data-delete-confirm-button]').focus();
  });
  document.querySelector('[data-delete-cancel]').addEventListener('click', () => {
    deleteConfirm.hidden = true;
  });
  document.querySelector('[data-delete-confirm-button]').addEventListener('click', async () => {
    deleteStatus.textContent = 'Deleting cloud copy…';
    try {
      await api.deleteCloudState();
      deleteStatus.textContent = 'Cloud copy deleted. Sync is paused; this device remains unchanged.';
      deleteConfirm.hidden = true;
      render();
    } catch {
      deleteStatus.textContent = 'Could not delete the cloud copy. No local data was changed.';
    }
  });

  window.addEventListener('exit-state:status', render);
  window.addEventListener('exit-state:auth', render);
  window.addEventListener('exit-state:conflict', render);
  api.ready.then(render);
  render();
})();
