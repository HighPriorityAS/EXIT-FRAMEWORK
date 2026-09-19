(() => {
  const api = window.ExitState;
  const signedOut = document.querySelector('[data-account-signed-out]');
  const signedIn = document.querySelector('[data-account-signed-in]');
  const form = document.querySelector('[data-account-form]');
  if (!api || !signedOut || !signedIn || !form) return;

  const emailOut = document.querySelector('[data-account-email]');
  const syncOut = document.querySelector('[data-account-sync-status]');
  const formStatus = document.querySelector('[data-account-form-status]');
  const conflictBox = document.querySelector('[data-account-conflict]');
  const conflictStatus = document.querySelector('[data-conflict-status]');
  const deleteConfirm = document.querySelector('[data-delete-confirm]');
  const deleteStatus = document.querySelector('[data-delete-status]');

  const render = () => {
    const state = api.getStatus();
    signedOut.hidden = state.signedIn;
    signedIn.hidden = !state.signedIn;
    if (state.signedIn) {
      emailOut.textContent = state.email || 'Signed in';
      syncOut.textContent = state.status;
      conflictBox.hidden = !state.conflict;
    }
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    formStatus.textContent = '';
    const email = String(form.elements.email.value || '').trim();
    if (!email) return;
    try {
      await api.signInWithEmail(email);
      formStatus.textContent = 'Check your email and open the one-time sign-in link. Return here to continue.';
    } catch {
      formStatus.textContent = 'Could not send the sign-in link. Your local Exit data is unchanged.';
    }
  });

  document.querySelector('[data-account-sync-now]').addEventListener('click', async () => {
    syncOut.textContent = 'SYNCING';
    await api.sync();
    render();
  });

  document.querySelector('[data-account-sign-out]').addEventListener('click', async () => {
    await api.signOut();
    render();
  });

  document.querySelector('[data-conflict-local]').addEventListener('click', async () => {
    conflictStatus.textContent = 'Resolving…';
    const ok = await api.resolveConflict('local');
    conflictStatus.textContent = ok ? 'This device is now the synchronized version.' : 'Could not resolve the conflict. Nothing was overwritten.';
    render();
  });

  document.querySelector('[data-conflict-cloud]').addEventListener('click', async () => {
    conflictStatus.textContent = 'Resolving…';
    const ok = await api.resolveConflict('cloud');
    conflictStatus.textContent = ok ? 'Cloud version restored to this device.' : 'Could not restore the cloud version.';
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
      deleteStatus.textContent = 'Cloud copy deleted. Local data on this device remains.';
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