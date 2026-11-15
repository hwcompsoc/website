import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {anchor,peopleOf,links,route,legacyPath,suggestPath,canonicalPath,pagePath,pages,events,resources,filterEvents,eventStatus,enquiryMail,liveEvent,liveCommittee,liveGuide,liveDocument} from '../src/content.ts';
import {parseAnswer,parseGuide,parseInline,readingMinutes} from '../src/guide-format.ts';
import {calendar,calendarFeed,eventCalendarLinks,eventFilePath,feedCalendarLinks} from '../src/calendar.ts';
import {sharePage,sharePages,DEFAULT_IMAGE} from '../src/share.ts';
import {entries,grouped,search} from '../src/search.ts';
import {DISCORD_INVITE} from './live-content.mjs';
import {passageLink,textFragment} from '../src/fragment.ts';
import {commitHash,discordMembers} from '../src/content.ts';
import {GUIDE_COLUMNS} from '../src/supabase-config.ts';
import {taskHref,fixRiskScores,monthGrid,agmTasks,agmNoticeDate,committeeSummary,sponsorProblems,blankSponsor,termOf,termEvents,blankEntry,entryProblems,directoryMatches,blankClaim,claimProblems,claimEditable,claimAction,spentOn,yearReport,incomeProblems,postText,platformsOf,postFinished,platformProblem,weekStart,weekLabel,spaceChecklist,spaceProgress,spaceStage,blankPlan,budgetTotal,budgetProblems,money,academicYear,eventFolder,agendaDue,agendaMarkdown,carriedForward,dueFromText,matchAssignee,minutesActions,assigneeLabel,blankTask,byDue,dueGroup,dueLabel,isMine,taskProblems,expectedMinutesSeconds,minutesStage,minutesHtml,minutesDocName,driveKind,cleanTranscript,minutesProblems,TRANSCRIPT_MAX,blankProfile,discordHandle,githubHandle,linkedinHandle,profileFields,profileProblems,slugTyping,documentPhase,documentProblem,documentUrl,readableSize,blankGuide,guideEditable,guidePhase,guideProblems,reviewDue,todayInUk,committeePhase,faqPhase,moved,nextPosition,photoProblem,photoUrl,committeeNameProblem,coverDownload,coverProblem,coverSize,coverUrl,missingSteps,slugify,ukInputToIso,isoToUkInput,blankEvent,eventDetailsText,passwordProblem,adminRoute,safeNext,checklist,progress,nextStep,eventTab,whenToIso,isoToWhen,whenProblems,slugAttempt,editableFields,shortDate,fullDate,timeRange,sitePhase,siteBusy,siteSlow,badgeFor,matchesSite} from '../src/admin-rules.ts';
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
 const row={slug:'real-talk',title:'Real, talk',category:'Talk',level:'Everyone welcome',starts_at:'2027-07-01T17:30:00Z',ends_at:'2027-07-01T19:00:00Z',venue:'EM1.82',description:'A talk',signup_required:true,luma_url:'https://luma.com/x',status:'published'};
 const summer=liveEvent(row,Date.parse('2027-01-01'));assert.equal(summer.id,'real-talk');assert.equal(summer.weekday,'THU');assert.equal(summer.day,'01');assert.equal(summer.month,'JUL');assert.equal(summer.date,'Thursday 1 July 2027');assert.equal(summer.time,'18:30–20:00 BST');assert.equal(summer.start,'20270701T173000Z');assert.equal(summer.past,false);assert.equal(summer.luma,'https://luma.com/x');
 const winter=liveEvent({...row,starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',signup_required:false,status:'cancelled'},Date.parse('2027-02-01'));assert.equal(winter.time,'17:30–19:00 GMT');assert.equal(winter.past,true);assert.equal(winter.cancelled,true);assert.equal(winter.luma,undefined);
 const file=calendar(summer);assert.ok(!file.includes('PROTOTYPE'));assert.ok(!file.includes('example'));assert.ok(file.includes('UID:real-talk@hwcompsoc'));assert.ok(file.includes('SUMMARY:Real\\, talk'));assert.ok(calendar(winter).includes('STATUS:CANCELLED'));
});
test('The form explains exactly what stands between an event and going live',()=>{
 const ready={...blankEvent(),title:'Talk',slug:'talk',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'EM1.82',description:'A talk',cover_path:'00000000-0000-0000-0000-000000000000.jpg',square_path:'00000000-0000-0000-0000-000000000001.jpg',cover_alt:'A poster',native_url:'https://native.fm/x',luma_url:'https://luma.com/x',socials_sent:true};
 assert.deepEqual(missingSteps(ready),[]);assert.ok(missingSteps(blankEvent()).length>5);
 assert.deepEqual(missingSteps({...ready,native_url:null}),['Create it on Native and paste the link, or skip it']);assert.deepEqual(missingSteps({...ready,native_url:null,native_skipped:true}),[]);assert.deepEqual(missingSteps({...ready,luma_url:null}),['Create it on Luma and paste the link']);assert.deepEqual(missingSteps({...ready,luma_url:null,signup_required:false}),[]);assert.deepEqual(missingSteps({...ready,socials_sent:false}),[],'social posts are tasks now, so they don’t hold up publishing');assert.deepEqual(missingSteps({...ready,native_url:'javascript:alert(1)'}),['Create it on Native and paste the link, or skip it']);assert.deepEqual(missingSteps({...ready,ends_at:ready.starts_at}),['Make the end time later than the start']);
 assert.equal(slugify('Your First Web App!'),'your-first-web-app');assert.equal(slugTyping('my-'),'my-');assert.equal(slugTyping('My Event '),'my-event-');assert.equal(slugify('my-'),'my');assert.equal(slugify('Café & Code'),'cafe-and-code');assert.equal(slugify('---'),'');assert.ok(slugify('x'.repeat(90)).length<=60);
 assert.equal(ukInputToIso('2027-07-01T18:30'),'2027-07-01T17:30:00.000Z');assert.equal(ukInputToIso('2027-01-14T18:30'),'2027-01-14T18:30:00.000Z');assert.equal(isoToUkInput('2027-07-01T17:30:00Z'),'2027-07-01T18:30');assert.equal(isoToUkInput('2027-01-14T18:30:00Z'),'2027-01-14T18:30');assert.equal(ukInputToIso(''),null);assert.equal(isoToUkInput(null),'');
 assert.ok(eventDetailsText(ready).includes('Sign up: https://luma.com/x'));assert.ok(eventDetailsText(ready,'https://site.example').includes('Website: https://site.example/events/talk'));
});
test('Admin routes and the return address after sign-in',()=>{
 const id='3647cf31-c4d8-467e-88a9-cd3b12d256b6';const name=path=>adminRoute(path).name;
 assert.equal(name('/admin/documents'),'documents');assert.equal(name('/admin/minutes'),'minutes');assert.equal(name('/admin/drive'),'drive');assert.equal(name('/admin/drive/x'),'notfound');assert.equal(name('/admin/minutes/x'),'notfound');assert.equal(name('/admin/help'),'help');assert.equal(name('/admin/help/x'),'notfound');assert.equal(name('/admin/guides'),'guides');assert.equal(name('/admin/guides/new'),'guide');assert.equal(name('/admin/guides/'+id),'guide');assert.equal(adminRoute('/admin/guides/'+id).id,id);assert.equal(name('/admin/guides/nope'),'notfound');assert.equal(name('/admin/guides/'+id+'/x'),'notfound');assert.equal(name('/admin/faqs'),'faqs');assert.equal(name('/admin/faqs/x'),'notfound');assert.equal(name('/admin/committee'),'committee');assert.equal(name('/admin/committee/x'),'notfound');assert.equal(name('/admin/people'),'people');assert.equal(name('/admin/people/x'),'notfound');assert.equal(name('/admin'),'overview');assert.equal(name('/admin/'),'overview');assert.equal(name('/admin/login'),'login');assert.equal(name('/admin/set-password'),'set-password');assert.equal(name('/admin/account'),'account');assert.equal(name('/admin/events'),'events');assert.equal(name('/admin/events/new'),'new');assert.deepEqual(adminRoute('/admin/events/'+id),{name:'event',id});assert.deepEqual(adminRoute('/admin/events/'+id+'/edit'),{name:'edit',id});
 for(const bad of ['/admin/nope','/admin/events/nope','/admin/events/'+id+'/nope','/admin/events/new/x','/admin/login/x'])assert.equal(name(bad),'notfound',bad);
 assert.equal(safeNext('/admin/events?tab=past'),'/admin/events?tab=past');for(const bad of [null,'','https://evil.example','//evil.example','/events','/administrator','/admin//evil.example','/admin/login','/admin/set-password'])assert.equal(safeNext(bad),'/admin',String(bad));
});
test('The checklist adapts to sign-up, and events sort into the right tab',()=>{
 const empty=blankEvent();assert.deepEqual(checklist(empty).map(s=>s.id),['details','native','luma']);assert.deepEqual(checklist({...empty,signup_required:false}).map(s=>s.id),['details','native']);assert.deepEqual(progress(empty),{done:0,total:3});assert.equal(nextStep(empty),'Finish the event details');
 const full={...empty,title:'T',slug:'t',starts_at:'2027-01-14T17:30:00Z',ends_at:'2027-01-14T19:00:00Z',venue:'V',description:'D',cover_path:'00000000-0000-0000-0000-000000000000.jpg',square_path:'00000000-0000-0000-0000-000000000001.jpg',cover_alt:'A poster'};assert.equal(nextStep(full),'Create it on Native');assert.equal(nextStep({...full,native_skipped:true}),'Create it on Luma');assert.deepEqual(progress({...full,native_skipped:true,luma_url:'https://l.co/x',socials_sent:true}),{done:3,total:3});assert.equal(editableFields(full).native_skipped,false);assert.deepEqual(progress({...full,native_url:'https://n.co/x',luma_url:'https://l.co/x',socials_sent:true}),{done:3,total:3});
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
 const base={title:'Talk',category:'Workshop',level:'Everyone welcome',venue:'EM1.82',description:'A talk',signup_required:false,luma_url:null,status:'published'};const list=[liveEvent({...base,slug:'next',starts_at:'2030-01-01T18:00:00Z',ends_at:'2030-01-01T19:00:00Z'}),liveEvent({...base,slug:'old',category:'Talk',starts_at:'2020-01-01T18:00:00Z',ends_at:'2020-01-01T19:00:00Z'})];
 assert.deepEqual(filterEvents('All','',false,list).map(e=>e.id),['next']);assert.deepEqual(filterEvents('All','',true,list).map(e=>e.id),['old']);assert.equal(filterEvents('Talk','',false,list).length,0);assert.equal(filterEvents('All','unlikely unmatched phrase',false,list).length,0);
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

test('An event can say what it costs and who can come',()=>{
 const row={slug:'t',title:'T',category:'Workshop',level:'Everyone welcome',starts_at:'2027-07-01T17:30:00Z',ends_at:'2027-07-01T19:00:00Z',venue:'V',description:'D',signup_required:false,luma_url:null,status:'published'};
 const both=liveEvent({...row,cost:'Free',open_to:'All students'});assert.equal(both.cost,'Free');assert.equal(both.openTo,'All students');
 for(const blank of [{},{cost:null,open_to:null},{cost:'',open_to:''}]){const shown=liveEvent({...row,...blank});assert.equal('cost' in shown,false);assert.equal('openTo' in shown,false)}
 const sent=editableFields({...blankEvent(),cost:'  Free ',open_to:'   '});assert.equal(sent.cost,'Free');assert.equal(sent.open_to,null);
 const saved={...blankEvent(),...row,cost:'Free',open_to:null};assert.equal(sitePhase(saved,[{...row,cost:'Free',open_to:null}]),'live');assert.equal(sitePhase(saved,[{...row,cost:null,open_to:null}]),'updating');assert.equal(sitePhase({...saved,cost:null},[row]),'live');
});

test('FAQ answers link email addresses by themselves and keep links safe',()=>{
 const link=(text,href)=>({kind:'link',text,href});
 assert.deepEqual(parseAnswer('Email a.b@hw.ac.uk.'),[{kind:'text',text:'Email '},link('a.b@hw.ac.uk','mailto:a.b@hw.ac.uk'),{kind:'text',text:'.'}]);
 assert.deepEqual(parseAnswer('[Write to us](mailto:a@hw.ac.uk)'),[link('Write to us','mailto:a@hw.ac.uk')]);
 assert.deepEqual(parseAnswer('[a@hw.ac.uk](mailto:a@hw.ac.uk)'),[link('a@hw.ac.uk','mailto:a@hw.ac.uk')]);
 assert.deepEqual(parseAnswer('[Page](https://example.com/a@b.com)'),[link('Page','https://example.com/a@b.com')]);
 assert.deepEqual(parseAnswer('Join the [Union](https://hwunion.com)'),[{kind:'text',text:'Join the '},link('Union','https://hwunion.com')]);
 assert.deepEqual(parseAnswer('[click](javascript:alert(1))'),[{kind:'text',text:'click'}]);
 assert.deepEqual(parseAnswer('No links here.'),[{kind:'text',text:'No links here.'}]);
});

test('Committee people and roles have stable addresses on the About page',()=>{
 assert.equal(anchor('Community Manager'),'community-manager');assert.equal(anchor('Events team'),'events-team');assert.equal(anchor(' Vice-President & Co. '),'vice-president-co');assert.equal(anchor('Kevin Paul Job'),'kevin-paul-job');
 const people=peopleOf(liveCommittee([{name:'Treasurer',description:'Books.',committee_people:[{name:'Sam Lee',photo_path:null}]},{name:'Events team',description:'Events.',committee_people:[{name:'Ann',photo_path:null},{name:'Sam Lee',photo_path:null}]}]));
 assert.deepEqual(people.map(person=>person.slug),['sam-lee','ann','sam-lee-events-team']);assert.deepEqual(people.map(person=>person.file),['sam-lee.md','events-team/ann.md','events-team/sam-lee-events-team.md']);assert.equal(people[0].team,false);assert.equal(people[1].team,true);assert.equal(people[1].text,'Events.');assert.equal(people[0].title,'Treasurer');assert.equal(people[1].title,'Event Organiser');assert.equal(peopleOf(liveCommittee([{name:'Crew',description:'',committee_people:[{name:'A',photo_path:null},{name:'B',photo_path:null}]}]))[0].title,'Crew');
});

test('A committee profile keeps only what is filled in, and only usernames',()=>{
 const person={name:'Sam',photo_path:null,bio:'Hi',studies:null,ask_me_about:'',discord:'sam_lee',github:null,linkedin:'sam-lee'};const [member]=liveCommittee([{name:'T',description:'',committee_people:[person]}])[0].members;assert.deepEqual(member,{name:'Sam',bio:'Hi',discord:'sam_lee',linkedin:'sam-lee'});
 assert.equal(githubHandle('https://github.com/SamLee/'),'SamLee');assert.equal(githubHandle('@samlee'),'samlee');assert.equal(githubHandle('www.github.com/samlee?tab=repositories'),'samlee');assert.equal(linkedinHandle('https://www.linkedin.com/in/sam-lee-123/?trk=x'),'sam-lee-123');assert.equal(linkedinHandle('uk.linkedin.com/in/sam-lee'),'sam-lee');assert.equal(discordHandle(' @Sam_Lee '),'sam_lee');
 assert.deepEqual(profileFields({bio:'  ',studies:' CS ',ask_me_about:'',discord:'@Sam',github:'https://github.com/sam',linkedin:null}),{bio:null,studies:'CS',ask_me_about:null,discord:'sam',github:'sam',linkedin:null});
 assert.deepEqual(profileProblems(blankProfile()),{});assert.ok(profileProblems({...blankProfile(),discord:'has space'}).discord);assert.ok(profileProblems({...blankProfile(),github:'javascript:alert(1)'}).github);assert.ok(profileProblems({...blankProfile(),linkedin:'a/b c'}).linkedin);assert.deepEqual(profileProblems({...blankProfile(),discord:'sam.lee',github:'sam-lee',linkedin:'sam-lee-1'}),{});
 const team={name:'T',description:'',committee_people:[{name:'Sam',photo_path:null,bio:'Hi'}]};assert.equal(committeePhase([team],[{...team,committee_people:[{name:'Sam',photo_path:null,bio:'Hi'}]}]),'live');assert.equal(committeePhase([team],[{...team,committee_people:[{name:'Sam',photo_path:null,bio:'Old'}]}]),'updating');assert.equal(committeePhase([{...team,committee_people:[{name:'Sam',photo_path:null}]}],[{...team,committee_people:[{name:'Sam',photo_path:null,github:null}]}]),'live');
});

test('Every font size comes from the shared scale',()=>{
 const scale=['fs-display','fs-page','fs-section','fs-card','fs-subhead','fs-body','fs-sm','pixel-lg','pixel-sm'];const allowed=new RegExp(`^(inherit|var[(]--(${scale.join('|')})[)])$`);const root=new URL('../src/',import.meta.url);
 const css=['website.css','motion.css','admin/admin.css'].map(name=>[name,readFileSync(new URL(name,root),'utf8').replace(/\/\*[\s\S]*?\*\//g,'')]);
 for(const [name,text] of css){for(const [,size] of text.matchAll(/font-size:([^;}]+)/g))assert.match(size.trim(),allowed,name);for(const [,font] of text.matchAll(/(?:^|[;{\s])font:([^;}]+)/g))assert.equal(font.trim(),'inherit',name)}
 const all=css.map(([,text])=>text).join('');for(const token of scale)assert.equal(all.split(`--${token}:`).length,2,token);
 for(const file of readdirSync(root,{recursive:true}).map(String).filter(file=>/\.tsx?$/.test(file)&&!/generated/.test(file))){const text=readFileSync(new URL(file.replace(/[^\w./-]/g,'/'),root),'utf8');assert.doesNotMatch(text,/fontSize|\btext-\[[\d.]+(px|rem|em)\]|\btext-([2-9]?xl)\b/,file)}
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
 assert.ok(site.indexOf('</main><Footer/>')>0);assert.ok(!site.includes('SayHello'));for(const page of ['pages/Join.tsx','pages/Events.tsx','pages/Resources.tsx','components/Hero.tsx']){const text=read(page);assert.ok(text.includes('links.discord')||text.includes('<DiscordButton/>'),page)}assert.ok(read('components/shared.tsx').includes('export function DiscordButton(){const button=<LinkButton href={links.discord}>'));
});
test('A missing build file is a real 404, and the page retries instead of staying blank',()=>{
 const {rewrites}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));const sends=new RegExp(`^${rewrites[0].source}$`);
 for(const path of ['/','/about','/admin/documents','/events/some-talk','/assetsfolder'])assert.ok(sends.test(path),path);assert.ok(!sends.test('/assets/index-abc.js'));
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.includes('hwcs-load-retries'));assert.ok(html.indexOf('hwcs-load-retries')<html.indexOf('type="module"'),'the retry has to be listening before the app loads');
});
test('Resources is left out of the site unless VITE_SHOW_RESOURCES is "true"',async()=>{
 const {execFileSync}=await import('node:child_process');
 const probe=`const c=await import('./src/content.ts');const s=await import('./src/share.ts');console.log(JSON.stringify({resources:c.resources.length,pages:c.sitePages.map(p=>p.id),page:c.route('/resources').view,guide:c.route('/resources/git').view,legacy:c.legacyPath('#resources'),shared:s.sharePages().some(p=>p.path.startsWith('/resources'))}))`;
 const run=(value)=>{const env={...process.env};delete env.VITE_SHOW_RESOURCES;if(value!==undefined)env.VITE_SHOW_RESOURCES=value;return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',probe],{env,cwd:new URL('..',import.meta.url),encoding:'utf8'}))};
 for(const value of [undefined,'false','1']){const off=run(value);assert.deepEqual(off,{resources:0,pages:['home','join','events','about','partners'],page:'notfound',guide:'notfound',legacy:null,shared:false},String(value))}
 const on=run('true');assert.ok(on.resources>0);assert.ok(on.pages.includes('resources'));assert.equal(on.page,'resources');assert.equal(on.guide,'resources');assert.equal(on.shared,true);
});
test('Board status: cancelled first, then on now, today and tomorrow by UK date, and nothing further off or finished',()=>{
 // 30 March 2027: the clocks went forward on the 28th, so UK dates are an hour ahead of UTC.
 const row={slug:'s',title:'S',category:'Talk',level:'L',starts_at:'2027-03-30T17:30:00Z',ends_at:'2027-03-30T19:00:00Z',venue:'V',description:'D',signup_required:false,luma_url:null,status:'published'};
 const at=(iso)=>Date.parse(iso);const e=liveEvent(row,at('2027-03-30T09:00:00Z'));
 assert.equal(eventStatus(e,at('2027-03-30T09:00:00Z')),'Today');
 assert.equal(eventStatus(e,at('2027-03-30T18:00:00Z')),'On now');
 assert.equal(eventStatus(e,at('2027-03-30T19:00:00Z')),undefined);
 assert.equal(eventStatus(e,at('2027-03-29T09:00:00Z')),'Tomorrow');
 // 23:30 UTC on the 28th is already the 29th in the UK, so the 30th is tomorrow.
 assert.equal(eventStatus(e,at('2027-03-28T23:30:00Z')),'Tomorrow');
 assert.equal(eventStatus(e,at('2027-03-28T22:30:00Z')),undefined);
 // An event late in the UK evening is still that UK day, though it's the next day in UTC.
 const late=liveEvent({...row,starts_at:'2027-01-10T23:30:00Z',ends_at:'2027-01-11T01:00:00Z'},at('2027-01-10T09:00:00Z'));
 assert.equal(eventStatus(late,at('2027-01-10T09:00:00Z')),'Today');
 assert.equal(eventStatus(liveEvent({...row,status:'cancelled'}),at('2027-03-30T09:00:00Z')),'Cancelled');
});
test('Site search: best matches first, every word must match, and an empty search suggests pages, the next events and actions',()=>{
 const e=(id,group,title,detail='',keywords='')=>({id,group,title,detail,keywords,href:'/'+id});
 const list=[e('a','Events','Board games night','Thu','social'),e('b','People','Gita Night','Treasurer'),e('c','Pages','Nightly builds'),e('d','Questions','When are socials?','Most nights'),e('e','Events','Git workshop','Thu','beginner')];
 assert.deepEqual(search('night',list).map(r=>r.id),['c','a','b','d'],'starts with, then a word starts with (groups in order), then only the details');
 assert.deepEqual(search('git work',list).map(r=>r.id),['e']);
 assert.deepEqual(search('  ',list).map(r=>r.id),['c','a','e'],'pages and the next events, with no people or questions');
 assert.deepEqual(search('nothing like this',list),[]);
 assert.deepEqual(grouped(search('night',list)).map(g=>g.group),['Pages','Events','People','Questions']);
 const all=entries();assert.ok(all.some(r=>r.id==='page-privacy')&&!search('').some(r=>r.id==='page-privacy'),'Privacy can be found but isn’t suggested');
 for(const r of all)assert.ok(r.href||r.action,r.id);
 assert.ok(search('copy email').some(r=>r.action==='copy-email'));
});
test('The Discord member count comes from the same invite the site links to, and is left out when unknown',()=>{
 assert.ok(links.discord.endsWith('/'+DISCORD_INVITE));assert.equal(discordMembers,null,'tests run with no count');
 assert.equal(search('discord').find(r=>r.id==='action-discord').detail,'Announcements and chat');
});
test('Past events get short commit hashes that never change',()=>{
 assert.match(commitHash('git-night'),/^[0-9a-f]{7}$/);assert.equal(commitHash('git-night'),commitHash('git-night'));assert.notEqual(commitHash('git-night'),commitHash('git-nights'));
 assert.equal(commitHash(''),'811c9dc');
});
test('Passage links: short selections whole, long ones by their first and last words, with the directive characters escaped',()=>{
 assert.equal(textFragment('  no   preparation\nis needed '),'#:~:text=no%20preparation%20is%20needed');
 assert.equal(textFragment('pay-as-you-go, & more'),'#:~:text=pay%2Das%2Dyou%2Dgo%2C%20%26%20more');
 const long='Whether you want to make friends, build confidence or explore what comes after university, the easiest place to start is the community.';
 assert.equal(textFragment(long),'#:~:text=Whether%20you%20want%20to,start%20is%20the%20community.');
 assert.equal(textFragment('   '),'');
 assert.equal(passageLink('https://x.test','/events/git','no preparation'),'https://x.test/events/git#:~:text=no%20preparation');
});

test('meeting transcripts are cut down to one line per turn', ()=>{
 const vtt='WEBVTT\r\n\r\n0e2b5f1c-1111-2222-3333-444455556666/12-0\r\n00:00:03.120 --> 00:00:05.440\r\n<v Alex Smith>Welcome, everyone.</v>\r\n\r\n0e2b5f1c-1111-2222-3333-444455556666/13-0\r\n00:00:05.440 --> 00:00:07.000\r\n<v Alex Smith>First, the budget.</v>\r\n\r\n00:00:07.000 --> 00:00:09.000\r\n<v Sam Lee>We have £200 left.</v>\r\n\r\nNOTE\r\nignored note\r\n\r\n';
 assert.equal(cleanTranscript(vtt),'Alex Smith: Welcome, everyone. First, the budget.\nSam Lee: We have £200 left.');
 const copied='Alex Smith   0:03\nWelcome, everyone.\n\nSam Lee   0:07\nLet’s meet at 5:30\n\nAlex Smith   1:02:03\nSounds good.';
 assert.equal(cleanTranscript(copied),'Alex Smith: Welcome, everyone.\nSam Lee: Let’s meet at 5:30\nAlex Smith: Sounds good.');
 const spoken='Alex Smith 3 minutes 5 seconds\nHello.\nSam Lee 4 minutes\nHi.\nAlex Smith 5 minutes 2 seconds\nBye.\nSam Lee 6 minutes\nBye.';
 assert.equal(cleanTranscript(spoken),'Alex Smith: Hello.\nSam Lee: Hi.\nAlex Smith: Bye.\nSam Lee: Bye.');
 assert.equal(cleanTranscript('Plain notes\n\nMeet at 5:30'),'Plain notes\nMeet at 5:30');
 assert.equal(cleanTranscript('  \n '),'');
 assert.deepEqual(minutesProblems({title:'AGM',date:'2026-11-12',transcript:'Hi'}),{});
 assert.deepEqual(Object.keys(minutesProblems({title:' ',date:'',transcript:''})).sort(),['date','title','transcript']);
 assert.ok(minutesProblems({title:'AGM',date:'2026-11-12',transcript:'x'.repeat(TRANSCRIPT_MAX+1)}).transcript);
});

test('minutes become a Google Doc with real headings, lists and tables', ()=>{
 const html=minutesHtml('# Committee <meeting>\n\n**Date:** Thursday\n**Present:** Alex, Sam\n\n## 1. Budget\nWe have £200 & change.\n- One\n- Two\n\n1. First\n2. Second\n\n## Actions\n\n| Action | Who | By when |\n|---|---|---|\n| Book room | **Sam** | Not set |\n','A & B');
 assert.match(html,/<title>A &amp; B<\/title>/);
 assert.match(html,/<h1>Committee &lt;meeting&gt;<\/h1>/);
 assert.match(html,/<p><b>Date:<\/b> Thursday<br><b>Present:<\/b> Alex, Sam<\/p>/);
 assert.match(html,/<h2>1\. Budget<\/h2><p>We have £200 &amp; change\.<\/p><ul><li>One<\/li><li>Two<\/li><\/ul><ol><li>First<\/li><li>Second<\/li><\/ol>/);
 assert.match(html,/<tr><th>Action<\/th><th>Who<\/th><th>By when<\/th><\/tr><tr><td>Book room<\/td><td><b>Sam<\/b><\/td><td>Not set<\/td><\/tr><\/table>/);
 assert.doesNotMatch(html,/---/);
 assert.equal(minutesDocName('2026-11-12','  Committee   meeting '),'2026-11-12 Committee meeting');
 assert.equal(driveKind('application/vnd.google-apps.folder'),'folder');assert.equal(driveKind('application/vnd.google-apps.document'),'doc');assert.equal(driveKind('application/vnd.google-apps.spreadsheet'),'sheet');
 assert.equal(driveKind('application/pdf'),'pdf');assert.equal(driveKind('image/png'),'image');assert.equal(driveKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),'doc');assert.equal(driveKind('application/zip'),'file');
});

test('the minutes progress moves from sending to reading to writing, paced by the transcript length', ()=>{
 assert.equal(expectedMinutesSeconds(0),20);
 assert.equal(expectedMinutesSeconds(120000),80);
 assert.equal(minutesStage(0,40),0);
 assert.equal(minutesStage(5,40),1);
 assert.equal(minutesStage(20,40),2);
 assert.equal(minutesStage(3,10),1,'reading always shows for a moment, even for a short meeting');
});

test('tasks: yours includes your roles’ tasks until someone picks them up, and overdue comes first', ()=>{
 const task=(fields)=>({...blankTask(),title:'Do it',...fields});
 assert.ok(isMine(task({assignee_email:'a@x'}),'a@x',[]));
 assert.ok(isMine(task({assignee_role:'socials'}),'a@x',['socials']),'a role task nobody has picked up is everyone in the role’s');
 assert.ok(!isMine(task({assignee_role:'socials',assignee_email:'b@x'}),'a@x',['socials']),'once picked up, it’s theirs');
 assert.ok(!isMine(task({assignee_role:'events'}),'a@x',['socials']));
 const members=[{email:'a@x',name:'Amanda Zhang',roles:['socials']}],roles=[{key:'socials',name:'Social Media Manager'}];
 assert.equal(assigneeLabel(task({assignee_email:'a@x'}),members,roles),'Amanda Zhang');
 assert.equal(assigneeLabel(task({assignee_role:'socials'}),members,roles),'Anyone in Social Media Manager');
 assert.equal(assigneeLabel(task({}),members,roles),'Nobody yet');
 assert.equal(dueGroup('2026-11-12','2026-11-13'),'overdue');
 assert.equal(dueGroup('2026-11-19','2026-11-13'),'week');
 assert.equal(dueGroup('2026-11-20','2026-11-13'),'later');
 assert.equal(dueGroup(null,'2026-11-13'),'none');
 assert.equal(dueLabel('2026-11-13','2026-11-13'),'Due today');
 assert.equal(dueLabel('2026-11-14','2026-11-13'),'Due tomorrow');
 assert.equal(dueLabel('2026-11-10','2026-11-13'),'Overdue, was due Tue 10 Nov');
 const sorted=[task({due_on:null,created_at:'1'}),task({due_on:'2026-11-20'}),task({due_on:'2026-11-01'})].sort(byDue).map(t=>t.due_on);
 assert.deepEqual(sorted,['2026-11-01','2026-11-20',null]);
 assert.deepEqual(Object.keys(taskProblems(task({title:' '}))),['title']);
 assert.deepEqual(Object.keys(taskProblems(task({link:'example.com'}))),['link']);
 assert.equal(adminRoute('/admin/tasks').name,'tasks');
 assert.equal(taskHref(task({details:{href:'/admin/money?tab=income'}}),'a@x',[]),'/admin/money?tab=income','a task the admin made goes where it’s done');
 assert.equal(taskHref(task({details:{href:'https://evil.example'}}),'a@x',[]),'/admin/tasks?tab=team','only links inside the admin are followed');
 assert.equal(taskHref(task({assignee_role:'treasurer'}),'a@x',['treasurer']),'/admin/tasks','your own deadline is under Mine');
 assert.equal(taskHref(task({assignee_role:'secretary'}),'a@x',['treasurer']),'/admin/tasks?tab=team','someone else’s is under their team');
});

test('minutes: actions and carried-forward items are read back out, and names and dates are matched where they’re clear', ()=>{
 const minutes='# Committee meeting\n\n## 1. Budget\nTalked about it.\n\n## Next meeting\n\n- Freshers’ fair plans\n- **Hoodie** order\n\n## Actions\n\n| Action | Who | By when |\n|---|---|---|\n| Book the room | Divine Halim | 20 November |\n| Send the **budget** | Treasurer | Friday |\n| Ask the SU | Ryan and Thomas | Not set |\n';
 assert.deepEqual(minutesActions(minutes),[{action:'Book the room',who:'Divine Halim',by:'20 November'},{action:'Send the budget',who:'Treasurer',by:'Friday'},{action:'Ask the SU',who:'Ryan and Thomas',by:'Not set'}]);
 assert.deepEqual(carriedForward(minutes),['Freshers’ fair plans','Hoodie order']);
 assert.deepEqual(carriedForward('## Next meeting\n\nNothing carried forward.\n\n## Actions\n\nNo actions recorded.'),[]);
 assert.deepEqual(minutesActions('## Actions\n\nNo actions recorded.'),[]);
 const members=[{email:'d@x',name:'Divine Halim',roles:['events']},{email:'r@x',name:'Ryan Dawson',roles:['president']},{email:'r2@x',name:'Raymond Shell',roles:['events']}];
 const roles=[{key:'treasurer',name:'Treasurer'},{key:'events',name:'Events Organiser'}];
 assert.deepEqual(matchAssignee('Divine Halim',members,roles),{assignee_email:'d@x',assignee_role:null});
 assert.deepEqual(matchAssignee('divine',members,roles),{assignee_email:'d@x',assignee_role:null});
 assert.deepEqual(matchAssignee('The Treasurer',members,roles),{assignee_email:null,assignee_role:'treasurer'});
 assert.deepEqual(matchAssignee('Ryan and Thomas',members,roles),{assignee_email:null,assignee_role:null},'two people is left for the Secretary');
 assert.deepEqual(matchAssignee('R',members,roles),{assignee_email:null,assignee_role:null});
 assert.equal(dueFromText('20 November','2026-11-13'),'2026-11-20');
 assert.equal(dueFromText('November 20th','2026-11-13'),'2026-11-20');
 assert.equal(dueFromText('3 January','2026-11-13'),'2027-01-03','a date already gone this year means next year');
 assert.equal(dueFromText('20/11','2026-11-13'),'2026-11-20');
 assert.equal(dueFromText('Friday','2026-11-13'),'2026-11-20','the meeting was on a Friday, so it means next Friday');
 assert.equal(dueFromText('Monday','2026-11-13'),'2026-11-16');
 assert.equal(dueFromText('Not set','2026-11-13'),null);
 assert.equal(dueFromText('next meeting','2026-11-13'),null);
 assert.equal(dueFromText('31/02','2026-11-13'),null);
 assert.equal(agendaDue('2026-11-27','2026-11-13'),'2026-11-24');
 assert.equal(agendaDue('2026-11-14','2026-11-13'),'2026-11-13');
});

test('agendas: built from the last minutes, open actions, items people added, role reports and events, leaving out empty sections', ()=>{
 const text=agendaMarkdown({title:'Committee meeting',date:'2026-11-27',last:{title:'Committee meeting',held_on:'2026-11-13',minutes_link:'https://docs.google.com/d/1'},actions:[{title:'Book the room',who:'Divine Halim',due:'2026-11-20'}],carried:['Hoodie order'],items:[],reports:[{role:'Treasurer',people:'Nathan Walker'}],events:[]});
 assert.match(text,/^# Committee meeting\n\n\*\*Date:\*\* Friday 27 November 2026/);
 assert.match(text,/## 2\. Minutes of the last meeting\n\nApprove the minutes of Committee meeting, Friday 13 November 2026\. \[Read them\]\(https:\/\/docs\.google\.com\/d\/1\)/);
 assert.match(text,/\| Book the room \| Divine Halim \| Friday 20 November 2026 \|/);
 assert.match(text,/## 4\. Carried forward\n\n- Hoodie order/);
 assert.doesNotMatch(text,/Items raised|Coming up/);
 assert.match(text,/## 5\. Officer reports\n\n- Treasurer \(Nathan Walker\)/);
 assert.match(text,/## 7\. Date of the next meeting\n$/);
 assert.match(minutesHtml('See [the doc](https://docs.google.com/d/1) and [this](javascript:alert(1))','x'),/<a href="https:\/\/docs\.google\.com\/d\/1">the doc<\/a> and \[this\]\(javascript:alert\(1\)\)/,'only https links become links');
});

test('event space: one checklist across planning, the day and afterwards, with the stage each card shows', ()=>{
 const event={...blankEvent(),id:'e1',title:'Rust workshop',slug:'rust',starts_at:'2026-11-26T17:00:00Z',ends_at:'2026-11-26T19:00:00Z',venue:'EM 2.50',description:'Learn Rust',cover_path:'a.jpg',square_path:'b.jpg',cover_alt:'Crab',native_skipped:true,signup_required:false,status:'published'};
 const before=Date.parse('2026-11-13T12:00:00Z'),after=Date.parse('2026-11-27T12:00:00Z');
 const plan={...blankPlan('e1'),lead_email:'d@x',budget_status:'approved',venue_status:'confirmed',requirements:[{item:'Projector',kind:'tech',done:true}],risk_status:'done',run_sheet:[{time:'17:00',what:'Doors',who:''}]};
 assert.deepEqual(spaceChecklist(event,plan,before).filter(s=>!s.done).map(s=>s.id),[],'everything done before the event');
 assert.ok(!spaceChecklist(event,plan,before).some(s=>s.id==='post-event'),'the post-event form only appears once the event starts');
 assert.deepEqual(spaceChecklist(event,plan,after).filter(s=>!s.done).map(s=>s.id),['post-event']);
 assert.equal(spaceStage(event,plan,before),'live');
 assert.equal(spaceStage(event,plan,after),'write-up');
 assert.equal(spaceStage(event,{...plan,post_event:{submitted_at:'x'}},after),'done');
 assert.equal(spaceStage({...event,status:'draft'},plan,before),'planning');
 assert.equal(spaceProgress(event,null,before).next.id,'lead','a new plan starts with choosing a lead');
 const tabs=spaceChecklist({...blankEvent(),id:'e2',signup_required:true},null,before).map(s=>s.tab).filter((tab,i,all)=>tab!==all[i-1]);
 assert.deepEqual(tabs,['details','planning','details','day'],'steps on the same tab sit together: details, planning, then back only to publish');
 assert.ok(!spaceChecklist(event,{...plan,requirements:[{item:'Projector',kind:'tech',done:false}]},before).find(s=>s.id==='requirements').done);
 assert.ok(!spaceChecklist(event,{...plan,requirements:[]},before).find(s=>s.id==='requirements').done,'an empty list isn’t sorted until someone says nothing’s needed');
 assert.equal(budgetTotal([{item:'Pizza',amount:'45.50'},{item:'Drinks',amount:'£10'}]),55.5);
 assert.equal(money(55.5),'£55.50');assert.equal(money(40),'£40');
 assert.deepEqual(Object.keys(budgetProblems([{item:'',amount:'5'},{item:'Pizza',amount:'lots'},{item:'',amount:''}])),['item-0','amount-1']);
 assert.equal(academicYear('2026-11-26T17:00:00Z'),'2026-27');
 assert.equal(academicYear('2027-03-01T17:00:00Z'),'2026-27');
 assert.equal(academicYear('2027-08-01T17:00:00Z'),'2027-28');
 assert.equal(eventFolder(event),'Events/2026-27/2026-11-26 Rust workshop');
 assert.equal(eventFolder({...event,title:'AI / ML night'}),'Events/2026-27/2026-11-26 AI - ML night','a slash in a title can’t make another folder');
 assert.ok(!checklist(event).some(s=>s.id==='socials'),'publishing no longer waits for the socials tick');
});

test('social posts: the words follow the event, and a post is done once every platform is posted or skipped', ()=>{
 const event={...blankEvent(),title:'Rust workshop',slug:'rust',starts_at:'2026-11-26T17:00:00Z',ends_at:'2026-11-26T19:00:00Z',venue:'EM 2.50',description:'Learn Rust.',luma_url:'https://lu.ma/rust'};
 assert.equal(postText(event,'announce','https://x.org'),'Rust workshop\nWhen: Thursday 26 November, 17:00–19:00\nWhere: EM 2.50\n\nLearn Rust.\n\nSign up: https://lu.ma/rust\nMore: https://x.org/events/rust');
 assert.match(postText(event,'week'),/^One week to go: Rust workshop\n/);
 assert.match(postText(event,'day'),/^Rust workshop is today!\nFrom 17:00–19:00 at EM 2\.50\./);
 assert.match(postText(event,'cancelled'),/^Sorry, Rust workshop on Thursday 26 November is cancelled\./);
 const none=platformsOf({details:{}});assert.deepEqual(Object.keys(none),['instagram','discord','linkedin']);assert.ok(!postFinished(none));
 assert.ok(postFinished({instagram:{state:'posted'},discord:{state:'skipped'},linkedin:{state:'posted'}}));
 assert.equal(platformProblem({state:'posted',link:'instagram.com/p/1'}),'Paste the full link to the post, starting https://');
 assert.equal(weekStart('2026-11-13'),'2026-11-09');assert.equal(weekStart('2026-11-09'),'2026-11-09');
 assert.equal(weekLabel('2026-11-09','2026-11-13'),'This week');assert.equal(weekLabel('2026-11-16','2026-11-13'),'Next week');assert.equal(weekLabel('2026-11-23','2026-11-13'),'Week of Mon 23 Nov');
});

test('money: claims need a receipt and say who pays them back, each person sees only their next step, and the year report adds up', ()=>{
 const claim={...blankClaim('2026-11-13'),description:'Pizza',amount:'45.50',receipt_link:'https://drive.google.com/x'};
 assert.deepEqual(claimProblems(claim),{});
 assert.deepEqual(Object.keys(claimProblems({...claim,receipt_link:null,payer:'company',payer_name:''})),['payer_name','receipt']);
 assert.equal(claimEditable({...claim,amount:'£1,045.50'}).amount,1045.5);
 const c=(status,claimant='a@x')=>({...claim,status,claimant_email:claimant});
 assert.equal(claimAction(c('submitted'),'t@x',true),'approve');
 assert.equal(claimAction(c('submitted','t@x'),'t@x',true),null,'nobody approves their own claim');
 assert.equal(claimAction(c('approved'),'t@x',true),'submit-to-su');
 assert.equal(claimAction(c('sent-back'),'a@x',false),'resubmit');
 assert.equal(claimAction(c('tracking'),'a@x',false),'mark-sent');
 assert.equal(claimAction(c('sent'),'a@x',false),'mark-paid');
 assert.equal(claimAction(c('sent'),'t@x',true),null,'only the claimant knows when they’ve been paid');
 const event={...blankEvent(),id:'e1',title:'Board games',starts_at:'2026-11-19T17:00:00Z',status:'published'};
 const plans=[{...blankPlan('e1'),budget_lines:[{item:'Pizza',amount:'50'}],budget_status:'approved',budget_approved:'40.00'}];
 const claims=[{...c('paid'),amount:45.5,spent_on:'2026-11-19',event_id:'e1'},{...c('sent-back'),amount:10,spent_on:'2026-11-19',event_id:'e1'},{...c('tracking'),payer:'company',payer_name:'Acme',amount:80,spent_on:'2026-11-20',event_id:null}];
 assert.equal(spentOn('e1',claims),45.5,'sent-back claims don’t count');
 const income=[{kind:'membership',description:'Fees',amount:'300',status:'received',received_on:'2026-10-01',due_on:null,event_id:null},{kind:'grant',description:'SU grant',amount:'200',status:'expected',due_on:'2027-01-10',received_on:null,event_id:null},{kind:'tickets',description:'Old',amount:'99',status:'received',received_on:'2026-07-01',due_on:null,event_id:null}];
 const report=yearReport({year:'2026-27',claims,income,events:[event],plans});
 assert.match(report,/\*\*Money in:\*\* £300\n\*\*Paid out by the society:\*\* £45\.50\n\*\*Balance for the year:\*\* £254\.50/);
 assert.match(report,/Still expected: SU grant \(£200\)\./);
 assert.match(report,/\| Board games \| £40 \| £45\.50 \|/);
 assert.match(report,/1 paid back by companies or sponsors, totalling £80\. These didn’t use society money\./);
 assert.deepEqual(Object.keys(incomeProblems({kind:'grant',description:'Grant',amount:'200',status:'applying',due_on:null})),['due_on'],'a grant application needs its deadline');
});

test('directory: entries need a name, passwords are refused, and search covers who holds a login', ()=>{
 assert.deepEqual(Object.keys(entryProblems({...blankEntry('login'),name:'Instagram',notes:'Password: hunter2'})),['notes']);
 assert.deepEqual(entryProblems({...blankEntry('login'),name:'Instagram',notes:'In the society password manager.'}),{},'mentioning where the password is kept is fine');
 assert.deepEqual(Object.keys(entryProblems({...blankEntry(),email:'not-an-email',url:'example.com'})),['name','email','url']);
 const members=[{email:'a@x',name:'Amanda Zhang',roles:[]}];
 const login={...blankEntry('login'),name:'Instagram',holder_email:'a@x'};
 assert.ok(directoryMatches(login,'amanda insta',members));assert.ok(!directoryMatches(login,'linkedin',members));assert.ok(directoryMatches(login,'',members));
});

test('SU, AGM, sponsors and numbers: the AGM sets off everyone’s tasks, and terms and events are counted the same way everywhere', ()=>{
 const tasks=agmTasks('2027-03-20','2026-11-13',['secretary','treasurer']);
 assert.deepEqual(tasks.map(t=>[t.assignee_role,t.due_on,t.kind]),[['secretary','2027-03-06','agm'],['secretary','2027-03-13','agm'],['treasurer','2027-03-17','agm'],['president','2027-03-17','agm'],['secretary','2027-03-22','agm'],['secretary','2027-04-03','handover'],['treasurer','2027-04-03','handover']]);
 assert.equal(agmTasks('2026-11-20','2026-11-13')[0].due_on,'2026-11-13','a notice already overdue is due today');
 assert.equal(agmNoticeDate('2027-03-20'),'2027-03-06');
 const summary=committeeSummary([{key:'treasurer',name:'Treasurer',position:4},{key:'president',name:'President',position:1}],[{email:'n@x',name:'Nathan Walker',roles:['treasurer']},{email:'r@x',name:'Ryan Dawson',roles:['president']}]);
 assert.equal(summary.text,'President: Ryan Dawson <r@x>\nTreasurer: Nathan Walker <n@x>');
 assert.deepEqual(Object.keys(sponsorProblems({...blankSponsor(),website:'acme.com'})),['name','website']);
 assert.equal(termOf('2026-11-13'),'2026-27 Semester 1');assert.equal(termOf('2027-02-01'),'2026-27 Semester 2');assert.equal(termOf('2027-07-01'),'2026-27 Summer');
 const events=[{...blankEvent(),id:'a',status:'published',starts_at:'2026-10-01T17:00:00Z',ends_at:'2026-10-01T19:00:00Z'},{...blankEvent(),id:'b',status:'published',starts_at:'2026-11-01T17:00:00Z',ends_at:'2026-11-01T19:00:00Z'},{...blankEvent(),id:'c',status:'cancelled',starts_at:'2026-11-02T17:00:00Z',ends_at:'2026-11-02T19:00:00Z'}];
 const plans=[{...blankPlan('a'),post_event:{attendance:30}}];
 assert.deepEqual(termEvents('2026-27 Semester 1',events,plans,Date.parse('2026-11-13T00:00:00Z')),{held:2,attendance:30,counted:1});
});

test('risk assessments: R is always L × S on the SU form, and anything unreadable is left for the organiser', ()=>{
 const form=['| School/Directorate | Location | Reference | Date | Assessor |','|---|---|---|---|---|','| CompSoc: Rust | EM 2.50 | ---- | 15 November 2026 | Divine |','','## Hazards','',
  '| What are the hazards? | Who might be harmed? | Control measures | L | S | R | Additional control measures | Action by whom? | Action by date |','|---|---|---|---|---|---|---|---|---|',
  '| Slips, trips and falls | Members | Dry floor | 2 | 2 | 5 | No further action | Divine | 24 November |','| Cables | Members | Taped down | 3 | 3 |  | Check before doors | Divine | 26 November |','| Allergies | Attendees | None yet | high | 4 | 9 | Ask at sign-up | Divine | 20 November |','','Some notes after.'].join('\n');
 const fixed=fixRiskScores(form).split('\n');
 assert.equal(fixed[8],'| Slips, trips and falls | Members | Dry floor | 2 | 2 | 4 | No further action | Divine | 24 November |','a wrong sum is put right');
 assert.equal(fixed[9],'| Cables | Members | Taped down | 3 | 3 | 9 | Check before doors | Divine | 26 November |','a missing R is filled in');
 assert.equal(fixed[10],'| Allergies | Attendees | None yet | high | 4 | 9 | Ask at sign-up | Divine | 20 November |','a score that isn’t 1 to 4 is left alone');
 assert.deepEqual(fixed.slice(0,3),form.split('\n').slice(0,3),'other tables, like the header, are untouched');
 assert.equal(fixRiskScores('No tables here.'),'No tables here.');
});

test('the events calendar shows whole Monday-to-Sunday weeks', ()=>{
 const weeks=monthGrid('2026-11');
 assert.equal(weeks[0][0],'2026-10-26');assert.equal(weeks.at(-1)[6],'2026-12-06');assert.equal(weeks.length,6);assert.ok(weeks.every(w=>w.length===7));
 assert.equal(monthGrid('2027-02')[0][0],'2027-02-01','February 2027 starts on a Monday');assert.equal(monthGrid('2027-02').length,4);
});
