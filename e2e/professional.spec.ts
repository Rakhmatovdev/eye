import {test,expect,type Page} from '@playwright/test';

async function fixtures(page:Page,locale='en',theme='dark') {
  await page.addInitScript(({locale,theme})=>{localStorage.setItem('nexus.locale',JSON.stringify({state:{locale},version:0}));localStorage.setItem('nexus.theme',JSON.stringify({state:{theme},version:0}));},{locale,theme});
  const stamp='2026-10-05T08:00:00Z';
  const evidence={id:'e1',case_id:'case',title:'Registry document',source:'Public archive',conclusion:'The registry lists the organization at the stated address.',reliability:'high',assessment:'observation',classification:'internal',created_by:'owner',created_at:stamp,files:[]};
  const entities=[{id:'a',type:'organization',classification:'internal',source_id:'registry',properties:{name:'Atlas Research',address:'Tashkent',registration:'A-104'},created_at:stamp,updated_at:stamp},{id:'b',type:'organization',classification:'internal',source_id:'registry',properties:{name:'Atlas Consulting',address:'Samarkand',registration:'B-205'},created_at:stamp,updated_at:stamp}];
  let research={case_id:'case',version:1,classification:'internal',cards:[{id:'card1',kind:'evidence',ref_id:'e1',note:'Verify the registry date against the original document.',x:40,y:40},{id:'card2',kind:'entity',ref_id:'a',note:'Compare the registered address with the case documents.',x:420,y:180}],links:[{from:'card1',to:'card2',label:'Source reference'}],hypotheses:[{id:'h1',title:'The addresses refer to different offices',status:'open',notes:'Check the effective dates before drawing a conclusion.',supporting:['e1'],opposing:[]}],checklist:[{id:'c1',title:'Verify source provenance',done:false}],report_outline:'Purpose\n\nFindings\n\nEvidence\n\nLimitations',updated_at:stamp,updated_by:'owner'};
  const watches=[{id:'watch',baseline:{...entities[0],properties:{...entities[0].properties,address:'Bukhara'}},current:entities[0],captured_at:stamp}];
  const tasks=[{id:'task',case_id:'case',title:'Verify document provenance',description:'Check the primary source.',assignee_id:'owner',status:'open',created_by:'owner',created_at:stamp,updated_at:stamp,history:[],overdue:true,due_at:'2026-01-01T08:00:00Z'}];
  const reports=[{id:'r2',case_id:'case',version:2,title:'Registry review',summary:'Address differences require follow-up.',evidence:[evidence],classification:'internal',sha256:'abc',status:'draft',created_by:'owner',created_at:stamp},{id:'r1',case_id:'case',version:1,title:'Registry review',summary:'Initial registry assessment.',evidence:[{...evidence,conclusion:'An initial registry observation.'}],classification:'internal',sha256:'def',status:'draft',created_by:'owner',created_at:stamp}];
  await page.route('**/api/v1/**',async route=>{
    const req=route.request();const path=new URL(req.url()).pathname.replace('/api/v1','');let data:unknown=[];
    if(path==='/auth/me')data={id:'owner',first_name:'Case',last_name:'Analyst',email:'analyst@example.test',role:'analyst',clearance_level:5,status:'active'};
    else if(path==='/cases')data=[{id:'case',title:'Registry review',description:'Cross-check documents and record supported conclusions.',status:'open',priority:'medium',owner_id:'owner',created_at:stamp}];
    else if(path==='/cases/case/workspace')data={can_write:true,can_review:true,participants:[{id:'owner',name:'Case Analyst',role:'owner'}]};
    else if(path==='/cases/case/research'){if(req.method()==='PUT')research={...req.postDataJSON(),version:research.version+1};data=research;}
    else if(path==='/cases/case/entities')data=entities;
    else if(path==='/cases/case/evidence')data=[evidence];
    else if(path==='/cases/case/tasks')data=tasks;
    else if(path==='/cases/case/report-versions')data=reports;
    else if(path==='/cases/case/entity-watches')data=watches;
    else if(path==='/workspace/case-templates')data=[{id:'general',title:'General investigation',tasks:['Define the scope','Verify sources','Review the findings'],checklist:['Verify source provenance'],outline:'Purpose\n\nFindings\n\nEvidence\n\nLimitations'}];
    else if(path==='/cases/case/apply-template')data=research;
    else if(path==='/workspace/preferences')data={widgets:['stats','cases','alerts'],pinned_project_ids:[]};
    await route.fulfill({json:{success:true,data,meta:{total:Array.isArray(data)?data.length:0}}});
  });
}

test('seven tools render, board movement persists, and reports show changed evidence',async({page})=>{
  await fixtures(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/workbench?case=case&tab=templates');
  await expect(page.getByRole('button',{name:'Apply template'})).toBeVisible();
  await page.getByRole('button',{name:'Apply template'}).click();
  await expect(page.getByRole('button',{name:'Saved',exact:true})).toBeVisible();
  await page.screenshot({path:'../.runtime/new-features-preview/templates-desktop.png'});
  await page.getByRole('link',{name:'Evidence board',exact:true}).click();
  const handle=page.getByRole('button',{name:'Registry document: Verify the registry date against the original document.'});
  await handle.focus();await page.keyboard.press('ArrowRight');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByText('Saved',{exact:true})).toBeVisible();
  await expect(page.locator('.pro-card').first()).toHaveCSS('left','60px');
  await page.screenshot({path:'../.runtime/new-features-preview/board-desktop.png'});
  await page.getByRole('link',{name:'Hypotheses',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Title'}).nth(1)).toHaveValue('The addresses refer to different offices');
  await page.screenshot({path:'../.runtime/new-features-preview/hypotheses-desktop.png'});
  await page.getByRole('link',{name:'Compare entities',exact:true}).click();
  await expect(page.getByRole('table')).toContainText('Samarkand');
  await page.getByRole('checkbox',{name:'Differences only'}).check();
  await expect(page.getByRole('table')).not.toContainText('classification');
  await page.screenshot({path:'../.runtime/new-features-preview/comparison-desktop.png'});
  await page.getByRole('link',{name:'Changes',exact:true}).click();
  await expect(page.getByRole('table')).toContainText('Bukhara');
  await page.getByRole('link',{name:'Team workload',exact:true}).click();
  await expect(page.getByRole('table')).toContainText('Case Analyst');
  await page.screenshot({path:'../.runtime/new-features-preview/workload-desktop.png'});
  await page.getByRole('link',{name:'Report versions',exact:true}).click();
  await page.getByRole('button',{name:'Compare',exact:true}).click();
  await expect(page.getByText('Changed evidence: 1')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Uzbek mobile layout contains horizontal scrolling within the board',async({page})=>{
  await page.setViewportSize({width:390,height:844});await fixtures(page,'uz','light');
  await page.goto('/workbench?case=case&tab=canvas');
  await expect(page.locator('.pro-card').first()).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({path:'../.runtime/new-features-preview/board-mobile-uz.png'});
  await page.goto('/workbench?case=case&tab=hypotheses');
  await expect(page.getByRole('button',{name:'Gipoteza qo‘shish'})).toBeVisible();
  await page.screenshot({path:'../.runtime/new-features-preview/hypotheses-mobile-uz.png'});
});
