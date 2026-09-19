(() => {
  const STATE_KEY = 'exit_control_sprint_v1';
  const META_KEY = 'exit_sync_meta_v1';
  const SCHEMA_VERSION = 1;
  const SUPABASE_URL = 'https://zilokqeajexkoewzgywf.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OUxMuJf45lZb2JUUBPRPaQ_cO6ZNeZ0';
  const SUPABASE_VERSION = '2.116.0';

  let client = null;
  let session = null;
  let status = 'LOCAL';
  let conflict = null;
  let syncTimer = null;

  const emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const setStatus = (next, detail = {}) => {
    status = next;
    emit('exit-state:status', { status: next, ...detail });
  };
  const parse = raw => {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const readLocal = () => parse(localStorage.getItem(STATE_KEY));
  const writeLocal = state => {
    try {
      if (state == null) localStorage.removeItem(STATE_KEY);
      else localStorage.setItem(STATE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  };
  const readMeta = () => parse(localStorage.getItem(META_KEY)) || {};
  const writeMeta = meta => {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
      return true;
    } catch {
      return false;
    }
  };
  const hash = state => {
    try { return JSON.stringify(state ?? null); } catch { return ''; }
  };
  const publicState = () => ({
    status,
    signedIn: Boolean(session?.user),
    email: session?.user?.email || '',
    userId: session?.user?.id || '',
    conflict: Boolean(conflict)
  });

  const fetchRemote = async userId => {
    const { data, error } = await client
      .from('exit_states')
      .select('state,schema_version,revision,updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const markSynced = (userId, remote) => {
    const local = readLocal();
    writeMeta({
      userId,
      revision: Number(remote.revision),
      syncedHash: hash(local),
      lastSyncedAt: remote.updated_at || new Date().toISOString(),
      dirty: false
    });
    conflict = null;
    setStatus('SYNCED');
  };

  const insertRemote = async (userId, local) => {
    setStatus('SYNCING');
    const { data, error } = await client
      .from('exit_states')
      .insert({
        user_id: userId,
        state: local,
        schema_version: SCHEMA_VERSION,
        revision: 1,
        updated_at: new Date().toISOString()
      })
      .select('revision,updated_at')
      .single();
    if (error) throw error;
    markSynced(userId, data);
  };

  const enterConflict = (local, remote) => {
    conflict = { local, remote };
    setStatus('SYNC ISSUE', { reason: 'conflict' });
    emit('exit-state:conflict', {
      local,
      remote: remote?.state || null,
      remoteRevision: remote?.revision || null,
      remoteUpdatedAt: remote?.updated_at || null
    });
  };

  const updateRemote = async (userId, local, expectedRevision) => {
    setStatus('SYNCING');
    const nextRevision = Number(expectedRevision) + 1;
    const { data, error } = await client
      .from('exit_states')
      .update({
        state: local,
        schema_version: SCHEMA_VERSION,
        revision: nextRevision,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('revision', expectedRevision)
      .select('revision,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const remote = await fetchRemote(userId);
      enterConflict(local, remote);
      return false;
    }
    markSynced(userId, data);
    return true;
  };

  const reconcile = async () => {
    if (!client || !session?.user) {
      setStatus('LOCAL');
      return;
    }
    if (!navigator.onLine) {
      setStatus('OFFLINE');
      return;
    }

    const userId = session.user.id;
    const local = readLocal();
    const meta = readMeta();
    setStatus('SYNCING');

    try {
      const remote = await fetchRemote(userId);

      if (!remote && !local) {
        writeMeta({ userId, revision: 0, syncedHash: hash(null), dirty: false });
        setStatus('SYNCED');
        return;
      }

      if (!remote && local) {
        await insertRemote(userId, local);
        return;
      }

      if (remote && !local) {
        if (!writeLocal(remote.state)) throw new Error('local_storage_unavailable');
        markSynced(userId, remote);
        emit('exit-state:changed', { source: 'cloud-restore' });
        return;
      }

      if (hash(local) === hash(remote.state)) {
        markSynced(userId, remote);
        return;
      }

      const sameAccount = meta.userId === userId;
      const knowsRemoteRevision = sameAccount && Number(meta.revision) === Number(remote.revision);
      const localChangedSinceSync = sameAccount && meta.syncedHash && meta.syncedHash !== hash(local);

      if (knowsRemoteRevision && localChangedSinceSync) {
        await updateRemote(userId, local, remote.revision);
        return;
      }

      enterConflict(local, remote);
    } catch (error) {
      console.warn('Exit sync unavailable', error);
      setStatus(navigator.onLine ? 'SYNC ISSUE' : 'OFFLINE', { reason: 'network' });
    }
  };

  const scheduleSync = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { void reconcile(); }, 120);
  };

  const save = state => {
    const ok = writeLocal(state);
    if (!ok) return false;
    const meta = readMeta();
    if (session?.user) {
      writeMeta({ ...meta, userId: session.user.id, dirty: true });
      setStatus(navigator.onLine ? 'SYNCING' : 'OFFLINE');
      scheduleSync();
    } else {
      setStatus('LOCAL');
    }
    emit('exit-state:changed', { source: 'local-save' });
    return true;
  };

  const resolveConflict = async choice => {
    if (!conflict || !session?.user) return false;
    const userId = session.user.id;
    if (choice === 'cloud') {
      if (!writeLocal(conflict.remote.state)) return false;
      markSynced(userId, conflict.remote);
      emit('exit-state:changed', { source: 'conflict-cloud' });
      return true;
    }
    if (choice === 'local') {
      const remoteRevision = Number(conflict.remote.revision);
      const local = conflict.local;
      conflict = null;
      return updateRemote(userId, local, remoteRevision);
    }
    return false;
  };

  const deleteCloudState = async () => {
    if (!client || !session?.user) throw new Error('not_signed_in');
    const { error } = await client.from('exit_states').delete().eq('user_id', session.user.id);
    if (error) throw error;
    writeMeta({ userId: session.user.id, revision: 0, syncedHash: '', dirty: true });
    setStatus('LOCAL');
    return true;
  };

  const importClient = async () => {
    if (window.__EXIT_SUPABASE_FACTORY__) return window.__EXIT_SUPABASE_FACTORY__();
    const mod = await import(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_VERSION}/+esm`);
    return mod.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  };

  const ready = (async () => {
    try {
      client = await importClient();
      const { data } = await client.auth.getSession();
      session = data?.session || null;
      client.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession;
        if (session?.user) void reconcile();
        else {
          conflict = null;
          setStatus('LOCAL');
        }
        emit('exit-state:auth', publicState());
      });
      if (session?.user) await reconcile();
      else setStatus('LOCAL');
      return true;
    } catch (error) {
      console.warn('Exit cloud client unavailable', error);
      setStatus(navigator.onLine ? 'LOCAL' : 'OFFLINE');
      return false;
    }
  })();

  const signInWithEmail = async email => {
    await ready;
    if (!client) throw new Error('cloud_client_unavailable');
    const redirectTo = 'https://chaosexit.com/account.html';
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
    });
    if (error) throw error;
    return true;
  };

  const signOut = async () => {
    await ready;
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    session = null;
    conflict = null;
    setStatus('LOCAL');
  };

  window.addEventListener('online', () => { if (session?.user) void reconcile(); });
  window.addEventListener('offline', () => { if (session?.user) setStatus('OFFLINE'); });

  window.ExitState = {
    load: readLocal,
    save,
    sync: reconcile,
    ready,
    getStatus: publicState,
    getSession: () => session,
    signInWithEmail,
    signOut,
    resolveConflict,
    deleteCloudState,
    project: { url: SUPABASE_URL, clientVersion: SUPABASE_VERSION }
  };
})();