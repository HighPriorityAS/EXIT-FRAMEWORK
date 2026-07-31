(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');

  if (toggle && menu) {
    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      menu.hidden = true;
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      menu.hidden = open;
    });

    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    addEventListener('resize', () => { if (innerWidth > 860) closeMenu(); }, { passive: true });
  }

  const canvas = document.getElementById('vortex-canvas');
  const image = document.getElementById('hero-art');
  const hero = document.querySelector('.hero');
  if (!canvas || !image || !hero) return;

  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!context) return;

  const TAU = Math.PI * 2;
  const LOOP_MS = 18000;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = matchMedia('(max-width: 860px)');
  let width = 1;
  let height = 1;
  let dpr = 1;
  let running = true;
  let inView = true;
  let frame = 0;
  let lastFrame = 0;

  const fract = (value) => value - Math.floor(value);
  const seeded = (index, salt = 0) => fract(Math.sin(index * 91.733 + salt * 17.17) * 43758.5453);
  const particles = Array.from({ length: 96 }, (_, index) => ({
    seed: seeded(index, 1),
    angle: seeded(index, 2) * TAU,
    size: 0.45 + seeded(index, 3) * 1.35,
    turn: 2 + Math.floor(seeded(index, 4) * 3),
    lane: 0.72 + seeded(index, 5) * 0.38,
    warm: seeded(index, 6)
  }));

  function mappedCenter() {
    const mobile = mobileQuery.matches;
    const sourceX = mobile ? 0.525 : 0.664;
    const sourceY = mobile ? 0.625 : 0.545;
    const naturalWidth = image.naturalWidth || (mobile ? 941 : 1672);
    const naturalHeight = image.naturalHeight || (mobile ? 1672 : 941);
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    return {
      x: (width - renderedWidth) / 2 + renderedWidth * sourceX,
      y: (height - renderedHeight) / 2 + renderedHeight * sourceY,
      radius: Math.min(renderedWidth, renderedHeight) * (mobile ? 0.31 : 0.39)
    };
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(devicePixelRatio || 1, mobileQuery.matches ? 1.45 : 1.8);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawOrbit(center, progress, index) {
    const direction = index % 2 ? -1 : 1;
    const rotation = progress * TAU * direction + index * 0.82;
    const radius = center.radius * (0.32 + index * 0.085);
    const arcLength = 0.34 + index * 0.045;
    context.save();
    context.translate(center.x, center.y);
    context.rotate(rotation);
    context.scale(1, 0.72);
    context.beginPath();
    context.arc(0, 0, radius, -arcLength, arcLength);
    context.strokeStyle = `rgba(238, 194, 109, ${0.06 + index * 0.012})`;
    context.lineWidth = 0.7 + index * 0.08;
    context.lineCap = 'round';
    context.stroke();
    context.restore();
  }

  function drawParticle(center, progress, particle, index) {
    const cycle = index % 7 === 0 ? 2 : 1;
    const phase = fract(particle.seed + progress * cycle);
    const fade = Math.pow(Math.sin(Math.PI * phase), 1.7);
    if (fade < 0.02) return;

    const outer = center.radius * particle.lane;
    const radius = outer * (1 - phase * 0.9);
    const angle = particle.angle + particle.turn * TAU * phase + progress * TAU;
    const ellipse = mobileQuery.matches ? 0.82 : 0.68;
    const wobble = Math.sin(angle * 2.3 + particle.seed * TAU) * center.radius * 0.012 * (1 - phase);
    const x = center.x + Math.cos(angle) * radius + wobble;
    const y = center.y + Math.sin(angle) * radius * ellipse;
    const trailAngle = angle - 0.045;
    const trailRadius = radius + center.radius * 0.018;
    const tx = center.x + Math.cos(trailAngle) * trailRadius;
    const ty = center.y + Math.sin(trailAngle) * trailRadius * ellipse;
    const alpha = fade * (0.16 + particle.warm * 0.46);

    const gradient = context.createLinearGradient(tx, ty, x, y);
    gradient.addColorStop(0, 'rgba(215,161,72,0)');
    gradient.addColorStop(1, `rgba(252,237,204,${alpha})`);
    context.beginPath();
    context.moveTo(tx, ty);
    context.lineTo(x, y);
    context.strokeStyle = gradient;
    context.lineWidth = particle.size;
    context.lineCap = 'round';
    context.stroke();

    context.beginPath();
    context.arc(x, y, particle.size * 0.7, 0, TAU);
    context.fillStyle = `rgba(238,194,109,${Math.min(0.72, alpha + 0.08)})`;
    context.fill();
  }

  function drawGeometryPulse(center, progress) {
    const radius = center.radius * 0.58;
    for (let index = 0; index < 7; index += 1) {
      const angle = -0.7 + index * 0.24;
      const pulse = 0.5 + 0.5 * Math.sin(TAU * progress + index * 0.9);
      const x = center.x + Math.cos(angle) * radius * (1.02 + index * 0.025);
      const y = center.y + Math.sin(angle) * radius * 0.72;
      context.beginPath();
      context.arc(x, y, 1.2 + pulse * 1.4, 0, TAU);
      context.fillStyle = `rgba(238,194,109,${0.08 + pulse * 0.16})`;
      context.fill();
    }
  }

  function render(now) {
    if (!running || !inView) return;
    const targetInterval = mobileQuery.matches ? 1000 / 30 : 1000 / 60;
    if (now - lastFrame < targetInterval) {
      frame = requestAnimationFrame(render);
      return;
    }
    lastFrame = now;
    const progress = reducedMotion.matches ? 0.32 : (now % LOOP_MS) / LOOP_MS;
    const center = mappedCenter();
    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = 'screen';
    for (let index = 0; index < 6; index += 1) drawOrbit(center, progress, index);
    const count = mobileQuery.matches ? 54 : particles.length;
    for (let index = 0; index < count; index += 1) drawParticle(center, progress, particles[index], index);
    drawGeometryPulse(center, progress);
    context.restore();
    if (!reducedMotion.matches) frame = requestAnimationFrame(render);
  }

  function restart() {
    cancelAnimationFrame(frame);
    running = !document.hidden;
    if (running && inView) frame = requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(() => { resize(); restart(); });
  resizeObserver.observe(hero);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    restart();
  }, { threshold: 0.02 });
  visibilityObserver.observe(hero);
  document.addEventListener('visibilitychange', restart);
  reducedMotion.addEventListener?.('change', restart);
  mobileQuery.addEventListener?.('change', () => { resize(); restart(); });
  image.addEventListener('load', () => { resize(); restart(); });
  resize();
  restart();
})();
