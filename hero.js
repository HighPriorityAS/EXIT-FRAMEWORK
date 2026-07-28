(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'production.css?v=4';
  document.head.appendChild(css);

  const toggle = document.getElementById('menuToggle');
  const panel = document.getElementById('mobilePanel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      panel.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const art = document.querySelector('.hero-art-wrap');
  if (!art) return;

  const image = art.querySelector('.hero-art');
  const revealImage = () => art.classList.add('hero-image-ready');
  if (image) {
    if (image.complete && image.naturalWidth > 0) revealImage();
    else {
      image.addEventListener('load', revealImage, { once: true });
      image.addEventListener('error', () => art.classList.add('hero-image-error'), { once: true });
    }
  }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const sheen = document.createElement('div');
  sheen.className = 'vortex-sheen';
  sheen.setAttribute('aria-hidden', 'true');
  art.appendChild(sheen);

  const canvas = document.createElement('canvas');
  canvas.className = 'vortex-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  art.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let last = 0;
  let running = true;
  let particles = [];
  let dust = [];
  let resizeTimer = 0;

  const random = (min, max) => min + Math.random() * (max - min);
  const isMobile = () => matchMedia('(max-width: 700px)').matches;

  function makeParticle() {
    return {
      angle: random(Math.PI * 0.62, Math.PI * 1.88),
      radius: random(0.13, 0.52),
      speed: random(0.055, 0.115),
      inward: random(0.006, 0.012),
      opacity: random(0.18, 0.64),
      size: random(0.45, 1.35),
      trail: random(0.018, 0.048),
      wobble: random(0, Math.PI * 2),
      layer: random(0.8, 1.25)
    };
  }

  function makeDust() {
    return {
      angle: random(0, Math.PI * 2),
      radius: random(0.08, 0.42),
      speed: random(0.012, 0.028),
      opacity: random(0.06, 0.22),
      size: random(0.35, 0.9),
      drift: random(-0.003, 0.003)
    };
  }

  function seed() {
    const particleCount = isMobile() ? 42 : 92;
    const dustCount = isMobile() ? 18 : 38;
    particles = Array.from({ length: particleCount }, makeParticle);
    dust = Array.from({ length: dustCount }, makeDust);
  }

  function resize() {
    const rect = art.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const nextW = Math.round(rect.width);
    const nextH = Math.round(rect.height);
    const changed = Math.abs(nextW - width) > 2 || Math.abs(nextH - height) > 2;
    width = nextW;
    height = nextH;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (changed || particles.length === 0) seed();
  }

  function point(item, radiusOffset = 0, angleOffset = 0) {
    const mobile = isMobile();
    const cx = width * 0.505;
    const cy = height * 0.515;
    const rx = width * (mobile ? 0.46 : 0.47);
    const ry = height * (mobile ? 0.43 : 0.44);
    const r = Math.max(0.035, item.radius - radiusOffset);
    const angle = item.angle + angleOffset;
    const spiralWarp = 1 + Math.sin(angle * 2.7 + item.wobble) * 0.045;
    return {
      x: cx + Math.cos(angle) * r * rx * spiralWarp,
      y: cy + Math.sin(angle) * r * ry
    };
  }

  function resetParticle(p) {
    Object.assign(p, makeParticle(), {
      angle: random(Math.PI * 0.72, Math.PI * 1.72),
      radius: random(0.43, 0.56)
    });
  }

  function drawFrame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000 || 0, 0.04);
    last = now;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const p of dust) {
      p.angle += p.speed * dt;
      p.radius += p.drift * dt;
      if (p.radius < 0.06 || p.radius > 0.46) p.drift *= -1;
      const a = point({ ...p, wobble: 0 });
      ctx.fillStyle = `rgba(255, 217, 133, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of particles) {
      p.angle += p.speed * dt;
      p.radius -= p.inward * dt;
      p.wobble += dt * 0.28;
      if (p.radius < 0.065) resetParticle(p);

      const head = point(p, 0, 0);
      const mid = point(p, p.trail * 0.55, -0.018);
      const tail = point(p, p.trail, -0.034);

      const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      gradient.addColorStop(0, 'rgba(205, 145, 42, 0)');
      gradient.addColorStop(0.55, `rgba(241, 187, 77, ${p.opacity * 0.45})`);
      gradient.addColorStop(1, `rgba(255, 225, 144, ${p.opacity})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = p.size * p.layer;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.quadraticCurveTo(mid.x, mid.y, head.x, head.y);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 235, 174, ${Math.min(0.78, p.opacity + 0.12)})`;
      ctx.beginPath();
      ctx.arc(head.x, head.y, Math.max(0.45, p.size * 0.72), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    requestAnimationFrame(drawFrame);
  }

  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  });
  observer.observe(art);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(drawFrame);
    }
  });

  resize();
  requestAnimationFrame(drawFrame);
})();
