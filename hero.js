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

  const addMembershipLinks = () => {
    document.querySelectorAll('.nav, .mobile-menu').forEach((nav) => {
      if (nav.querySelector('a[href$="membership.html"]')) return;
      const about = nav.querySelector('a[href$="about.html"]');
      const prefix = about?.getAttribute('href')?.startsWith('../') ? '../' : '';
      const link = document.createElement('a');
      link.href = `${prefix}membership.html`;
      link.textContent = 'Membership';
      nav.insertBefore(link, about || null);
    });
  };
  addMembershipLinks();

  const canvas = document.getElementById('vortex-canvas');
  const image = document.getElementById('hero-art');
  const hero = document.querySelector('.hero');
  if (!canvas || !image || !hero) return;

  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!context) return;

  const TAU = Math.PI * 2;
  const LOOP_MS = 9200;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = matchMedia('(max-width: 860px)');
  let width = 1, height = 1, dpr = 1, running = true, inView = true, frame = 0, lastFrame = 0;
  const fract = (value) => value - Math.floor(value);
  const seeded = (index, salt = 0) => fract(Math.sin(index * 91.733 + salt * 17.17) * 43758.5453);
  const particles = Array.from({ length: 220 }, (_, index) => ({
    seed: seeded(index, 1), angle: seeded(index, 2) * TAU, size: 0.5 + seeded(index, 3) * 2.1,
    turn: 2.4 + seeded(index, 4) * 3.8, lane: 0.5 + seeded(index, 5) * 0.66,
    warm: seeded(index, 6), speed: 0.74 + seeded(index, 7) * 0.85
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
      radius: Math.min(renderedWidth, renderedHeight) * (mobile ? 0.34 : 0.42)
    };
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(devicePixelRatio || 1, mobileQuery.matches ? 1.25 : 1.55);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawSpiral(center, progress, armIndex) {
    const points = mobileQuery.matches ? 54 : 78;
    const direction = armIndex % 2 ? -1 : 1;
    const phase = progress * TAU * (0.72 + armIndex * 0.09) * direction + armIndex * 0.73;
    const inner = center.radius * (0.12 + (armIndex % 3) * 0.025);
    const outer = center.radius * (0.78 + (armIndex % 4) * 0.07);
    const turns = 1.35 + armIndex * 0.12;
    context.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const t = index / points;
      const radius = inner + (outer - inner) * Math.pow(t, 0.9);
      const angle = phase + t * TAU * turns + Math.sin(t * Math.PI * 3 + armIndex) * 0.08;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius * (mobileQuery.matches ? 0.82 : 0.69);
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    const alpha = 0.08 + (armIndex % 4) * 0.035;
    context.strokeStyle = armIndex % 3 === 0 ? `rgba(248,237,214,${alpha + 0.08})` : `rgba(240,197,107,${alpha})`;
    context.lineWidth = 1.2 + (armIndex % 5) * 0.75;
    context.lineCap = 'round';
    context.stroke();
  }

  function drawOrbit(center, progress, index) {
    const direction = index % 2 ? -1 : 1;
    const rotation = progress * TAU * direction * (0.65 + index * 0.045) + index * 0.58;
    const radius = center.radius * (0.24 + index * 0.07);
    const arcLength = 0.38 + (index % 5) * 0.14;
    context.save();
    context.translate(center.x, center.y);
    context.rotate(rotation);
    context.scale(1, mobileQuery.matches ? 0.82 : 0.69);
    context.beginPath();
    context.arc(0, 0, radius, -arcLength, arcLength);
    context.strokeStyle = `rgba(240,197,107,${0.08 + index * 0.012})`;
    context.lineWidth = 0.8 + index * 0.09;
    context.lineCap = 'round';
    context.stroke();
    context.restore();
  }

  function drawParticle(center, progress, particle, index) {
    const phase = fract(particle.seed + progress * particle.speed);
    const fade = Math.pow(Math.sin(Math.PI * phase), 1.25);
    if (fade < 0.025) return;
    const outer = center.radius * particle.lane;
    const radius = outer * (1 - phase * 0.88);
    const angle = particle.angle + particle.turn * TAU * phase + progress * TAU * 1.15;
    const ellipse = mobileQuery.matches ? 0.82 : 0.69;
    const wobble = Math.sin(angle * 2.5 + particle.seed * TAU) * center.radius * 0.014 * (1 - phase);
    const x = center.x + Math.cos(angle) * radius + wobble;
    const y = center.y + Math.sin(angle) * radius * ellipse;
    const trailAngle = angle - 0.075;
    const trailRadius = radius + center.radius * (0.025 + particle.size * 0.003);
    const tx = center.x + Math.cos(trailAngle) * trailRadius;
    const ty = center.y + Math.sin(trailAngle) * trailRadius * ellipse;
    const alpha = fade * (0.24 + particle.warm * 0.58);
    const gradient = context.createLinearGradient(tx, ty, x, y);
    gradient.addColorStop(0, 'rgba(216,163,67,0)');
    gradient.addColorStop(1, `rgba(248,237,214,${alpha})`);
    context.beginPath(); context.moveTo(tx, ty); context.lineTo(x, y);
    context.strokeStyle = gradient; context.lineWidth = particle.size; context.lineCap = 'round'; context.stroke();
    if (index % 3 === 0) {
      context.beginPath(); context.arc(x, y, particle.size * 0.78, 0, TAU);
      context.fillStyle = `rgba(240,197,107,${Math.min(0.9, alpha + 0.1)})`; context.fill();
    }
  }

  function drawPulseRings(center, progress) {
    for (let index = 0; index < 4; index += 1) {
      const phase = fract(progress * 1.7 + index / 4);
      const radius = center.radius * (0.12 + phase * 0.42);
      context.save(); context.translate(center.x, center.y); context.scale(1, mobileQuery.matches ? 0.82 : 0.69);
      context.beginPath(); context.arc(0, 0, radius, 0, TAU);
      context.strokeStyle = `rgba(248,237,214,${(1 - phase) * 0.16})`;
      context.lineWidth = 1 + (1 - phase) * 1.8; context.stroke(); context.restore();
    }
  }

  function render(now) {
    if (!running || !inView) return;
    const targetInterval = mobileQuery.matches ? 1000 / 30 : 1000 / 50;
    if (now - lastFrame < targetInterval) { frame = requestAnimationFrame(render); return; }
    lastFrame = now;
    const progress = reducedMotion.matches ? 0.32 : (now % LOOP_MS) / LOOP_MS;
    const center = mappedCenter();
    context.clearRect(0, 0, width, height);
    context.save(); context.globalCompositeOperation = 'screen';
    for (let index = 0; index < (mobileQuery.matches ? 7 : 11); index += 1) drawSpiral(center, progress, index);
    for (let index = 0; index < 10; index += 1) drawOrbit(center, progress, index);
    const count = mobileQuery.matches ? 118 : particles.length;
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
  const visibilityObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; restart(); }, { threshold: 0.02 });
  visibilityObserver.observe(hero);
  document.addEventListener('visibilitychange', restart);
  reducedMotion.addEventListener?.('change', restart);
  mobileQuery.addEventListener?.('change', () => { resize(); restart(); });
  image.addEventListener('load', () => { resize(); restart(); });
  resize(); restart();
})();
