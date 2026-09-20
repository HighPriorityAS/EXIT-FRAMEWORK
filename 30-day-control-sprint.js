(() => {
  const KEY = 'exit_control_sprint_v1';
  const VERSION = 2;
  const empty = document.querySelector('[data-sprint-empty]');
  const setup = document.querySelector('[data-sprint-setup]');
  const active = document.querySelector('[data-sprint-active]');
  const summary = document.querySelector('[data-sprint-summary]');
  const reviewForm = document.querySelector('[data-review-form]');
  const controlSystemForm = document.querySelector('[data-control-system-form]');
  if (!empty || !setup || !active || !summary || !reviewForm || !controlSystemForm) return;

  const track = name => window.ExitMetrics?.track(name);
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
  const cleanText = value => String(value || '').trim();
  const clampRating = value => Math.min(10, Math.max(0, Number(value) || 0));
  const phaseForDay = day => day <= 7 ? 'STABILIZE' : day <= 14 ? 'CONTROL' : day <= 21 ? 'EXECUTE' : 'AUTONOMY';
  const reviewCheckpoint = day => day >= 28 ? 4 : day >= 21 ? 3 : day >= 14 ? 2 : day >= 7 ? 1 : 0;

  const normalize = stored => {
    if (!stored || !stored.startedAt || !stored.constraint || !stored.outcome || !stored.protect || !Array.isArray(stored.checkins)) return null;
    if (stored.version !== 1 && stored.version !== VERSION) return null;
    return {
      ...stored,
      version: VERSION,
      priority: cleanText(stored.priority) || cleanText(stored.constraint),
      reviews: Array.isArray(stored.reviews) ? stored.reviews : [],
      controlSystem: stored.controlSystem || null,
      completedAt: stored.completedAt || null,
      checkins: stored.checkins.map((item, index) => ({
        ...item,
        day: Number(item.day) || Math.min(30, index + 1),
        action: cleanText(item.action),
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
    sprint.version = VERSION;
    if (window.ExitState?.save) return window.ExitState.save(sprint);
    try {
      localStorage.setItem(KEY, JSON.stringify(sprint));
      return true;
    } catch {
      return false;
    }
  };
  const checkinForDay = (sprint, day = sprintDay(sprint)) => sprint.checkins.find(item => Number(item.day) === Number(day));
  const latestCheckin = sprint => sprint.checkins.length ? [...sprint.checkins].sort((a, b) => Number(a.day) - Number(b.day)).at(-1) : null;
  const currentRating = sprint => latestCheckin(sprint)?.control ?? sprint.baseline;
  const reviewForWeek = (sprint, week) => sprint.reviews.find(item => Number(item.week) === Number(week));

  let data = load();
  let setupStep = 0;

  const setupSteps = [...setup.querySelectorAll('[data-setup-step]')];
  const setupProgress = document.querySelector('[data-setup-progress]');
  const setupFill = document.querySelector('[data-setup-progress-fill]');
  const setupBack = document.querySelector('[data-setup-back]');
  const setupNext = document.querySelector('[data-setup-next]');
  const setupStatus = document.querySelector('[data-setup-status]');
  const baselineInput = setup.elements.baseline;
  const baselineOutput = document.querySelector('[data-baseline-output]');

  const showSetupStep = () => {
    setupSteps.forEach((step, index) => { step.hidden = index !== setupStep; });
    setupProgress.textContent = `${setupStep + 1} / ${setupSteps.length}`;
    setupFill.style.width = `${((setupStep + 1) / setupSteps.length) * 100}%`;
    setupBack.hidden = setupStep === 0;
    setupNext.textContent = setupStep === setupSteps.length - 1 ? 'Start 30-day sprint →' : 'Next →';
    setupStatus.textContent = '';
  };
  const setupValid = () => {
    if (setupStep === 0) return Boolean(cleanText(setup.elements.constraint.value));
    if (setupStep === 1) return Boolean(cleanText(setup.elements.outcome.value));
    if (setupStep === 2) return true;
    if (setupStep === 3) return Boolean(cleanText(setup.elements.protect.value));
    return false;
  };

  document.querySelector('[data-sprint-setup-start]').addEventListener('click', () => {
    empty.hidden = true;
    setup.hidden = false;
    showSetupStep();
    setupSteps[0].querySelector('input')?.focus();
  });
  baselineInput.addEventListener('input', () => { baselineOutput.textContent = baselineInput.value; });
  setupBack.addEventListener('click', () => {
    if (setupStep > 0) setupStep -= 1;
    showSetupStep();
  });
  setupNext.addEventListener('click', () => {
    if (!setupValid()) {
      setupStatus.textContent = 'Complete this one field before continuing.';
      setupSteps[setupStep].querySelector('input')?.focus();
      return;
    }
    if (setupStep < setupSteps.length - 1) {
      setupStep += 1;
      showSetupStep();
      setupSteps[setupStep].querySelector('input')?.focus();
      return;
    }
    const next = {
      version: VERSION,
      startedAt: todayKey(),
      constraint: cleanText(setup.elements.constraint.value),
      outcome: cleanText(setup.elements.outcome.value),
      baseline: clampRating(setup.elements.baseline.value),
      protect: cleanText(setup.elements.protect.value),
      priority: cleanText(setup.elements.constraint.value),
      checkins: [],
      reviews: [],
      controlSystem: null,
      completedAt: null
    };
    if (!save(next)) {
      setupStatus.textContent = 'This browser is blocking local storage. The sprint cannot persist safely here.';
      return;
    }
    data = next;
    track('sprint_start');
    render();
    active.focus();
  });

  const dayLabel = document.querySelector('[data-sprint-day-label]');
  const progressFill = document.querySelector('[data-sprint-progress-fill]');
  const currentControl = document.querySelector('[data-current-control]');
  const activePriority = document.querySelector('[data-active-priority]');
  const activeOutcome = document.querySelector('[data-active-outcome]');
  const activeProtect = document.querySelector('[data-active-protect]');
  const checkinCount = document.querySelector('[data-checkin-count]');
  const lowCapacityNote = document.querySelector('[data-low-capacity-note]');
  const nextAction = document.querySelector('[data-next-action]');
  const nextDetail = document.querySelector('[data-next-detail]');
  const checkinOpen = document.querySelector('[data-checkin-open]');
  const reviewOpen = document.querySelector('[data-review-open]');
  const controlSystemOpen = document.querySelector('[data-control-system-open]');
  const checkinForm = document.querySelector('[data-checkin-form]');
  const checkinTitle = document.querySelector('[data-checkin-title]');
  const checkinControl = checkinForm.elements.control;
  const checkinControlOutput = document.querySelector('[data-checkin-control-output]');
  const checkinStatus = document.querySelector('[data-checkin-status]');

  const renderActive = () => {
    const day = sprintDay(data);
    const current = checkinForDay(data, day);
    const latest = latestCheckin(data);
    const checkpoint = reviewCheckpoint(day);
    const reviewDue = checkpoint > 0 && !reviewForWeek(data, checkpoint);
    const lowCapacity = latest?.state === 'red';

    dayLabel.textContent = `Day ${day} / 30 · ${phaseForDay(day)}`;
    progressFill.style.width = `${(day / 30) * 100}%`;
    currentControl.textContent = currentRating(data);
    activePriority.textContent = data.priority || data.constraint;
    activeOutcome.textContent = data.outcome;
    activeProtect.textContent = data.protect;
    checkinCount.textContent = data.checkins.length;
    active.classList.toggle('is-low-capacity', lowCapacity);
    lowCapacityNote.hidden = !lowCapacity;
    if (lowCapacity) lowCapacityNote.textContent = `LOW CAPACITY MODE · protect ${data.protect}. Keep the next step small.`;

    checkinOpen.hidden = false;
    reviewOpen.hidden = true;
    controlSystemOpen.hidden = true;
    reviewForm.hidden = true;
    controlSystemForm.hidden = true;

    if (!current) {
      checkinOpen.textContent = `Check in for Day ${day} →`;
      nextAction.textContent = "Set today's operating state and one next action.";
      nextDetail.textContent = lowCapacity ? 'Protect the base. One small action is enough.' : 'State → priority → one action. Then execute.';
      return;
    }

    checkinOpen.textContent = `Update Day ${day} check-in →`;
    if (current.mission === 'planned') {
      nextAction.textContent = current.action || 'Run the action you defined.';
      nextDetail.textContent = lowCapacity ? 'Do only the bounded action. Return later only to record the result.' : 'Execute the bounded action. Return later to record the result.';
      return;
    }

    if (reviewDue) {
      nextAction.textContent = `Run Week ${checkpoint} Control Review.`;
      nextDetail.textContent = 'Use the evidence to remove friction and choose one priority for the next week.';
      reviewOpen.hidden = false;
      reviewOpen.textContent = `Open Week ${checkpoint} review →`;
      return;
    }

    if (day === 30) {
      nextAction.textContent = 'Build My Control System.';
      nextDetail.textContent = 'Your final check-in and Week 4 review are recorded. Convert the evidence into rules you can keep using.';
      controlSystemOpen.hidden = false;
      return;
    }

    nextAction.textContent = 'Stop. Return when reality changes or tomorrow begins.';
    nextDetail.textContent = lowCapacity ? 'Today is recorded. Protect the base instead of adding load.' : 'Today is recorded. Do not manufacture another obligation.';
  };

  const openCheckin = () => {
    const day = sprintDay(data);
    const existing = checkinForDay(data, day);
    checkinForm.hidden = false;
    reviewForm.hidden = true;
    controlSystemForm.hidden = true;
    checkinTitle.textContent = `Day ${day} control loop.`;
    checkinForm.reset();
    checkinControl.value = existing?.control ?? currentRating(data);
    checkinControlOutput.textContent = checkinControl.value;
    checkinForm.elements.action.value = existing?.action || '';
    if (existing) {
      const state = checkinForm.querySelector(`input[name="state"][value="${existing.state}"]`);
      const mission = checkinForm.querySelector(`input[name="mission"][value="${existing.mission}"]`);
      if (state) state.checked = true;
      if (mission) mission.checked = true;
      checkinForm.elements.note.value = existing.note || '';
    }
    checkinStatus.textContent = '';
    checkinForm.scrollIntoView({ block: 'start', behavior: 'instant' });
    checkinForm.querySelector('input[name="state"]')?.focus();
  };

  checkinOpen.addEventListener('click', openCheckin);
  document.querySelector('[data-checkin-cancel]').addEventListener('click', () => {
    checkinForm.hidden = true;
    checkinOpen.focus();
  });
  checkinControl.addEventListener('input', () => { checkinControlOutput.textContent = checkinControl.value; });
  checkinForm.addEventListener('submit', event => {
    event.preventDefault();
    const state = checkinForm.querySelector('input[name="state"]:checked')?.value;
    const mission = checkinForm.querySelector('input[name="mission"]:checked')?.value;
    const action = cleanText(checkinForm.elements.action.value);
    if (!state || !mission || !action) {
      checkinStatus.textContent = 'Choose the operating state, define one next action and record its status.';
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
      control: clampRating(checkinControl.value),
      note: cleanText(checkinForm.elements.note.value)
    };
    const existingIndex = fresh.checkins.findIndex(item => Number(item.day) === day);
    if (existingIndex >= 0) fresh.checkins[existingIndex] = entry;
    else fresh.checkins.push(entry);
    fresh.checkins.sort((a, b) => Number(a.day) - Number(b.day));
    if (!save(fresh)) {
      checkinStatus.textContent = 'Could not save locally. Nothing was sent.';
      return;
    }
    data = fresh;
    track('sprint_checkin', { day });
    checkinForm.hidden = true;
    renderActive();
    active.focus();
  });

  const reviewTitle = document.querySelector('[data-review-title]');
  const reviewStatus = document.querySelector('[data-review-status]');
  reviewOpen.addEventListener('click', () => {
    const week = reviewCheckpoint(sprintDay(data));
    reviewForm.hidden = false;
    checkinForm.hidden = true;
    controlSystemForm.hidden = true;
    reviewForm.reset();
    reviewForm.dataset.week = String(week);
    reviewTitle.textContent = `Week ${week} Control Review.`;
    reviewStatus.textContent = '';
    reviewForm.scrollIntoView({ block: 'start', behavior: 'instant' });
    reviewForm.elements.improved.focus();
  });
  document.querySelector('[data-review-cancel]').addEventListener('click', () => {
    reviewForm.hidden = true;
    reviewOpen.focus();
  });
  reviewForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = ['improved', 'friction', 'worked', 'remove', 'priority'];
    if (fields.some(name => !cleanText(reviewForm.elements[name].value))) {
      reviewStatus.textContent = 'Keep it short, but complete each line before saving the review.';
      return;
    }
    const fresh = load() || data;
    const week = Number(reviewForm.dataset.week) || reviewCheckpoint(sprintDay(fresh));
    const review = {
      week,
      day: sprintDay(fresh),
      date: todayKey(),
      improved: cleanText(reviewForm.elements.improved.value),
      friction: cleanText(reviewForm.elements.friction.value),
      worked: cleanText(reviewForm.elements.worked.value),
      remove: cleanText(reviewForm.elements.remove.value),
      priority: cleanText(reviewForm.elements.priority.value)
    };
    const existingIndex = fresh.reviews.findIndex(item => Number(item.week) === week);
    if (existingIndex >= 0) fresh.reviews[existingIndex] = review;
    else fresh.reviews.push(review);
    fresh.reviews.sort((a, b) => Number(a.week) - Number(b.week));
    fresh.priority = review.priority;
    if (!save(fresh)) {
      reviewStatus.textContent = 'Could not save locally. Nothing was sent.';
      return;
    }
    data = fresh;
    track('sprint_review', { week });
    reviewForm.hidden = true;
    renderActive();
    active.focus();
  });

  const controlSystemStatus = document.querySelector('[data-control-system-status]');
  const setControlSystemDefaults = () => {
    controlSystemForm.elements.dailyLoop.value = 'State → priority → one bounded action → evidence';
    controlSystemForm.elements.weeklyLoop.value = 'Review evidence → remove friction → choose one priority';
  };
  controlSystemOpen.addEventListener('click', () => {
    const finalCheckin = checkinForDay(data, 30);
    if (sprintDay(data) < 30 || !finalCheckin || finalCheckin.mission === 'planned' || !reviewForWeek(data, 4)) return;
    controlSystemForm.hidden = false;
    checkinForm.hidden = true;
    reviewForm.hidden = true;
    controlSystemForm.reset();
    setControlSystemDefaults();
    controlSystemStatus.textContent = '';
    track('sprint_control_system_open');
    controlSystemForm.scrollIntoView({ block: 'start', behavior: 'instant' });
    controlSystemForm.elements.notNow.focus();
  });
  document.querySelector('[data-control-system-cancel]').addEventListener('click', () => {
    controlSystemForm.hidden = true;
    controlSystemOpen.focus();
  });
  controlSystemForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = ['notNow', 'failureProtocol', 'decisionRule', 'dailyLoop', 'weeklyLoop', 'warningSignal', 'controlSignal', 'next30'];
    if (fields.some(name => !cleanText(controlSystemForm.elements[name].value))) {
      controlSystemStatus.textContent = 'Complete each line. Short and operational is enough.';
      return;
    }
    const fresh = load() || data;
    const final = currentRating(fresh);
    fresh.controlSystem = {
      createdAt: todayKey(),
      currentReality: `Active constraint: ${fresh.constraint}. Current control: ${final}/10 after ${fresh.checkins.length} recorded days.`,
      stability: fresh.protect,
      priority: fresh.priority || fresh.constraint,
      notNow: cleanText(controlSystemForm.elements.notNow.value),
      failureProtocol: cleanText(controlSystemForm.elements.failureProtocol.value),
      decisionRule: cleanText(controlSystemForm.elements.decisionRule.value),
      dailyLoop: cleanText(controlSystemForm.elements.dailyLoop.value),
      weeklyLoop: cleanText(controlSystemForm.elements.weeklyLoop.value),
      warningSignal: cleanText(controlSystemForm.elements.warningSignal.value),
      controlSignal: cleanText(controlSystemForm.elements.controlSignal.value),
      next30: cleanText(controlSystemForm.elements.next30.value)
    };
    fresh.completedAt = todayKey();
    if (!save(fresh)) {
      controlSystemStatus.textContent = 'Could not save locally. Nothing was sent.';
      return;
    }
    data = fresh;
    track('sprint_control_system_complete');
    track('sprint_day30_complete');
    render();
    summary.focus();
  });

  const missionCounts = items => items.reduce((counts, item) => {
    const key = item.mission || 'planned';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { planned: 0, completed: 0, changed: 0, not_completed: 0 });
  const signedDelta = value => value > 0 ? `+${value}` : String(value);
  const buildSummaryText = () => {
    const final = currentRating(data);
    const delta = final - data.baseline;
    const counts = missionCounts(data.checkins);
    const system = data.controlSystem;
    return `EXIT OS — 30-DAY CONTROL SPRINT\nDay 0 control: ${data.baseline}/10\nDay 30 control: ${final}/10\nChange: ${signedDelta(delta)}\nEvidence: ${data.checkins.length}/30 recorded days\nActions: ${counts.completed} completed, ${counts.changed} changed deliberately, ${counts.not_completed} not completed, ${counts.planned} still planned\n\nMY CONTROL SYSTEM\nCURRENT REALITY\n${system.currentReality}\n\nNON-NEGOTIABLE STABILITY\n${system.stability}\n\nPRIORITY\n${system.priority}\n\nNOT NOW\n${system.notNow}\n\nFAILURE PROTOCOL\n${system.failureProtocol}\n\nDECISION RULE\n${system.decisionRule}\n\nDAILY LOOP\n${system.dailyLoop}\n\nWEEKLY LOOP\n${system.weeklyLoop}\n\nWARNING SIGNAL\n${system.warningSignal}\n\nCONTROL SIGNAL\n${system.controlSignal}\n\nNEXT 30 DAYS\n${system.next30}`;
  };
  const renderSummary = () => {
    const final = currentRating(data);
    const delta = final - data.baseline;
    const counts = missionCounts(data.checkins);
    const system = data.controlSystem;
    document.querySelector('[data-summary-baseline]').textContent = data.baseline;
    document.querySelector('[data-summary-final]').textContent = final;
    document.querySelector('[data-summary-delta]').textContent = `${signedDelta(delta)} points`;
    document.querySelector('[data-summary-checkins]').textContent = data.checkins.length;
    document.querySelector('[data-summary-missions]').textContent = `${counts.completed} completed / ${counts.changed} changed / ${counts.not_completed} not completed / ${counts.planned} planned`;
    document.querySelector('[data-summary-missing]').textContent = `${Math.max(0, 30 - data.checkins.length)} days`;
    document.querySelector('[data-summary-constraint]').textContent = data.constraint;
    document.querySelector('[data-summary-outcome]').textContent = data.outcome;
    document.querySelector('[data-summary-protect]').textContent = data.protect;
    const direction = delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'was unchanged';
    document.querySelector('[data-summary-text]').textContent = `Recorded control ${direction} from ${data.baseline}/10 to ${final}/10 across ${data.checkins.length} recorded days. Keep the evidence without turning one sprint into a verdict about yourself.`;
    const values = {
      reality: system.currentReality,
      stability: system.stability,
      priority: system.priority,
      'not-now': system.notNow,
      failure: system.failureProtocol,
      decision: system.decisionRule,
      daily: system.dailyLoop,
      weekly: system.weeklyLoop,
      warning: system.warningSignal,
      control: system.controlSignal,
      next30: system.next30
    };
    Object.entries(values).forEach(([key, value]) => {
      const target = document.querySelector(`[data-system-${key}]`);
      if (target) target.textContent = value;
    });
  };

  document.querySelector('[data-summary-copy]').addEventListener('click', async () => {
    const status = document.querySelector('[data-summary-status]');
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      status.textContent = 'Control System copied.';
      track('sprint_summary_copy');
    } catch {
      status.textContent = 'Copy is unavailable in this browser.';
    }
  });

  document.querySelectorAll('[data-sprint-reset]').forEach(button => {
    button.addEventListener('click', () => {
      if (!window.confirm('Erase this sprint and all locally stored check-ins on this device?')) return;
      try { localStorage.removeItem(KEY); } catch {}
      data = null;
      setup.reset();
      baselineInput.value = '5';
      baselineOutput.textContent = '5';
      setupStep = 0;
      track('sprint_reset');
      render();
    });
  });

  const render = () => {
    empty.hidden = Boolean(data);
    setup.hidden = true;
    active.hidden = true;
    summary.hidden = true;
    checkinForm.hidden = true;
    reviewForm.hidden = true;
    controlSystemForm.hidden = true;
    if (!data) return;
    if (data.completedAt) {
      renderSummary();
      summary.hidden = false;
    } else {
      renderActive();
      active.hidden = false;
    }
  };

  const reloadFromPersistedState = () => {
    data = load();
    render();
  };

  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    reloadFromPersistedState();
  });
  window.addEventListener('exit-state:changed', reloadFromPersistedState);

  render();
  track('sprint_view');
})();
