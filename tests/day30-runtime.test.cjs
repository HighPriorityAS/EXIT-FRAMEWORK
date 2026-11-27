const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const key = 'exit_control_sprint_v1';
const readScript = name => readFileSync(join(__dirname, '..', name), 'utf8');
const day30 = { date:'2026-10-30', day:30, state:'green', control:9, action:'  closing evidence  ', mission:'completed', note:'  keep evidence  ' };
const completed = () => ({
  version:2, startedAt:'2026-10-01', completedAt:'2026-10-30', baseline:5,
  constraint:'Synthetic', outcome:'Synthetic outcome', protect:'Synthetic base',
  controlSystem:{priority:'One action',currentReality:'Synthetic system'},
  reviews:[], checkins:[day30], controlRoom:{activeFriction:{statement:'Fixture',status:'active'}}
});

function harness(initial, { adapter = false } = {}) {
  let date = '2026-10-30';
  let stored = JSON.stringify(initial);
  let savedCount = 0;
  const storage = {
    getItem: k => k === key ? stored : null,
    setItem: (k, v) => { if (k === key) { stored = v; savedCount++; } },
    removeItem: k => { if (k === key) stored = null; }
  };
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [date + 'T12:00:00Z'])); }
  }
  function page(script) {
    let copied;
    function el() {
      const callbacks = {};
      const fields = new Map();
      return {
        callbacks, value:'', hidden:false, textContent:'', dataset:{}, style:{}, classList:{toggle(){}},
        addEventListener:(name, cb)=>callbacks[name]=cb,
        querySelector: sel => sel.endsWith(':checked')
          ? {value:sel.includes('"mission"')?'changed':'yellow'} : null,
        querySelectorAll:()=>[], setAttribute(){}, removeAttribute(){}, reset(){}, focus(){},
        elements:new Proxy({}, {get(_t, k){
          if(!fields.has(k)) fields.set(k,{value:'',addEventListener(){},focus(){}});
          return fields.get(k);
        }})
      };
    }
    const elements = new Map();
    const get = name => { if (!elements.has(name)) elements.set(name,el()); return elements.get(name); };
    const env = { Date:FakeDate, localStorage:storage, document:{querySelector:get,querySelectorAll:()=>[]},
      window:{addEventListener(){},...(adapter ? {ExitState:{
        load:()=>JSON.parse(storage.getItem(key)), save:v=>{ storage.setItem(key,JSON.stringify(v));return true;}
      }} : {})}, navigator:{clipboard:{writeText:async s=>{copied=s;}}}, console };
    vm.runInNewContext(readScript(script),env,{filename:script});
    const form = name => get(name);
    return {
      get, submit(name, values) { const f=form(name);for (const [k,v] of Object.entries(values)) f.elements[k].value=v;return f.callbacks.submit({preventDefault(){}}); },
      async copy() { await get('[data-summary-copy]').callbacks.click();return copied; }
    };
  }
  return { page, at: value=>{date=value;}, get:()=>JSON.parse(stored), replace:v=>{stored=JSON.stringify(v);}, clear:()=>storage.removeItem(key), writes:()=>savedCount };
}
const log = '[data-cr-log-form]';
const sprint = '30-day-control-sprint.js';
const room = 'control-room.js';
for (const adapter of [false,true]) test(`completed Sprint and copied summary survive runtime saves (${adapter?'adapter interface':'local storage'})`, async () => {
  const h=harness(completed(),{adapter});
  const before=await h.page(sprint).copy();
  assert.match(before,/Day 30 control: 9\/10/);
  const cr=h.page(room);
  h.at('2026-10-31'); cr.submit(log,{action:'First',control:3,note:'one'});
  assert.deepEqual(h.get().checkins,[day30]);
  h.at('2026-11-01'); cr.submit(log,{action:'Second',control:4,note:'two'});
  assert.deepEqual(Object.keys(h.get().controlRoom.runtimeCheckins),['2026-10-31','2026-11-01']);
  assert.equal(h.get().controlRoom.activeFriction.statement,'Fixture');
  cr.submit(log,{action:'Edited second',control:6,note:'two changed'});
  assert.equal(Object.keys(h.get().controlRoom.runtimeCheckins).length,2);
  assert.equal(h.get().controlRoom.runtimeCheckins['2026-10-31'].action,'First');
  const reopened=h.page(room);
  assert.equal(reopened.get('[data-cr-last-meta]').textContent,'Runtime · 2026-11-01');
  assert.equal(reopened.get('[data-cr-last-action]').textContent,'Edited second');
  assert.equal(reopened.get('[data-cr-control]').textContent,6);
  assert.deepEqual(h.get().checkins,[day30]);
  assert.equal(await h.page(sprint).copy(),before);
});
test('the actual Day 30 remains editable before completion',()=>{
  const h=harness({...completed(),completedAt:null});
  h.page(room).submit(log,{action:'Day 30 edit',control:8});
  assert.equal(h.get().checkins.length,1);
  assert.equal(h.get().checkins[0].action,'Day 30 edit');
  assert.equal(h.get().controlRoom.runtimeCheckins,undefined);
});
test('an old Sprint tab cannot change check-in, review or final report after completion',()=>{
  const h=harness({...completed(),completedAt:null});
  const stale=h.page(sprint);
  const saved=completed(); h.replace(saved);
  stale.submit('[data-checkin-form]',{action:'stale',control:0});
  stale.submit('[data-review-form]',Object.fromEntries(['improved','friction','worked','remove','priority'].map(k=>[k,'stale'])));
  stale.submit('[data-control-system-form]',Object.fromEntries(['notNow','failureProtocol','decisionRule','dailyLoop','weeklyLoop','warningSignal','controlSignal','next30'].map(k=>[k,'stale'])));
  assert.deepEqual(h.get(),saved); assert.equal(h.writes(),0);
});
test('an old Control Room tab cannot recreate removed data',()=>{
  const h=harness(completed());
  const stale=h.page(room); h.clear();
  stale.submit(log,{action:'stale',control:0});
  assert.equal(h.get(),null); assert.equal(h.writes(),0);
});
