/* Privacy-safe paid-conversion bridge. No tool answers or user-entered Sprint data are emitted. */
(() => {
  const cfg = window.EXIT_LAUNCH_CONFIG?.exitOS || {};
  const track = (name, meta = {}) => window.ExitMetrics?.track(name, meta);

  document.querySelectorAll('[data-sprint-interest]').forEach(link => {
    link.addEventListener('click', () => {
      track('sprint_interest', { source: link.dataset.source || 'unknown' });
    });
  });

  document.querySelectorAll('[data-exit-price]').forEach(el => {
    el.textContent = cfg.priceLabel || 'One-time access';
  });

  const checkout = document.querySelector('[data-sprint-checkout]');
  if (checkout) {
    if (cfg.paymentLink) {
      checkout.href = cfg.paymentLink;
      checkout.target = '_blank';
      checkout.rel = 'noopener noreferrer';
    }
    checkout.addEventListener('click', event => {
      track('sprint_checkout_click', { offer: cfg.offer || 'unknown' });
      if (cfg.paymentLink) return;
      event.preventDefault();
      track('sprint_checkout_unavailable', { offer: cfg.offer || 'unknown' });
      const status = document.querySelector('[data-checkout-status]');
      if (status) {
        status.textContent = 'Checkout is not connected yet. The Sprint offer is ready, but no payment is being taken from this page until the verified Stripe Payment Link is connected.';
        status.focus();
      }
    });
  }

  if (document.body.dataset.surface === 'sprint-offer') track('sprint_offer_view', { offer: cfg.offer || 'unknown' });
  if (document.body.dataset.surface === 'sprint-access') track('sprint_access_view', { offer: cfg.offer || 'unknown' });
})();