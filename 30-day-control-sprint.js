(() => {
  const KEY = 'exit_control_sprint_v1';
  const VERSION = 1;
  const empty = document.querySelector('[data-sprint-empty]');
  const setup = document.querySelector('[data-sprint-setup]');
  const active = document.querySelector('[data-sprint-active]');
  const summary = document.querySelector('[data-sprint-summary]');
  if (!empty || !setup || !active || !summary) return;

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

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw);
      if (!stored || stored.version !== VERSION || !stored.startedAt || !stored.constraint || !stored.outcome || !stored.protect || !Array.isArray(stored.checkins)) return null;
      return stored;
    } catch {
      return null;
    }
  };
  const save = sprint => {
    try {
      localStorage.setItem(KEY, JSON.stringify(sprint));
      return true;
    } catch {
      return false;
    }
  };
  const latestCheckin = sprint => sprint.checkins.length ? sprint.checkins[sprint.checkins.length - 1] : null;
  const currentRating = sprint => latestCheckin(sprint)?.control ?? sprint.baseline;
  const todayCheckin = sprint => sprint.checkins.find(item => item.date === todayKey());

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
      checkins: [],
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
  const activeConstraint = document.querySelector('[data-active-constraint]');
  const activeOutcome = document.querySelector('[data-active-outcome]');
  const activeProtect = document.querySelector('[data-active-protect]');
  const checkinCount = document.querySelector('[data-checkin-count]');
  const nextAction = document.querySelector('[data-next-action]');
  const nextDetail = document.querySelector('[data-next-detail]');
  const checkinOpen = document.querySelector('[data-checkin-open]');
  const completeSprint = document.querySelector('[data-complete-sprint]');
  const checkinForm = document.querySelector('[data-checkin-form]');
  const checkinTitle = document.querySelector('[data-checkin-title]');
  const checkinControl = checkinForm.elements.control;
  const checkinControlOutput = document.querySelector('[data-checkin-control-output]');
  const checkinStatus = document.querySelector('[data-checkin-status]');

  const renderActive = () => {
    const day = sprintDay(data);
    const todays = todayCheckin(data);
    dayLabel.textContent = `Day ${day} / 30`;
    progressFill.style.width = `${(day / 30) * 100}%`;
    currentControl.textContent = currentRating(data);
    activeConstraint.textContent = data.constraint;
    activeOutcome.textContent = data.outcome;
    activeProtect.textContent = data.protect;
    checkinCount.textContent = data.checkins.length;
    checkinOpen.hidden = false;
    completeSprint.hidden = true;
    if (todays) {
      checkinOpen.textContent = `Update Day ${day} check-in →`;
      if (day === 30) {
        nextAction.textContent = 'Complete the Day 30 comparison.';
        nextDetail.textContent = 'The final check-in is recorded. Close the sprint with evidence, not a verdict.';
        checkinOpen.hidden = true;
        completeSprint.hidden = false;
      } else {
        nextAction.textContent = 'Stop. Return tomorrow.';
        nextDetail.textContent = 'Today is recorded. Do not manufacture another obligation.';
      }
    } else {
      checkinOpen.textContent = `Check in for Day ${day} →`;
      nextAction.textContent = "Complete today's short check-in.";
      nextDetail.textContent = day === 30 ? 'Record the final operating state, then compare Day 30 with Day 0.' : 'Record the day. Then stop.';
    }
  };

  const openCheckin = () => {
    const day = sprintDay(data);
    const existing = todayCheckin(data);
    checkinForm.hidden = false;
    checkinTitle.textContent = `Day ${day} check-in.`;
    checkinForm.reset();
    checkinControl.value = existing?.control ?? currentRating(data);
    checkinControlOutput.textContent = checkinControl.value;
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
    if (!state || !mission) {
      checkinStatus.textContent = 'Choose the operating state and mission status.';
      return;
    }
    const entry = {
      date: todayKey(),
      day: sprintDay(data),
      state,
      mission,
      control: clampRating(checkinControl.value),
      note: cleanText(checkinForm.elements.note.value)
    };
    const existingIndex = data.checkins.findIndex(item => item.date === entry.date);
    if (existingIndex >= 0) data.checkins[existingIndex] = entry;
    else data.checkins.push(entry);
    data.checkins.sort((a, b) => a.date.localeCompare(b.date));
    if (!save(data)) {
      checkinStatus.textContent = 'Could not save locally. Nothing was sent.';
      return;
    }
    track('sprint_checkin');
    checkinForm.hidden = true;
    renderActive();
    active.focus();
  });

  const missionCounts = items => items.reduce((counts, item) => {
    counts[item.mission] = (counts[item.mission] || 0) + 1;
    return counts;
  }, { completed: 0, changed: 0, not_completed: 0 });
  const signedDelta = value => value > 0 ? `+${value}` : String(value);
  const buildSummaryText = () => {
    const final = currentRating(data);
    const delta = final - data.baseline;
    const counts = missionCounts(data.checkins);
    return `EXIT OS — 30-DAY CONTROL SPRINT\nDay 0 control: ${data.baseline}/10\nDay 30 control: ${final}/10\nChange: ${signedDelta(delta)}\nEvidence: ${data.checkins.length}/30 check-ins\nMissions: ${counts.completed} completed, ${counts.changed} changed deliberately, ${counts.not_completed} not completed\n\nACTIVE CONSTRAINT\n${data.constraint}\n\nDAY 30 OUTCOME\n${data.outcome}\n\nPROTECTED BASE\n${data.protect}\n\nThe sprint records evidence. Missing days remain missing rather than being treated as failure.`;
  };
  const renderSummary = () => {
    const final = currentRating(data);
    const delta = final - data.baseline;
    const counts = missionCounts(data.checkins);
    document.querySelector('[data-summary-baseline]').textContent = data.baseline;
    document.querySelector('[data-summary-final]').textContent = final;
    document.querySelector('[data-summary-delta]').textContent = `${signedDelta(delta)} points`;
    document.querySelector('[data-summary-checkins]').textContent = data.checkins.length;
    document.querySelector('[data-summary-missions]').textContent = `${counts.completed} completed / ${counts.changed} changed / ${counts.not_completed} not completed`;
    document.querySelector('[data-summary-missing]').textContent = `${Math.max(0, 30 - data.checkins.length)} days`;
    document.querySelector('[data-summary-constraint]').textContent = data.constraint;
    document.querySelector('[data-summary-outcome]').textContent = data.outcome;
    document.querySelector('[data-summary-protect]').textContent = data.protect;
    const direction = delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'was unchanged';
    document.querySelector('[data-summary-text]').textContent = `Recorded control ${direction} from ${data.baseline}/10 to ${final}/10 across ${data.checkins.length} check-ins. Keep the evidence. Do not turn one sprint into a global judgment about yourself or the system.`;
  };

  completeSprint.addEventListener('click', () => {
    if (sprintDay(data) < 30 || !todayCheckin(data)) return;
    data.completedAt = todayKey();
    if (!save(data)) return;
    track('sprint_day30_complete');
    render();
    summary.focus();
  });
  document.querySelector('[data-summary-copy]').addEventListener('click', async () => {
    const status = document.querySelector('[data-summary-status]');
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      status.textContent = 'Sprint summary copied.';
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
    if (!data) return;
    if (data.completedAt) {
      renderSummary();
      summary.hidden = false;
    } else {
      renderActive();
      active.hidden = false;
    }
  };

  render();
  track('sprint_view');
})();
