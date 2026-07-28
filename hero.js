(() => {
  const canvas = document.getElementById('vortex-canvas');
  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w=0,h=0,dpr=1,last=0,particles=[];
  const rand=(a,b)=>a+Math.random()*(b-a);
  function seed(){particles=[];const n=innerWidth<740?70:150;for(let i=0;i<n;i++)particles.push({a:rand(0,Math.PI*2),r:rand(.12,.48),s:rand(.035,.085),z:rand(.5,1.4),o:rand(.18,.78),l:rand(1.5,5)});}
  function resize(){const r=host.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);seed();}
  function point(p, offset=0){const cx=w*.49,cy=h*.51;const sx=w*.73,sy=h*.62;const rr=Math.max(.06,p.r-offset);const warp=1+Math.sin(p.a*3.1)*.09;return{x:cx+Math.cos(p.a)*rr*sx*warp,y:cy+Math.sin(p.a)*rr*sy};}
  function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;ctx.clearRect(0,0,w,h);ctx.save();ctx.globalCompositeOperation='screen';for(const p of particles){if(!reduce){p.a+=p.s*dt*2.2;p.r-=dt*.0045*p.z;if(p.r<.075){p.r=rand(.36,.5);p.a=rand(Math.PI*.55,Math.PI*1.55);}}
      const a=point(p,0),b=point(p,.008*p.l);const grd=ctx.createLinearGradient(b.x,b.y,a.x,a.y);grd.addColorStop(0,'rgba(184,137,37,0)');grd.addColorStop(1,`rgba(255,207,87,${p.o})`);ctx.strokeStyle=grd;ctx.lineWidth=Math.max(.45,p.z);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.stroke();ctx.fillStyle=`rgba(255,221,121,${p.o*.75})`;ctx.beginPath();ctx.arc(a.x,a.y,p.z*.9,0,Math.PI*2);ctx.fill();}
    ctx.restore();requestAnimationFrame(frame)}
  new ResizeObserver(resize).observe(host);resize();requestAnimationFrame(frame);
})();
