(() => {
  const intro = document.querySelector('[data-audit-intro]');
  const form = document.querySelector('[data-audit-form]');
  const result = document.querySelector('[data-audit-result]');
  if (!intro || !form || !result) return;

  const steps = [...form.querySelectorAll('[data-audit-step]')];
  const start = document.querySelector('[data-audit-start]');
  const next = document.querySelector('[data-audit-next]');
  const back = document.querySelector('[data-audit-back]');
  const restart = document.querySelector('[data-audit-restart]');
  const progress = document.querySelector('[data-audit-progress]');
  const fill = document.querySelector('[data-audit-progress-fill]');
  const status = document.querySelector('[data-audit-status]');
  const emailContinue = document.querySelector('[data-email-continue]');
  const mvdContinue = document.querySelector('[data-mvd-continue]');
  let step = 0;

  const track = (name, meta) => window.ExitMetrics?.track(name, meta);
  const showStep = () => {
    steps.forEach((el, i) => { el.hidden = i !== step; });
    progress.textContent = `${step + 1} / ${steps.length}`;
    fill.style.width = `${((step + 1) / steps.length) * 100}%`;
    back.hidden = step === 0;
    next.textContent = step === steps.length - 1 ? 'See my result →' : 'Next →';
    status.textContent = '';
  };

  const selected = name => form.querySelector(`input[name="${name}"]:checked`)?.value;

  const buildResult = () => {
    const pressure = selected('pressure');
    const overload = Number(selected('overload') || 1);
    const lever = selected('lever');
    const capacity = selected('capacity');
    const need = selected('need');

    const pressureCopy = {
      capacity: ['Capacity instability', 'Your system looks most constrained by basic capacity right now. Protect the base before adding more load.'],
      obligations: ['Open-loop pressure', 'Unfinished practical obligations appear to be creating avoidable drag and background stress.'],
      substance: ['Recovery instability', 'Substance use or recovery pressure appears to be the strongest current source of volatility.'],
      relationships: ['Relationship pressure', 'Conflict, isolation or relationship stress appears to be consuming a large share of available capacity.'],
      environment: ['Environmental instability', 'Your surroundings or practical living conditions appear to be making everything else harder.']
    };

    const actionCopy = {
      rest: ['Protect the base for 24 hours', 'Reduce load. Prioritize the most basic stabilizer you can actually complete: sleep opportunity, food, prescribed medication, hydration or another concrete recovery-supporting action.'],
      task: ['Close one urgent loop', 'Choose the single practical obligation that creates the most downstream pressure. Make the action small enough to finish today.'],
      support: ['Make one safe contact', 'Contact one person or service that can reduce isolation, uncertainty or practical risk. One message or one call is enough.'],
      environment: ['Remove one source of friction', 'Change one part of the environment that makes the unwanted loop easier: remove a trigger, prepare what you need, reduce noise or move one obstacle.']
    };

    const [title, summaryBase] = pressureCopy[pressure] || ['System overload', 'Several parts of life appear to be competing for the same limited capacity.'];
    let summary = summaryBase;
    if (overload === 3) summary += ' Everything feels urgent, so the first objective is reducing volatility rather than adding plans.';
    if (capacity === 'low') summary += ' Your available capacity is low, so the next step should be deliberately small.';
    if (need === 'clarity') summary += ' Clarity matters more than volume right now.';

    const [action, detail] = actionCopy[lever] || actionCopy.task;
    result.querySelector('[data-result-title]').textContent = title;
    result.querySelector('[data-result-summary]').textContent = summary;
    result.querySelector('[data-result-action]').textContent = action;
    result.querySelector('[data-result-detail]').textContent = detail;
  };

  start.addEventListener('click', () => {
    intro.hidden = true;
    form.hidden = false;
    showStep();
    steps[0].querySelector('input')?.focus();
    track('audit_start');
  });

  next.addEventListener('click', () => {
    const fieldset = steps[step];
    const checked = fieldset.querySelector('input:checked');
    if (!checked) {
      status.textContent = 'Choose the option that feels closest. There is no perfect answer.';
      fieldset.querySelector('input')?.focus();
      return;
    }
    track('audit_step_complete', { step: step + 1 });
    if (step < steps.length - 1) {
      step += 1;
      showStep();
      steps[step].querySelector('input')?.focus();
      return;
    }
    buildResult();
    form.hidden = true;
    result.hidden = false;
    result.focus();
    track('audit_complete');
    track('result_view');
  });

  back.addEventListener('click', () => {
    if (step > 0) step -= 1;
    showStep();
  });

  restart.addEventListener('click', () => {
    form.reset();
    step = 0;
    result.hidden = true;
    form.hidden = false;
    showStep();
    steps[0].querySelector('input')?.focus();
    track('audit_restart');
  });

  emailContinue?.addEventListener('click', () => track('email_continue'));
  mvdContinue?.addEventListener('click', () => track('audit_mvd_continue'));
  track('audit_view');
})();
