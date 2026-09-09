(() => {
  const intro=document.querySelector('[data-mission-intro]');
  const form=document.querySelector('[data-mission-form]');
  const result=document.querySelector('[data-mission-result]');
  if(!intro||!form||!result)return;

  const steps=[...form.querySelectorAll('[data-mission-step]')];
  const start=document.querySelector('[data-mission-start]');
  const next=document.querySelector('[data-mission-next]');
  const back=document.querySelector('[data-mission-back]');
  const restart=document.querySelector('[data-mission-restart]');
  const copy=document.querySelector('[data-mission-copy]');
  const progress=document.querySelector('[data-mission-progress]');
  const fill=document.querySelector('[data-mission-progress-fill]');
  const status=document.querySelector('[data-mission-status]');
  const copyStatus=document.querySelector('[data-mission-copy-status]');
  const context=document.querySelector('[data-mission-context]');
  const contextState=document.querySelector('[data-mission-context-state]');
  let step=0;

  const track=(name,meta)=>window.ExitMetrics?.track(name,meta);
  const selected=name=>form.querySelector(`input[name="${name}"]:checked`)?.value;
  const value=name=>form.elements[name]?.value?.trim();

  let mvdState='none';
  try{mvdState=sessionStorage.getItem('exit_mvd_state')||'none';}catch{}
  if(['green','yellow','red'].includes(mvdState)){
    context.hidden=false;
    contextState.textContent=mvdState.toUpperCase();
  }

  const recommendedTimebox=()=>mvdState==='red'?'10':mvdState==='yellow'?'20':'45';
  const stateLabel=()=>mvdState==='red'?'RED / stabilization first':mvdState==='yellow'?'YELLOW / narrowed load':mvdState==='green'?'GREEN / focused load available':'No MVD state loaded';

  const categoryCopy={
    stabilize:'Reduce friction before adding load.',
    close:'Close one visible loop before opening another.',
    contact:'Use one message or call to move uncertainty into clarity.',
    progress:'Move one important task to its next visible state.',
    prepare:'Spend effort now only if it clearly reduces tomorrow’s friction.'
  };

  const firstMove={
    stabilize:'Remove the first source of friction you can act on.',
    close:'Open the exact task and complete the smallest irreversible step.',
    contact:'Open the message or dial the number before rewriting the plan.',
    progress:'Open the work and complete the first concrete sub-step.',
    prepare:'Set up the exact object, file or environment change needed tomorrow.'
  };

  const stopRule=()=>mvdState==='red'?'Stop when the defined finish line is reached. Do not add a second mission.':mvdState==='yellow'?'Stop at the finish line or timebox. Reassess before taking more load.':'Stop at the finish line. Add more only after a deliberate review.';

  const showStep=()=>{
    steps.forEach((el,i)=>el.hidden=i!==step);
    progress.textContent=`${step+1} / ${steps.length}`;
    fill.style.width=`${((step+1)/steps.length)*100}%`;
    back.hidden=step===0;
    next.textContent=step===steps.length-1?'Build mission →':'Next →';
    status.textContent='';
    if(step===2&&!selected('timebox')){
      const recommended=form.querySelector(`input[name="timebox"][value="${recommendedTimebox()}"]`);
      if(recommended) recommended.checked=true;
    }
  };

  const currentStepValid=()=>{
    if(step===0) return Boolean(selected('category'));
    if(step===1) return Boolean(value('mission'));
    if(step===2) return Boolean(value('done')&&selected('timebox'));
    return false;
  };

  const build=()=>{
    const category=selected('category');
    const mission=value('mission');
    const done=value('done');
    const timebox=selected('timebox');
    result.querySelector('[data-mission-state]').textContent=stateLabel();
    result.querySelector('[data-mission-output]').textContent=mission;
    result.querySelector('[data-mission-category-detail]').textContent=categoryCopy[category];
    result.querySelector('[data-mission-first]').textContent=firstMove[category];
    result.querySelector('[data-mission-done-output]').textContent=done;
    result.querySelector('[data-mission-timebox]').textContent=`${timebox} minutes`;
    result.querySelector('[data-mission-stop]').textContent=stopRule();
  };

  const cardText=()=>`EXIT OS — DAILY MISSION\nOperating context: ${result.querySelector('[data-mission-state]').textContent}\n\nMISSION\n${result.querySelector('[data-mission-output]').textContent}\n${result.querySelector('[data-mission-category-detail]').textContent}\n\nFIRST MOVE\n${result.querySelector('[data-mission-first]').textContent}\n\nDONE WHEN\n${result.querySelector('[data-mission-done-output]').textContent}\nTimebox: ${result.querySelector('[data-mission-timebox]').textContent}\n\nSTOP RULE\n${result.querySelector('[data-mission-stop]').textContent}`;

  start.addEventListener('click',()=>{
    intro.hidden=true;form.hidden=false;showStep();steps[0].querySelector('input')?.focus();track('mission_start',{has_mvd_state:mvdState!=='none'});
  });

  next.addEventListener('click',()=>{
    if(!currentStepValid()){
      status.textContent=step===1?'Write one mission sentence before continuing.':step===2?'Define done and choose a timebox.':'Choose the option that matters most today.';
      steps[step].querySelector('input')?.focus();
      return;
    }
    track('mission_step_complete',{step:step+1});
    if(step<steps.length-1){step+=1;showStep();steps[step].querySelector('input,button')?.focus();return;}
    build();form.hidden=true;result.hidden=false;result.focus();track('mission_complete',{has_mvd_state:mvdState!=='none'});track('mission_result_view');
  });

  back.addEventListener('click',()=>{if(step>0)step-=1;showStep();});

  restart.addEventListener('click',()=>{
    form.reset();step=0;result.hidden=true;form.hidden=false;copyStatus.textContent='';showStep();steps[0].querySelector('input')?.focus();track('mission_restart');
  });

  copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(cardText());copyStatus.textContent='Mission card copied.';track('mission_copy');}
    catch{copyStatus.textContent='Copy is unavailable in this browser. Select the mission card text manually.';}
  });

  track('mission_view',{has_mvd_state:mvdState!=='none'});
})();
