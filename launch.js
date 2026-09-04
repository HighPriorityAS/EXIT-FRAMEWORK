(() => {
  const config = window.EXIT_LAUNCH_CONFIG || {};
  const stripe = config.stripe || {};
  const crm = config.crm || {};

  document.querySelectorAll('[data-founder-price]').forEach((el) => {
    if (config.founderPriceLabel) el.textContent = config.founderPriceLabel;
  });

  document.querySelectorAll('[data-checkout="founder"]').forEach((link) => {
    if (stripe.founderPaymentLink) {
      link.href = stripe.founderPaymentLink;
      link.removeAttribute('aria-disabled');
      link.textContent = 'Secure founder access →';
      link.rel = 'noopener';
    }
  });

  const labels = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn'
  };
  const glyphs = {
    instagram: '◎',
    youtube: '▶',
    tiktok: '♪',
    linkedin: 'in'
  };
  document.querySelectorAll('[data-social-links]').forEach((container) => {
    Object.entries(config.social || {}).forEach(([key, url]) => {
      if (!url || !labels[key]) return;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', labels[key]);
      a.title = labels[key];
      a.textContent = glyphs[key] || labels[key].slice(0, 1);
      container.appendChild(a);
    });
    if (!container.children.length) container.hidden = true;
  });

  const reserve = (type) => {
    const form = document.querySelector('[data-founder-form]');
    if (!form) return;
    const interest = form.querySelector('[data-drop-interest]');
    const status = form.querySelector('[data-form-status]');
    const email = form.querySelector('input[type="email"]');
    if (interest) interest.value = type;
    if (status) status.textContent = `Founder ${type} interest selected. Add your email to reserve priority notice.`;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => email?.focus(), 450);
  };
  document.querySelectorAll('[data-reserve]').forEach((button) => {
    button.addEventListener('click', () => reserve(button.dataset.reserve));
  });

  document.querySelectorAll('[data-founder-form]').forEach((form) => {
    const status = form.querySelector('[data-form-status]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!crm.endpoint) {
        if (status) status.textContent = 'CRM connection is not live yet. Opening the founder launch list instead.';
        if (crm.fallbackUrl) location.href = crm.fallbackUrl;
        return;
      }
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        const response = await fetch(crm.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, source: 'Founder 100', timestamp: new Date().toISOString() })
        });
        if (!response.ok) throw new Error('CRM request failed');
        form.reset();
        if (status) status.textContent = 'Recorded. Founder launch updates are on the way.';
      } catch (_) {
        if (status) status.textContent = 'Could not record the request. Please use the launch list instead.';
        if (crm.fallbackUrl) setTimeout(() => { location.href = crm.fallbackUrl; }, 900);
      }
    });
  });
})();
