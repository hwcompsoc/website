import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {links,route,legacyPath,suggestPath,canonicalPath,pagePath,pages,events,resources,filterEvents,enquiryMail,liveEvent,liveCommittee,liveGuide,liveDocument} from '../src/content.ts';
import {parseGuide,parseInline,readingMinutes} from '../src/guide-format.ts';
import {calendar,calendarFeed,eventCalendarLinks,eventFilePath,feedCalendarLinks} from '../src/calendar.ts';
import {sharePage,sharePages,DEFAULT_IMAGE} from '../src/share.ts';
import {GUIDE_COLUMNS} from '../src/supabase-config.ts';
import {slugTyping,documentPhase,documentProblem,documentUrl,readableSize,blankGuide,guideEditable,guidePhase,guideProblems,reviewDue,todayInUk,committeePhase,faqPhase,moved,nextPosition,photoProblem,photoUrl,committeeNameProblem,coverDownload,coverProblem,coverSize,coverUrl,missingSteps,slugify,ukInputToIso,isoToUkInput,blankEvent,eventDetailsText,passwordProblem,adminRoute,safeNext,checklist,progress,nextStep,eventTab,whenToIso,isoToWhen,whenProblems,slugAttempt,editableFields,shortDate,fullDate,timeRange,sitePhase,siteBusy,siteSlow,badgeFor,matchesSite} from '../src/admin-rules.ts';
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
 const summer=liveEvent(row,Date.parse('2027-01-01'));assert.equal(summer.id,'real-talk');assert.equal(summer.day,'01');assert.equal(summer.month,'JUL');assert.equal(summer.date,'Thursday 1 July 2027');assert.equal(summer.time,'18:30–20:00 BST');assert.equal(summer.start,'20270701T173000Z');assert.equal(summer.past,false);assert.equal(summer.luma,'https://luma.com/x');
 const winter=liveEvent({...row,starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',signup_required:false,status:'cancelled'},Date.parse('2027-02-01'));assert.equal(winter.time,'17:30–19:00 GMT');assert.equal(winter.past,true);assert.equal(winter.cancelled,true);assert.equal(winter.luma,undefined);
 const file=calendar(summer);assert.ok(!file.includes('PROTOTYPE'));assert.ok(!file.includes('example'));assert.ok(file.includes('UID:real-talk@hwcompsoc'));assert.ok(file.includes('SUMMARY:Real\\, talk'));assert.ok(calendar(winter).includes('STATUS:CANCELLED'));
});
test('The form explains exactly what stands between an event and going live',()=>{
 const ready={...blankEvent(),title:'Talk',slug:'talk',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'EM1.82',description:'A talk',cover_path:'00000000-0000-0000-0000-000000000000.jpg',square_path:'00000000-0000-0000-0000-000000000001.jpg',cover_alt:'A poster',native_url:'https://native.fm/x',luma_url:'https://luma.com/x',socials_sent:true};
 assert.deepEqual(missingSteps(ready),[]);assert.ok(missingSteps(blankEvent()).length>5);
 assert.deepEqual(missingSteps({...ready,native_url:null}),['Create it on Native and paste the link']);assert.deepEqual(missingSteps({...ready,luma_url:null}),['Create it on Luma and paste the link']);assert.deepEqual(missingSteps({...ready,luma_url:null,signup_required:false}),[]);assert.deepEqual(missingSteps({...ready,socials_sent:false}),['Send the details to Amanda and Kevin']);assert.deepEqual(missingSteps({...ready,native_url:'javascript:alert(1)'}),['Create it on Native and paste the link']);assert.deepEqual(missingSteps({...ready,ends_at:ready.starts_at}),['Make the end time later than the start']);
 assert.equal(slugify('Your First Web App!'),'your-first-web-app');assert.equal(slugTyping('my-'),'my-');assert.equal(slugTyping('My Event '),'my-event-');assert.equal(slugify('my-'),'my');assert.equal(slugify('Café & Code'),'cafe-and-code');assert.equal(slugify('---'),'');assert.ok(slugify('x'.repeat(90)).length<=60);
 assert.equal(ukInputToIso('2027-07-01T18:30'),'2027-07-01T17:30:00.000Z');assert.equal(ukInputToIso('2027-01-14T18:30'),'2027-01-14T18:30:00.000Z');assert.equal(isoToUkInput('2027-07-01T17:30:00Z'),'2027-07-01T18:30');assert.equal(isoToUkInput('2027-01-14T18:30:00Z'),'2027-01-14T18:30');assert.equal(ukInputToIso(''),null);assert.equal(isoToUkInput(null),'');
 assert.ok(eventDetailsText(ready).includes('Sign up: https://luma.com/x'));assert.ok(eventDetailsText(ready,'https://site.example').includes('Website: https://site.example/events/talk'));
});
test('Admin routes and the return address after sign-in',()=>{
 const id='3647cf31-c4d8-467e-88a9-cd3b12d256b6';const name=path=>adminRoute(path).name;
 assert.equal(name('/admin/documents'),'documents');assert.equal(name('/admin/help'),'help');assert.equal(name('/admin/help/x'),'notfound');assert.equal(name('/admin/guides'),'guides');assert.equal(name('/admin/guides/new'),'guide');assert.equal(name('/admin/guides/'+id),'guide');assert.equal(adminRoute('/admin/guides/'+id).id,id);assert.equal(name('/admin/guides/nope'),'notfound');assert.equal(name('/admin/guides/'+id+'/x'),'notfound');assert.equal(name('/admin/faqs'),'faqs');assert.equal(name('/admin/faqs/x'),'notfound');assert.equal(name('/admin/committee'),'committee');assert.equal(name('/admin/committee/x'),'notfound');assert.equal(name('/admin/people'),'people');assert.equal(name('/admin/people/x'),'notfound');assert.equal(name('/admin'),'overview');assert.equal(name('/admin/'),'overview');assert.equal(name('/admin/login'),'login');assert.equal(name('/admin/set-password'),'set-password');assert.equal(name('/admin/account'),'account');assert.equal(name('/admin/events'),'events');assert.equal(name('/admin/events/new'),'new');assert.deepEqual(adminRoute('/admin/events/'+id),{name:'event',id});assert.deepEqual(adminRoute('/admin/events/'+id+'/edit'),{name:'edit',id});
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
 const {rewrites}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.deepEqual(rewrites,[{source:'/((?!assets/).*)',destination:'/index.html'}]);
});
test('Event filters separate past events',()=>{
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

test('Privacy has its own address, and nothing the note denies has crept in',()=>{
 assert.deepEqual(route('/privacy'),{view:'privacy',item:''});assert.equal(route('/privacy/x').view,'notfound');assert.ok(sharePages().some(s=>s.path==='/privacy'));assert.equal(suggestPath('/privcy'),'/privacy');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(!/googletagmanager|gtag|plausible|posthog|analytics/i.test(html));assert.ok(!/https?:\/\//.test(html),'index.html loads nothing from another address');
 const headers=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')).headers.find(h=>h.source==='/(.*)').headers;assert.ok(headers.some(h=>h.key==='X-Frame-Options'&&h.value==='DENY'));assert.ok(headers.some(h=>h.key==='X-Content-Type-Options'));
});
test('The privacy page keeps the expected order, a date, and everything the ICO asks for',()=>{
 const page=readFileSync(new URL('../src/pages/Privacy.tsx',import.meta.url),'utf8');const list=page.match(/const SECTIONS=(\[.*?\]) as const/)[1];const ids=[...list.matchAll(/\['([a-z-]+)','/g)].map(m=>m[1]);
 assert.deepEqual(ids,['who-we-are','what-we-collect','why-we-use-it','who-we-share-it-with','how-long-we-keep-it','your-rights','contact-or-complain','changes']);
 assert.deepEqual([...page.matchAll(/<Heading id="([a-z-]+)"\/>/g)].map(m=>m[1]),ids,'each section appears once, in the same order as the jump links');
 assert.match(page,/^const UPDATED='\d{1,2} [A-Z][a-z]+ \d{4}';/m);for(const phrase of ['legal basis','right to object','Information Commissioner','0303 123 1113','for 2 years','UK Extension'])assert.ok(page.includes(phrase),phrase);
});
test('Every address has its own share details, and they are written safely into the page',()=>{
 const base={title:'Rust & "friends"',category:'Workshop',level:'Everyone welcome',venue:'EM1.82',description:'x '.repeat(200),signup_required:false,luma_url:null,status:'published',starts_at:'2027-07-01T17:30:00Z',ends_at:'2027-07-01T19:00:00Z',slug:'rust'};
 const event=liveEvent({...base,cover_path:'00000000-0000-0000-0000-000000000000.jpg',cover_alt:'A crab <holding> a laptop'},Date.parse('2027-01-01'));const list=sharePages([event,liveEvent({...base,slug:'off',status:'cancelled'},Date.parse('2027-01-01'))]);
 const paths=list.map(s=>s.path);for(const path of ['/','/join','/events','/resources','/about','/partners','/events/rust','/events/off','/resources/git'])assert.ok(paths.includes(path),path);assert.equal(new Set(paths).size,paths.length);for(const share of list){assert.ok(share.path==='/'?share.title==='HW CompSoc | Heriot-Watt Computer Science Society':share.title.endsWith(share.path.startsWith('/events/')?' | HW CompSoc Events':share.path.startsWith('/resources/')?' | HW CompSoc Resources':' | HW CompSoc'),share.path);assert.ok(share.description.length>0&&share.description.length<=200,share.path);assert.equal(route(share.path).view==='notfound',share.path.startsWith('/events/'),share.path)}
 const shared=list.find(s=>s.path==='/events/rust');assert.equal(shared.image,'/event-covers/00000000-0000-0000-0000-000000000000.jpg');assert.ok(shared.description.startsWith('Thursday 1 July 2027, 18:30–20:00 BST, EM1.82. '));assert.equal(list.find(s=>s.path==='/about').image,DEFAULT_IMAGE);assert.ok(list.find(s=>s.path==='/events/off').description.startsWith('Cancelled. '));
 const template='<html><head><meta name="description" content="old"><title>old</title></head></html>';const page=sharePage(template,shared,'https://example.com');
 assert.ok(page.includes('<title>Rust &amp; &quot;friends&quot; | HW CompSoc Events</title>'));assert.ok(!page.includes('content="old"')&&!page.includes('<title>old'));assert.ok(page.includes('<meta property="og:image" content="https://example.com/event-covers/00000000-0000-0000-0000-000000000000.jpg">'));assert.ok(page.includes('<meta property="og:url" content="https://example.com/events/rust">'));assert.ok(page.includes('content="A crab &lt;holding&gt; a laptop"'));assert.ok(page.includes('<link rel="canonical" href="https://example.com/events/rust">'));
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
 const {headers}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.ok(headers.find(h=>h.source.includes('ics')).headers.some(h=>h.value.startsWith('text/calendar')));
});

test('The committee comes from the admin, and empty roles stay off the page',()=>{
 const shown=liveCommittee([{name:'Treasurer',description:'Keeps the books.',committee_people:[{name:'Sam Lee',photo_path:'00000000-0000-0000-0000-000000000000.jpg'}]},{name:'Empty',description:'Nobody',committee_people:[]},{name:'Events team',description:'',committee_people:[{name:'A',photo_path:null},{name:'B',photo_path:null}]}]);
 assert.deepEqual(shown.map(team=>team.role),['Treasurer','Events team']);assert.deepEqual(shown[0],{role:'Treasurer',text:'Keeps the books.',members:[{name:'Sam Lee',photo:'/committee-photos/00000000-0000-0000-0000-000000000000.jpg'}]});assert.deepEqual(shown[1].members,[{name:'A'},{name:'B'}]);
 assert.equal(photoProblem(200,200),null);assert.match(photoProblem(150,900),/only 150 × 900/);assert.ok(photoUrl('x.jpg').endsWith('/committee-photos/x.jpg'));assert.equal(committeeNameProblem('  ','Add it.'),'Add it.');assert.equal(committeeNameProblem('Sam','Add it.'),null);
 assert.equal(nextPosition([]),1);assert.equal(nextPosition([{position:2},{position:7}]),8);
 const rows=[{id:'a',position:1},{id:'b',position:2},{id:'c',position:5}];assert.deepEqual(moved(rows,'b',1),[{id:'b',position:5},{id:'c',position:2}]);assert.deepEqual(moved(rows,'b',-1),[{id:'b',position:1},{id:'a',position:2}]);assert.equal(moved(rows,'a',-1),null);assert.equal(moved(rows,'c',1),null);assert.equal(moved(rows,'z',1),null);
});

test('The committee page only says live once the public site has the change',()=>{
 const team={id:'1',name:'Treasurer',description:'Keeps the books.',position:1,committee_people:[{id:'2',team_id:'1',name:'Sam',photo_path:null,position:1},{id:'3',team_id:'1',name:'Lee',photo_path:'a.jpg',position:2}]};const site=[{...team,position:9,committee_people:team.committee_people.map(p=>({...p,position:9}))}];
 assert.equal(committeePhase([team],null),'unknown');assert.equal(committeePhase(undefined,[team]),'live');assert.equal(committeePhase([team],site),'live');
 assert.equal(committeePhase([{...team,name:'New'}],site),'updating');assert.equal(committeePhase([{...team,description:'New'}],site),'updating');assert.equal(committeePhase([{...team,committee_people:[...team.committee_people].reverse()}],site),'updating');assert.equal(committeePhase([{...team,committee_people:[team.committee_people[0],{...team.committee_people[1],photo_path:'b.jpg'}]}],site),'updating');assert.equal(committeePhase([],site),'updating');
});

test('The FAQs page only says live once the public site has the change',()=>{
 const faqs=[{id:'1',question:'Q1',answer:'A1',position:1},{id:'2',question:'Q2',answer:'A2',position:2}];const site=faqs.map(faq=>({...faq,position:9}));
 assert.equal(faqPhase(faqs,null),'unknown');assert.equal(faqPhase(undefined,site),'live');assert.equal(faqPhase(faqs,site),'live');assert.equal(faqPhase([],[]),'live');assert.equal(faqPhase([],site),'updating');assert.equal(faqPhase([{...faqs[0],answer:'New'},faqs[1]],site),'updating');assert.equal(faqPhase([faqs[1],faqs[0]],site),'updating');
});

test('Guide formatting makes plain blocks, and nothing typed can become HTML or an unsafe link',()=>{
 const blocks=parseGuide('## Start small\nsecond heading follows\n\nFirst line\nsame paragraph **bold** and `code`.\n\n### Small\n\n- One\n- [Docs](https://example.com)\n\n1. A\n2) B\n\n- [ ] Tick\n- [x] Tock\n\n```\n# not a heading\n<script>alert(1)</script>\n- not a list\n```\n\nEnd\r\nline');
 assert.deepEqual(blocks.map(b=>b.kind),['heading','paragraph','paragraph','heading','list','list','checklist','code','paragraph']);assert.equal(blocks[0].level,2);assert.equal(blocks[3].level,3);assert.deepEqual(blocks[2].text,[{kind:'text',text:'First line same paragraph '},{kind:'bold',text:'bold'},{kind:'text',text:' and '},{kind:'code',text:'code'},{kind:'text',text:'.'}]);assert.equal(blocks[4].ordered,false);assert.deepEqual(blocks[4].items[1],[{kind:'link',text:'Docs',href:'https://example.com'}]);assert.equal(blocks[5].ordered,true);assert.equal(blocks[5].items.length,2);assert.deepEqual(blocks[6].items,['Tick','Tock']);assert.equal(blocks[7].text,'# not a heading\n<script>alert(1)</script>\n- not a list');assert.equal(blocks[8].text[0].text,'End line');
 for(const bad of ['javascript:alert(1)','data:text/html,x','http://example.com','/relative','vbscript:x'])assert.deepEqual(parseInline('[click](' +bad+ ')'),[{kind:'text',text:'click'}],bad);assert.equal(parseInline('[m](mailto:a@hw.ac.uk)')[0].kind,'link');assert.deepEqual(parseInline('[w](https://en.wikipedia.org/wiki/Git_(software)) next'),[{kind:'link',text:'w',href:'https://en.wikipedia.org/wiki/Git_(software)'},{kind:'text',text:' next'}]);
 assert.deepEqual(parseInline('<img src=x onerror=alert(1)>'),[{kind:'text',text:'<img src=x onerror=alert(1)>'}]);assert.deepEqual(parseGuide(''),[]);assert.equal(parseGuide('```\nnever closed').at(-1).text,'never closed');
 assert.equal(readingMinutes(''),1);assert.equal(readingMinutes('word '.repeat(1000)),5);
});
test('Guides: drafts stay hidden, confirmed guides need someone looking after them, and the maintainer stays private',()=>{
 const g=liveGuide({slug:'git',title:'Git',category:'Learning',kind:'Starter guide',description:'D',body:'word '.repeat(400),status:'confirmed',reviewed_on:'2027-03-15'});assert.equal(g.id,'git');assert.equal(g.minutes,'2 min');assert.equal(g.reviewed,'March 2027');assert.equal(g.type,'Starter guide');
 const draft={...blankGuide(),title:'T'};assert.deepEqual(guideProblems(draft),{});assert.ok(guideProblems(blankGuide()).title);const confirmed={...draft,status:'confirmed'};assert.deepEqual(Object.keys(guideProblems(confirmed)).sort(),['body','description','maintainer']);assert.deepEqual(guideProblems({...confirmed,body:'B',description:'D',maintainer:'Sam'}),{});
 assert.equal('id' in guideEditable({...draft,id:'x'}),false);assert.equal('published_at' in guideEditable({...draft,published_at:'x'}),false);
 assert.ok(!GUIDE_COLUMNS.includes('maintainer'));assert.ok(!readFileSync(new URL('../supabase/migrations/20261102170000_guides.sql',import.meta.url),'utf8').match(/grant select \([^)]*maintainer/));
 const now=Date.parse('2027-06-01T12:00:00Z');assert.equal(reviewDue(null,now),false);assert.equal(reviewDue('2026-06-02',now),false);assert.equal(reviewDue('2026-06-01',now),true);assert.equal(reviewDue('2025-01-01',now),true);assert.equal(todayInUk(Date.parse('2027-06-30T23:30:00Z')),'2027-07-01');
 const row={slug:'a',title:'A',category:'Learning',kind:'K',description:'D',body:'B',status:'confirmed',reviewed_on:'2027-01-01'};assert.equal(guidePhase([row],null),'unknown');assert.equal(guidePhase(undefined,[row]),'live');assert.equal(guidePhase([row],[row]),'live');assert.equal(guidePhase([{...row,maintainer:'Sam'}],[row]),'live');assert.equal(guidePhase([row,{...row,slug:'b',status:'draft'}],[row]),'live');assert.equal(guidePhase([{...row,body:'New'}],[row]),'updating');assert.equal(guidePhase([{...row,status:'draft'}],[row]),'updating');assert.equal(guidePhase([{...row,reviewed_on:'2027-02-02'}],[row]),'updating');
});

test('Documents: only real PDFs under the limit, and live once the site has them',()=>{
 assert.equal(documentProblem(1000,true),null);assert.match(documentProblem(1000,false),/isn’t a PDF/);assert.match(documentProblem(21*1024*1024,true),/over 20 MB/);assert.equal(documentProblem(20*1024*1024,true),null);assert.ok(documentUrl('a.pdf').endsWith('/society-documents/a.pdf'));assert.equal(readableSize(500),'1 KB');assert.equal(readableSize(2048),'2 KB');assert.equal(readableSize(1572864),'1.5 MB');
 const row={id:'1',title:'Constitution',approved_on:'2026-10-01',file_path:'a.pdf',size_bytes:1572864,position:1};assert.deepEqual(liveDocument(row),{id:'1',title:'Constitution',approved:'1 October 2026',href:'/documents/a.pdf',size:'1.5 MB'});
 assert.equal(documentPhase([row],null),'unknown');assert.equal(documentPhase(undefined,[row]),'live');assert.equal(documentPhase([row],[{...row,position:9,size_bytes:1}]),'live');assert.equal(documentPhase([{...row,title:'New'}],[row]),'updating');assert.equal(documentPhase([{...row,file_path:'b.pdf'}],[row]),'updating');assert.equal(documentPhase([],[row]),'updating');
});
test('The public site no longer calls itself a prototype',()=>{
 for(const file of ['components/Footer.tsx','pages/About.tsx','pages/Partners.tsx','components/DetailDialog.tsx'])assert.ok(!/prototype/i.test(readFileSync(new URL('../src/'+file,import.meta.url),'utf8')),file);
});
test('The footer stays compact: contact and legal links only, with invitations to join left to the pages',()=>{
 const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');const footer=read('components/Footer.tsx');const site=read('Website.tsx');
 for(const required of ['mailto:${links.email}','href="/privacy"','links.membership','Affiliated to HW Union','Footer navigation'])assert.ok(footer.includes(required),required);
 for(const removed of ['links.discord','links.instagram','Come and say hello','RevealHeading','Accordion'])assert.ok(!footer.includes(removed),removed);
 assert.ok(site.indexOf('</main><Footer/>')>0);assert.ok(!site.includes('SayHello'));for(const page of ['pages/Join.tsx','pages/Events.tsx','pages/Resources.tsx','components/Hero.tsx'])assert.ok(read(page).includes('links.discord'),page);
});
test('A missing build file is a real 404, and the page retries instead of staying blank',()=>{
 const {rewrites}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));const sends=new RegExp(`^${rewrites[0].source}$`);
 for(const path of ['/','/about','/admin/documents','/events/some-talk','/assetsfolder'])assert.ok(sends.test(path),path);assert.ok(!sends.test('/assets/index-abc.js'));
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.includes('hwcs-load-retries'));assert.ok(html.indexOf('hwcs-load-retries')<html.indexOf('type="module"'),'the retry has to be listening before the app loads');
});
