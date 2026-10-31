(()=>{
'use strict';
const $=s=>document.querySelector(s);
const panel=$('[data-shift-sprint]'), setup=$('[data-shift-setup]'), start=$('[data-shift-start]'), day=$('[data-shift-day]'), desc=$('[data-shift-sprint-description]');
const valid=s=>Boolean(s&&s.startedAt&&s.constraint&&s.outcome&&s.protect&&Array.isArray(s.checkins));
const read=()=>{try{return window.ExitState?.load?.()||JSON.parse(localStorage.getItem('exit_control_sprint_v1')||'null')}catch{return null}};
const store=s=>{if(window.ExitState?.save)return window.ExitState.save(s);try{localStorage.setItem('exit_control_sprint_v1',JSON.stringify(s));return true}catch{return false}};
const today=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const getDay=s=>{const a=new Date(s.startedAt+'T12:00:00'),b=new Date(today()+'T12:00:00');return Math.max(1,Math.min(30,Math.round((b-a)/86400000)+1))};
const clean=v=>String(v||'').trim();
const updateSprint=()=>{
  const sprint=read();
  panel.hidden=false;
  if(valid(sprint)){
    day.textContent='DAY '+String(getDay(sprint)).padStart(2,'0')+' / 30';
    desc.textContent='ACTIVE CONSTRAINT: '+sprint.constraint+' • PROTECTED: '+sprint.protect;
    setup.hidden=true;start.hidden=true;
  } else {day.textContent='DAY 00 / 30';desc.textContent='One constraint, one observable outcome. No missed-day debt.';start.hidden=false}
};
start.addEventListener('click',()=>{setup.hidden=false;start.hidden=true;setup.elements.constraint.focus()});
setup.addEventListener('submit',event=>{
 event.preventDefault();
 const constraint=clean(setup.elements.constraint.value).slice(0,120),outcome=clean(setup.elements.outcome.value).slice(0,140),protect=clean(setup.elements.protect.value).slice(0,120);
 if(!constraint||!outcome||!protect)return;
 const sprint={version:2,startedAt:today(),constraint,outcome,baseline:5,protect,priority:constraint,checkins:[],reviews:[],controlSystem:null,completedAt:null};
 const status=$('[data-shift-setup-status]');
 if(!store(sprint)){status.textContent='Cannot save on this device. Please check storage.';return}
 updateSprint();status.textContent='';window.dispatchEvent(new CustomEvent('exit-state:changed',{detail:{source:'shift-setup'}}));
});
updateSprint();
window.addEventListener('exit-state:changed',updateSprint);
const prompt=$('[data-voice-prompt]'),status=$('[data-voice-status]'),answer=$('#shift-answer'),review=$('[data-voice-review]'),confirmBox=$('[data-voice-confirm]'),language=$('[data-voice-language]');
const speechButton=$('[data-voice-mic]'),speakButton=$('[data-voice-speak]');
const questions={
 'en-US':{state:'What state are you operating from: stable, loaded, or chaos?',action:'What is one bounded action that matters now?',reflection:'What would be a useful signal that this action helped?',start:'Voice shift started. One question at a time.',error:'Please select stable, loaded, or chaos.',ready:'Review your answers. Nothing has been saved.',saved:'Control point saved. Execute one action, then stand down.',offline:'Voice recognition is unavailable here. You can always type.'},
 'nb-NO':{state:'Hvilken tilstand er du i: stabil, belastet eller kaos?',action:'Hva er én avgrenset handling som betyr noe nå?',reflection:'Hva ville vært et nyttig tegn på at handlingen hjalp?',start:'Skiftet er startet. Ett spørsmål om gangen.',error:'Velg stabil, belastet eller kaos.',ready:'Kontroller svarene. Ingenting er lagret.',saved:'Kontrollpunkt lagret. Gjør én handling og avslutt skiftet.',offline:'Talegjenkjenning er ikke tilgjengelig her. Du kan alltid skrive.'}
};
let stage=-1, draft={state:'',action:'',reflection:''}, recognition=null;
const copy=()=>questions[language.value]||questions['en-US'];
const normalizeState=value=>{const t=clean(value).toLowerCase();if(/^(stable|stabil|green|grønn)$/.test(t))return 'stable';if(/^(loaded|belastet|yellow|gul)$/.test(t))return 'loaded';if(/^(chaos|kaos|red|rød)$/.test(t))return 'chaos';return ''};
const currentQuestion=()=>stage===0?copy().state:stage===1?copy().action:copy().reflection;
const showQuestion=()=>{prompt.textContent=currentQuestion();answer.value='';answer.placeholder=stage===0?'stable / loaded / chaos':'';confirmBox.hidden=true;answer.focus({preventScroll:true})};
$('[data-voice-start]').addEventListener('click',()=>{stage=0;draft={state:'',action:'',reflection:''};showQuestion();status.textContent=copy().start});
$('[data-voice-form]').addEventListener('submit',e=>{
 e.preventDefault();if(stage<0)return;
 const value=clean(answer.value);if(!value){status.textContent='One answer is needed.';return}
 if(stage===0){const normalized=normalizeState(value);if(!normalized){status.textContent=copy().error;return}draft.state=normalized}
 if(stage===1)draft.action=value.slice(0,180);
 if(stage===2)draft.reflection=value.slice(0,180);
 if(stage<2){stage++;showQuestion();status.textContent='';return}
 confirmBox.hidden=false;
 review.textContent='STATE: '+draft.state.toUpperCase()+' • ACTION: '+draft.action+' • SIGNAL: '+draft.reflection;
 status.textContent=copy().ready;
});
$('[data-voice-cancel]').addEventListener('click',()=>{confirmBox.hidden=true;answer.focus()});
$('[data-voice-save]').addEventListener('click',()=>{
 if(stage!==2||!draft.state||!draft.action||!draft.reflection)return;
 const key='exit_app_v1';let data;
 try{data=JSON.parse(localStorage.getItem(key)||'null')}catch{data=null}
 if(!data||typeof data!=='object')data={version:1,entries:[],captures:[],reviews:[]};
 if(!Array.isArray(data.entries))data.entries=[];if(!Array.isArray(data.captures))data.captures=[];if(!Array.isArray(data.reviews))data.reviews=[];
 const now=new Date().toISOString(),entry={date:today(),state:draft.state,action:draft.action,status:'planned',control:null,protect:'none',friction:'',updatedAt:now};
 const idx=data.entries.findIndex(x=>x.date===entry.date);
 if(idx<0)data.entries.push(entry);else data.entries[idx]=entry;
 data.captures.push({id:now,at:now,type:'observation',text:'Expected signal: '+draft.reflection});
 data.entries=data.entries.slice(-90);data.captures=data.captures.slice(-120);
 try{localStorage.setItem(key,JSON.stringify(data))}catch{status.textContent='Could not save. Check storage.';return}
 const sprint=read();
 if(valid(sprint)){
   const dayNo=getDay(sprint),i=sprint.checkins.findIndex(x=>Number(x.day)===dayNo);
   const update={...(i>=0?sprint.checkins[i]:{}),day:dayNo,date:today(),state:draft.state==='stable'?'green':draft.state==='loaded'?'yellow':'red',action:draft.action,mission:'planned',control:null,note:''};
   if(i<0)sprint.checkins.push(update);else sprint.checkins[i]=update;
   sprint.controlRoom=sprint.controlRoom||{};sprint.controlRoom.appV1=data;
   if(!store(sprint))status.textContent='Saved locally, but sprint sync was unavailable.';
 }
 stage=-1;confirmBox.hidden=true;answer.value='';prompt.textContent=copy().saved;
 if(!status.textContent.includes('unavailable'))status.textContent='Saved locally. Refresh to see today’s control point.';
});
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SpeechRecognition){speechButton.disabled=true;speechButton.title='Use text input on this device';status.textContent=copy().offline}
speechButton.addEventListener('click',()=>{
 if(!SpeechRecognition||stage<0)return;
 if(recognition){recognition.abort();recognition=null}
 const rec=new SpeechRecognition();recognition=rec;rec.lang=language.value;rec.interimResults=false;rec.maxAlternatives=1;
 rec.onresult=e=>{if(recognition!==rec)return;answer.value=e.results[0][0].transcript.slice(0,180);status.textContent='Transcript ready. Review before continuing.'};
 rec.onerror=()=>{if(recognition===rec)status.textContent=copy().offline};
 rec.onend=()=>{if(recognition===rec)recognition=null};
 try{rec.start();status.textContent='Listening on this device…'}catch{status.textContent=copy().offline}
});
speakButton.addEventListener('click',()=>{
 if(!('speechSynthesis'in window)||stage<0){status.textContent=copy().offline;return}
 speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(currentQuestion());utter.lang=language.value;utter.rate=.93;speechSynthesis.speak(utter);
});
language.addEventListener('change',()=>{if(stage>=0)prompt.textContent=currentQuestion()});
})();