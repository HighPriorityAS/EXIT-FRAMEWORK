(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }));
  }

  const video = document.getElementById('vortex-video');
  const media = document.querySelector('.hero-media');
  if (!video || !media) return;

  const ready = () => media.classList.add('video-ready');
  video.addEventListener('loadeddata', ready, { once: true });
  video.addEventListener('canplay', ready, { once: true });
  video.addEventListener('error', ready, { once: true });
  if (video.readyState >= 2) ready();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    if (reduced.matches) video.pause();
    else video.play().catch(() => {});
  };
  reduced.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', () => document.hidden ? video.pause() : sync());
  sync();
})();
