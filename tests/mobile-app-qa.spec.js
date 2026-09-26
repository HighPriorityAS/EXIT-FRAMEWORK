const { test, expect } = require('@playwright/test');
test.use({ baseURL: 'http://127.0.0.1:4173' });

async function clear(page){await page.goto('/app/');await page.evaluate(()=>localStorage.clear());await page.reload()}
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1)}
async function setControlPoint(page,{state='loaded',action='Close one bounded task',control='5',protect='none',friction='' }={}){
  await page.getByRole('button',{name:new RegExp(state,'i')}).click();
  if(protect!=='none')await page.locator(`input[name="protect"][value="${protect}"]`).check();
  await page.locator('#next-action').fill(action);
  await page.locator('#control-rating').fill(control);
  if(friction)await page.locator('#active-friction').fill(friction);
  await page.getByRole('button',{name:/SET CONTROL POINT/i}).click();
}

for(const width of [390,430,768]) test('v1 core flow '+width,async({page})=>{
  await page.setViewportSize({width,height:900});await clear(page);
  await expect(page.getByRole('heading',{name:'What state are you in?'})).toBeVisible();
  await setControlPoint(page,{state:'chaos',action:'Drink water and clear one immediate obligation',control:'3',protect:'fuel',friction:'Too many decisions'});
  await expect(page.locator('body')).toHaveAttribute('data-state','chaos');
  await expect(page.locator('[data-current-action]')).toHaveText('Drink water and clear one immediate obligation');
  await expect(page.locator('[data-current-protect]')).toHaveText('Food + water');
  await expect(page.locator('[data-control-score]')).toHaveText('3');
  await expect(page.locator('[data-protocol-title]')).toHaveText('Minimum Viable Day');
  await expect(page.getByRole('button',{name:/HISTORY/i})).toBeHidden();
  await page.getByRole('button',{name:'DONE',exact:true}).click();
  await expect(page.locator('[data-current-status]')).toHaveText('DONE');
  await page.reload();
  await expect(page.locator('[data-current-status]')).toHaveText('DONE');
  await noOverflow(page);
});

test('quick capture and history summary',async({page})=>{
  await clear(page);await setControlPoint(page,{state:'stable',action:'Finish one review',control:'7',protect:'rest'});
  await page.getByRole('button',{name:/Capture/i}).click();
  await page.locator('input[name="type"][value="decision"]').check();
  await page.locator('#capture-text').fill('Remove notifications until the review is done');
  await page.getByRole('button',{name:/CAPTURE →/i}).click();
  await page.getByRole('button',{name:/HISTORY/i}).click();
  await expect(page.locator('[data-history-control]')).toHaveText('7.0');
  await expect(page.locator('[data-capture-log]')).toContainText('Remove notifications until the review is done');
});

test('mirrors v1 data into existing sprint state',async({page})=>{
  await clear(page);
  await page.evaluate(()=>localStorage.setItem('exit_control_sprint_v1',JSON.stringify({version:2,startedAt:new Date().toISOString().slice(0,10),constraint:'Unstructured load',outcome:'Start deliberately',baseline:4,protect:'Recovery',priority:'One action',checkins:[],reviews:[],controlRoom:{},controlSystem:null,completedAt:null})));
  await page.reload();await setControlPoint(page,{state:'loaded',action:'Close one bounded task',control:'6',protect:'environment',friction:'Notifications'});
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('exit_control_sprint_v1')));
  expect(state.checkins).toHaveLength(1);expect(state.checkins[0].state).toBe('yellow');expect(state.checkins[0].control).toBe(6);
  expect(state.controlRoom.appV1.entries).toHaveLength(1);expect(state.controlRoom.appV1.entries[0].friction).toBe('Notifications');
});

test('re-entry has no catch-up debt',async({page})=>{
  await clear(page);
  await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()-3);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem('exit_app_v1',JSON.stringify({version:1,entries:[{date,state:'loaded',action:'Reduce the surface',status:'completed',control:4,protect:'rest',friction:''}],captures:[],reviews:[]}))});
  await page.reload();await expect(page.locator('[data-reentry]')).toBeVisible();await expect(page.locator('[data-reentry-copy]')).toContainText('Nothing to repay');
});

test('weekly review becomes useful after seven entries',async({page})=>{
  await clear(page);
  await page.evaluate(()=>{const entries=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;entries.push({date,state:'stable',action:'One bounded action',status:'completed',control:7,protect:'none',friction:'',updatedAt:new Date().toISOString()})}localStorage.setItem('exit_app_v1',JSON.stringify({version:1,entries,captures:[],reviews:[]}))});
  await page.reload();await page.getByRole('button',{name:/REVIEW/i}).click();await expect(page.locator('[data-review-status]')).toContainText('Review due');
  await page.locator('textarea[name="increase"]').fill('Starting from one written control point');
  await page.locator('textarea[name="drift"]').fill('Opening new work before closing the first loop');
  await page.locator('textarea[name="remove"]').fill('Optional notifications');
  await page.locator('textarea[name="next"]').fill('Protect the first control point');
  await page.getByRole('button',{name:/SAVE REVIEW/i}).click();
  await expect(page.locator('[data-review-form-status]')).toContainText('Review saved');
});

test('migrates v0 without inventing a control score',async({page})=>{
  await clear(page);
  await page.evaluate(()=>{localStorage.removeItem('exit_app_v1');localStorage.setItem('exit_app_v0',JSON.stringify({version:1,entries:[{date:new Date().toISOString().slice(0,10),state:'stable',action:'Legacy action',status:'planned'}]}))});
  await page.reload();await expect(page.locator('[data-current-action]')).toHaveText('Legacy action');await expect(page.locator('[data-control-score]')).toHaveText('—');
});
