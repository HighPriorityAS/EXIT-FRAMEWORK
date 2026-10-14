(() => {
  const KEY = 'exit_monetization_sprint_v0';
  const VERSION = 1;
  const empty = document.querySelector('[data-ms-empty]');
  const setup = document.querySelector('[data-ms-setup]');
  const runtime = document.querySelector('[data-ms-runtime]');
  const summary = document.querySelector('[data-ms-summary]');
  if (!empty || !setup || !runtime || !summary) return;

  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];
  const clean = value => String(value || '').trim();
  const money = value => 'NOK ' + new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Number(value) || 0);
  const todayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };
  const utcDay = key => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const elapsedDays = (start, end) => Math.floor((utcDay(end) - utcDay(start)) / 86400000);
  const sprintDay = state => Math.min(7, Math.max(1, elapsedDays(state.startedAt, todayKey()) + 1));
  const uid = prefix => prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

  const load = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!parsed || parsed.version !== VERSION || !parsed.startedAt) return null;
      parsed.experiments = Array.isArray(parsed.experiments) ? parsed.experiments : [];
      parsed.evidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
      return parsed;
    } catch {
      return null;
    }
  };
  const save = state => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  };

  let data = load();
  const activeExperiment = state => [...state.experiments].reverse().find(item => item.status === 'active') || null;
  const closedExperiments = state => state.experiments.filter(item => item.status === 'closed');
  const sumType = (state, type) => state.evidence.filter(item => item.type === type).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const totalRevenue = state => state.evidence.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const commercialSignal = state => {
    const purchases = sumType(state, 'purchase');
    const revenue = totalRevenue(state);
    const checkouts = sumType(state, 'checkout_started');
    const conversations = sumType(state, 'qualified_conversation');
    if (purchases > 0 || revenue > 0) return 'PAID SIGNAL';
    if (checkouts > 0) return 'CHECKOUT INTENT';
    if (conversations > 0) return 'QUALIFIED INTEREST';
    if (state.evidence.length > 0) return 'EVIDENCE, NO PAYMENT SIGNAL';
    return 'NO COMMERCIAL SIGNAL YET';
  };

  const hideForms = () => {
    qa('[data-ms-experiment-form],[data-ms-evidence-form],[data-ms-exp-decision-form],[data-ms-final-form]').forEach(el => { el.hidden = true; });
  };

  const renderLedger = state => {
    const list = q('[data-ms-ledger-list]');
    const emptyLedger = q('[data-ms-ledger-empty]');
    list.innerHTML = '';
    emptyLedger.hidden = state.evidence.length > 0;
    [...state.evidence].reverse().forEach(item => {
      const row = document.createElement('article');
      row.className = 'ms-ledger-entry';
      const date = document.createElement('time');
      date.dateTime = item.date;
      date.textContent = item.date;
      const type = document.createElement('div');
      type.className = 'ms-ledger-type';
      type.textContent = item.type.replaceAll('_', ' ');
      const body = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = item.note;
      const meta = document.createElement('p');
      meta.className = 'ms-ledger-meta';
      const pieces = [item.count + ' signal' + (Number(item.count) === 1 ? '' : 's')];
      if (Number(item.revenue) > 0) pieces.push(money(item.revenue));
      if (item.source) pieces.push(item.source);
      meta.textContent = pieces.join(' · ');
      body.append(title, meta);
      row.append(date, type, body);
      list.append(row);
    });
  };

  const renderExperiment = state => {
    const exp = activeExperiment(state);
    const card = q('[data-ms-experiment-card]');
    const none = q('[data-ms-no-experiment]');
    card.hidden = !exp;
    none.hidden = Boolean(exp);
    q('[data-ms-experiment-open]').hidden = Boolean(exp);
    if (!exp) {
      q('[data-ms-experiment-title]').textContent = closedExperiments(state).length ? 'No active experiment.' : 'No experiment defined.';
      return;
    }
    q('[data-ms-experiment-title]').textContent = 'Experiment active.';
    q('[data-ms-exp-hypothesis]').textContent = exp.hypothesis;
    q('[data-ms-exp-action]').textContent = exp.action;
    q('[data-ms-exp-signal]').textContent = exp.successSignal;
    q('[data-ms-next-action]').textContent = state.evidence.some(item => item.experimentId === exp.id)
      ? 'Inspect the evidence. Continue only if the next action can change the decision.'
      : exp.action;
  };

  const renderRuntime = state => {
    const day = sprintDay(state);
    q('[data-ms-day]').textContent = 'Day ' + day + ' / 7';
    q('[data-ms-days-left]').textContent = day >= 7 ? 'Decision day' : (8 - day) + ' days left';
    q('[data-ms-signal]').textContent = commercialSignal(state) + '.';
    q('[data-ms-offer-out]').textContent = state.offer;
    q('[data-ms-customer-out]').textContent = state.customer;
    q('[data-ms-thesis-out]').textContent = state.thesis;
    q('[data-ms-constraint-out]').textContent = state.constraint;
    q('[data-ms-threshold-out]').textContent = state.threshold;
    q('[data-ms-guardrail-out]').textContent = state.guardrail;
    q('[data-ms-purchases]').textContent = sumType(state, 'purchase');
    q('[data-ms-revenue]').textContent = money(totalRevenue(state));
    q('[data-ms-checkouts]').textContent = sumType(state, 'checkout_started');
    q('[data-ms-conversations]').textContent = sumType(state, 'qualified_conversation');
    q('[data-ms-objections]').textContent = sumType(state, 'objection');
    const finalOpen = q('[data-ms-final-open]');
    finalOpen.disabled = state.evidence.length < 1;
    q('[data-ms-gate-note]').textContent = state.evidence.length < 1
      ? 'Log at least one piece of evidence before closing the sprint. Day 7 is the default decision point; a decisive signal can justify stopping earlier.'
      : (day >= 7 ? 'Decision day. Do not extend the sprint by default. Decide from the evidence.' : 'A decision can be recorded now if the evidence is already decisive. Otherwise keep the experiment bounded.');
    renderExperiment(state);
    renderLedger(state);
  };

  const renderSummary = state => {
    const decision = state.finalDecision;
    q('[data-ms-summary-decision]').textContent = decision.decision + ' — ' + state.offer;
    q('[data-ms-summary-signal]').textContent = commercialSignal(state);
    q('[data-ms-summary-reality]').textContent = decision.reality;
    q('[data-ms-summary-rationale]').textContent = decision.rationale;
    q('[data-ms-summary-next]').textContent = decision.nextMove;
    q('[data-ms-summary-thesis]').textContent = state.thesis;
    q('[data-ms-summary-threshold]').textContent = state.threshold;
    q('[data-ms-summary-purchases]').textContent = sumType(state, 'purchase');
    q('[data-ms-summary-revenue]').textContent = money(totalRevenue(state));
    q('[data-ms-summary-evidence]').textContent = state.evidence.length;
    q('[data-ms-summary-experiments]').textContent = closedExperiments(state).length;
  };

  const render = () => {
    data = load();
    hideForms();
    if (!data) {
      empty.hidden = false;
      setup.hidden = true;
      runtime.hidden = true;
      summary.hidden = true;
      return;
    }
    empty.hidden = true;
    setup.hidden = true;
    if (data.finalDecision) {
      runtime.hidden = true;
      summary.hidden = false;
      renderSummary(data);
      summary.focus({ preventScroll: true });
      return;
    }
    summary.hidden = true;
    runtime.hidden = false;
    renderRuntime(data);
    runtime.focus({ preventScroll: true });
  };

  const fillSaksfremgang = () => {
    setup.hidden = false;
    empty.hidden = true;
    setup.elements.offer.value = 'Saksfremgang — full NAV case analysis';
    setup.elements.customer.value = 'People with a NAV decision who need to understand the case and choose the next action';
    setup.elements.thesis.value = 'People arriving with a high-intent NAV problem will pay NOK 499 for a source-grounded analysis and one recommended next action.';
    setup.elements.constraint.value = 'No confirmed willingness-to-pay signal from non-personal traffic yet';
    setup.elements.threshold.value = 'At least 1 confirmed NOK 499 purchase from non-personal traffic';
    setup.elements.guardrail.value = '7 days · max NOK 1,000 paid search · no major product expansion';
    setup.elements.offer.focus();
  };

  q('[data-ms-setup-open]').addEventListener('click', () => {
    empty.hidden = true;
    setup.hidden = false;
    setup.elements.offer.focus();
  });
  q('[data-ms-seed-saksfremgang]').addEventListener('click', fillSaksfremgang);
  q('[data-ms-setup-cancel]').addEventListener('click', () => {
    setup.hidden = true;
    empty.hidden = false;
    q('[data-ms-setup-open]').focus();
  });

  setup.addEventListener('submit', event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(setup).entries());
    const required = ['offer','customer','thesis','constraint','threshold','guardrail'];
    if (required.some(name => !clean(fields[name]))) {
      q('[data-ms-setup-status]').textContent = 'Complete the six baseline fields.';
      return;
    }
    const state = {
      version: VERSION,
      startedAt: todayKey(),
      offer: clean(fields.offer),
      customer: clean(fields.customer),
      thesis: clean(fields.thesis),
      constraint: clean(fields.constraint),
      threshold: clean(fields.threshold),
      guardrail: clean(fields.guardrail),
      experiments: [],
      evidence: [],
      finalDecision: null
    };
    if (!save(state)) {
      q('[data-ms-setup-status]').textContent = 'Could not save locally. Nothing was sent.';
      return;
    }
    render();
  });

  const expForm = q('[data-ms-experiment-form]');
  const openExp = () => {
    hideForms();
    expForm.hidden = false;
    expForm.reset();
    q('[data-ms-exp-status]').textContent = '';
    expForm.elements.hypothesis.focus();
    expForm.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  q('[data-ms-experiment-open]').addEventListener('click', openExp);
  q('[data-ms-exp-cancel]').addEventListener('click', () => { expForm.hidden = true; });

  expForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(expForm).entries());
    if (![fields.hypothesis, fields.action, fields.successSignal].every(clean)) {
      q('[data-ms-exp-status]').textContent = 'Define the hypothesis, bounded action and success signal.';
      return;
    }
    const fresh = load();
    if (!fresh || activeExperiment(fresh)) return;
    fresh.experiments.push({
      id: uid('exp'),
      createdAt: todayKey(),
      hypothesis: clean(fields.hypothesis),
      action: clean(fields.action),
      successSignal: clean(fields.successSignal),
      status: 'active'
    });
    if (!save(fresh)) {
      q('[data-ms-exp-status]').textContent = 'Could not save locally.';
      return;
    }
    render();
  });

  const evidenceForm = q('[data-ms-evidence-form]');
  const openEvidence = () => {
    hideForms();
    evidenceForm.hidden = false;
    evidenceForm.reset();
    evidenceForm.elements.count.value = 1;
    evidenceForm.elements.revenue.value = 0;
    q('[data-ms-evidence-status]').textContent = '';
    evidenceForm.querySelector('input[name="type"]').focus();
    evidenceForm.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  q('[data-ms-evidence-open]').addEventListener('click', openEvidence);
  q('[data-ms-evidence-open-secondary]').addEventListener('click', openEvidence);
  q('[data-ms-evidence-cancel]').addEventListener('click', () => { evidenceForm.hidden = true; });

  evidenceForm.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(evidenceForm);
    const type = clean(formData.get('type'));
    const count = Math.max(1, Number(formData.get('count')) || 1);
    const revenue = Math.max(0, Number(formData.get('revenue')) || 0);
    const note = clean(formData.get('note'));
    if (!type || !note) {
      q('[data-ms-evidence-status]').textContent = 'Choose an evidence type and record what actually happened.';
      return;
    }
    const fresh = load();
    const exp = activeExperiment(fresh);
    fresh.evidence.push({
      id: uid('ev'),
      date: todayKey(),
      experimentId: exp?.id || null,
      type,
      count,
      revenue,
      source: clean(formData.get('source')),
      note
    });
    if (!save(fresh)) {
      q('[data-ms-evidence-status]').textContent = 'Could not save locally.';
      return;
    }
    render();
  });

  const decisionForm = q('[data-ms-exp-decision-form]');
  q('[data-ms-exp-decision-open]').addEventListener('click', () => {
    hideForms();
    decisionForm.hidden = false;
    decisionForm.reset();
    q('[data-ms-exp-decision-status]').textContent = '';
    decisionForm.querySelector('input[name="decision"]').focus();
    decisionForm.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  q('[data-ms-exp-decision-cancel]').addEventListener('click', () => { decisionForm.hidden = true; });

  decisionForm.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(decisionForm);
    const decision = clean(formData.get('decision'));
    const rationale = clean(formData.get('rationale'));
    if (!decision || !rationale) {
      q('[data-ms-exp-decision-status]').textContent = 'Choose a decision and cite the evidence.';
      return;
    }
    const fresh = load();
    const exp = activeExperiment(fresh);
    if (!exp) return;
    exp.status = 'closed';
    exp.closedAt = todayKey();
    exp.decision = decision;
    exp.rationale = rationale;
    if (!save(fresh)) {
      q('[data-ms-exp-decision-status]').textContent = 'Could not save locally.';
      return;
    }
    render();
  });

  const finalForm = q('[data-ms-final-form]');
  q('[data-ms-final-open]').addEventListener('click', () => {
    if (!data || data.evidence.length < 1) return;
    hideForms();
    finalForm.hidden = false;
    finalForm.reset();
    q('[data-ms-final-status]').textContent = '';
    finalForm.elements.reality.focus();
    finalForm.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  q('[data-ms-final-cancel]').addEventListener('click', () => { finalForm.hidden = true; });

  finalForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(finalForm).entries());
    if (![fields.reality, fields.decision, fields.rationale, fields.nextMove].every(clean)) {
      q('[data-ms-final-status]').textContent = 'Record reality, decision, rationale and one next move.';
      return;
    }
    const fresh = load();
    fresh.finalDecision = {
      date: todayKey(),
      reality: clean(fields.reality),
      decision: clean(fields.decision),
      rationale: clean(fields.rationale),
      nextMove: clean(fields.nextMove)
    };
    if (!save(fresh)) {
      q('[data-ms-final-status]').textContent = 'Could not save locally.';
      return;
    }
    render();
  });

  const reset = () => {
    if (!window.confirm('Erase the local Monetization Sprint and its evidence ledger?')) return;
    localStorage.removeItem(KEY);
    render();
  };
  qa('[data-ms-reset]').forEach(button => button.addEventListener('click', reset));

  q('[data-ms-copy]').addEventListener('click', async () => {
    const state = load();
    if (!state?.finalDecision) return;
    const lines = [
      'EXIT MONETIZATION SPRINT v0',
      '',
      'Offer: ' + state.offer,
      'Customer: ' + state.customer,
      'Original thesis: ' + state.thesis,
      'Constraint: ' + state.constraint,
      'Success threshold: ' + state.threshold,
      'Guardrail: ' + state.guardrail,
      '',
      'Commercial signal: ' + commercialSignal(state),
      'Purchases: ' + sumType(state, 'purchase'),
      'Revenue: ' + money(totalRevenue(state)),
      'Checkout starts: ' + sumType(state, 'checkout_started'),
      'Qualified conversations: ' + sumType(state, 'qualified_conversation'),
      'Objections: ' + sumType(state, 'objection'),
      'Evidence entries: ' + state.evidence.length,
      '',
      'FINAL DECISION: ' + state.finalDecision.decision,
      'Reality: ' + state.finalDecision.reality,
      'Rationale: ' + state.finalDecision.rationale,
      'Next move: ' + state.finalDecision.nextMove
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      q('[data-ms-copy-status]').textContent = 'Sprint record copied.';
    } catch {
      q('[data-ms-copy-status]').textContent = 'Clipboard access was blocked by this browser.';
    }
  });

  window.addEventListener('storage', event => {
    if (event.key === KEY) render();
  });

  render();
})();