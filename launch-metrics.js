/* Privacy-first measurement hooks for the Post #001 -> Chaos Audit -> Exit OS launch loop.
   No provider is configured here and no audit or MVD answers are sent.
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
    'audit_restart',
    'audit_mvd_continue',
    'mvd_view',
    'mvd_start',
    'mvd_step_complete',
    'mvd_complete',
    'mvd_result_view',
    'mvd_copy',
    'mvd_restart'
  ]);

  const track = (eventName, meta = {}) => {
    if (!allowed.has(eventName)) return;

    const payload = {
      event: `exit_${eventName}`,
      surface: 'post001_exit_os',
      version: 2,
      ...meta
    };

    window.dispatchEvent(new CustomEvent('exit:metric', { detail: payload }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    if (typeof window.plausible === 'function') {
      window.plausible(payload.event, { props: { surface: payload.surface } });
    }
  };

  window.ExitMetrics = Object.freeze({ track });
})();
