(()=>{
  const isArticle=/\/articles\//.test(location.pathname),base=isArticle?'../':'';
  const ensureCss=(selector,href,attr)=>{if(document.querySelector(selector))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;if(attr)l.setAttribute(attr,'true');document.head.appendChild(l)};
  ensureCss('link[data-brand-v14]',`${base}brand-v14.css?v=14`,'data-brand-v14');
  ensureCss('link[data-obsidian-amber]',`${base}obsidian-amber.css?v=15.3`,'data-obsidian-amber');
  ensureCss('link[data-site-v17]',`${base}site-v17.css?v=17`,'data-site-v17');

  const brandMarkup=`<span class="brand-symbol" aria-hidden="true"><svg viewBox="0 0 96 96"><defs><linearGradient id="ef-blue-u" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f8fc6"/><stop offset="1" stop-color="#183d82"/></linearGradient><linearGradient id="ef-white-u" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f4"/><stop offset="1" stop-color="#aeb8c7"/></linearGradient><linearGradient id="ef-gold-u" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f0d078"/><stop offset="1" stop-color="#d49a25"/></linearGradient></defs><path d="M10 18h27l22 29-21 31H14l21-31z" fill="none" stroke="url(#ef-blue-u)" stroke-width="7"/><path d="M29 17l28 30-30 31" fill="none" stroke="url(#ef-white-u)" stroke-width="8"/><path d="M55 47L83 10" fill="none" stroke="url(#ef-gold-u)" stroke-width="4"/></svg></span><span class="brand-words"><span class="brand-line">EXIT</span><span class="brand-line">FRAMEWORK</span><span class="brand-tag">STRATEGIC CONTROL. HUMAN FREEDOM.</span></span>`;
  document.querySelectorAll('.brand').forEach(b=>{b.innerHTML=brandMarkup});

  const current=location.pathname.split('/').pop()||'index.html',items=[['framework.html','Framework'],['founders.html','Founder 100'],['membership.html','Membership'],['articles.html','Journal'],['faq.html','FAQ']];
  const build=nav=>{if(!nav)return;nav.innerHTML=items.map(([href,label])=>{const active=current===href||(isArticle&&href==='articles.html');return `<a ${active?'aria-current="page" ':''}href="${base}${href}">${label}</a>`}).join('')};
  build(document.querySelector('.nav'));build(document.getElementById('mobile-menu'));
  const action=document.querySelector('.header-actions');if(action)action.innerHTML=`<a class="button button-small button-gold" href="${base}framework.html">Enter the framework</a>`;
  const mobile=document.getElementById('mobile-menu');if(mobile)mobile.insertAdjacentHTML('beforeend',`<a class="button button-gold" href="${base}founders.html">Founder 100</a>`);

  const HAS_URL='https://humanautonomystudy.org/';
  const externalizeHAS=()=>{
    document.querySelectorAll('a').forEach(a=>{
      const text=(a.textContent||'').trim();
      const href=(a.getAttribute('href')||'').toLowerCase();
      if(/human autonomy study/i.test(text)||/(^|\/)has\.html(?:$|[#?])/.test(href)){
        a.href=HAS_URL;a.target='_blank';a.rel='noopener noreferrer';a.classList.add('has-external-link');
      }
    });
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){
      if(!node.nodeValue||!node.nodeValue.includes('Human Autonomy Study'))return NodeFilter.FILTER_REJECT;
      const p=node.parentElement;if(!p||p.closest('a,script,style,textarea,title'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parts=node.nodeValue.split(/(Human Autonomy Study)/g);if(parts.length<2)return;
      const frag=document.createDocumentFragment();parts.forEach(part=>{if(part==='Human Autonomy Study'){const a=document.createElement('a');a.href=HAS_URL;a.target='_blank';a.rel='noopener noreferrer';a.className='has-external-link';a.textContent=part;frag.appendChild(a)}else frag.appendChild(document.createTextNode(part))});node.replaceWith(frag);
    });
  };
  externalizeHAS();

  document.querySelectorAll('link[rel="canonical"]').forEach(link=>{
    try{const u=new URL(link.href);if(u.hostname==='theexitmission.com')link.href=`https://chaosexit.com${u.pathname}${u.search}${u.hash}`;}catch(_){ }
  });

  const toggle=document.querySelector('.menu-toggle');if(toggle&&mobile){const close=()=>{toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');mobile.hidden=true};toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?'Open menu':'Close menu');mobile.hidden=open});mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));addEventListener('resize',()=>{if(innerWidth>860)close()},{passive:true})}
})();