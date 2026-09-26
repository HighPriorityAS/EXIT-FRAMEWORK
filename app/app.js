(()=>{
  const KEY='exit_app_v1';
  const LEGACY_KEY='exit_app_v0';
  const MAX_ENTRIES=90;
  const MAX_CAPTURES=120;
  const body=document.body;
  const capturePanel=document.querySelector('[data-capture]');
  const currentPanel=document.querySelector('[data-current]');
  const actionForm=document.querySelector('[data-action-form]');
  if(!body||!capturePanel||!currentPanel||!actionForm)return;

  const stateButtons=[...document.querySelectorAll('[data-state-choice]')];
  const statusButtons=[...document.querySelectorAll('[data-status]')];
  const navButtons=[...document.querySelectorAll('[data-nav-view]')];
  const viewPanels=[...document.querySelectorAll('[data-view-panel]')];
  const quickDialog=document.querySelector('[data-capture-dialog]');
  const quickForm=document.querySelector('[data-quick-form]');
  const reviewForm=document.querySelector('[data-review-form]');
  const installButton=document.querySelector('[data-install]');
  const syncStatus=document.querySelector('[data-sync-status]');
  const actionInput=actionForm.elements.action;
  const controlInput=actionForm.elements.control;
  const controlOutput=document.querySelector('[data-control-output]');
  const formStatus=document.querySelector('[data-form-status]');

  const stateCopy={
    stable:{label:'STABLE',kicker:'CONTROL POINT',title:'Choose the leverage point.',detail:'Capacity is available. Spend it deliberately, not automatically.',actionLabel:'What single move creates the most practical control?'},
    loaded:{label:'LOADED',kicker:'NARROW THE SURFACE',title:'Reduce before you optimize.',detail:'Keep the mission bounded. Optional complexity does not earn screen space.',actionLabel:'What one bounded action matters now?'},
    chaos:{label:'CHAOS',kicker:'STABILIZE FIRST',title:'Make the next move smaller.',detail:'Protect the base. Choose the smallest action that reduces immediate load or increases safety and control.',actionLabel:'Smallest stabilizing move'}
  };
  const statusCopy={planned:'ACTIVE',completed:'DONE',changed:'CHANGED',not_completed:'NOT DONE'};
  const protectCopy={rest:'Rest window',fuel:'Food + water',environment:'Lower friction',support:'Safe contact',essential:'Essential only',none:'No protected base'};
  const captureTypes={signal:'SIGNAL',friction:'FRICTION',decision:'DECISION',observation:'OBSERVATION'};
  let selectedState='';
  let deferredInstall=null;

  const clean=v=>String(v||'').trim();
  const clamp=v=>Math.min(10,Math.max(0,Number(v)||0));
  const todayKey=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
  const parseDate=v=>{const [y,m,d]=String(v||'').split('-').map(Number);return Number.isFinite(y)&&Number.isFinite(m)&&Number.isFinite(d)?new Date(y,m-1,d):null};
  const dateDiff=(a,b)=>{const da=parseDate(a),db=parseDate(b);return da&&db?Math.floor((db-da)/86400000):0};
  const displayDate=v=>{const d=parseDate(v);return d?d.toLocaleDateString(undefined,{month:'short',day:'numeric'}).toUpperCase():''};
  const isoNow=()=>new Date().toISOString();
  const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  const emptyData=()=>({version:1,entries:[],captures:[],reviews:[]});
  const normalizeEntry=x=>{
    if(!x||!x.date||!stateCopy[x.state]||!clean(x.action))return null;
    const hasControl=x.control!==null&&x.control!==undefined&&x.control!==''&&Number.isFinite(Number(x.control));
    return {date:x.date,state:x.state,action:clean(x.action),status:statusCopy[x.status]?x.status:'planned',control:hasControl?clamp(x.control):null,protect:protectCopy[x.protect]?x.protect:'none',friction:clean(x.friction).slice(0,160),updatedAt:x.updatedAt||''};
  };
  const normalize=raw=>({
    version:1,
    entries:(Array.isArray(raw?.entries)?raw.entries:[]).map(normalizeEntry).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date)).slice(-MAX_ENTRIES),
    captures:(Array.isArray(raw?.captures)?raw.captures:[]).filter(x=>x&&captureTypes[x.type]&&clean(x.text)).map(x=>({id:x.id||id(),at:x.at||isoNow(),type:x.type,text:clean(x.text).slice(0,220)})).sort((a,b)=>a.at.localeCompare(b.at)).slice(-MAX_CAPTURES),
    reviews:(Array.isArray(raw?.reviews)?raw.reviews:[]).filter(x=>x&&x.date&&clean(x.increase)&&clean(x.drift)&&clean(x.remove)&&clean(x.next)).map(x=>({date:x.date,increase:clean(x.increase).slice(0,240),drift:clean(x.drift).slice(0,240),remove:clean(x.remove).slice(0,240),next:clean(x.next).slice(0,180),savedAt:x.savedAt||''})).sort((a,b)=>a.date.localeCompare(b.date)).slice(-24)
  });
  const validSprint=s=>!!(s&&s.startedAt&&s.constraint&&s.outcome&&s.protect&&Array.isArray(s.checkins));
  const readRaw=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
  const writeLocal=data=>{try{localStorage.setItem(KEY,JSON.stringify(normalize(data)));return true}catch{return false}};
  const migrateLegacy=()=>{
    if(readRaw(KEY))return;
    const legacy=readRaw(LEGACY_KEY);
    if(!legacy?.entries?.length)return;
    const migrated=emptyData();
    migrated.entries=legacy.entries.map(x=>normalizeEntry({...x,control:null,protect:'none',friction:''})).filter(Boolean);
    writeLocal(migrated);
  };
  migrateLegacy();

  const sprintApi=()=>window.ExitState;
  const sprintState=()=>sprintApi()?.load?.()||null;
  const loadData=()=>{
    const sprint=sprintState();
    if(validSprint(sprint)&&sprint.controlRoom?.appV1){
      const synced=normalize(sprint.controlRoom.appV1);
      writeLocal(synced);
      return synced;
    }
    return normalize(readRaw(KEY));
  };
  const saveData=data=>{
    const normalized=normalize(data);
    if(!writeLocal(normalized))return false;
    const api=sprintApi(),sprint=api?.load?.();
    if(validSprint(sprint)){
      sprint.controlRoom=sprint.controlRoom&&typeof sprint.controlRoom==='object'?sprint.controlRoom:{};
      sprint.controlRoom.appV1=normalized;
      api.save(sprint);
    }
    return true;
  };
  const attachLocalToSprint=()=>{
    const api=sprintApi(),sprint=api?.load?.();
    if(!validSprint(sprint)||sprint.controlRoom?.appV1)return;
    const local=normalize(readRaw(KEY));
    if(!local.entries.length&&!local.captures.length&&!local.reviews.length)return;
    sprint.controlRoom=sprint.controlRoom&&typeof sprint.controlRoom==='object'?sprint.controlRoom:{};
    sprint.controlRoom.appV1=local;
    api.save(sprint);
  };

  const todayEntry=data=>data.entries.find(x=>x.date===todayKey())||null;
  const latestEntry=data=>data.entries.length?data.entries[data.entries.length-1]:null;
  const sprintDay=s=>{const start=parseDate(s.startedAt),today=parseDate(todayKey());return!start||!today?1:Math.min(30,Math.max(1,Math.floor((today-start)/86400000)+1))};
  const mirrorEntryToSprint=entry=>{
    const api=sprintApi(),sprint=api?.load?.();
    if(!validSprint(sprint))return false;
    const day=sprintDay(sprint),i=sprint.checkins.findIndex(x=>Number(x.day)===day),existing=i>=0?sprint.checkins[i]:{};
    const mapped=entry.state==='stable'?'green':entry.state==='loaded'?'yellow':'red';
    const next={...existing,date:todayKey(),day,state:mapped,action:entry.action,mission:entry.status,control:entry.control??(Number.isFinite(Number(existing.control))?Number(existing.control):Number(sprint.baseline??5)),note:clean(existing.note)};
    if(i>=0)sprint.checkins[i]=next;else sprint.checkins.push(next);
    sprint.checkins.sort((a,b)=>Number(a.day)-Number(b.day));
    sprint.controlRoom=sprint.controlRoom&&typeof sprint.controlRoom==='object'?sprint.controlRoom:{};
    sprint.controlRoom.appV1=loadData();
    return api.save(sprint);
  };

  const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  const windowEntries=(data,startAgo,endAgo=0)=>data.entries.filter(e=>{const diff=dateDiff(e.date,todayKey());return diff>=endAgo&&diff<=startAgo});
  const controlTrend=data=>{
    const current=windowEntries(data,6).map(e=>e.control).filter(Number.isFinite);
    const previous=data.entries.filter(e=>{const d=dateDiff(e.date,todayKey());return d>=7&&d<=13}).map(e=>e.control).filter(Number.isFinite);
    const currentAvg=average(current),previousAvg=average(previous);
    if(currentAvg===null)return {value:null,text:'Set perceived control to establish the signal.'};
    if(previousAvg===null)return {value:currentAvg,text:`7-day average from ${current.length} recorded day${current.length===1?'':'s'}.`};
    const delta=currentAvg-previousAvg;
    const direction=Math.abs(delta)<0.25?'stable':delta>0?'up':'down';
    return {value:currentAvg,text:`7-day average ${direction==='stable'?'is stable':`${direction} ${Math.abs(delta).toFixed(1)} vs previous 7 days`}.`};
  };
  const dominantState=entries=>{
    if(!entries.length)return null;
    const counts={stable:0,loaded:0,chaos:0};entries.forEach(e=>counts[e.state]++);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  };
  const followThrough=entries=>{
    if(!entries.length)return null;
    const useful=entries.filter(e=>e.status==='completed'||e.status==='changed').length;
    return Math.round((useful/entries.length)*100);
  };
  const repeatedFriction=entries=>{
    const map=new Map();entries.map(e=>clean(e.friction).toLowerCase()).filter(Boolean).forEach(x=>map.set(x,(map.get(x)||0)+1));
    const hit=[...map.entries()].sort((a,b)=>b[1]-a[1])[0];
    return hit&&hit[1]>=2?hit:null;
  };

  const renderSync=()=>{
    if(!syncStatus)return;
    const api=sprintApi(),sprint=api?.load?.();
    if(validSprint(sprint)){
      syncStatus.textContent=api.getDisplayStatus?.()||'Sprint linked';
      syncStatus.title='App data is stored inside the local-first Sprint state and follows its optional sync.';
    }else{
      syncStatus.textContent='Local first';
      syncStatus.title='No account or Sprint setup required. App data remains on this device.';
    }
  };

  const setView=view=>{
    if(body.dataset.state==='chaos'&&(view==='history'||view==='review'))view='today';
    body.dataset.view=view;
    viewPanels.forEach(p=>p.hidden=p.dataset.viewPanel!==view);
    navButtons.forEach(b=>b.setAttribute('aria-current',b.dataset.navView===view?'page':'false'));
    if(view==='history')renderHistory(loadData());
    if(view==='review')renderReview(loadData());
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const setState=state=>{
    selectedState=state;
    body.dataset.state=state||'unset';
    stateButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stateChoice===state)));
    if(!stateCopy[state]){actionForm.hidden=true;return}
    const c=stateCopy[state];
    document.querySelector('[data-mode-kicker]').textContent=c.kicker;
    document.querySelector('[data-mode-title]').textContent=c.title;
    document.querySelector('[data-mode-detail]').textContent=c.detail;
    document.querySelector('[data-action-label]').textContent=c.actionLabel;
    actionForm.hidden=false;
    formStatus.textContent='';
    renderProtocol({state,friction:actionForm.elements.friction.value});
  };

  const renderProtocol=entry=>{
    const card=document.querySelector('[data-protocol]');
    if(!card||!entry?.state){if(card)card.hidden=true;return}
    const code=document.querySelector('[data-protocol-code]'),title=document.querySelector('[data-protocol-title]'),copy=document.querySelector('[data-protocol-copy]'),link=document.querySelector('[data-protocol-link]');
    if(entry.state==='chaos'){
      card.hidden=false;code.textContent='MVD';title.textContent='Minimum Viable Day';copy.textContent='Protect the base, remove optional load and keep one promise small enough to be real.';link.href='../minimum-viable-day.html';link.textContent='Open Minimum Viable Day →';return;
    }
    if(entry.state==='loaded'){
      card.hidden=false;code.textContent='REDUCE';title.textContent='Shrink the control surface';copy.textContent='Reduce decisions, name one active friction and keep the next move bounded.';link.href='../framework.html#operating-loop';link.textContent='Open operating loop →';return;
    }
    if(clean(entry.friction)){
      card.hidden=false;code.textContent='FRICTION';title.textContent='Remove before adding';copy.textContent='A named friction is now part of the operating picture. Prefer removing one constraint before adding another commitment.';link.href='../control-room.html';link.textContent='Open full Control Room →';return;
    }
    card.hidden=true;
  };

  const renderOverview=(data,current)=>{
    const overview=document.querySelector('[data-overview]');
    if(!overview)return;
    overview.hidden=!current;
    if(!current)return;
    const trend=controlTrend(data);
    document.querySelector('[data-control-score]').textContent=current.control??'—';
    document.querySelector('[data-control-trend]').textContent=trend.text;
    document.querySelector('[data-overview-date]').textContent=displayDate(current.date);
    document.querySelector('[data-overview-state]').textContent=stateCopy[current.state].label;
    document.querySelector('[data-overview-protect]').textContent=protectCopy[current.protect];
  };

  const renderHistory=data=>{
    const history=document.querySelector('[data-history]'),historyEmpty=document.querySelector('[data-history-empty]');
    history.querySelectorAll('.history-item').forEach(n=>n.remove());
    const recent=[...data.entries].reverse().slice(0,14);historyEmpty.hidden=recent.length>0;
    recent.forEach(item=>{
      const article=document.createElement('article');article.className='history-item';
      const meta=document.createElement('div');meta.className='history-meta';meta.textContent=`${displayDate(item.date)}\n${stateCopy[item.state].label}\n${item.control??'—'}/10`;
      const copy=document.createElement('div');copy.className='history-copy';
      const strong=document.createElement('strong');strong.textContent=item.action;
      const small=document.createElement('small');small.textContent=`${statusCopy[item.status]} · ${protectCopy[item.protect]}${item.friction?` · Friction: ${item.friction}`:''}`;
      copy.append(strong,small);article.append(meta,copy);history.append(article);
    });
    const last7=windowEntries(data,6),controls=last7.map(e=>e.control).filter(Number.isFinite),avg=average(controls),ft=followThrough(last7),dom=dominantState(last7),repeat=repeatedFriction(last7);
    document.querySelector('[data-history-control]').textContent=avg===null?'—':avg.toFixed(1);
    document.querySelector('[data-history-followthrough]').textContent=ft===null?'—':`${ft}%`;
    document.querySelector('[data-history-state]').textContent=dom?stateCopy[dom].label:'—';
    const pattern=document.querySelector('[data-pattern-note]');
    if(last7.length<3)pattern.textContent='More evidence is needed before a useful pattern can be shown.';
    else if(repeat)pattern.textContent=`Repeated named friction: “${repeat[0]}” appeared ${repeat[1]} times. This is an observation, not a causal claim.`;
    else pattern.textContent=`${last7.length} recorded days. No friction repeated often enough to call a pattern yet.`;
    const log=document.querySelector('[data-capture-log]'),empty=document.querySelector('[data-capture-empty]');
    log.querySelectorAll('.capture-log-item').forEach(n=>n.remove());
    const captures=[...data.captures].reverse().slice(0,12);empty.hidden=captures.length>0;
    captures.forEach(item=>{
      const article=document.createElement('article');article.className='capture-log-item';article.dataset.type=item.type;
      const meta=document.createElement('div');meta.className='capture-log-meta';const d=new Date(item.at);meta.textContent=`${captureTypes[item.type]}\n${d.toLocaleDateString(undefined,{month:'short',day:'numeric'}).toUpperCase()}`;
      const copy=document.createElement('div');copy.className='capture-log-copy';const strong=document.createElement('strong');strong.textContent=item.text;copy.append(strong);article.append(meta,copy);log.append(article);
    });
  };

  const reviewDueInfo=data=>{
    const latest=data.reviews.length?data.reviews[data.reviews.length-1]:null;
    if(!latest){
      if(data.entries.length>=7)return {due:true,text:'Review due. You have at least seven recorded control points.'};
      return {due:false,text:`${Math.max(0,7-data.entries.length)} more recorded day${7-data.entries.length===1?'':'s'} before the first weekly review is suggested.`};
    }
    const days=dateDiff(latest.date,todayKey());
    if(days>=7)return {due:true,text:`Review due. ${days} days since the last review.`};
    return {due:false,text:`Last review ${days===0?'today':`${days} day${days===1?'':'s'} ago`}. Re-entry beats forced cadence.`};
  };
  const renderReview=data=>{
    const info=reviewDueInfo(data),latest=data.reviews.length?data.reviews[data.reviews.length-1]:null;
    document.querySelector('[data-review-status]').textContent=info.text;
    if(latest&&!reviewForm.dataset.dirty){
      reviewForm.elements.increase.placeholder=`Last: ${latest.increase}`;
      reviewForm.elements.drift.placeholder=`Last: ${latest.drift}`;
      reviewForm.elements.remove.placeholder=`Last: ${latest.remove}`;
      reviewForm.elements.next.placeholder=`Last: ${latest.next}`;
    }
  };

  const render=()=>{
    const data=loadData(),current=todayEntry(data),latest=latestEntry(data),isReentry=latest&&latest.date!==todayKey();
    const reentry=document.querySelector('[data-reentry]');reentry.hidden=!isReentry;
    if(isReentry)document.querySelector('[data-reentry-copy]').textContent=`${stateCopy[latest.state].label} was the last recorded state ${dateDiff(latest.date,todayKey())} day${dateDiff(latest.date,todayKey())===1?'':'s'} ago. Nothing to repay. Start from what is true now.`;
    currentPanel.hidden=!current;
    renderOverview(data,current);
    if(current){
      document.querySelector('[data-current-date]').textContent=displayDate(current.date);
      document.querySelector('[data-current-state]').textContent=stateCopy[current.state].label;
      document.querySelector('[data-current-status]').textContent=statusCopy[current.status];
      document.querySelector('[data-current-action]').textContent=current.action;
      document.querySelector('[data-current-protect]').textContent=protectCopy[current.protect];
      document.querySelector('[data-current-friction]').textContent=current.friction||'None named';
      statusButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===current.status)));
      body.dataset.state=current.state;
      capturePanel.hidden=true;
      renderProtocol(current);
      if(current.state==='chaos'&&(body.dataset.view==='history'||body.dataset.view==='review'))setView('today');
    }else{
      capturePanel.hidden=false;setState('');renderProtocol(null);
    }
    renderSync();
    if(body.dataset.view==='history')renderHistory(data);
    if(body.dataset.view==='review')renderReview(data);
  };

  stateButtons.forEach(button=>{button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{setState(button.dataset.stateChoice);actionInput.focus({preventScroll:true});actionForm.scrollIntoView({block:'nearest',behavior:'smooth'})})});
  controlInput.addEventListener('input',()=>{controlOutput.textContent=controlInput.value});
  actionForm.elements.friction.addEventListener('input',()=>{if(selectedState)renderProtocol({state:selectedState,friction:actionForm.elements.friction.value})});

  actionForm.addEventListener('submit',event=>{
    event.preventDefault();
    const action=clean(actionInput.value);
    if(!stateCopy[selectedState]){formStatus.textContent='Choose the operating state first.';return}
    if(!action){formStatus.textContent='Name one concrete next action.';actionInput.focus();return}
    const data=loadData();
    const entry={date:todayKey(),state:selectedState,action,status:'planned',control:clamp(controlInput.value),protect:actionForm.elements.protect.value||'none',friction:clean(actionForm.elements.friction.value),updatedAt:isoNow()};
    const index=data.entries.findIndex(x=>x.date===entry.date);if(index>=0)data.entries[index]=entry;else data.entries.push(entry);
    if(!saveData(data)){formStatus.textContent='Could not save on this device.';return}
    mirrorEntryToSprint(entry);
    actionForm.reset();controlInput.value='5';controlOutput.textContent='5';selectedState='';capturePanel.hidden=true;render();
  });

  statusButtons.forEach(button=>button.addEventListener('click',()=>{
    const data=loadData(),entry=todayEntry(data);if(!entry)return;
    entry.status=button.dataset.status;entry.updatedAt=isoNow();
    if(!saveData(data))return;mirrorEntryToSprint(entry);render();
  }));

  document.querySelector('[data-adjust]')?.addEventListener('click',()=>{
    const entry=todayEntry(loadData());if(!entry)return;
    capturePanel.hidden=false;setState(entry.state);actionInput.value=entry.action;actionForm.elements.friction.value=entry.friction||'';controlInput.value=entry.control??5;controlOutput.textContent=controlInput.value;
    const protect=actionForm.querySelector(`input[name="protect"][value="${entry.protect}"]`);if(protect)protect.checked=true;
    capturePanel.scrollIntoView({block:'start',behavior:'smooth'});
  });

  navButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.navView)));
  document.querySelector('[data-open-capture]')?.addEventListener('click',()=>{quickForm.reset();document.querySelector('[data-quick-status]').textContent='';quickDialog.showModal();setTimeout(()=>quickForm.elements.text.focus(),0)});
  document.querySelector('[data-close-capture]')?.addEventListener('click',()=>quickDialog.close());
  quickForm?.addEventListener('submit',event=>{
    event.preventDefault();const text=clean(quickForm.elements.text.value),type=quickForm.elements.type.value;
    if(!text||!captureTypes[type]){document.querySelector('[data-quick-status]').textContent='Capture one useful line.';return}
    const data=loadData();data.captures.push({id:id(),at:isoNow(),type,text});
    if(!saveData(data)){document.querySelector('[data-quick-status]').textContent='Could not save on this device.';return}
    quickDialog.close();if(body.dataset.view==='history')renderHistory(loadData());renderSync();
  });

  reviewForm?.addEventListener('input',()=>{reviewForm.dataset.dirty='true'});
  reviewForm?.addEventListener('submit',event=>{
    event.preventDefault();const values=['increase','drift','remove','next'].map(name=>clean(reviewForm.elements[name].value));
    if(values.some(v=>!v)){document.querySelector('[data-review-form-status]').textContent='Answer all four prompts. Short is fine.';return}
    const data=loadData();data.reviews.push({date:todayKey(),increase:values[0],drift:values[1],remove:values[2],next:values[3],savedAt:isoNow()});
    if(!saveData(data)){document.querySelector('[data-review-form-status]').textContent='Could not save on this device.';return}
    reviewForm.reset();reviewForm.dataset.dirty='';document.querySelector('[data-review-form-status]').textContent='Review saved. Keep the next control point bounded.';renderReview(loadData());renderSync();
  });

  window.addEventListener('exit-state:status',renderSync);
  window.addEventListener('exit-state:changed',event=>{if(event.detail?.source!=='local-save')render()});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;installButton.hidden=false});
  installButton?.addEventListener('click',async()=>{if(!deferredInstall)return;await deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;installButton.hidden=true});
  window.addEventListener('appinstalled',()=>{deferredInstall=null;if(installButton)installButton.hidden=true});
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));

  attachLocalToSprint();
  setView('today');
  render();
})();
