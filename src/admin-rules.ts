// The publishing rules as the form explains them. The database enforces the same rules, so it has the final say.
import {COMMITTEE_BUCKET,COVER_BUCKET,DOCUMENT_BUCKET,SUPABASE_URL,coverThumb} from './supabase-config.ts';
export const NATIVE_CREATE='https://promoters.native.fm/event/event/create';
export const LUMA_CREATE='https://luma.com/create';

export type AdminEvent={id?:string;slug:string;title:string;category:string;level:string;starts_at:string|null;ends_at:string|null;venue:string;description:string;signup_required:boolean;native_url:string|null;native_skipped?:boolean;luma_url:string|null;socials_sent:boolean;status:'draft'|'published'|'cancelled';cover_path?:string|null;square_path?:string|null;cover_alt?:string;cost?:string|null;open_to?:string|null;published_at?:string|null;updated_at?:string};
export const blankEvent=():AdminEvent=>({slug:'',title:'',category:'Workshop',level:'Everyone welcome',starts_at:null,ends_at:null,venue:'',description:'',signup_required:true,native_url:null,native_skipped:false,luma_url:null,socials_sent:false,status:'draft',cover_path:null,square_path:null,cover_alt:'',cost:null,open_to:null});

// Event images: 'cover' is the landscape one the site shows and Native needs (Native serves its images at 736 × 412, about 16:9),
// 'square' is for Luma, Instagram and Discord. Close to the shape is enough, so a few pixels out doesn't mean redoing a poster.
// These are the sizes saved and what's accepted. Scaling only ever goes down.
export const COVER_FULL={longest:1600,quality:.88},COVER_THUMB={longest:480,quality:.75},COVER_MIN=800;
export type CoverKind='cover'|'square';
export function coverProblem(kind:CoverKind,width:number,height:number){if(width<COVER_MIN)return `That image is only ${width} pixels wide. Use one at least ${COVER_MIN} wide, so it stays sharp.`;if(kind==='cover'&&Math.abs(width/height-16/9)>.05*16/9)return `That image is ${width} × ${height}, so it isn’t 16:9 landscape. Use one shaped like 1600 × 900.`;if(kind==='square'&&Math.abs(width-height)>.02*Math.max(width,height))return `That image is ${width} × ${height}, so it isn’t square. Use one shaped like 1080 × 1080.`;return null}
export function coverSize(width:number,height:number,longest:number){const scale=Math.min(1,longest/Math.max(width,height));return {width:Math.round(width*scale),height:Math.round(height*scale)}}
export const coverUrl=(path:string,thumb=false)=>`${SUPABASE_URL}/storage/v1/object/public/${COVER_BUCKET}/${thumb?coverThumb(path):path}`;
export const coverDownload=(path:string,name:string)=>`${coverUrl(path)}?download=${encodeURIComponent(name)}`;

// While someone types, a trailing hyphen stays, or they could never type one. `slugify` tidies it up afterwards.
export const slugTyping=(title:string)=>title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+/,'').slice(0,60);
export const slugify=(title:string)=>slugTyping(title).replace(/-+$/,'');
export const isLink=(value:string|null)=>!!value&&/^https:\/\/\S+$/.test(value);

// What still stands between this event and going live, in the order the organiser does it.
export function missingSteps(event:AdminEvent){const missing:string[]=[];
 if(!event.title.trim())missing.push('Add a title');
 if(!event.slug)missing.push('Add a web address');
 if(!event.starts_at)missing.push('Add a start time');
 if(!event.ends_at)missing.push('Add an end time');
 if(event.starts_at&&event.ends_at&&new Date(event.ends_at)<=new Date(event.starts_at))missing.push('Make the end time later than the start');
 if(!event.venue.trim())missing.push('Add a venue');
 if(!event.description.trim())missing.push('Add a description');
 if(!event.cover_path)missing.push('Add a landscape image');
 if(!event.square_path)missing.push('Add a square image');
 if(!event.cover_alt?.trim())missing.push('Describe the image');
 if(!isLink(event.native_url)&&!event.native_skipped)missing.push('Create it on Native and paste the link, or skip it');
 if(event.signup_required&&!isLink(event.luma_url))missing.push('Create it on Luma and paste the link');
 return missing}

// Offset of UK time from UTC at a moment, in milliseconds.
function ukOffset(ms:number){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(ms)).map(p=>[p.type,p.value]));return Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second)-Math.floor(ms/1000)*1000}
// The form's date and time boxes always mean UK time, wherever the browser is.
export function ukInputToIso(value:string){if(!value)return null;const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);if(!match)return null;const [,y,mo,d,h,mi]=match.map(Number);const wall=Date.UTC(y,mo-1,d,h,mi);return new Date(wall-ukOffset(wall-ukOffset(wall))).toISOString()}
export function isoToUkInput(iso:string|null){if(!iso)return '';const ms=new Date(iso).getTime();return new Date(ms+ukOffset(ms)).toISOString().slice(0,16)}

// Everything the Social Media Managers need for a post, in one message.
export function eventDetailsText(event:AdminEvent,site=''){const when=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
 return [event.title,event.starts_at?`When: ${when(event.starts_at)}`:'',event.venue?`Where: ${event.venue}`:'',event.description,event.luma_url?`Sign up: ${event.luma_url}`:'',event.slug?`Website: ${site}/events/${event.slug}`:'',event.square_path?`Square image: ${coverUrl(event.square_path)}`:''].filter(Boolean).join('\n')}

export const PASSWORD_MIN=12;
export function passwordProblem(password:string){if(password.length<PASSWORD_MIN)return `Use at least ${PASSWORD_MIN} characters.`;if(/password|changeme|compsoc|qwerty|123456/i.test(password))return 'That’s too easy to guess. Try a few unrelated words.';return null}

// Admin routes. Unknown addresses inside /admin get the admin's own "not found" page.
export type AdminRoute={name:'login'|'set-password'|'overview'|'tasks'|'content'|'photos'|'money'|'directory'|'sponsors'|'handover'|'numbers'|'events'|'new'|'event'|'edit'|'account'|'people'|'committee'|'faqs'|'guides'|'guide'|'documents'|'minutes'|'drive'|'help'|'notfound';id?:string};
export function adminRoute(pathname:string):AdminRoute{const parts=pathname.toLowerCase().split('/').filter(Boolean).slice(1);const [a,b,c,...rest]=parts;if(rest.length)return {name:'notfound'};
 if(!a)return {name:'overview'};if(!b&&(a==='login'||a==='set-password'||a==='account'||a==='tasks'||a==='content'||a==='photos'||a==='money'||a==='directory'||a==='sponsors'||a==='handover'||a==='numbers'||a==='people'||a==='committee'||a==='faqs'||a==='documents'||a==='minutes'||a==='drive'||a==='help'))return {name:a};
 if(a==='guides'){if(!b)return {name:'guides'};if(b==='new'&&!c)return {name:'guide'};if(/^[0-9a-f-]{36}$/.test(b)&&!c)return {name:'guide',id:b}}
 if(a==='events'){if(!b)return {name:'events'};if(b==='new'&&!c)return {name:'new'};if(/^[0-9a-f-]{36}$/.test(b)){if(!c)return {name:'event',id:b};if(c==='edit')return {name:'edit',id:b}}}
 return {name:'notfound'}}
// Only ever return to somewhere inside the admin area after signing in.
export const safeNext=(next:string|null)=>next&&/^\/admin(\/|\?|$)/.test(next)&&!next.includes('//')&&!next.startsWith('/admin/login')&&!next.startsWith('/admin/set-password')?next:'/admin';

export const statusLabel={draft:'Draft',published:'Live',cancelled:'Cancelled'} as const;
export type StepId='details'|'native'|'luma';
export function detailsMissing(event:AdminEvent){const missing:string[]=[];if(!event.title.trim())missing.push('A title');if(!event.slug)missing.push('A web address');if(!event.starts_at)missing.push('A date and start time');if(!event.ends_at)missing.push('An end time');if(!event.venue.trim())missing.push('A venue');if(!event.description.trim())missing.push('A description');if(!event.cover_path)missing.push('A landscape image');if(!event.square_path)missing.push('A square image');if(!event.cover_alt?.trim())missing.push('A description of the image');return missing}
// The steps that get an event live. Luma only appears when the event needs sign-up.
export function checklist(event:AdminEvent){const steps:{id:StepId;label:string;done:boolean}[]=[{id:'details',label:'Finish the event details',done:!detailsMissing(event).length},{id:'native',label:'Create it on Native',done:isLink(event.native_url)||!!event.native_skipped}];if(event.signup_required)steps.push({id:'luma',label:'Create it on Luma',done:isLink(event.luma_url)});return steps}
export const progress=(event:AdminEvent)=>{const steps=checklist(event);return {done:steps.filter(step=>step.done).length,total:steps.length}};
export const nextStep=(event:AdminEvent)=>checklist(event).find(step=>!step.done)?.label??null;

export type EventTab='drafts'|'upcoming'|'past'|'cancelled';
export function eventTab(event:AdminEvent,now=Date.now()):EventTab{if(event.status==='draft')return 'drafts';if(event.status==='cancelled')return 'cancelled';return event.ends_at&&new Date(event.ends_at).getTime()<now?'past':'upcoming'}

// The form asks for one date and two times. "Finishes the next day" covers socials that run past midnight.
export type When={date:string;start:string;end:string;nextDay:boolean};
export function whenToIso(when:When){const starts_at=when.date&&when.start?ukInputToIso(`${when.date}T${when.start}`):null;if(!when.date||!when.end)return {starts_at,ends_at:null};const [y,m,d]=when.date.split('-').map(Number);const day=new Date(Date.UTC(y,m-1,d+(when.nextDay?1:0))).toISOString().slice(0,10);return {starts_at,ends_at:ukInputToIso(`${day}T${when.end}`)}}
export function isoToWhen(starts:string|null,ends:string|null):When{const start=isoToUkInput(starts),end=isoToUkInput(ends);return {date:start.slice(0,10),start:start.slice(11,16),end:end.slice(11,16),nextDay:!!start&&!!end&&start.slice(0,10)!==end.slice(0,10)}}
export type Problems=Record<string,string>;
export const titleProblems=(event:AdminEvent):Problems=>event.title.trim()?{}:{title:'Give the event a title.'};
export const altProblems=(event:AdminEvent):Problems=>event.cover_alt?.trim()?{}:{cover_alt:'Describe the image.'};
export const descriptionProblems=(event:AdminEvent):Problems=>event.description.trim()?{}:{description:'Add a short description.'};
export function whenProblems(when:When,venue:string,required=true){const found:Problems={};if(required){if(!when.date)found.date='Choose a date.';if(!when.start)found.start='Add a start time.';if(!when.end)found.end='Add an end time.';if(!venue.trim())found.venue='Say where it is.'}const {starts_at,ends_at}=whenToIso(when);if(starts_at&&ends_at&&new Date(ends_at)<=new Date(starts_at))found.end='The end must be after the start. If it finishes after midnight, tick the box below.';return found}
export const slugAttempt=(base:string,attempt:number)=>attempt<=1?base:`${base.slice(0,56).replace(/-+$/,'')}-${attempt}`;
// The only fields a form may send: never the id or published time, or the images, which CoverField saves itself.
export function editableFields(event:AdminEvent){const {slug,title,category,level,starts_at,ends_at,venue,description,signup_required,native_url,native_skipped=false,luma_url,socials_sent,status,cover_alt,cost,open_to}=event;return {cover_alt,cost:cost?.trim()||null,open_to:open_to?.trim()||null,slug,title,category,level,starts_at,ends_at,venue,description,signup_required,native_url,native_skipped,luma_url,socials_sent,status}}

const uk=(iso:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).format(new Date(iso));
export const shortDate=(iso:string|null)=>iso?`${uk(iso,{day:'2-digit'})} ${uk(iso,{month:'short'}).slice(0,3).toUpperCase()}`:'';
export const fullDate=(iso:string)=>`${uk(iso,{weekday:'long'})} ${uk(iso,{day:'numeric'})} ${uk(iso,{month:'long'})} ${uk(iso,{year:'numeric'})}`;
export const timeRange=(start:string,end:string|null)=>{const at=(iso:string)=>uk(iso,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});return end?`${at(start)}–${at(end)}`:at(start)};

// Has the public site caught up? The site's published list is compared with the saved event, field by field.
export type SiteRow=Pick<AdminEvent,'slug'|'title'|'category'|'level'|'starts_at'|'ends_at'|'venue'|'description'|'signup_required'|'luma_url'|'status'|'cover_path'|'cover_alt'|'cost'|'open_to'>;
const time=(iso:string|null)=>iso?new Date(iso).getTime():null;
export function matchesSite(event:AdminEvent,row:SiteRow){return row.title===event.title&&row.category===event.category&&row.level===event.level&&time(row.starts_at)===time(event.starts_at)&&time(row.ends_at)===time(event.ends_at)&&row.venue===event.venue&&row.description===event.description&&row.signup_required===event.signup_required&&(row.luma_url??null)===(event.luma_url??null)&&row.status===event.status&&(row.cover_path??null)===(event.cover_path??null)&&(row.cover_alt??'')===(event.cover_alt??'')&&(row.cost??null)===(event.cost??null)&&(row.open_to??null)===(event.open_to??null)}
export type SitePhase='hidden'|'live'|'publishing'|'updating'|'removing'|'unknown';
export function sitePhase(event:AdminEvent,rows:SiteRow[]|null):SitePhase{const row=rows?.find(r=>r.slug===event.slug);if(event.status==='draft'){if(!rows)return event.published_at?'unknown':'hidden';return row?'removing':'hidden'}if(!rows)return 'unknown';if(!row)return 'publishing';return matchesSite(event,row)?'live':'updating'}
export const siteBusy=(phase:SitePhase)=>phase==='publishing'||phase==='updating'||phase==='removing';
// A rebuild takes minutes. Past this, something has probably gone wrong.
export const SITE_SLOW_AFTER=10*60*1000;
export const siteSlow=(event:AdminEvent,now=Date.now())=>!!event.updated_at&&now-new Date(event.updated_at).getTime()>SITE_SLOW_AFTER;
export function badgeFor(event:Pick<AdminEvent,'status'>,phase:SitePhase|null){if(phase==='publishing')return {label:'Going live',state:'busy'};if(phase==='updating')return {label:'Updating',state:'busy'};return {label:statusLabel[event.status],state:event.status}}

// The committee page. Photos are square and small, as they only ever show small.
export const PHOTO_MIN=200,PHOTO_SIZE=384,PHOTO_QUALITY=.85;
export const photoUrl=(path:string)=>`${SUPABASE_URL}/storage/v1/object/public/${COMMITTEE_BUCKET}/${path}`;
export const photoProblem=(width:number,height:number)=>Math.min(width,height)<PHOTO_MIN?`That image is only ${width} × ${height}. Use one at least ${PHOTO_MIN} pixels on each side, so it stays sharp.`:null;
// People paste whole addresses, so these keep just the username, which is all that's stored.
export const discordHandle=(value:string)=>value.trim().replace(/^@/,'').toLowerCase();
export const githubHandle=(value:string)=>value.trim().replace(/^(https?:\/\/)?(www\.)?github\.com\//i,'').replace(/^@/,'').replace(/[/?#].*$/,'');
export const linkedinHandle=(value:string)=>value.trim().replace(/^(https?:\/\/)?([a-z]+\.)?linkedin\.com\/in\//i,'').replace(/[/?#].*$/,'');
export type Profile={bio:string|null;studies:string|null;ask_me_about:string|null;discord:string|null;github:string|null;linkedin:string|null};
export const blankProfile=():Profile=>({bio:null,studies:null,ask_me_about:null,discord:null,github:null,linkedin:null});
export const profileFields=(profile:Profile):Profile=>({bio:profile.bio?.trim()||null,studies:profile.studies?.trim()||null,ask_me_about:profile.ask_me_about?.trim()||null,discord:discordHandle(profile.discord??'')||null,github:githubHandle(profile.github??'')||null,linkedin:linkedinHandle(profile.linkedin??'')||null});
export function profileProblems(profile:Profile):Problems{const {discord,github,linkedin}=profileFields(profile);const found:Problems={};if(discord&&!/^[a-z0-9_.]{2,32}$/.test(discord))found.discord='Use their Discord username, like sam_lee.';if(github&&!/^[A-Za-z0-9-]{1,39}$/.test(github))found.github='Use their GitHub username, like samlee.';if(linkedin&&!/^[A-Za-z0-9_%-]{3,100}$/.test(linkedin))found.linkedin='Use the end of their LinkedIn address, like sam-lee-123.';return found}
export const committeeNameProblem=(name:string,message:string)=>name.trim()?null:message;
export const nextPosition=(rows:{position:number}[])=>Math.max(0,...rows.map(row=>row.position))+1;
// The two rows with their positions swapped, ready to save together, or null if there's nowhere to go.
export function moved<T extends {id:string;position:number}>(rows:T[],id:string,by:-1|1){const at=rows.findIndex(row=>row.id===id);const other=rows[at+by];if(at<0||!other)return null;return [{...rows[at],position:other.position},{...other,position:rows[at].position}]}

// Has the public site caught up with the committee? Compared as the About page would show it, in order.
export type SiteTeam={name:string;description:string;committee_people:({name:string;photo_path:string|null}&Partial<Profile>)[]};
const shownCommittee=(teams:SiteTeam[])=>JSON.stringify(teams.map(team=>[team.name,team.description,team.committee_people.map(person=>[person.name,person.photo_path??null,person.bio??null,person.studies??null,person.ask_me_about??null,person.discord??null,person.github??null,person.linkedin??null])]));
const phaseFrom=(saved:string|null,site:string|null):SitePhase=>site===null?'unknown':saved===null||saved===site?'live':'updating';
export const committeePhase=(saved:SiteTeam[]|undefined,site:SiteTeam[]|null):SitePhase=>phaseFrom(saved?shownCommittee(saved):null,site&&shownCommittee(site));
export type SiteFaq={question:string;answer:string};
const shownFaqs=(faqs:SiteFaq[])=>JSON.stringify(faqs.map(faq=>[faq.question,faq.answer]));
export const faqPhase=(saved:SiteFaq[]|undefined,site:SiteFaq[]|null):SitePhase=>phaseFrom(saved?shownFaqs(saved):null,site&&shownFaqs(site));

// Guides. A draft only needs a title. Anything on the site must be complete, and a confirmed guide needs someone looking after it.
export const GUIDE_CATEGORIES=['Learning','Community','Support'] as const;
export const GUIDE_KINDS=['Starter guide','Workshop notes','Contribution guide','Support directory'];
export type GuideStatus='draft'|'confirmed';
export type Guide={id?:string;slug:string;title:string;category:typeof GUIDE_CATEGORIES[number];kind:string;description:string;body:string;status:GuideStatus;maintainer:string;reviewed_on:string|null;position?:number;published_at?:string|null};
export const blankGuide=():Guide=>({slug:'',title:'',category:'Learning',kind:'Starter guide',description:'',body:'',status:'draft',maintainer:'',reviewed_on:null});
// The only fields a form may send: never the id or published time.
export function guideEditable(guide:Guide){const {slug,title,category,kind,description,body,status,maintainer,reviewed_on}=guide;return {slug,title,category,kind,description,body,status,maintainer,reviewed_on}}
export function guideProblems(guide:Guide):Problems{const found:Problems={};if(!guide.title.trim())found.title='Give the guide a title.';if(guide.status==='draft')return found;if(!guide.kind.trim())found.kind='Say what type of guide it is.';if(!guide.description.trim())found.description='Add a short description for the card.';if(!guide.body.trim())found.body='Write the guide first.';if(guide.status==='confirmed'&&!guide.maintainer.trim())found.maintainer='Name who looks after this guide.';return found}
// Today in the UK, as a plain date.
export const todayInUk=(now=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
// A guide is due another look a year after its last review.
export function reviewDue(reviewed:string|null|undefined,now=Date.now()){if(!reviewed)return false;const due=new Date(`${reviewed}T00:00:00Z`);due.setUTCFullYear(due.getUTCFullYear()+1);return now>=due.getTime()}
export type SiteGuide=Pick<Guide,'slug'|'title'|'category'|'kind'|'description'|'body'|'status'|'reviewed_on'>;
const shownGuides=(guides:SiteGuide[])=>JSON.stringify(guides.filter(guide=>guide.status!=='draft').map(guide=>[guide.slug,guide.title,guide.category,guide.kind,guide.description,guide.body,guide.status,guide.reviewed_on??null]));
export const guidePhase=(saved:SiteGuide[]|undefined,site:SiteGuide[]|null):SitePhase=>phaseFrom(saved?shownGuides(saved):null,site&&shownGuides(site));

// Documents. What a visitor would see decides whether the site has caught up.
export const DOCUMENT_MAX=20*1024*1024;
export const documentProblem=(size:number,startsAsPdf:boolean)=>!startsAsPdf?'That file isn’t a PDF. Save it as a PDF and try again.':size>DOCUMENT_MAX?'That file is over 20 MB. Try making it smaller.':null;
export const documentUrl=(path:string)=>`${SUPABASE_URL}/storage/v1/object/public/${DOCUMENT_BUCKET}/${path}`;
export const readableSize=(bytes:number)=>bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
export type SiteDocument={title:string;approved_on:string;file_path:string};
const shownDocuments=(rows:SiteDocument[])=>JSON.stringify(rows.map(row=>[row.title,row.approved_on,row.file_path]));
export const documentPhase=(saved:SiteDocument[]|undefined,site:SiteDocument[]|null):SitePhase=>phaseFrom(saved?shownDocuments(saved):null,site&&shownDocuments(site));

// Meeting minutes. A Teams transcript repeats who's speaking and when on every line, which is most of its length, so it's
// cut down to one "Name: what they said" line per turn before it's sent. The server function checks the same limit.
export const TRANSCRIPT_MAX=120000;
// Roughly how long the AI takes, from the transcript's length: about 20 seconds, plus a second for every 2,000 characters.
export const expectedMinutesSeconds=(characters:number)=>Math.round(20+characters/2000);
// Which step the progress shows: sending for the first 2 seconds, then reading for about a third of the time, then writing.
export const minutesStage=(seconds:number,expected:number)=>seconds<2?0:seconds<Math.max(4,expected*.35)?1:2;
const CLOCK=String.raw`(?:\d+:)?\d{1,2}:\d{2}(?:\.\d+)?`;
const STAMP=new RegExp(String.raw`^${CLOCK}(?:\s*-->\s*${CLOCK}.*)?$`);
// "Name   0:03", "Name 1:02:03", "Name 0:00:03.120 --> 0:00:05.440" or "Name 3 minutes 5 seconds".
const HEADER=new RegExp(String.raw`^(.{1,80}?)\s+(?:${CLOCK}(?:\s*-->\s*${CLOCK})?|(?:\d+ hours? ?)?(?:\d+ minutes? ?)?(?:\d+ seconds?)?)$`);
export function cleanTranscript(raw:string){const lines=raw.replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim());
 // Only treat "words then a time" as a speaker line if that speaker comes up more than once, or Teams' wide gap separates the
 // name from the time, so "Meet at 5:30" stays a sentence.
 const named=new Map<string,number>();for(const line of lines){const who=line.match(HEADER)?.[1];if(who&&/\d/.test(line.slice(who.length)))named.set(who,(named.get(who)??0)+1)}
 const turns:{who:string;said:string}[]=[];let speaker='';let note=false;
 const add=(who:string,said:string)=>{said=said.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();if(!said)return;const last=turns.at(-1);if(last&&who&&last.who===who)last.said+=` ${said}`;else turns.push({who,said})};
 for(const line of lines){if(!line){note=false;continue}if(note||line==='WEBVTT')continue;if(/^NOTE\b/.test(line)){note=true;continue}
  if(STAMP.test(line)||/^\d+$/.test(line)||/^[0-9a-f-]{36}\/\d+-\d+$/i.test(line))continue;
  const voice=line.match(/^<v\s+([^>]+)>(.*)$/);if(voice){speaker='';add(voice[1].trim(),voice[2]);continue}
  const header=line.match(HEADER);if(header&&((named.get(header[1])??0)>1||/^(?: {2,}|	)/.test(line.slice(header[1].length)))){speaker=header[1];continue}
  add(speaker,line)}
 return turns.map(turn=>turn.who?`${turn.who}: ${turn.said}`:turn.said).join('\n')}
export function minutesProblems({title,date,transcript}:{title:string;date:string;transcript:string}){const problems:Problems={};
 if(!title.trim())problems.title='Name the meeting.';if(!/^\d{4}-\d{2}-\d{2}$/.test(date))problems.date='Choose the date of the meeting.';
 if(!transcript.trim())problems.transcript='Paste the transcript, or open the file from Teams.';else if(transcript.length>TRANSCRIPT_MAX)problems.transcript='That’s longer than about two hours of meeting. Split it in two and do each half separately.';
 return problems}

// Minutes are saved to Drive as HTML, which Drive turns into a Google Doc with real headings and a real table.
// Only the Markdown the minutes and agendas use: headings, **bold**, [links](https://…), bullet and numbered lists, tables and paragraphs.
const escapeHtml=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const inlineHtml=(text:string)=>escapeHtml(text).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>');
export function minutesHtml(markdown:string,title:string){const out:string[]=[];let para:string[]=[];let list:'ul'|'ol'|''='';let table:string[][]|null=null;
 const endPara=()=>{if(para.length)out.push(`<p>${para.map(inlineHtml).join('<br>')}</p>`);para=[]};
 const endList=()=>{if(list)out.push(`</${list}>`);list=''};
 const endTable=()=>{if(!table)return;const [head,...rows]=table;out.push(`<table border="1" cellpadding="6" style="border-collapse:collapse"><tr>${head.map(cell=>`<th>${inlineHtml(cell)}</th>`).join('')}</tr>${rows.map(row=>`<tr>${row.map(cell=>`<td>${inlineHtml(cell)}</td>`).join('')}</tr>`).join('')}</table>`);table=null};
 for(const raw of markdown.replace(/\r\n?/g,'\n').split('\n')){const line=raw.trim();
  if(!line){endPara();endList();endTable();continue}
  if(/^\|.*\|$/.test(line)){endPara();endList();const cells=line.slice(1,-1).split('|').map(cell=>cell.trim());if(!cells.every(cell=>/^:?-{2,}:?$/.test(cell)))(table??=[]).push(cells);continue}
  endTable();
  const heading=line.match(/^(#{1,3})\s+(.+)$/);if(heading){endPara();endList();const level=heading[1].length;out.push(`<h${level}>${inlineHtml(heading[2])}</h${level}>`);continue}
  const item=line.match(/^[-*]\s+(.+)$/)??line.match(/^\d+[.)]\s+(.+)$/);
  if(item){endPara();const kind=/^[-*]/.test(line)?'ul':'ol';if(list!==kind){endList();out.push(`<${kind}>`);list=kind}out.push(`<li>${inlineHtml(item[1])}</li>`);continue}
  endList();para.push(line)}
 endPara();endList();endTable();
 return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${out.join('')}</body></html>`}
// Dated first, so they sort in order in the Minutes folder.
export const minutesDocName=(date:string,title:string)=>`${date} ${title.trim().replace(/\s+/g,' ')}`;

export type DriveKind='folder'|'doc'|'sheet'|'slides'|'form'|'pdf'|'image'|'video'|'file';
export function driveKind(mimeType:string):DriveKind{const google=mimeType.match(/^application\/vnd\.google-apps\.(\w+)$/)?.[1];
 if(google)return google==='folder'?'folder':google==='document'?'doc':google==='spreadsheet'?'sheet':google==='presentation'?'slides':google==='form'?'form':'file';
 if(mimeType==='application/pdf')return 'pdf';if(mimeType.startsWith('image/'))return 'image';if(mimeType.startsWith('video/'))return 'video';
 if(/wordprocessingml|msword|opendocument\.text/.test(mimeType))return 'doc';if(/spreadsheetml|ms-excel|text\/csv/.test(mimeType))return 'sheet';if(/presentationml|ms-powerpoint/.test(mimeType))return 'slides';
 return 'file'}
export const driveKindLabel:Record<DriveKind,string>={folder:'Folder',doc:'Document',sheet:'Spreadsheet',slides:'Slides',form:'Form',pdf:'PDF',image:'Image',video:'Video',file:'File'};

// --- Roles and tasks ---
// What each role can see and do. The database enforces the same rules, so it has the final say.
export type Role={key:string;name:string;position:number;sees:string[];create_events:boolean;finances:boolean;content_calendar:boolean;sponsors:boolean};
export type Member={email:string;name:string|null;owner?:boolean;roles:string[]};
export type TaskStatus='open'|'done'|'cancelled';
export type Task={id?:string;title:string;notes:string;assignee_email:string|null;assignee_role:string|null;due_on:string|null;status:TaskStatus;kind:string;event_id:string|null;link:string|null;details:Record<string,unknown>;created_by?:string|null;created_at?:string;done_by?:string|null;done_at?:string|null};
export const blankTask=(assignee_email:string|null=null):Task=>({title:'',notes:'',assignee_email,assignee_role:null,due_on:null,status:'open',kind:'task',event_id:null,link:null,details:{}});
export const ROLE_PERMISSIONS=[{key:'create_events',label:'Create and edit events'},{key:'finances',label:'See and approve finances'},{key:'content_calendar',label:'See the content calendar'},{key:'sponsors',label:'Manage sponsors'}] as const;
export const personName=(member:Pick<Member,'email'|'name'>)=>member.name?.trim()||member.email;
export const taskEditable=(task:Task)=>({title:task.title.trim(),notes:task.notes,assignee_email:task.assignee_email,assignee_role:task.assignee_role,due_on:task.due_on||null,status:task.status,kind:task.kind,event_id:task.event_id,link:task.link?.trim()||null,details:task.details});

// Yours: given to you, or given to one of your roles and not yet picked up by anyone.
export const isMine=(task:Task,email:string,roles:string[])=>task.assignee_email===email||(!task.assignee_email&&!!task.assignee_role&&roles.includes(task.assignee_role));
export function assigneeLabel(task:Task,members:Member[],roles:Role[]){const person=members.find(m=>m.email===task.assignee_email);const role=roles.find(r=>r.key===task.assignee_role);
 if(task.assignee_email)return person?personName(person):task.assignee_email;if(role)return `Anyone in ${role.name}`;return 'Nobody yet'}

const addDays=(iso:string,days:number)=>{const [y,m,d]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10)};
export type DueGroup='overdue'|'week'|'later'|'none';
export const dueGroups:{id:DueGroup;label:string}[]=[{id:'overdue',label:'Overdue'},{id:'week',label:'Due in the next 7 days'},{id:'later',label:'Later'},{id:'none',label:'No due date'}];
export function dueGroup(due:string|null,today:string):DueGroup{if(!due)return 'none';if(due<today)return 'overdue';return due<=addDays(today,6)?'week':'later'}
const dayName=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}).format(new Date(`${iso}T12:00:00Z`));
export function dueLabel(due:string|null,today:string){if(!due)return '';if(due<today)return `Overdue, was due ${dayName(due)}`;if(due===today)return 'Due today';if(due===addDays(today,1))return 'Due tomorrow';return `Due ${dayName(due)}`}
// Soonest first, undated last, then oldest first, so nothing new jumps above what's been waiting.
export const byDue=(a:Task,b:Task)=>(a.due_on??'9999').localeCompare(b.due_on??'9999')||(a.created_at??'').localeCompare(b.created_at??'');
export function taskProblems(task:Task){const problems:Problems={};if(!task.title.trim())problems.title='Say what needs doing.';if(task.link?.trim()&&!isLink(task.link.trim()))problems.link='Paste the full address, starting https://';return problems}
export const taskKindLabel:Record<string,string>={agm:'AGM',agenda:'Agenda',action:'From minutes',post:'Social post','post-event':'After the event',budget:'Budget',claim:'Expense claim',deadline:'Deadline',handover:'Handover'};

// --- Meetings: actions and agendas ---
export type MinutesAction={action:string;who:string;by:string};
const plain=(text:string)=>text.replace(/\*\*/g,'').trim();
// The lines of a "## Heading" section, up to the next heading.
function section(markdown:string,heading:RegExp){const lines=markdown.replace(/\r\n?/g,'\n').split('\n');const start=lines.findIndex(l=>/^#{1,3}\s/.test(l.trim())&&heading.test(l.trim().replace(/^#{1,3}\s*/,'')));if(start<0)return [];const rest=lines.slice(start+1);const end=rest.findIndex(l=>/^#{1,3}\s/.test(l.trim()));return (end<0?rest:rest.slice(0,end)).map(l=>l.trim()).filter(Boolean)}
// The table the minutes end with: | Action | Who | By when |.
export function minutesActions(markdown:string):MinutesAction[]{return section(markdown,/^actions$/i).filter(l=>/^\|.*\|$/.test(l)).map(l=>l.slice(1,-1).split('|').map(plain)).filter(cells=>cells[0]&&!cells.every(c=>/^:?-{2,}:?$/.test(c))&&!/^action$/i.test(cells[0])).map(([action,who='',by=''])=>({action,who,by}))}
// What the meeting agreed to come back to, from the "Next meeting" list.
export const carriedForward=(markdown:string)=>section(markdown,/^next meeting$/i).map(l=>l.match(/^[-*]\s+(.+)$/)?.[1]).filter((item):item is string=>!!item).map(plain);

// Who an action's "Who" means: someone's full name, a role's name, or a first name only one person has. Anything else is left for the Secretary to choose.
export function matchAssignee(who:string,members:Member[],roles:Pick<Role,'key'|'name'>[]):{assignee_email:string|null;assignee_role:string|null}{const none={assignee_email:null,assignee_role:null};if(/\band\b|,|&/i.test(who))return none;
 const said=who.toLowerCase().replace(/[^a-z\s'-]/g,' ').replace(/\s+/g,' ').trim().replace(/^the /,'');if(!said)return none;
 const full=members.find(m=>m.name?.toLowerCase().trim()===said);if(full)return {assignee_email:full.email,assignee_role:null};
 const role=roles.find(r=>r.name.toLowerCase()===said||r.key===said.replace(/\s+/g,'-'));if(role)return {assignee_email:null,assignee_role:role.key};
 if(said.includes(' '))return none;const first=members.filter(m=>m.name?.toLowerCase().split(' ')[0]===said);return first.length===1?{assignee_email:first[0].email,assignee_role:null}:none}

const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const monthOf=(word:string)=>word.length>=3?MONTHS.findIndex(m=>m.startsWith(word.slice(0,3))):-1;
// A deadline as said in the meeting, as a date: "20 November", "20/11", "Friday", or a date. Anything vaguer gives no date.
export function dueFromText(by:string,meeting:string):string|null{const said=by.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g,'$1').replace(/,/g,' ').replace(/\s+/g,' ').trim();if(!said||/not set|^tbc|^n\/?a$/.test(said))return null;
 const [y0,m0,d0]=meeting.split('-').map(Number);const iso=(y:number,m:number,d:number)=>{const date=new Date(Date.UTC(y,m-1,d));return date.getUTCMonth()===m-1&&date.getUTCDate()===d?date.toISOString().slice(0,10):null};
 const after=(y:number|undefined,m:number,d:number)=>{if(y)return iso(y<100?2000+y:y,m,d);const same=iso(y0,m,d);return same&&same<meeting?iso(y0+1,m,d):same};
 let match=said.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(match)return iso(+match[1],+match[2],+match[3]);
 match=said.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);if(match)return after(match[3]?+match[3]:undefined,+match[2],+match[1]);
 match=said.match(/(\d{1,2}) ([a-z]+)(?: (\d{4}))?/);if(match&&monthOf(match[2])>=0)return after(match[3]?+match[3]:undefined,monthOf(match[2])+1,+match[1]);
 match=said.match(/([a-z]+) (\d{1,2})(?: (\d{4}))?/);if(match&&monthOf(match[1])>=0)return after(match[3]?+match[3]:undefined,monthOf(match[1])+1,+match[2]);
 const day=DAYS.findIndex(d=>new RegExp(`\\b${d}\\b`).test(said));if(day>=0){const start=new Date(Date.UTC(y0,m0-1,d0));const ahead=((day-start.getUTCDay()+7)%7)||7;return new Date(start.getTime()+ahead*86400000).toISOString().slice(0,10)}
 return null}

export type AgendaInput={title:string;date:string;last:{title:string;held_on:string;minutes_link:string|null}|null;actions:{title:string;who:string;due:string|null}[];carried:string[];items:{title:string;by:string}[];reports:{role:string;people:string}[];events:{title:string;when:string}[]};
const longDay=(iso:string)=>fullDate(`${iso}T12:00:00Z`);
// The next meeting's agenda, built from the last minutes, open actions, items people asked for, each role's report and what's coming up. Sections with nothing in them are left out.
export function agendaMarkdown(input:AgendaInput){const sections:[string,string[]][]=[['Welcome and apologies',[]]];
 if(input.last)sections.push(['Minutes of the last meeting',[`Approve the minutes of ${input.last.title}, ${longDay(input.last.held_on)}.${input.last.minutes_link?` [Read them](${input.last.minutes_link})`:''}`]]);
 sections.push(['Actions from last time',input.actions.length?['| Action | Who | Due |','|---|---|---|',...input.actions.map(a=>`| ${a.title.replace(/\|/g,'/')} | ${a.who} | ${a.due?longDay(a.due):'Not set'} |`)]:['No open actions.']]);
 if(input.carried.length)sections.push(['Carried forward',input.carried.map(item=>`- ${item}`)]);
 if(input.items.length)sections.push(['Items raised',input.items.map(item=>`- ${item.title} (${item.by})`)]);
 if(input.reports.length)sections.push(['Officer reports',input.reports.map(r=>`- ${r.role}${r.people?` (${r.people})`:''}`)]);
 if(input.events.length)sections.push(['Coming up',input.events.map(e=>`- ${e.title}, ${e.when}`)]);
 sections.push(['Any other business',[]],['Date of the next meeting',[]]);
 return [`# ${input.title}`,'',`**Date:** ${longDay(input.date)}`,'',...sections.flatMap(([heading,body],i)=>[`## ${i+1}. ${heading}`,...(body.length?['',...body]:[]),''])].join('\n').trim()+'\n'}
// A few days' notice: the agenda task falls due three days before the meeting, or today if that's already passed.
export function agendaDue(meeting:string,today:string){const due=addDays(meeting,-3);return due<today?today:due}

// --- The event space: planning, the day itself, and afterwards ---
export type BudgetLine={item:string;amount:string};
export type Requirement={item:string;kind:'tech'|'equipment'|'catering'|'accessibility'|'other';done:boolean};
export type RunSheetRow={time:string;what:string;who:string};
export type PostEvent={attendance?:number|null;went_well?:string;went_badly?:string;run_again?:'yes'|'no'|'maybe'|'';notes?:string;submitted_at?:string;submitted_by?:string};
export type BudgetStatus='none'|'pending'|'approved'|'sent-back';
export type EventPlan={event_id:string;lead_email:string|null;budget_lines:BudgetLine[];budget_status:BudgetStatus;budget_approved:number|string|null;budget_note:string;budget_decided_by:string|null;budget_decided_at:string|null;venue_status:'not-booked'|'requested'|'confirmed'|'not-needed';venue_reference:string;requirements:Requirement[];risk_status:'not-started'|'drafted'|'done'|'not-needed';risk_link:string|null;run_sheet:RunSheetRow[];post_event:PostEvent;post_event_link:string|null;photos_link:string|null;updated_at?:string};
export const blankPlan=(event_id:string):EventPlan=>({event_id,lead_email:null,budget_lines:[],budget_status:'none',budget_approved:null,budget_note:'',budget_decided_by:null,budget_decided_at:null,venue_status:'not-booked',venue_reference:'',requirements:[],risk_status:'not-started',risk_link:null,run_sheet:[],post_event:{},post_event_link:null,photos_link:null});
// What organisers can change. The budget decision is the Treasurer's, and the database only lets them make it.
export const planEditable=(plan:EventPlan)=>({lead_email:plan.lead_email,budget_lines:plan.budget_lines.filter(l=>l.item.trim()||l.amount.trim()).map(l=>({item:l.item.trim(),amount:l.amount.trim()})),venue_status:plan.venue_status,venue_reference:plan.venue_reference.trim(),requirements:plan.requirements.filter(r=>r.item.trim()).map(r=>({...r,item:r.item.trim()})),risk_status:plan.risk_status,risk_link:plan.risk_link?.trim()||null,run_sheet:plan.run_sheet.filter(r=>r.time.trim()||r.what.trim()).map(r=>({time:r.time.trim(),what:r.what.trim(),who:r.who.trim()})),post_event:plan.post_event,post_event_link:plan.post_event_link,photos_link:plan.photos_link});
export const money=(amount:number)=>`£${amount.toFixed(2).replace(/\.00$/,'')}`;
const amountOf=(text:string)=>{const value=Number(text.replace(/[£,\s]/g,''));return Number.isFinite(value)?value:NaN};
export const budgetTotal=(lines:BudgetLine[])=>lines.reduce((sum,line)=>sum+(amountOf(line.amount)||0),0);
export function budgetProblems(lines:BudgetLine[]){const problems:Problems={};lines.forEach((line,i)=>{if(!line.item.trim()&&!line.amount.trim())return;if(!line.item.trim())problems[`item-${i}`]='Say what it’s for.';const value=amountOf(line.amount);if(!line.amount.trim()||Number.isNaN(value)||value<0)problems[`amount-${i}`]='Enter an amount in pounds, like 25 or 12.50.'});return problems}
export const budgetLabel:Record<BudgetStatus,string>={none:'Not sent yet',pending:'Waiting for the Treasurer',approved:'Approved','sent-back':'Sent back'};
export const venueLabel:Record<EventPlan['venue_status'],string>={'not-booked':'Not booked yet',requested:'Requested',confirmed:'Confirmed','not-needed':'No booking needed'};
export const riskLabel:Record<EventPlan['risk_status'],string>={'not-started':'Not started',drafted:'Drafted',done:'Done and saved','not-needed':'Not needed'};
export const requirementKinds:{id:Requirement['kind'];label:string}[]=[{id:'tech',label:'Tech'},{id:'equipment',label:'Equipment'},{id:'catering',label:'Catering'},{id:'accessibility',label:'Accessibility'},{id:'other',label:'Other'}];
export const NOTHING_NEEDED='Nothing extra needed';

export type SpaceTab='overview'|'details'|'planning'|'day'|'after';
export const spaceTabs:{id:SpaceTab;label:string}[]=[{id:'overview',label:'Overview'},{id:'details',label:'Details'},{id:'planning',label:'Planning'},{id:'day',label:'On the day'},{id:'after',label:'After'}];
export type SpaceStep={id:string;label:string;done:boolean;tab:SpaceTab};
// One list of everything an event needs, in the order it usually happens, each pointing at the tab where it's done.
export function spaceChecklist(event:AdminEvent,plan:EventPlan|null,now=Date.now()):SpaceStep[]{const p=plan??blankPlan(event.id??'');const started=!!event.starts_at&&new Date(event.starts_at).getTime()<=now;
 const steps:SpaceStep[]=[{id:'details',label:'Add the details and both images',done:!detailsMissing(event).length,tab:'details'},{id:'lead',label:'Choose a lead organiser',done:!!p.lead_email,tab:'planning'},{id:'native',label:event.native_skipped?'Native skipped':'Create it on Native',done:isLink(event.native_url)||!!event.native_skipped,tab:'details'}];
 if(event.signup_required)steps.push({id:'luma',label:'Create it on Luma',done:isLink(event.luma_url),tab:'details'});
 steps.push({id:'budget',label:p.budget_status==='pending'?'Wait for the Treasurer to approve the budget':p.budget_status==='sent-back'?'Change the budget and send it again':'Get the budget approved',done:p.budget_status==='approved',tab:'planning'},
  {id:'venue',label:p.venue_status==='not-needed'?'No venue booking needed':p.venue_status==='requested'?'Get the venue booking confirmed':'Book the venue',done:p.venue_status==='confirmed'||p.venue_status==='not-needed',tab:'planning'},
  {id:'requirements',label:'Sort the requirements',done:p.requirements.length>0&&p.requirements.every(r=>r.done),tab:'planning'},
  {id:'risk',label:p.risk_status==='not-needed'?'No risk assessment needed':'Save the risk assessment',done:p.risk_status==='done'||p.risk_status==='not-needed',tab:'planning'},
  {id:'published',label:event.status==='cancelled'?'Cancelled':'Publish it on the site',done:event.status!=='draft',tab:'details'},
  {id:'run-sheet',label:'Write the run sheet',done:p.run_sheet.length>0,tab:'day'});
 if(started||p.post_event.submitted_at)steps.push({id:'post-event',label:'Fill in the post-event form',done:!!p.post_event.submitted_at,tab:'after'});
 return steps}
export function spaceProgress(event:AdminEvent,plan:EventPlan|null,now=Date.now()){const steps=spaceChecklist(event,plan,now);return {done:steps.filter(s=>s.done).length,total:steps.length,next:steps.find(s=>!s.done)??null}}
export type SpaceStage='planning'|'live'|'write-up'|'done'|'cancelled';
export function spaceStage(event:AdminEvent,plan:EventPlan|null,now=Date.now()):SpaceStage{if(event.status==='cancelled')return 'cancelled';if(event.status==='draft')return 'planning';const ended=!!event.ends_at&&new Date(event.ends_at).getTime()<now;if(!ended)return 'live';return plan?.post_event.submitted_at?'done':'write-up'}
export const stageLabel:Record<SpaceStage,string>={planning:'Planning',live:'Live','write-up':'Write-up due',done:'Done',cancelled:'Cancelled'};
// Academic years run from August: an event in November 2026 is in 2026-27.
export function academicYear(iso:string){const [y,m]=iso.slice(0,7).split('-').map(Number);const start=m>=8?y:y-1;return `${start}-${String((start+1)%100).padStart(2,'0')}`}
// Where an event's files go in the society's Drive: Events / 2026-27 / 2026-11-26 Rust workshop.
export const eventFolder=(event:AdminEvent)=>`Events/${academicYear(event.starts_at??new Date().toISOString())}/${(event.starts_at??'').slice(0,10)} ${event.title.replace(/[/\\]/g,'-').trim()}`.replace(/\/ /,'/');
export function postEventMarkdown(event:AdminEvent,post:PostEvent,lead:string){const when=event.starts_at?`${fullDate(event.starts_at)}, ${timeRange(event.starts_at,event.ends_at)}`:'';const again={yes:'Yes',no:'No',maybe:'Maybe, with changes','':'Not said'}[post.run_again??''];
 return [`# ${event.title}: after the event`,'',`**When:** ${when}`,`**Where:** ${event.venue}`,`**Lead organiser:** ${lead||'Not set'}`,`**People who came:** ${post.attendance??'Not counted'}`,`**Run it again?** ${again}`,'','## What went well','',post.went_well?.trim()||'Nothing noted.','','## What didn’t go well','',post.went_badly?.trim()||'Nothing noted.','',...(post.notes?.trim()?['## Notes','',post.notes.trim(),'']:[])].join('\n')}

// --- Social posts and the content calendar ---
export const PLATFORMS=[{id:'instagram',label:'Instagram'},{id:'discord',label:'Discord'},{id:'linkedin',label:'LinkedIn'}] as const;
export type Platform=typeof PLATFORMS[number]['id'];
export type PlatformState={state:'todo'|'posted'|'skipped';link?:string};
export type PostKind='announce'|'week'|'day'|'recap'|'cancelled'|'other';
export const postKindLabel:Record<PostKind,string>={announce:'Announcement',week:'One week to go',day:'On the day',recap:'Recap',cancelled:'Cancellation',other:'Post'};
export function platformsOf(task:Pick<Task,'details'>):Record<Platform,PlatformState>{const given=(task.details?.platforms??{}) as Partial<Record<Platform,PlatformState>>;return Object.fromEntries(PLATFORMS.map(({id})=>[id,given[id]??{state:'todo'}])) as Record<Platform,PlatformState>}
// A post is finished once every platform is posted or deliberately skipped.
export const postFinished=(platforms:Record<Platform,PlatformState>)=>PLATFORMS.every(({id})=>platforms[id].state!=='todo');
export function platformProblem(state:PlatformState){return state.state==='posted'&&state.link?.trim()&&!isLink(state.link.trim())?'Paste the full link to the post, starting https://':''}
// Suggested words for each post, from the event as it is now, so a changed time or venue is always right.
export function postText(event:AdminEvent,post:PostKind,site=''){const day=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long'}).format(new Date(iso));
 const when=event.starts_at?`${day(event.starts_at)}, ${timeRange(event.starts_at,event.ends_at)}`:'';const page=event.slug?`${site}/events/${event.slug}`:'';const signup=event.luma_url?`Sign up: ${event.luma_url}`:'';
 const lines=post==='week'?[`One week to go: ${event.title}`,when&&`When: ${when}`,event.venue&&`Where: ${event.venue}`,signup||page&&`More: ${page}`]
  :post==='day'?[`${event.title} is today!`,event.starts_at&&`From ${timeRange(event.starts_at,event.ends_at)} at ${event.venue}.`,signup||page&&`More: ${page}`]
  :post==='recap'?[`Thanks to everyone who came to ${event.title}!`,'[A line or two about how it went, and a few photos.]','Keep an eye on our events for what’s next.']
  :post==='cancelled'?[`Sorry, ${event.title}${event.starts_at?` on ${day(event.starts_at)}`:''} is cancelled.`,'[A line on why, if you can say, and whether it’ll be rescheduled.]']
  :[event.title,when&&`When: ${when}`,event.venue&&`Where: ${event.venue}`,'',event.description,'',signup,page&&`More: ${page}`];
 return lines.map(line=>line||'').filter((line,i,all)=>!(line===''&&(i===0||all[i-1]===''))).join('\n').trim()}
// The calendar shows posts by week, starting on Monday.
export function weekStart(iso:string){const [y,m,d]=iso.split('-').map(Number);const date=new Date(Date.UTC(y,m-1,d));const back=(date.getUTCDay()+6)%7;return new Date(date.getTime()-back*86400000).toISOString().slice(0,10)}
export function weekLabel(monday:string,today:string){const thisWeek=weekStart(today);if(monday===thisWeek)return 'This week';if(monday===addDays(thisWeek,7))return 'Next week';if(monday===addDays(thisWeek,-7))return 'Last week';return `Week of ${dayName(monday)}`}

// --- Money: expense claims, income and the year's report ---
export type ClaimStatus='submitted'|'sent-back'|'approved'|'tracking'|'sent'|'paid';
export type Payer='su'|'company'|'sponsor';
export type Claim={id?:string;claimant_email?:string;description:string;amount:number|string;spent_on:string;payer:Payer;payer_name:string;event_id:string|null;receipt_link:string|null;status?:ClaimStatus;note?:string;decided_by?:string|null;decided_at?:string|null;paid_at?:string|null;created_at?:string};
export const payerLabel:Record<Payer,string>={su:'The SU or the society',company:'An outside company',sponsor:'A sponsor'};
export const claimStatusLabel:Record<ClaimStatus,string>={submitted:'Waiting for approval','sent-back':'Sent back',approved:'Approved, to submit to the SU',tracking:'To send to whoever pays',sent:'Sent, waiting for payment',paid:'Paid'};
export const blankClaim=(today:string):Claim=>({description:'',amount:'',spent_on:today,payer:'su',payer_name:'',event_id:null,receipt_link:null});
export function claimProblems(claim:Claim){const problems:Problems={};if(!claim.description.trim())problems.description='Say what it was for.';const amount=Number(String(claim.amount).replace(/[£,\s]/g,''));if(!String(claim.amount).trim()||!Number.isFinite(amount)||amount<=0)problems.amount='Enter the amount in pounds, like 12.50.';if(!/^\d{4}-\d{2}-\d{2}$/.test(claim.spent_on))problems.spent_on='Choose the date you paid.';if(claim.payer!=='su'&&!claim.payer_name.trim())problems.payer_name='Say who’s paying it back.';if(!claim.receipt_link)problems.receipt='Add the receipt, as a PDF or a photo.';return problems}
export const claimEditable=(claim:Claim)=>({description:claim.description.trim(),amount:Number(String(claim.amount).replace(/[£,\s]/g,'')),spent_on:claim.spent_on,payer:claim.payer,payer_name:claim.payer==='su'?'':claim.payer_name.trim(),event_id:claim.event_id,receipt_link:claim.receipt_link});
// What the person looking can do next with a claim, if anything.
export function claimAction(claim:Claim,me:string,canApprove:boolean):'approve'|'submit-to-su'|'resubmit'|'mark-sent'|'mark-paid'|null{const mine=claim.claimant_email===me;
 if(claim.status==='submitted')return canApprove&&!mine?'approve':null;if(claim.status==='approved')return canApprove&&!mine?'submit-to-su':null;if(claim.status==='sent-back')return mine?'resubmit':null;if(claim.status==='tracking')return mine?'mark-sent':null;if(claim.status==='sent')return mine?'mark-paid':null;return null}
// Money spent on an event: its claims, except any sent back.
export const spentOn=(eventId:string,claims:Claim[])=>claims.filter(c=>c.event_id===eventId&&c.status!=='sent-back').reduce((sum,c)=>sum+Number(c.amount),0);

export type IncomeKind='membership'|'tickets'|'sponsorship'|'grant'|'other';
export type IncomeStatus='applying'|'expected'|'received'|'declined';
export type Income={id?:string;kind:IncomeKind;description:string;amount:number|string;status:IncomeStatus;due_on:string|null;received_on:string|null;event_id:string|null;created_at?:string};
export const incomeKindLabel:Record<IncomeKind,string>={membership:'Membership',tickets:'Tickets',sponsorship:'Sponsorship',grant:'Grant',other:'Other'};
export const incomeStatusLabel:Record<IncomeStatus,string>={applying:'Applying',expected:'Expected',received:'Received',declined:'Declined'};
export function incomeProblems(income:Income){const problems:Problems={};if(!income.description.trim())problems.description='Say what it’s for.';const amount=Number(String(income.amount).replace(/[£,\s]/g,''));if(!String(income.amount).trim()||!Number.isFinite(amount)||amount<0)problems.amount='Enter the amount in pounds.';if(income.status==='applying'&&!income.due_on)problems.due_on='Add the application deadline.';return problems}

// The year runs from August, like the committee's.
export const inAcademicYear=(iso:string|null|undefined,year:string)=>!!iso&&academicYear(iso)===year;
export function yearReport({year,claims,income,events,plans}:{year:string;claims:Claim[];income:Income[];events:AdminEvent[];plans:EventPlan[]}){
 const theirs=claims.filter(c=>inAcademicYear(c.spent_on,year)&&c.status!=='sent-back');const society=theirs.filter(c=>c.payer==='su');const elsewhere=theirs.filter(c=>c.payer!=='su');
 const got=income.filter(i=>i.status==='received'&&inAcademicYear(i.received_on??i.due_on,year));const waiting=income.filter(i=>i.status==='expected'&&inAcademicYear(i.due_on??i.created_at,year));
 const sum=(list:{amount:number|string}[])=>list.reduce((t,x)=>t+Number(x.amount),0);
 const byKind=(Object.keys(incomeKindLabel) as IncomeKind[]).map(kind=>({kind,total:sum(got.filter(i=>i.kind===kind))})).filter(k=>k.total>0);
 const yearEvents=events.filter(e=>e.status!=='draft'&&inAcademicYear(e.starts_at,year)).sort((a,b)=>(a.starts_at??'').localeCompare(b.starts_at??''));
 const rows=yearEvents.map(e=>{const plan=plans.find(p=>p.event_id===e.id);return {title:e.title,approved:plan?.budget_status==='approved'?Number(plan.budget_approved??0):null,spent:spentOn(e.id!,society)}}).filter(r=>r.approved!==null||r.spent>0);
 const lines=[`# Finances for ${year}`,'',`**Money in:** ${money(sum(got))}`,`**Paid out by the society:** ${money(sum(society))}`,`**Balance for the year:** ${money(sum(got)-sum(society))}`,'','## Money in','',...(byKind.length?['| Kind | Amount |','|---|---|',...byKind.map(k=>`| ${incomeKindLabel[k.kind]} | ${money(k.total)} |`)]:['Nothing received yet.']),
  ...(waiting.length?['','Still expected: '+waiting.map(i=>`${i.description} (${money(Number(i.amount))})`).join(', ')+'.']:[]),'','## Events','',...(rows.length?['| Event | Budget | Spent |','|---|---|---|',...rows.map(r=>`| ${r.title.replace(/\|/g,'/')} | ${r.approved===null?'None':money(r.approved)} | ${money(r.spent)} |`)]:['No event spending recorded.']),
  '','## Expense claims','',`${society.length} paid by the society, totalling ${money(sum(society))}.`,...(elsewhere.length?[`${elsewhere.length} paid back by companies or sponsors, totalling ${money(sum(elsewhere))}. These didn’t use society money.`]:[]),...(theirs.filter(c=>c.status!=='paid').length?[`${theirs.filter(c=>c.status!=='paid').length} not yet paid.`]:[]),''];
 return lines.join('\n')}

// --- The help directory ---
export type DirectoryKind='contact'|'link'|'login';
export type DirectoryEntry={id?:string;kind:DirectoryKind;name:string;about:string;email:string|null;phone:string|null;url:string|null;holder_email:string|null;notes:string;organisation:string;updated_at?:string;updated_by?:string|null};
export const directoryKinds:{id:DirectoryKind;label:string;single:string}[]=[{id:'contact',label:'Contacts',single:'contact'},{id:'link',label:'Links',single:'link'},{id:'login',label:'Logins',single:'login'}];
export const blankEntry=(kind:DirectoryKind='contact'):DirectoryEntry=>({kind,name:'',about:'',email:null,phone:null,url:null,holder_email:null,notes:'',organisation:''});
// Passwords don't belong here: anything that looks like one is refused, so a login entry stays safe to hand over.
export function entryProblems(entry:DirectoryEntry){const problems:Problems={};if(!entry.name.trim())problems.name=entry.kind==='contact'?'Add their name.':'Say what it is.';if(entry.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email.trim()))problems.email='Enter a full email address.';if(entry.url?.trim()&&!isLink(entry.url.trim()))problems.url='Paste the full address, starting https://';if(/\b(password|passcode|pwd)\s*(is|:|=)/i.test(entry.notes))problems.notes='Don’t put passwords here. Say where the password is kept instead.';return problems}
export function directoryMatches(entry:DirectoryEntry,query:string,members:Member[]){const words=query.toLowerCase().split(/\s+/).filter(Boolean);if(!words.length)return true;const holder=members.find(m=>m.email===entry.holder_email);const text=[entry.name,entry.about,entry.organisation,entry.email,entry.notes,holder?personName(holder):''].join(' ').toLowerCase();return words.every(w=>text.includes(w))}

// --- SU paperwork, the AGM and handover ---
// The committee as the SU's forms ask for it: each role, who holds it and their email.
export function committeeSummary(roles:Pick<Role,'key'|'name'|'position'>[],members:Member[]){const rows=[...roles].sort((a,b)=>a.position-b.position).flatMap(role=>members.filter(m=>m.roles.includes(role.key)).map(m=>({role:role.name,name:personName(m),email:m.email})));return {rows,text:rows.map(r=>`${r.role}: ${r.name} <${r.email}>`).join('\n')}}
export const agmNoticeDate=(agm:string)=>addDays(agm,-14);
// Everything an AGM sets off, from the notice two weeks before to each role's handover note afterwards.
export function agmTasks(agm:string,today:string,roleKeys:string[]=['president','vice-president','secretary','treasurer','events','socials','industry-liaison','community']):Task[]{const on=(days:number)=>{const due=addDays(agm,days);return due<today?today:due};const day=fullDate(`${agm}T12:00:00Z`);const base={...blankTask(),kind:'agm',details:{agm}};
 return [{...base,title:`Send the AGM notice to members (AGM on ${day})`,assignee_role:'secretary',due_on:on(-14),notes:'Most constitutions need two weeks’ notice. Say how to stand for a role and the deadline for nominations.'},
  {...base,title:'Collect nominations for next year’s committee',assignee_role:'secretary',due_on:on(-7)},
  {...base,title:'Prepare the year’s finances for the AGM',assignee_role:'treasurer',due_on:on(-3),details:{agm,href:'/admin/money?tab=report'}},
  {...base,title:'Prepare the President’s report for the AGM',assignee_role:'president',due_on:on(-3)},
  {...base,title:'Record the AGM results and update the committee',assignee_role:'secretary',due_on:on(2),notes:'Update the About page’s committee, and ask an Owner to give the new committee access and roles.',details:{agm,href:'/admin/committee'}},
  ...roleKeys.map(key=>({...base,kind:'handover',title:'Finish your handover note for whoever takes over',assignee_role:key,due_on:on(14),details:{agm,href:'/admin/handover'}}))]}

// --- Sponsors, handover notes and the numbers each term ---
export type SponsorStatus='not-contacted'|'contacted'|'in-talks'|'approved';
export type Sponsor={id?:string;name:string;status:SponsorStatus;contact_id:string|null;website:string|null;notes:string;follow_up_on:string|null;updated_at?:string};
export const sponsorStatuses:{id:SponsorStatus;label:string}[]=[{id:'not-contacted',label:'Not contacted'},{id:'contacted',label:'Contacted'},{id:'in-talks',label:'In talks'},{id:'approved',label:'Approved'}];
export const blankSponsor=():Sponsor=>({name:'',status:'not-contacted',contact_id:null,website:null,notes:'',follow_up_on:null});
export function sponsorProblems(sponsor:Sponsor){const problems:Problems={};if(!sponsor.name.trim())problems.name='Add the company’s name.';if(sponsor.website?.trim()&&!isLink(sponsor.website.trim()))problems.website='Paste the full address, starting https://';return problems}

export const HANDOVER_TEMPLATE=['## What the role does','','## Who to know','Contacts are in the Directory. Name the ones that matter most for this role.','','## Logins to pass on','Say which, and where they’re kept. Never the passwords themselves.','','## Through the year','The deadlines and jobs that come round every year, and roughly when.','','## How things are done','','## What I’d do differently',''].join('\n');

export type Term=`${string} ${'Semester 1'|'Semester 2'|'Summer'}`;
// Semester 1 runs September to December, Semester 2 January to May, and the summer June to August.
export function termOf(iso:string):Term{const month=Number(iso.slice(5,7));return `${academicYear(iso)} ${month>=9?'Semester 1':month<=5?'Semester 2':'Summer'}` as Term}
export type TermNumbers={term:string;discord_members:number|null;instagram_followers:number|null;linkedin_followers:number|null;luma_signups:number|null;website_visitors:number|null;notes:string;updated_at?:string};
export const blankNumbers=(term:string):TermNumbers=>({term,discord_members:null,instagram_followers:null,linkedin_followers:null,luma_signups:null,website_visitors:null,notes:''});
export const numberFields:{key:keyof Omit<TermNumbers,'term'|'notes'|'updated_at'>;label:string}[]=[{key:'discord_members',label:'Discord members'},{key:'instagram_followers',label:'Instagram followers'},{key:'linkedin_followers',label:'LinkedIn followers'},{key:'luma_signups',label:'Luma sign-ups'},{key:'website_visitors',label:'Website visitors'}];
// What the admin already knows about a term: events that happened, and how many came to those with a post-event form.
export function termEvents(term:string,events:AdminEvent[],plans:EventPlan[],now=Date.now()){const held=events.filter(e=>e.status==='published'&&e.starts_at&&termOf(e.starts_at)===term&&new Date(e.ends_at??e.starts_at).getTime()<now);const counts=held.map(e=>plans.find(p=>p.event_id===e.id)?.post_event.attendance).filter((n):n is number=>typeof n==='number');return {held:held.length,attendance:counts.reduce((a,b)=>a+b,0),counted:counts.length}}
