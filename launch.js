(()=>{
  const config=window.EXIT_LAUNCH_CONFIG||{},stripe=config.stripe||{},crm=config.crm||{},social=config.social||{};
  const socialKeys=['instagram','youtube','tiktok','linkedin'];
  const launchMode=config.launchMode==='live'?'live':'preview';
  const socialReady=config.socialVerified===true&&socialKeys.every(key=>Boolean(social[key]));
  const activationReady=launchMode==='live'&&config.founderPriceConfirmed===true&&config.qaPassed===true&&Boolean(stripe.founderPaymentLink)&&Boolean(crm.endpoint)&&socialReady;
  document.documentElement.dataset.launchMode=activationReady?'live':'preview';

  const toggle=document.querySelector('.menu-toggle'),menu=document.getElementById('mobile-menu');
  if(toggle&&menu){const close=()=>{toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');menu.hidden=true};toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?'Open menu':'Close menu');menu.hidden=open});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));addEventListener('resize',()=>{if(innerWidth>860)close()},{passive:true})}

  document.querySelectorAll('[data-founder-price]').forEach(el=>{el.textContent=activationReady&&config.founderPriceLabel?config.founderPriceLabel:'Price pending approval'});
  document.querySelectorAll('[data-checkout="founder"]').forEach(link=>{if(activationReady){link.href=stripe.founderPaymentLink;link.textContent='Secure founder access →';link.dataset.mode='checkout';link.target='_blank';link.rel='noopener noreferrer'}else{link.href='#founder-form';link.textContent='Join Founder 100 preview →';link.dataset.mode='preview';link.removeAttribute('target');link.removeAttribute('rel')}});

  const labels={instagram:'Instagram',youtube:'YouTube',tiktok:'TikTok',linkedin:'LinkedIn'},glyphs={instagram:'IG',youtube:'YT',tiktok:'TT',linkedin:'in'};
  document.querySelectorAll('[data-social-links]').forEach(box=>{Object.entries(social).forEach(([key,url])=>{if(!config.socialVerified||!url||!labels[key])return;const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',labels[key]);a.title=labels[key];a.textContent=glyphs[key];box.appendChild(a)});if(!box.children.length)box.hidden=true});

  const selectInterest=type=>{const form=document.querySelector('[data-founder-form]');if(!form)return;const select=form.querySelector('[name="interest_type"]'),status=form.querySelector('[data-form-status]'),email=form.querySelector('input[type="email"]');if(select)select.value=type;if(status)status.textContent=`${type} selected. Add your email to continue to the preview list.`;form.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>email?.focus(),420)};
  document.querySelectorAll('[data-reserve]').forEach(btn=>btn.addEventListener('click',()=>selectInterest(btn.dataset.reserve)));

  document.querySelectorAll('[data-founder-form]').forEach(form=>{const status=form.querySelector('[data-form-status]');form.addEventListener('submit',async e=>{e.preventDefault();const payload=Object.fromEntries(new FormData(form).entries());payload.has_interest=form.querySelector('[name="has_interest"]')?.checked?'yes':'no';payload.source='Exit Framework Founder 100';payload.timestamp=new Date().toISOString();if(!activationReady){if(status)status.textContent='Founder CRM is not live. The details above are not submitted here; opening the Exit Framework preview list instead.';if(crm.fallbackUrl)setTimeout(()=>{location.href=crm.fallbackUrl},650);return}try{const response=await fetch(crm.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok)throw new Error('CRM request failed');form.reset();if(status)status.textContent='Recorded. Founder launch updates are on the way.'}catch(_){if(status)status.textContent='The CRM endpoint did not respond. Opening the fallback launch list.';if(crm.fallbackUrl)setTimeout(()=>{location.href=crm.fallbackUrl},850)}})});
})();
