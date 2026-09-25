/* Legacy compatibility bridge. EXIT Core no longer has a paid conversion funnel. */
(() => {
  const track = (name, meta = {}) => window.ExitMetrics?.track(name, meta);

  document.querySelectorAll('[data-sprint-interest]').forEach(link => {
    link.addEventListener('click', () => {
      track('sprint_interest', { source: link.dataset.source || 'unknown' });
    });
  });

  if (document.body.dataset.surface === 'sprint-access') {
    track('sprint_legacy_access_view');
  }
})();
