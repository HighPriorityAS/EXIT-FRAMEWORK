(() => {
  const api = window.ExitState;
  if (!api) return;

  const SUPABASE_URL = 'https://zilokqeajexkoewzgywf.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OUxMuJf45lZb2JUUBPRPaQ_cO6ZNeZ0';
  const SUPABASE_VERSION = '2.116.0';

  const signedOut = document.querySelector('[data-dl-signed-out]');
  const appSections = [...document.querySelectorAll('[data-dl-app]')];
  const form = document.querySelector('[data-dl-capture-form]');
  const status = document.querySelector('[data-dl-capture-status]');
  const confidence = document.querySelector('[data-dl-confidence]');
  const confidenceOutput = document.querySelector('[data-dl-confidence-output]');
  const reviewList = document.querySelector('[data-dl-review-list]');
  const history = document.querySelector('[data-dl-history]');
  const countOut = document.querySelector('[data-dl-count]');
  const dueOut = document.querySelector('[data-dl-due-count]');
  const reviewedOut = document.querySelector('[data-dl-reviewed-count]');
  const refreshButton = document.querySelector('[data-dl-refresh]');

  let client = null;
  let session = null;

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const lines = value => String(value || '').split('\n').map(v => v.trim()).filter(Boolean);

  const isoEndOfDay = value => {
    const date = new Date(value + 'T17:00:00');
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  const formatDate = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(date);
  };

  const daysFromNow = days => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0,10);
  };

  const setDefaultReviewDate = () => {
    const input = form?.elements.review_due_at;
    if (input && !input.value) input.value = daysFromNow(7);
  };

  const importClient = async () => {
    const mod = await import(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_VERSION}/+esm`);
    return mod.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  };

  const renderAuth = () => {
    const active = Boolean(session?.user);
    signedOut.hidden = active;
    appSections.forEach(section => section.hidden = !active);
  };

  const loadSession = async () => {
    await api.ready;
    client = await importClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    session = data?.session || null;
    client.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession;
      renderAuth();
      if (session?.user) void refreshAll();
    });
    renderAuth();
  };

  const fetchMetrics = async () => {
    if (!session?.user) return;
    const userId = session.user.id;
    const [all, due, reviewed] = await Promise.all([
      client.from('dl_decisions').select('id',{count:'exact',head:true}).eq('user_id',userId),
      client.from('dl_due_reviews').select('id',{count:'exact',head:true}).eq('user_id',userId),
      client.from('dl_reviews').select('decision_id',{count:'exact',head:true}).eq('user_id',userId)
    ]);
    countOut.textContent = all.count ?? '—';
    dueOut.textContent = due.count ?? '—';
    reviewedOut.textContent = reviewed.count ?? '—';
  };

  const dueCard = decision => {
    const id = escapeHtml(decision.id);
    return `
      <article class="dl-card" data-review-card="${id}">
        <div class="dl-card-main">
          <div class="dl-card-meta">
            <span class="dl-accent">Due ${escapeHtml(formatDate(decision.review_due_at))}</span>
            <span>${escapeHtml(decision.domain)}</span>
            <span>${escapeHtml(decision.capacity_level)} capacity</span>
          </div>
          <h3>${escapeHtml(decision.title)}</h3>
          <p><strong>Expected:</strong> ${escapeHtml(decision.expected_outcome)}</p>
          <button class="text-link" type="button" data-open-review="${id}">Review outcome →</button>
        </div>
        <div class="dl-confidence-badge">${Math.round(Number(decision.confidence)*100)}%</div>

        <form class="dl-review-form" data-review-form="${id}" hidden>
          <div class="dl-rating-row dl-field-wide">
            <div class="dl-field">
              <label>Decision process quality</label>
              <select name="process_quality" required>
                <option value="5">5 — Strong</option><option value="4">4</option><option value="3" selected>3 — Mixed</option><option value="2">2</option><option value="1">1 — Weak</option>
              </select>
            </div>
            <div class="dl-field">
              <label>Outcome quality</label>
              <select name="outcome_quality" required>
                <option value="5">5 — Strong</option><option value="4">4</option><option value="3" selected>3 — Mixed</option><option value="2">2</option><option value="1">1 — Weak</option>
              </select>
            </div>
          </div>
          <div class="dl-field dl-field-wide">
            <label>What actually happened?</label>
            <textarea name="result_summary" rows="3" required></textarea>
          </div>
          <div class="dl-field dl-field-wide">
            <label>What did we learn? <span>optional</span></label>
            <textarea name="lessons" rows="3"></textarea>
          </div>
          <div class="dl-field">
            <label>Would you repeat this decision?</label>
            <select name="would_repeat">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div class="dl-field">
            <label>Binary prediction resolved?</label>
            <select name="binary_result">
              <option value="">Not binary / unknown</option>
              <option value="true">Yes — happened</option>
              <option value="false">No — did not happen</option>
            </select>
          </div>
          <div class="dl-review-actions dl-field-wide">
            <span class="form-status" data-review-status="${id}"></span>
            <button class="button button-gold" type="submit">Freeze review →</button>
          </div>
        </form>
      </article>`;
  };

  const historyCard = decision => `
    <article class="dl-card">
      <div class="dl-card-main">
        <div class="dl-card-meta">
          <span class="dl-accent">${escapeHtml(formatDate(decision.decision_at))}</span>
          <span>${escapeHtml(decision.domain)}</span>
          <span>${escapeHtml(decision.reversibility)} reversibility</span>
        </div>
        <h3>${escapeHtml(decision.title)}</h3>
        <p>${escapeHtml(decision.decision_text)}</p>
        <p><strong>Expected:</strong> ${escapeHtml(decision.expected_outcome)}</p>
        <span class="dl-source">Source: ${escapeHtml(decision.source_type)}${decision.source_ref ? ' · '+escapeHtml(decision.source_ref) : ''}</span>
      </div>
      <div class="dl-confidence-badge">${Math.round(Number(decision.confidence)*100)}%</div>
    </article>`;

  const loadDueReviews = async () => {
    const { data, error } = await client
      .from('dl_due_reviews')
      .select('*')
      .order('review_due_at',{ascending:true})
      .limit(25);
    if (error) throw error;
    reviewList.innerHTML = data?.length ? data.map(dueCard).join('') : '<p class="dl-empty">Nothing due. Keep collecting reality.</p>';
  };

  const loadHistory = async () => {
    const { data, error } = await client
      .from('dl_decisions')
      .select('id,decision_at,title,domain,decision_text,confidence,expected_outcome,reversibility,source_type,source_ref')
      .order('decision_at',{ascending:false})
      .limit(20);
    if (error) throw error;
    history.innerHTML = data?.length ? data.map(historyCard).join('') : '<p class="dl-empty">No decisions yet. Your first frozen belief starts the dataset.</p>';
  };

  const refreshAll = async () => {
    if (!session?.user) return;
    try {
      await Promise.all([fetchMetrics(),loadDueReviews(),loadHistory()]);
    } catch (error) {
      console.warn('Decision Ledger refresh failed',error);
      reviewList.innerHTML = '<p class="dl-empty">Could not load the ledger right now.</p>';
    }
  };

  confidence?.addEventListener('input',() => {
    confidenceOutput.textContent = `${confidence.value}%`;
  });

  form?.addEventListener('submit',async event => {
    event.preventDefault();
    if (!session?.user || !client) return;
    status.textContent = 'Freezing decision…';
    const fd = new FormData(form);
    const assumptions = lines(fd.get('assumptions')).map(statement => ({ statement, source_type: 'human' }));
    const evidence = lines(fd.get('evidence')).map(claim => ({ claim, phase:'pre', direction:'neutral', source_type:'human' }));
    const alternatives = lines(fd.get('alternatives'));
    const reviewDueAt = isoEndOfDay(String(fd.get('review_due_at') || ''));
    if (!reviewDueAt) {
      status.textContent = 'Choose a valid review date.';
      return;
    }

    const { data, error } = await client.rpc('dl_capture_decision',{
      p_title:String(fd.get('title')||'').trim(),
      p_domain:String(fd.get('domain')||'general'),
      p_objective:String(fd.get('objective')||'').trim() || null,
      p_decision_text:String(fd.get('decision_text')||'').trim(),
      p_alternatives:alternatives,
      p_capacity_level:String(fd.get('capacity')||'unknown'),
      p_reversibility:String(fd.get('reversibility')||'unknown'),
      p_confidence:Number(fd.get('confidence'))/100,
      p_expected_outcome:String(fd.get('expected_outcome')||'').trim(),
      p_review_due_at:reviewDueAt,
      p_stop_condition:String(fd.get('stop_condition')||'').trim() || null,
      p_source_type:String(fd.get('source_type')||'human'),
      p_source_ref:String(fd.get('source_ref')||'').trim() || null,
      p_assumptions:assumptions,
      p_evidence:evidence,
      p_metadata:{capture_surface:'decision-ledger-v0'}
    });

    if (error) {
      console.error(error);
      status.textContent = 'Could not freeze the decision. Nothing partial was saved.';
      return;
    }

    form.reset();
    setDefaultReviewDate();
    confidence.value = '65';
    confidenceOutput.textContent = '65%';
    status.textContent = `Decision frozen · ${String(data).slice(0,8)}`;
    await refreshAll();
  });

  document.addEventListener('click',event => {
    const button = event.target.closest('[data-open-review]');
    if (!button) return;
    const id = button.getAttribute('data-open-review');
    const reviewForm = document.querySelector(`[data-review-form="${CSS.escape(id)}"]`);
    if (reviewForm) {
      reviewForm.hidden = !reviewForm.hidden;
      if (!reviewForm.hidden) reviewForm.querySelector('textarea')?.focus();
    }
  });

  document.addEventListener('submit',async event => {
    const reviewForm = event.target.closest('[data-review-form]');
    if (!reviewForm) return;
    event.preventDefault();
    const id = reviewForm.getAttribute('data-review-form');
    const reviewStatus = document.querySelector(`[data-review-status="${CSS.escape(id)}"]`);
    const fd = new FormData(reviewForm);
    const boolOrNull = value => value === 'true' ? true : value === 'false' ? false : null;
    reviewStatus.textContent = 'Freezing review…';

    const { error } = await client.rpc('dl_submit_review',{
      p_decision_id:id,
      p_process_quality:Number(fd.get('process_quality')),
      p_outcome_quality:Number(fd.get('outcome_quality')),
      p_would_repeat:boolOrNull(fd.get('would_repeat')),
      p_result_summary:String(fd.get('result_summary')||'').trim(),
      p_lessons:String(fd.get('lessons')||'').trim() || null,
      p_binary_result:boolOrNull(fd.get('binary_result')),
      p_source_type:'human_review',
      p_assumption_updates:[],
      p_metadata:{review_surface:'decision-ledger-v0'}
    });

    if (error) {
      console.error(error);
      reviewStatus.textContent = 'Could not save review.';
      return;
    }
    reviewStatus.textContent = 'Review frozen.';
    await refreshAll();
  });

  refreshButton?.addEventListener('click',() => void refreshAll());

  setDefaultReviewDate();
  loadSession()
    .then(() => { if (session?.user) return refreshAll(); })
    .catch(error => {
      console.warn('Decision Ledger unavailable',error);
      signedOut.hidden = false;
      appSections.forEach(section => section.hidden = true);
    });
})();