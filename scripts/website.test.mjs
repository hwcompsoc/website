import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {links,route,legacyPath,suggestPath,canonicalPath,pagePath,pages,events,resources,filterEvents,calendar,enquiryMail,liveEvent} from '../src/content.ts';
import {missingSteps,slugify,ukInputToIso,isoToUkInput,blankEvent,eventDetailsText,passwordProblem,adminRoute,safeNext,checklist,progress,nextStep,eventTab,whenToIso,isoToWhen,whenProblems,slugAttempt,editableFields,shortDate,fullDate,timeRange,sitePhase,siteBusy,siteSlow,badgeFor,matchesSite} from '../src/admin-rules.ts';
test('Visitor site keeps all six routes and the exact user-supplied joining/contact destinations',()=>{
 assert.equal(pages.length,6);for(const page of pages)assert.deepEqual(route(pagePath(page.id)),{view:page.id,item:''});
 assert.equal(links.discord,'https://discord.gg/VwXhpb7mZW');assert.equal(links.instagram,'https://www.instagram.com/hwcompsoc');assert.equal(links.membership,'https://www.hwunion.com/societies/compsci/');assert.equal(links.email,'compsci.society@hw.ac.uk');
});
test('Paths resolve to pages and items, and anything else is not found',()=>{
 assert.deepEqual(route('/Events/'),{view:'events',item:''});assert.equal(canonicalPath('/Events/'),'/events');
 for(const resource of resources)assert.deepEqual(route('/resources/'+resource.id),{view:'resources',item:resource.id});
 assert.ok(!pages.some(p=>p.id==='admin'));
 for(const path of ['/unknown','/home','/events/nope','/resources/nope','/about/team','/events/web/extra'])assert.equal(route(path).view,'notfound',path);
});
test('Live events become site events in UK time, and real calendar files carry no prototype labels',()=>{
 const row={slug:'real-talk',title:'Real, talk',category:'Industry',level:'Everyone welcome',starts_at:'2027-07-01T17:30:00Z',ends_at:'2027-07-01T19:00:00Z',venue:'EM1.82',description:'A talk',signup_required:true,luma_url:'https://luma.com/x',status:'published'};
 const summer=liveEvent(row,Date.parse('2027-01-01'));assert.equal(summer.id,'real-talk');assert.equal(summer.day,'01');assert.equal(summer.month,'JUL');assert.equal(summer.date,'Thursday 1 July 2027');assert.equal(summer.time,'18:30–20:00 BST');assert.equal(summer.start,'20270701T173000Z');assert.equal(summer.past,false);assert.equal(summer.luma,'https://luma.com/x');assert.ok(!summer.sample);
 const winter=liveEvent({...row,starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',signup_required:false,status:'cancelled'},Date.parse('2027-02-01'));assert.equal(winter.time,'17:30–19:00 GMT');assert.equal(winter.past,true);assert.equal(winter.cancelled,true);assert.equal(winter.luma,undefined);
 const file=calendar(summer);assert.ok(!file.includes('PROTOTYPE'));assert.ok(!file.includes('example'));assert.ok(file.includes('UID:real-talk@hwcompsoc'));assert.ok(file.includes('SUMMARY:Real\\, talk'));assert.ok(calendar(winter).includes('STATUS:CANCELLED'));
});
test('The form explains exactly what stands between an event and going live',()=>{
 const ready={...blankEvent(),title:'Talk',slug:'talk',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'EM1.82',description:'A talk',native_url:'https://native.fm/x',luma_url:'https://luma.com/x',socials_sent:true};
 assert.deepEqual(missingSteps(ready),[]);assert.ok(missingSteps(blankEvent()).length>5);
 assert.deepEqual(missingSteps({...ready,native_url:null}),['Create it on Native and paste the link']);assert.deepEqual(missingSteps({...ready,luma_url:null}),['Create it on Luma and paste the link']);assert.deepEqual(missingSteps({...ready,luma_url:null,signup_required:false}),[]);assert.deepEqual(missingSteps({...ready,socials_sent:false}),['Send the details to Amanda and Kevin']);assert.deepEqual(missingSteps({...ready,native_url:'javascript:alert(1)'}),['Create it on Native and paste the link']);assert.deepEqual(missingSteps({...ready,ends_at:ready.starts_at}),['Make the end time later than the start']);
 assert.equal(slugify('Your First Web App!'),'your-first-web-app');assert.equal(slugify('Café & Code'),'cafe-and-code');assert.equal(slugify('---'),'');assert.ok(slugify('x'.repeat(90)).length<=60);
 assert.equal(ukInputToIso('2027-07-01T18:30'),'2027-07-01T17:30:00.000Z');assert.equal(ukInputToIso('2027-01-14T18:30'),'2027-01-14T18:30:00.000Z');assert.equal(isoToUkInput('2027-07-01T17:30:00Z'),'2027-07-01T18:30');assert.equal(isoToUkInput('2027-01-14T18:30:00Z'),'2027-01-14T18:30');assert.equal(ukInputToIso(''),null);assert.equal(isoToUkInput(null),'');
 assert.ok(eventDetailsText(ready).includes('Sign up: https://luma.com/x'));
});
test('Admin routes and the return address after sign-in',()=>{
 const id='3647cf31-c4d8-467e-88a9-cd3b12d256b6';const name=path=>adminRoute(path).name;
 assert.equal(name('/admin'),'overview');assert.equal(name('/admin/'),'overview');assert.equal(name('/admin/login'),'login');assert.equal(name('/admin/set-password'),'set-password');assert.equal(name('/admin/account'),'account');assert.equal(name('/admin/events'),'events');assert.equal(name('/admin/events/new'),'new');assert.deepEqual(adminRoute('/admin/events/'+id),{name:'event',id});assert.deepEqual(adminRoute('/admin/events/'+id+'/edit'),{name:'edit',id});
 for(const bad of ['/admin/nope','/admin/events/nope','/admin/events/'+id+'/nope','/admin/events/new/x','/admin/login/x','/admin/people'])assert.equal(name(bad),'notfound',bad);
 assert.equal(safeNext('/admin/events?tab=past'),'/admin/events?tab=past');for(const bad of [null,'','https://evil.example','//evil.example','/events','/administrator','/admin//evil.example','/admin/login','/admin/set-password'])assert.equal(safeNext(bad),'/admin',String(bad));
});
test('The checklist adapts to sign-up, and events sort into the right tab',()=>{
 const empty=blankEvent();assert.deepEqual(checklist(empty).map(s=>s.id),['details','native','luma','socials']);assert.deepEqual(checklist({...empty,signup_required:false}).map(s=>s.id),['details','native','socials']);assert.deepEqual(progress(empty),{done:0,total:4});assert.equal(nextStep(empty),'Finish the event details');
 const full={...empty,title:'T',slug:'t',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'V',description:'D'};assert.equal(nextStep(full),'Create it on Native');assert.deepEqual(progress({...full,native_url:'https://n.co/x',luma_url:'https://l.co/x',socials_sent:true}),{done:4,total:4});
 const now=Date.parse('2027-02-01');assert.equal(eventTab(full,now),'drafts');assert.equal(eventTab({...full,status:'published'},now),'past');assert.equal(eventTab({...full,status:'published'},Date.parse('2027-01-01')),'upcoming');assert.equal(eventTab({...full,status:'cancelled'},Date.parse('2027-01-01')),'cancelled');
 assert.ok(!('id' in editableFields({...full,id:'x',published_at:'y'})));assert.ok(!('published_at' in editableFields({...full,id:'x',published_at:'y'})));
});
test('Dates and times in the form mean UK time, including events past midnight',()=>{
 assert.deepEqual(whenToIso({date:'2027-07-01',start:'18:30',end:'20:00',nextDay:false}),{starts_at:'2027-07-01T17:30:00.000Z',ends_at:'2027-07-01T19:00:00.000Z'});
 assert.deepEqual(whenToIso({date:'2027-01-14',start:'23:00',end:'01:00',nextDay:true}),{starts_at:'2027-01-14T23:00:00.000Z',ends_at:'2027-01-15T01:00:00.000Z'});assert.deepEqual(whenToIso({date:'2027-01-31',start:'23:00',end:'01:00',nextDay:true}).ends_at,'2027-02-01T01:00:00.000Z');
 assert.deepEqual(isoToWhen('2027-07-01T17:30:00Z','2027-07-01T19:00:00Z'),{date:'2027-07-01',start:'18:30',end:'20:00',nextDay:false});assert.equal(isoToWhen('2027-01-14T23:00:00Z','2027-01-15T01:00:00Z').nextDay,true);assert.deepEqual(isoToWhen(null,null),{date:'',start:'',end:'',nextDay:false});
 assert.deepEqual(whenToIso({date:'',start:'18:00',end:'',nextDay:false}),{starts_at:null,ends_at:null});
 assert.ok(whenProblems({date:'2027-01-14',start:'23:00',end:'01:00',nextDay:false},'V').end);assert.deepEqual(whenProblems({date:'2027-01-14',start:'23:00',end:'01:00',nextDay:true},'V'),{});assert.equal(Object.keys(whenProblems({date:'',start:'',end:'',nextDay:false},'')).length,4);assert.deepEqual(whenProblems({date:'',start:'',end:'',nextDay:false},'',false),{});
 assert.equal(slugAttempt('talk',1),'talk');assert.equal(slugAttempt('talk',2),'talk-2');assert.ok(slugAttempt('x'.repeat(60),12).length<=60);assert.equal(shortDate('2027-07-01T17:30:00Z'),'01 JUL');assert.equal(fullDate('2027-07-01T17:30:00Z'),'Thursday 1 July 2027');assert.equal(timeRange('2027-07-01T17:30:00Z','2027-07-01T19:00:00Z'),'18:30–20:00');
});
test('The admin only says an event is live once the public site really has it',()=>{
 const event={...blankEvent(),title:'Talk',slug:'talk',starts_at:'2030-01-01T18:00:00+00:00',ends_at:'2030-01-01T19:00:00+00:00',venue:'V',description:'D',signup_required:false,status:'published',published_at:'x'};const row={slug:'talk',title:'Talk',category:event.category,level:event.level,starts_at:'2030-01-01T18:00:00.000Z',ends_at:'2030-01-01T19:00:00.000Z',venue:'V',description:'D',signup_required:false,luma_url:null,status:'published'};
 assert.equal(matchesSite(event,row),true);assert.equal(sitePhase(event,[]),'publishing');assert.equal(sitePhase(event,[row]),'live');assert.equal(sitePhase({...event,venue:'New'},[row]),'updating');assert.equal(sitePhase({...event,status:'cancelled'},[row]),'updating');assert.equal(sitePhase({...event,status:'cancelled'},[{...row,status:'cancelled'}]),'live');assert.equal(sitePhase({...event,status:'draft'},[row]),'removing');assert.equal(sitePhase({...event,status:'draft'},[]),'hidden');assert.equal(sitePhase(event,null),'unknown');assert.equal(sitePhase({...blankEvent(),slug:'new'},null),'hidden');
 assert.equal(siteBusy('publishing'),true);assert.equal(siteBusy('live'),false);assert.equal(siteBusy('unknown'),false);assert.equal(badgeFor(event,'publishing').label,'Going live');assert.equal(badgeFor(event,'live').label,'Live');assert.equal(badgeFor(event,'updating').label,'Updating');
 assert.equal(siteSlow({...event,updated_at:new Date(1000).toISOString()},1000+11*60000),true);assert.equal(siteSlow({...event,updated_at:new Date(1000).toISOString()},1000+60000),false);assert.equal(siteSlow(event),false);
});
test('Weak passwords are turned down',()=>{
 for(const weak of ['short','changeme123','changeme12345','Password12345','hwcompsoc2026!','123456789012'])assert.ok(passwordProblem(weak),weak);assert.equal(passwordProblem('purple-otter-lamp-river'),null);
});
test('Old hash links lead to their new paths',()=>{
 assert.equal(legacyPath('#events'),'/events');assert.equal(legacyPath('#home'),'/');assert.equal(legacyPath('#resources/support'),'/resources?category=support');assert.equal(legacyPath('#resources'),'/resources');assert.equal(legacyPath('#main-content'),null);assert.equal(legacyPath(''),null);
});
test('Did you mean finds close addresses and stays quiet otherwise',()=>{
 for(const [typed,expected] of [['/evnts','/events'],['/abuot','/about'],['/partner','/partners'],['/jion','/join'],['/RESORCES','/resources'],['/home','/'],['/events/wbe','/events'],['/resources/gti','/resources/git'],['/events/nope','/events'],['/evnts/nope','/events']])assert.equal(suggestPath(typed),expected,typed);
 for(const typed of ['/x','/abc','/wp-admin','/contact','/'])assert.equal(suggestPath(typed),null,typed);
});
test('The host sends every address to the app, so paths survive a refresh',()=>{
 const {rewrites}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.deepEqual(rewrites,[{source:'/(.*)',destination:'/index.html'}]);
});
test('Event filters separate past events, and there are no sample events left',()=>{
 assert.deepEqual(events,[]);assert.deepEqual(filterEvents('All','',false),[]);
 const base={title:'Talk',category:'Workshop',level:'Everyone welcome',venue:'EM1.82',description:'A talk',signup_required:false,luma_url:null,status:'published'};const list=[liveEvent({...base,slug:'next',starts_at:'2030-01-01T18:00:00Z',ends_at:'2030-01-01T19:00:00Z'}),liveEvent({...base,slug:'old',category:'Industry',starts_at:'2020-01-01T18:00:00Z',ends_at:'2020-01-01T19:00:00Z'})];
 assert.deepEqual(filterEvents('All','',false,list).map(e=>e.id),['next']);assert.deepEqual(filterEvents('All','',true,list).map(e=>e.id),['old']);assert.equal(filterEvents('Industry','',false,list).length,0);assert.equal(filterEvents('All','unlikely unmatched phrase',false,list).length,0);
 const text=calendar(list[0]);assert.ok(text.includes('DTSTART:20300101T180000Z'));assert.ok(!text.includes('ATTENDEE:'));assert.ok(text.endsWith('\r\n'));
 const href=enquiryMail('Example & team','review@example.invalid','Workshop','A local example only.');assert.ok(href.startsWith('mailto:compsci.society@hw.ac.uk?'));assert.ok(decodeURIComponent(href).includes('Example & team'));
});
test('The favicon is the official cursor, with its body following the system theme',()=>{
 const root=new URL('../',import.meta.url);const icon=readFileSync(new URL('public/website-assets/favicon.svg',root),'utf8');const blue=readFileSync(new URL('public/website-assets/cursor-blue.svg',root),'utf8');const white=readFileSync(new URL('public/website-assets/cursor-white.svg',root),'utf8');
 const css=icon.match(/<style>(.*?)<\/style>/)[1];assert.ok(/prefers-color-scheme:dark/.test(css));const plain=icon.replace(/<style>.*?<\/style>/,'');
 assert.equal(plain.replaceAll('class="body"','fill="#004066"'),blue);assert.equal(plain.replaceAll('class="body"','fill="#FFFFFF"'),white);assert.ok(readFileSync(new URL('index.html',root),'utf8').includes('href="/website-assets/favicon.svg"'));
});
test('Class names stay clear of what ad blockers hide',()=>{
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+'/'+entry.name):[dir+'/'+entry.name]);const risky=/^(ad|ads|advert|advertisement|sponsor|banner)([-_]|$)/;const found=[];
 for(const file of walk(new URL('../src',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')).filter(f=>/\.(tsx|css)$/.test(f))){const text=readFileSync(file,'utf8');const names=file.endsWith('.css')?[...text.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]):[...text.matchAll(/className="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/));for(const name of names)if(risky.test(name)||name==='footer-cta')found.push(file.split('/src/')[1]+': '+name)}
 assert.deepEqual(found,[]);
});
test('Visitor branding uses byte-identical official SVG assets',()=>{
 const root=new URL('../',import.meta.url);for(const name of ['compsoc-blue.svg','compsoc-white.svg','cursor-blue.svg','cursor-white.svg']){const type=name.startsWith('cursor')?'icons':'logos';assert.deepEqual(readFileSync(new URL('public/website-assets/'+name,root)),readFileSync(new URL(`../asset-library/${type}/svg/${name}`,root)));}
});
