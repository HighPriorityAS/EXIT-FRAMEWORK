/* Privacy-first measurement hooks for the Post #001 -> Chaos Audit -> Exit OS launch loop.
   No provider is configured here and no audit, MVD, mission or sprint answers are sent.
   If a production analytics provider is added later, it can consume these event names. */
(() => {
  const allowed = new Set([
    'post001_view','post001_audit_click','audit_view','audit_start','audit_step_complete','audit_complete','result_view','email_continue','audit_restart','audit_mvd_continue',
    'mvd_view','mvd_start','mvd_step_complete','mvd_complete','mvd_result_view','mvd_copy','mvd_restart','mvd_mission_continue',
    'mission_view','mission_start','mission_step_complete','mission_complete','mission_result_view','mission_copy','mission_restart',
    'sprint_view','sprint_start','sprint_checkin','sprint_day30_complete','sprint_summary_copy','sprint_reset'
  ]);

  const track = (eventName, meta = {}) => {
    if (!allowed.has(eventName)) return;
    const payload = { event: `exit_${eventName}`, surface: 'post001_exit_os', version: 4, ...meta };
    window.dispatchEvent(new CustomEvent('exit:metric', { detail: payload }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    if (typeof window.plausible === 'function') window.plausible(payload.event, { props: { surface: payload.surface } });
  };

  window.ExitMetrics = Object.freeze({ track });
})();
