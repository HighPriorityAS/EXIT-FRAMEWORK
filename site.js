/* Navigation and lightweight interaction only. Artwork and page content are declared in HTML. */
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const close = (restoreFocus = false) => {
    if (!menu || !toggle) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    if (restoreFocus) toggle.focus();
  };
  if (toggle && menu) {
    menu.querySelectorAll('a').forEach(link => {
      link.style.border = '1px solid var(--amber)';
      link.style.padding = '13px 15px';
      link.style.margin = '3px 0';
    });
    toggle.addEventListener('click', () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) close(true);
    });
    document.addEventListener('click', event => {
      if (!menu.hidden && !event.target.closest('.site-header')) close();
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
  }
  document.querySelectorAll('[data-reserve]').forEach(button => {
    button.addEventListener('click', () => {
      const notice = document.querySelector('[data-form-status]');
      if (!notice) return;
      notice.textContent = `${button.dataset.reserve}: reservations are not open yet. No details have been submitted.`;
      const link = document.querySelector('#launch-updates a');
      link?.focus();
      link?.scrollIntoView({block: 'center', behavior: 'instant'});
    });
  });
})();
