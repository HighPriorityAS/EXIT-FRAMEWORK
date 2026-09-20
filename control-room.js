(() => {
  const KEY = 'exit_control_sprint_v1';
  const runtime = document.querySelector('[data-cr-runtime]');
  const empty = document.querySelector('[data-cr-empty]');
  const status = document.querySelector('[data-cr-status]');
  const logForm = document.querySelector('[data-cr-log-form]');
  const frictionForm = document.querySelector('[data-cr-friction-form]');
  if (!runtime || !empty || !status || !logForm || !frictionForm) return;

  const cleanText = value => String(value || '').trim();
  const clampRating = value => Math.min(10, Math.max(0, Number(value) || 0));
  const todayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const utcDay = key => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const elapsedDays = (start, end) => Math.floor((utcDay(end) - utcDay(start)) / 86400000);
  const sprintDay = sprint => Math.min(30, Math.max(1, elapsedDays(sprint.startedAt, todayKey()) + 1));
  const phaseForDay = day => day <= 7 ? 'STABILIZE' : day <= 14 ? 'CONTROL' : day <= 21 ? 'EXECUTE' : 'AUTONOMY';
  const reviewCheckpoint = day => day >= 28 ? 4 : day >= 21 ? 3 : day >= 14 ? 2 : day >= 7 ? 1 : 0;
  const checkinForDay = (sprint, day = sprintDay(sprint)) => sprint.checkins.find(item => Number(item.day) === Number(day));
  const latestCheckin = sprint => sprint.checkins.length ? [...sprint.checkins].sort((a, b) => Number(a.day) - Number(b.day)).at(-1) : null;
  const currentRating = sprint => latestCheckin(sprint)?.control ?? sprint.baseline ?? 5;
  const reviewForWeek = (sprint, week) => (sprint.reviews || []).find(item => Number(item.week) === Number(week));

  const normalize = stored => {
    if (!stored || !stored.startedAt || !Array.isArray(stored.checkins)) return null;
    return {
      ...stored,
      reviews: Array.isArray(stored.reviews) ? stored.reviews : [],
      priority: cleanText(stored.priority) || cleanText(stored.constraint),
      controlRoom: stored.controlRoom && typeof stored.controlRoom === 'object' ? stored.controlRoom : {},
      checkins: stored.checkins.map((item, index) => ({
        ...item,
        day: Number(item.day) || Math.min(30, index + 1),
        action: cleanText(item.action),
        note: cleanText(item.note),
        mission: item.mission || 'planned'
      }))
    };
  };

  const load = () => {
    try {
      const stored = window.ExitState?.load ? window.ExitState.load() : JSON.parse(localStorage.getItem(KEY) || 'null');
      return normalize(stored);
    } catch {
      return null;
    }
  };

  const save = sprint => {
    if (window.ExitState?.save) return window.ExitState.save(sprint);
    try {
      localStorage.setItem(KEY, JSON.stringify(sprint));
      return true;
    } catch {
      return false;
    }
  };

  let data = load();

  const dayLabel = document.querySelector('[data-cr-day-label]');
  const progressFill = document.querySelector('[data-cr-progress-fill]');
  const mode = document.querySelector('[data-cr-mode]');
  const syncStatus = document.querySelector('[data-cr-sync-status]');
  const gap = document.querySelector('[data-cr-gap]');
  const control = document.querySelector('[data-cr-control]');
  const priority = document.querySelector('[data-cr-priority]');
  const protect = document.querySelector('[data-cr-protect]');
  const nextAction = document.querySelector('[data-cr-next-action]');
  const nextDetail = document.querySelector('[data-cr-next-detail]');
  const primary = document.querySelector('[data-cr-primary]');

  const frictionEmpty = document.querySelector('[data-cr-friction-empty]');
  const frictionCard = document.querySelector('[data-cr-friction-card]');
  const frictionStatement = document.querySelector('[data-cr-friction-statement]');
  const frictionNext = document.querySelector('[data-cr-friction-next]');
  const frictionEdit = document.querySelector('[data-cr-friction-edit]');
  const frictionStart = document.querySelector('[data-cr-friction-start]');
  const frictionResolve = document.querySelector('[data-cr-friction-resolve]');
  const frictionCancel = document.querySelector('[data-cr-friction-cancel]');
  const frictionStatus = document.querySelector('[data-cr-friction-status]');

  const lastEmpty = document.querySelector('[data-cr-last-empty]');
  const lastCard = document.querySelector('[data-cr-last-card]');
  const lastMeta = document.querySelector('[data-cr-last-meta]');
  const lastAction = document.querySelector('[data-cr-last-action]');
  const lastNote = document.querySelector('[data-cr-last-note]');
  const lastState = document.querySelector('[data-cr-last-state]');
  const lastMission = document.querySelector('[data-cr-last-mission]');
  const lastControl = document.querySelector('[data-cr-last-control]');

  const logControl = logForm.elements.control;
  const logControlOutput = document.querySelector('[data-cr-control-output]');
  const logStatus = document.querySelector('[data-cr-log-status]');

  const activeFriction = sprint => {
    const item = sprint.controlRoom?.activeFriction;
    return item && item.status !== 'resolved' && cleanText(item.statement) ? item : null;
  };

  const deriveNext = sprint => {
    const day = sprintDay(sprint);
    const current = checkinForDay(sprint, day);
    const checkpoint = reviewCheckpoint(day);
    const reviewDue = checkpoint > 0 && !reviewForWeek(sprint, checkpoint);

    if (sprint.completedAt && sprint.controlSystem) {
      return {
        action: sprint.controlSystem.priority || sprint.controlSystem.next30 || 'Run the Control System you installed.',
        detail: 'The Sprint is complete. Use the rules that earned their place.',
        mode: 'log',
        label: 'Log current state →'
      };
    }

    if (!current) {
      return {
        action: "Set today's operating state and one next action.",
        detail: 'Do not reconstruct missed days. Start from what is true now.',
        mode: 'log',
        label: "Set today's state →"
      };
    }

    if (current.mission === 'planned') {
      return {
        action: current.action || 'Run the bounded action you defined.',
        detail: 'Execute one bounded move. Return only to record what happened.',
        mode: 'log',
        label: 'Log result →'
      };
    }

    if (reviewDue) {
      return {
        action: `Run Week ${checkpoint} Control Review.`,
        detail: 'Use evidence to remove friction and choose one priority for the next week.',
        mode: 'sprint',
        label: `Open Week ${checkpoint} review →`
      };
    }

    if (day === 30 && !sprint.controlSystem) {
      return {
        action: 'Build My Control System.',
        detail: 'Convert thirty days of evidence into rules you can keep using.',
        mode: 'sprint',
        label: 'Build My Control System →'
      };
    }

    return {
      action: 'Stop. Return when reality changes or tomorrow begins.',
      detail: 'Today is recorded. Do not manufacture another obligation.',
      mode: 'last',
      label: 'Review latest evidence →'
    };
  };

  const humanState = value => ({ green: 'GREEN · usable capacity', yellow: 'YELLOW · narrow the load', red: 'RED · stabilize first' }[value] || 'State not recorded');
  const humanMission = value => ({ planned: 'PLANNED', completed: 'COMPLETED', changed: 'CHANGED DELIBERATELY', not_completed: 'NOT COMPLETED' }[value] || 'STATUS UNKNOWN');

  const fillLog = () => {
    if (!data) return;
    const day = sprintDay(data);
    const current = checkinForDay(data, day);
    const latest = latestCheckin(data);
    logForm.reset();
    logForm.elements.action.value = current?.action || activeFriction(data)?.nextAction || '';
    logForm.elements.control.value = current?.control ?? currentRating(data);
    logControlOutput.textContent = logForm.elements.control.value;
    logForm.elements.note.value = current?.note || '';
    const stateValue = current?.state || latest?.state;
    const missionValue = current?.mission || 'planned';
    if (stateValue) {
      const stateInput = logForm.querySelector(`input[name="state"][value="${stateValue}"]`);
      if (stateInput) stateInput.checked = true;
    }
    const missionInput = logForm.querySelector(`input[name="mission"][value="${missionValue}"]`);
    if (missionInput) missionInput.checked = true;
  };

  const renderFriction = () => {
    const friction = activeFriction(data);
    frictionForm.hidden = true;
    frictionStatus.textContent = '';
    frictionCard.hidden = !friction;
    frictionEmpty.hidden = Boolean(friction);
    frictionEdit.hidden = !friction;
    if (!friction) return;
    frictionStatement.textContent = friction.statement;
    frictionNext.textContent = friction.nextAction || 'No next move named yet.';
  };

  const renderLast = () => {
    const latest = latestCheckin(data);
    lastCard.hidden = !latest;
    lastEmpty.hidden = Boolean(latest);
    if (!latest) return;
    lastMeta.textContent = `Day ${latest.day} · ${latest.date || 'recorded evidence'}`;
    lastAction.textContent = latest.action || 'No action text recorded.';
    lastNote.textContent = latest.note || 'No additional note. The action status is the evidence.';
    lastState.textContent = humanState(latest.state);
    lastMission.textContent = humanMission(latest.mission);
    lastControl.textContent = `${latest.control ?? data.baseline ?? 5} / 10 control`;
  };

  const render = () => {
    data = load();
    if (!data) {
      empty.hidden = false;
      runtime.hidden = true;
      status.textContent = '';
      return;
    }

    empty.hidden = true;
    runtime.hidden = false;
    const day = sprintDay(data);
    const latest = latestCheckin(data);
    const lowCapacity = latest?.state === 'red';
    const next = deriveNext(data);

    dayLabel.textContent = data.completedAt ? 'CONTROL SYSTEM INSTALLED' : `Day ${day} / 30 · ${phaseForDay(day)}`;
    progressFill.style.width = `${data.completedAt ? 100 : (day / 30) * 100}%`;
    mode.textContent = lowCapacity ? 'LOW CAPACITY' : data.completedAt ? 'RUNTIME' : 'OPERATING';
    if (syncStatus) syncStatus.textContent = window.ExitState?.getDisplayStatus?.() || 'Saved locally';
    runtime.classList.toggle('is-low-capacity', lowCapacity);
    control.textContent = currentRating(data);
    priority.textContent = data.priority || data.constraint || 'No priority recorded';
    protect.textContent = data.protect || 'No protected base recorded';

    const latestDay = Number(latest?.day || 0);
    const missingSinceLast = latestDay ? Math.max(0, day - latestDay - 1) : 0;
    gap.hidden = missingSinceLast < 1 || data.completedAt;
    if (!gap.hidden) gap.textContent = `${missingSinceLast} unrecorded day${missingSinceLast === 1 ? '' : 's'} since the last check-in. Nothing to repay. Continue from today.`;

    nextAction.textContent = next.action;
    nextDetail.textContent = next.detail;
    primary.textContent = next.label;
    primary.dataset.mode = next.mode;

    renderFriction();
    renderLast();
    fillLog();
    runtime.focus({ preventScroll: true });
  };

  const openLog = () => {
    fillLog();
    logStatus.textContent = '';
    document.querySelector('#control-room-log')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    logForm.querySelector('input[name="state"]')?.focus({ preventScroll: true });
  };

  primary.addEventListener('click', () => {
    const actionMode = primary.dataset.mode;
    if (actionMode === 'sprint') {
      window.location.href = '30-day-control-sprint.html';
      return;
    }
    if (actionMode === 'last') {
      document.querySelector('.control-room-last')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    openLog();
  });

  const openFriction = () => {
    const current = activeFriction(data);
    frictionForm.hidden = false;
    frictionForm.elements.statement.value = current?.statement || '';
    frictionForm.elements.nextAction.value = current?.nextAction || '';
    frictionStatus.textContent = '';
    frictionForm.elements.statement.focus();
  };
  frictionStart.addEventListener('click', openFriction);
  frictionEdit.addEventListener('click', openFriction);
  frictionCancel.addEventListener('click', () => {
    frictionForm.hidden = true;
    (activeFriction(data) ? frictionEdit : frictionStart).focus();
  });

  frictionForm.addEventListener('submit', event => {
    event.preventDefault();
    const statement = cleanText(frictionForm.elements.statement.value);
    const nextActionValue = cleanText(frictionForm.elements.nextAction.value);
    if (!statement) {
      frictionStatus.textContent = 'Name one concrete source of friction.';
      frictionForm.elements.statement.focus();
      return;
    }
    const fresh = load() || data;
    fresh.controlRoom = fresh.controlRoom && typeof fresh.controlRoom === 'object' ? fresh.controlRoom : {};
    fresh.controlRoom.activeFriction = {
      statement,
      nextAction: nextActionValue,
      status: 'active',
      updatedAt: todayKey()
    };
    if (!save(fresh)) {
      frictionStatus.textContent = 'Could not save locally. Nothing was sent.';
      return;
    }
    data = fresh;
    render();
  });

  frictionResolve.addEventListener('click', () => {
    const fresh = load() || data;
    if (!fresh?.controlRoom?.activeFriction) return;
    fresh.controlRoom.activeFriction.status = 'resolved';
    fresh.controlRoom.activeFriction.resolvedAt = todayKey();
    if (!save(fresh)) {
      status.textContent = 'Could not update the friction item locally.';
      return;
    }
    data = fresh;
    render();
    frictionStart.focus();
  });

  logControl.addEventListener('input', () => { logControlOutput.textContent = logControl.value; });

  logForm.addEventListener('submit', event => {
    event.preventDefault();
    const state = logForm.querySelector('input[name="state"]:checked')?.value;
    const mission = logForm.querySelector('input[name="mission"]:checked')?.value;
    const action = cleanText(logForm.elements.action.value);
    if (!state || !mission || !action) {
      logStatus.textContent = 'Choose the operating state, name one action and record its status.';
      return;
    }

    const fresh = load() || data;
    const day = sprintDay(fresh);
    const entry = {
      date: todayKey(),
      day,
      state,
      action,
      mission,
      control: clampRating(logForm.elements.control.value),
      note: cleanText(logForm.elements.note.value)
    };
    const existingIndex = fresh.checkins.findIndex(item => Number(item.day) === day);
    if (existingIndex >= 0) fresh.checkins[existingIndex] = entry;
    else fresh.checkins.push(entry);
    fresh.checkins.sort((a, b) => Number(a.day) - Number(b.day));

    if (!save(fresh)) {
      logStatus.textContent = 'Could not save locally. Nothing was sent.';
      return;
    }
    data = fresh;
    render();
    logStatus.textContent = 'Saved locally. Context restored.';
  });

  window.addEventListener('storage', event => {
    if (event.key === KEY) render();
  });
  window.addEventListener('exit-state:changed', event => {
    if (event.detail?.source !== 'local-save') render();
  });
  window.addEventListener('exit-state:status', () => {
    if (syncStatus) syncStatus.textContent = window.ExitState?.getDisplayStatus?.() || 'Saved locally';
  });

  render();
})();