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
  const LOOP_MS = 12600;
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
  const particles = Array.from({ length: 168 }, (_, index) => ({
    seed: seeded(index, 1),
    angle: seeded(index, 2) * TAU,
    size: 0.45 + seeded(index, 3) * 1.65,
    turn: 2.1 + seeded(index, 4) * 3.15,
    lane: 0.54 + seeded(index, 5) * 0.58,
    warm: seeded(index, 6),
    speed: 0.72 + seeded(index, 7) * 0.62
  }));

  function mappedCenter() {
    const mobile = mobileQuery.matches;
    const sourceX = mobile ? 0.52 : 0.59;
    const sourceY = mobile ? 0.60 : 0.53;
    const naturalWidth = image.naturalWidth || (mobile ? 941 : 1672);
    const naturalHeight = image.naturalHeight || (mobile ? 1672 : 941);
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    return {
      x: (width - renderedWidth) / 2 + renderedWidth * sourceX,
      y: (height - renderedHeight) / 2 + renderedHeight * sourceY,
      radius: Math.min(renderedWidth, renderedHeight) * (mobile ? 0.34 : 0.43)
    };
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(devicePixelRatio || 1, mobileQuery.matches ? 1.2 : 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawSpiral(center, progress, armIndex) {
    const points = mobileQuery.matches ? 46 : 66;
    const direction = armIndex % 3 === 0 ? -1 : 1;
    const phase = progress * TAU * (0.48 + armIndex * 0.045) * direction + armIndex * 0.82;
    const inner = center.radius * (0.14 + (armIndex % 3) * 0.026);
    const outer = center.radius * (0.72 + (armIndex % 4) * 0.065);
    const turns = 1.22 + armIndex * 0.1;
    context.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const t = index / points;
      const radius = inner + (outer - inner) * Math.pow(t, 0.92);
      const angle = phase + t * TAU * turns;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius * (mobileQuery.matches ? 0.82 : 0.7);
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    const alpha = 0.06 + (armIndex % 4) * 0.025;
    context.strokeStyle = armIndex % 3 === 0 ? `rgba(248,237,215,${alpha + 0.07})` : `rgba(239,196,103,${alpha})`;
    context.lineWidth = 1 + (armIndex % 4) * 0.55;
    context.lineCap = 'round';
    context.stroke();
  }

  function drawOrbit(center, progress, index) {
    const direction = index % 2 ? -1 : 1;
    const rotation = progress * TAU * direction * (0.34 + index * 0.03) + index * 0.7;
    const radius = center.radius * (0.25 + index * 0.075);
    const arcLength = 0.34 + (index % 4) * 0.13;
    context.save();
    context.translate(center.x, center.y);
    context.rotate(rotation);
    context.scale(1, mobileQuery.matches ? 0.82 : 0.7);
    context.beginPath();
    context.arc(0, 0, radius, -arcLength, arcLength);
    context.strokeStyle = `rgba(239,196,103,${0.07 + index * 0.011})`;
    context.lineWidth = 0.75 + index * 0.075;
    context.lineCap = 'round';
    context.stroke();
    context.restore();
  }

  function drawParticle(center, progress, particle, index) {
    const phase = fract(particle.seed + progress * particle.speed);
    const fade = Math.pow(Math.sin(Math.PI * phase), 1.35);
    if (fade < 0.03) return;

    const outer = center.radius * particle.lane;
    const radius = outer * (1 - phase * 0.88);
    const angle = particle.angle + particle.turn * TAU * phase + progress * TAU * 0.78;
    const ellipse = mobileQuery.matches ? 0.82 : 0.7;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius * ellipse;
    const trailAngle = angle - 0.06;
    const trailRadius = radius + center.radius * 0.022;
    const tx = center.x + Math.cos(trailAngle) * trailRadius;
    const ty = center.y + Math.sin(trailAngle) * trailRadius * ellipse;
    const alpha = fade * (0.16 + particle.warm * 0.46);

    const gradient = context.createLinearGradient(tx, ty, x, y);
    gradient.addColorStop(0, 'rgba(214,161,63,0)');
    gradient.addColorStop(1, `rgba(248,237,215,${alpha})`);
    context.beginPath();
    context.moveTo(tx, ty);
    context.lineTo(x, y);
    context.strokeStyle = gradient;
    context.lineWidth = particle.size;
    context.lineCap = 'round';
    context.stroke();

    if (index % 4 === 0) {
      context.beginPath();
      context.arc(x, y, particle.size * 0.68, 0, TAU);
      context.fillStyle = `rgba(239,196,103,${Math.min(0.72, alpha + 0.07)})`;
      context.fill();
    }
  }

  function drawPulseRings(center, progress) {
    for (let index = 0; index < 3; index += 1) {
      const phase = fract(progress * 0.9 + index / 3);
      const radius = center.radius * (0.12 + phase * 0.38);
      context.save();
      context.translate(center.x, center.y);
      context.scale(1, mobileQuery.matches ? 0.82 : 0.7);
      context.beginPath();
      context.arc(0, 0, radius, 0, TAU);
      context.strokeStyle = `rgba(248,237,215,${(1 - phase) * 0.12})`;
      context.lineWidth = 1 + (1 - phase) * 1.2;
      context.stroke();
      context.restore();
    }
  }

  function render(now) {
    if (!running || !inView) return;
    const targetInterval = mobileQuery.matches ? 1000 / 30 : 1000 / 48;
    if (now - lastFrame < targetInterval) {
      frame = requestAnimationFrame(render);
      return;
    }
    lastFrame = now;
    const progress = reducedMotion.matches ? 0.3 : (now % LOOP_MS) / LOOP_MS;
    const center = mappedCenter();
    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = 'screen';
    const spiralCount = mobileQuery.matches ? 5 : 8;
    for (let index = 0; index < spiralCount; index += 1) drawSpiral(center, progress, index);
    for (let index = 0; index < 9; index += 1) drawOrbit(center, progress, index);
    const count = mobileQuery.matches ? 76 : particles.length;
    for (let index = 0; index < count; index += 1) drawParticle(center, progress, particles[index], index);
    drawPulseRings(center, progress);
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