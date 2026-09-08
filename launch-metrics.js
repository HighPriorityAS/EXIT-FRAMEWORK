/* Privacy-first measurement hooks for the Post #001 -> Chaos Audit launch loop.
   No provider is configured here and no audit answers or result categories are sent.
   If a production analytics provider is added later, it can consume these event names. */
(() => {
  const allowed = new Set([
    'post001_view',
    'post001_audit_click',
    'audit_view',
    'audit_start',
    'audit_step_complete',
    'audit_complete',
    'result_view',
    'email_continue',
    'audit_restart'
  ]);

  const track = (eventName, meta = {}) => {
    if (!allowed.has(eventName)) return;

    const payload = {
      event: `exit_${eventName}`,
      surface: 'post001_chaos_audit',
      version: 1,
      ...meta
    };

    // Local application hook. Does not transmit data by itself.
    window.dispatchEvent(new CustomEvent('exit:metric', { detail: payload }));

    // Adapter hooks: inert unless a provider is deliberately configured elsewhere.
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    if (typeof window.plausible === 'function') {
      window.plausible(payload.event, { props: { surface: payload.surface } });
    }
  };

  window.ExitMetrics = Object.freeze({ track });
})();
