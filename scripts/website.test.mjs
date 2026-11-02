import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {links,route,legacyPath,suggestPath,canonicalPath,pagePath,pages,events,resources,filterEvents,enquiryMail,liveEvent} from '../src/content.ts';
import {calendar,calendarFeed,eventCalendarLinks,eventFilePath,feedCalendarLinks} from '../src/calendar.ts';
import {sharePage,sharePages,DEFAULT_IMAGE} from '../src/share.ts';
import {coverDownload,coverProblem,coverSize,coverUrl,missingSteps,slugify,ukInputToIso,isoToUkInput,blankEvent,eventDetailsText,passwordProblem,adminRoute,safeNext,checklist,progress,nextStep,eventTab,whenToIso,isoToWhen,whenProblems,slugAttempt,editableFields,shortDate,fullDate,timeRange,sitePhase,siteBusy,siteSlow,badgeFor,matchesSite} from '../src/admin-rules.ts';
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
 const ready={...blankEvent(),title:'Talk',slug:'talk',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'EM1.82',description:'A talk',cover_path:'00000000-0000-0000-0000-000000000000.jpg',square_path:'00000000-0000-0000-0000-000000000001.jpg',cover_alt:'A poster',native_url:'https://native.fm/x',luma_url:'https://luma.com/x',socials_sent:true};
 assert.deepEqual(missingSteps(ready),[]);assert.ok(missingSteps(blankEvent()).length>5);
 assert.deepEqual(missingSteps({...ready,native_url:null}),['Create it on Native and paste the link']);assert.deepEqual(missingSteps({...ready,luma_url:null}),['Create it on Luma and paste the link']);assert.deepEqual(missingSteps({...ready,luma_url:null,signup_required:false}),[]);assert.deepEqual(missingSteps({...ready,socials_sent:false}),['Send the details to Amanda and Kevin']);assert.deepEqual(missingSteps({...ready,native_url:'javascript:alert(1)'}),['Create it on Native and paste the link']);assert.deepEqual(missingSteps({...ready,ends_at:ready.starts_at}),['Make the end time later than the start']);
 assert.equal(slugify('Your First Web App!'),'your-first-web-app');assert.equal(slugify('Café & Code'),'cafe-and-code');assert.equal(slugify('---'),'');assert.ok(slugify('x'.repeat(90)).length<=60);
 assert.equal(ukInputToIso('2027-07-01T18:30'),'2027-07-01T17:30:00.000Z');assert.equal(ukInputToIso('2027-01-14T18:30'),'2027-01-14T18:30:00.000Z');assert.equal(isoToUkInput('2027-07-01T17:30:00Z'),'2027-07-01T18:30');assert.equal(isoToUkInput('2027-01-14T18:30:00Z'),'2027-01-14T18:30');assert.equal(ukInputToIso(''),null);assert.equal(isoToUkInput(null),'');
 assert.ok(eventDetailsText(ready).includes('Sign up: https://luma.com/x'));
});
test('Admin routes and the return address after sign-in',()=>{
 const id='3647cf31-c4d8-467e-88a9-cd3b12d256b6';const name=path=>adminRoute(path).name;
 assert.equal(name('/admin/people'),'people');assert.equal(name('/admin/people/x'),'notfound');assert.equal(name('/admin'),'overview');assert.equal(name('/admin/'),'overview');assert.equal(name('/admin/login'),'login');assert.equal(name('/admin/set-password'),'set-password');assert.equal(name('/admin/account'),'account');assert.equal(name('/admin/events'),'events');assert.equal(name('/admin/events/new'),'new');assert.deepEqual(adminRoute('/admin/events/'+id),{name:'event',id});assert.deepEqual(adminRoute('/admin/events/'+id+'/edit'),{name:'edit',id});
 for(const bad of ['/admin/nope','/admin/events/nope','/admin/events/'+id+'/nope','/admin/events/new/x','/admin/login/x'])assert.equal(name(bad),'notfound',bad);
 assert.equal(safeNext('/admin/events?tab=past'),'/admin/events?tab=past');for(const bad of [null,'','https://evil.example','//evil.example','/events','/administrator','/admin//evil.example','/admin/login','/admin/set-password'])assert.equal(safeNext(bad),'/admin',String(bad));
});
test('The checklist adapts to sign-up, and events sort into the right tab',()=>{
 const empty=blankEvent();assert.deepEqual(checklist(empty).map(s=>s.id),['details','native','luma','socials']);assert.deepEqual(checklist({...empty,signup_required:false}).map(s=>s.id),['details','native','socials']);assert.deepEqual(progress(empty),{done:0,total:4});assert.equal(nextStep(empty),'Finish the event details');
 const full={...empty,title:'T',slug:'t',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'V',description:'D',cover_path:'00000000-0000-0000-0000-000000000000.jpg',square_path:'00000000-0000-0000-0000-000000000001.jpg',cover_alt:'A poster'};assert.equal(nextStep(full),'Create it on Native');assert.deepEqual(progress({...full,native_url:'https://n.co/x',luma_url:'https://l.co/x',socials_sent:true}),{done:4,total:4});
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
 assert.ok(!readFileSync(new URL('../src/content.ts',import.meta.url),'utf8').includes('sample:true'));
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

test('Event images: both shapes and a description are required to go live, and the form never sends the images',()=>{
 const path='00000000-0000-0000-0000-000000000000.jpg';const ready={...blankEvent(),title:'Talk',slug:'talk',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'EM1.82',description:'A talk',signup_required:false,native_url:'https://native.fm/x',socials_sent:true};
 const square='00000000-0000-0000-0000-000000000001.jpg';const complete={...ready,cover_path:path,square_path:square,cover_alt:'A poster for the talk'};for(const [gap,step] of [[{cover_path:null},'Add a landscape image'],[{square_path:null},'Add a square image'],[{cover_alt:'  '},'Describe the image']]){assert.deepEqual(missingSteps({...complete,...gap}),[step]);assert.equal(checklist({...complete,...gap})[0].done,false)}assert.deepEqual(missingSteps(complete),[]);assert.equal(checklist(complete)[0].done,true);
 assert.equal(coverProblem('cover',1600,900),null);assert.equal(coverProblem('cover',736,412),'That image is only 736 pixels wide. Use one at least 800 wide, so it stays sharp.');assert.equal(coverProblem('cover',1472,824),null);assert.match(coverProblem('cover',1000,1000),/isn’t 16:9/);assert.match(coverProblem('cover',1200,1600),/isn’t 16:9/);assert.match(coverProblem('cover',1500,1000),/isn’t 16:9/);assert.match(coverProblem('cover',700,400),/only 700 pixels/);assert.equal(coverProblem('square',1080,1080),null);assert.equal(coverProblem('square',1080,1070),null);assert.match(coverProblem('square',1080,1350),/isn’t square/);assert.match(coverProblem('square',500,500),/only 500 pixels/);assert.ok(coverDownload(square,'a b.jpg').endsWith(square+'?download=a%20b.jpg'));
 const sent=editableFields(complete);assert.equal('cover_path' in sent,false);assert.equal('square_path' in sent,false);assert.equal(sent.cover_alt,'A poster for the talk');
 assert.deepEqual(coverSize(4000,2000,1600),{width:1600,height:800});assert.deepEqual(coverSize(1000,2000,1600),{width:800,height:1600});assert.deepEqual(coverSize(900,600,1600),{width:900,height:600});
 assert.ok(coverUrl(path,true).endsWith('/event-covers/00000000-0000-0000-0000-000000000000-thumb.jpg'));assert.ok(eventDetailsText(complete).includes(`Square image: https://xirsiblrzrfahslrloya.supabase.co/storage/v1/object/public/event-covers/${square}`));
 const row={slug:'talk',title:'Talk',category:'Workshop',level:'Everyone welcome',starts_at:ready.starts_at,ends_at:ready.ends_at,venue:'EM1.82',description:'A talk',signup_required:false,luma_url:null,status:'published'};
 const shown=liveEvent({...row,cover_path:path,cover_alt:'A poster for the talk'});assert.equal(shown.coverAlt,'A poster for the talk');assert.equal(shown.cover,'/event-covers/'+path);assert.equal(shown.thumb,'/event-covers/00000000-0000-0000-0000-000000000000-thumb.jpg');assert.equal(liveEvent(row).cover,undefined);
 const live={...complete,status:'published'};const site={...row,cover_path:path,cover_alt:complete.cover_alt};assert.equal(sitePhase(live,[site]),'live');assert.equal(sitePhase(live,[row]),'updating');assert.equal(sitePhase({...live,cover_alt:'New'},[site]),'updating');assert.equal(sitePhase({...live,square_path:'other'},[site]),'live');
});

test('Every address has its own share details, and they are written safely into the page',()=>{
 const base={title:'Rust & "friends"',category:'Workshop',level:'Everyone welcome',venue:'EM1.82',description:'x '.repeat(200),signup_required:false,luma_url:null,status:'published',starts_at:'2027-07-01T17:30:00Z',ends_at:'2027-07-01T19:00:00Z',slug:'rust'};
 const event=liveEvent({...base,cover_path:'00000000-0000-0000-0000-000000000000.jpg',cover_alt:'A crab <holding> a laptop'},Date.parse('2027-01-01'));const list=sharePages([event,liveEvent({...base,slug:'off',status:'cancelled'},Date.parse('2027-01-01'))]);
 const paths=list.map(s=>s.path);for(const path of ['/','/join','/events','/resources','/about','/partners','/events/rust','/events/off','/resources/git'])assert.ok(paths.includes(path),path);assert.equal(new Set(paths).size,paths.length);for(const share of list){assert.ok(share.title.endsWith(' · HW CompSoc'));assert.ok(share.description.length>0&&share.description.length<=200,share.path);assert.equal(route(share.path).view==='notfound',share.path.startsWith('/events/'),share.path)}
 const shared=list.find(s=>s.path==='/events/rust');assert.equal(shared.image,'/event-covers/00000000-0000-0000-0000-000000000000.jpg');assert.ok(shared.description.startsWith('Thursday 1 July 2027, 18:30–20:00 BST, EM1.82. '));assert.equal(list.find(s=>s.path==='/about').image,DEFAULT_IMAGE);assert.ok(list.find(s=>s.path==='/events/off').description.startsWith('Cancelled. '));
 const template='<html><head><meta name="description" content="old"><title>old</title></head></html>';const page=sharePage(template,shared,'https://example.com');
 assert.ok(page.includes('<title>Rust &amp; &quot;friends&quot; · HW CompSoc</title>'));assert.ok(!page.includes('content="old"')&&!page.includes('<title>old'));assert.ok(page.includes('<meta property="og:image" content="https://example.com/event-covers/00000000-0000-0000-0000-000000000000.jpg">'));assert.ok(page.includes('<meta property="og:url" content="https://example.com/events/rust">'));assert.ok(page.includes('content="A crab &lt;holding&gt; a laptop"'));assert.ok(page.includes('<link rel="canonical" href="https://example.com/events/rust">'));
 assert.ok(sharePage(template,list.find(s=>s.path==='/'),'https://example.com').includes('<meta property="og:url" content="https://example.com">'));const local=sharePage(template,shared,'');assert.ok(!local.includes('og:image'));assert.ok(local.includes('<meta property="og:title"'));
 assert.ok(readFileSync(new URL('../public'+DEFAULT_IMAGE,import.meta.url)).length>1000);
});

test('Calendar files follow the format, and their links carry the event',()=>{
 const base={title:'Rust; a talk, with notes',category:'Workshop',level:'Everyone welcome',venue:'EM1.82, Earl Mountbatten',description:'Line one\nLine two – '+'é'.repeat(120),signup_required:true,luma_url:'https://luma.com/x',status:'published',starts_at:'2027-07-01T17:30:00Z',ends_at:'2027-07-01T19:00:00Z',slug:'rust'};
 const event=liveEvent(base,Date.parse('2027-01-01'));const cancelled=liveEvent({...base,slug:'off',status:'cancelled',signup_required:false},Date.parse('2027-01-01'));const site='https://example.com';const now=Date.parse('2027-01-01T00:00:00Z');
 const feed=calendarFeed([event,cancelled],site,now);assert.ok(feed.endsWith('END:VCALENDAR\r\n'));assert.equal(feed.replaceAll('\r\n','').includes('\n'),false);for(const line of feed.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75,line);
 const text=feed.replaceAll('\r\n ','');assert.equal(text.split('BEGIN:VEVENT').length,3);assert.ok(text.includes('X-WR-CALNAME:HW CompSoc events'));assert.ok(text.includes('UID:rust@hwcompsoc'));assert.ok(text.includes('DTSTAMP:20270101T000000Z'));assert.ok(text.includes('DTSTART:20270701T173000Z'));assert.ok(text.includes('SUMMARY:Rust\\; a talk\\, with notes'));assert.ok(text.includes('LOCATION:EM1.82\\, Earl Mountbatten'));assert.ok(text.includes('Line one\\nLine two – '+'é'.repeat(120)+'\\nSign up: https://luma.com/x\\nMore: https://example.com/events/rust'));assert.ok(text.includes('URL:https://example.com/events/rust'));assert.ok(text.includes('SUMMARY:Cancelled: Rust'));assert.ok(text.includes('STATUS:CANCELLED'));assert.ok(text.includes('STATUS:CONFIRMED'));
 const one=calendar(event,'',now);assert.equal(one.split('BEGIN:VEVENT').length,2);assert.ok(!one.includes('X-WR-CALNAME'));assert.ok(!one.includes('URL:'));assert.equal(eventFilePath(event),'/events/rust.ics');
 const links=eventCalendarLinks(event,site);const google=new URL(links[0].href);assert.equal(google.searchParams.get('dates'),'20270701T173000Z/20270701T190000Z');assert.equal(google.searchParams.get('text'),base.title);assert.ok(google.searchParams.get('details').includes('Sign up: https://luma.com/x'));const outlook=new URL(links[1].href);assert.equal(outlook.host,'outlook.office.com');assert.equal(outlook.searchParams.get('startdt'),'2027-07-01T17:30:00Z');assert.equal(new URL(links[2].href).host,'outlook.live.com');assert.deepEqual([links[3].href,links[3].download],['/events/rust.ics','rust.ics']);
 const subscribe=feedCalendarLinks(site);assert.equal(new URL(subscribe[0].href).searchParams.get('cid'),'webcal://example.com/events.ics');assert.equal(new URL(subscribe[1].href).searchParams.get('url'),'https://example.com/events.ics');assert.equal(subscribe[3].href,'webcal://example.com/events.ics');
 const {headers}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.ok(headers[0].headers.some(h=>h.value.startsWith('text/calendar')));
});
