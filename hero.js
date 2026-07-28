(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'production.css?v=2';
  document.head.appendChild(css);

  const toggle = document.getElementById('menuToggle');
  const panel = document.getElementById('mobilePanel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      panel.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const art = document.querySelector('.hero-art-wrap');
  if (!art || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('canvas');
  layer.setAttribute('aria-hidden','true');
  layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;mix-blend-mode:screen';
  art.appendChild(layer);
  const ctx = layer.getContext('2d');
  let w=0,h=0,dpr=1,last=0,particles=[];
  const rand=(a,b)=>a+Math.random()*(b-a);
  function seed(){particles=[];const n=innerWidth<700?26:58;for(let i=0;i<n;i++)particles.push({a:rand(2.1,5.2),r:rand(.12,.44),s:rand(.035,.07),o:rand(.15,.5),z:rand(.5,1.4)});}
  function resize(){const r=art.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);layer.width=Math.max(1,w*dpr);layer.height=Math.max(1,h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);seed();}
  function p(q,off=0){const cx=w*.51,cy=h*.54,rr=Math.max(.04,q.r-off);return{x:cx+Math.cos(q.a)*rr*w*.72,y:cy+Math.sin(q.a)*rr*h*.63};}
  function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;ctx.clearRect(0,0,w,h);for(const q of particles){q.a+=q.s*dt;q.r-=dt*.004;if(q.r<.07){q.r=rand(.32,.46);q.a=rand(2.2,4.4)}const a=p(q),b=p(q,.018);const g=ctx.createLinearGradient(b.x,b.y,a.x,a.y);g.addColorStop(0,'rgba(255,205,92,0)');g.addColorStop(1,`rgba(255,213,112,${q.o})`);ctx.strokeStyle=g;ctx.lineWidth=q.z;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.stroke()}requestAnimationFrame(frame)}
  new ResizeObserver(resize).observe(art);resize();requestAnimationFrame(frame);
})();