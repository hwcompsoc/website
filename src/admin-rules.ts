// The publishing rules as the form explains them. The database enforces the same rules, so it has the final say.
import {COMMITTEE_BUCKET,COVER_BUCKET,SUPABASE_URL,coverThumb} from './supabase-config.ts';
export const NATIVE_CREATE='https://promoters.native.fm/event/event/create';
export const LUMA_CREATE='https://luma.com/create';

export type AdminEvent={id?:string;slug:string;title:string;category:string;level:string;starts_at:string|null;ends_at:string|null;venue:string;description:string;signup_required:boolean;native_url:string|null;luma_url:string|null;socials_sent:boolean;status:'draft'|'published'|'cancelled';cover_path?:string|null;square_path?:string|null;cover_alt?:string;published_at?:string|null;updated_at?:string};
export const blankEvent=():AdminEvent=>({slug:'',title:'',category:'Workshop',level:'Everyone welcome',starts_at:null,ends_at:null,venue:'',description:'',signup_required:true,native_url:null,luma_url:null,socials_sent:false,status:'draft',cover_path:null,square_path:null,cover_alt:''});

// Event images: 'cover' is the landscape one the site shows and Native needs (Native serves its images at 736 × 412, about 16:9),
// 'square' is for Luma, Instagram and Discord. Close to the shape is enough, so a few pixels out doesn't mean redoing a poster.
// These are the sizes saved and what's accepted. Scaling only ever goes down.
export const COVER_FULL={longest:1600,quality:.88},COVER_THUMB={longest:480,quality:.75},COVER_MIN=800;
export type CoverKind='cover'|'square';
export function coverProblem(kind:CoverKind,width:number,height:number){if(width<COVER_MIN)return `That image is only ${width} pixels wide. Use one at least ${COVER_MIN} wide, so it stays sharp.`;if(kind==='cover'&&Math.abs(width/height-16/9)>.05*16/9)return `That image is ${width} × ${height}, so it isn’t 16:9 landscape. Use one shaped like 1600 × 900.`;if(kind==='square'&&Math.abs(width-height)>.02*Math.max(width,height))return `That image is ${width} × ${height}, so it isn’t square. Use one shaped like 1080 × 1080.`;return null}
export function coverSize(width:number,height:number,longest:number){const scale=Math.min(1,longest/Math.max(width,height));return {width:Math.round(width*scale),height:Math.round(height*scale)}}
export const coverUrl=(path:string,thumb=false)=>`${SUPABASE_URL}/storage/v1/object/public/${COVER_BUCKET}/${thumb?coverThumb(path):path}`;
export const coverDownload=(path:string,name:string)=>`${coverUrl(path)}?download=${encodeURIComponent(name)}`;

export const slugify=(title:string)=>title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'');
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
 if(!isLink(event.native_url))missing.push('Create it on Native and paste the link');
 if(event.signup_required&&!isLink(event.luma_url))missing.push('Create it on Luma and paste the link');
 if(!event.socials_sent)missing.push('Send the details to Amanda and Kevin');
 return missing}

// Offset of UK time from UTC at a moment, in milliseconds.
function ukOffset(ms:number){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(ms)).map(p=>[p.type,p.value]));return Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second)-Math.floor(ms/1000)*1000}
// The form's date and time boxes always mean UK time, wherever the browser is.
export function ukInputToIso(value:string){if(!value)return null;const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);if(!match)return null;const [,y,mo,d,h,mi]=match.map(Number);const wall=Date.UTC(y,mo-1,d,h,mi);return new Date(wall-ukOffset(wall-ukOffset(wall))).toISOString()}
export function isoToUkInput(iso:string|null){if(!iso)return '';const ms=new Date(iso).getTime();return new Date(ms+ukOffset(ms)).toISOString().slice(0,16)}

// Everything Amanda and Kevin need in one message.
export function eventDetailsText(event:AdminEvent){const when=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
 return [event.title,event.starts_at?`When: ${when(event.starts_at)}`:'',event.venue?`Where: ${event.venue}`:'',event.description,event.luma_url?`Sign up: ${event.luma_url}`:'',event.slug?`Website: /events/${event.slug}`:'',event.square_path?`Square image: ${coverUrl(event.square_path)}`:''].filter(Boolean).join('\n')}

export const PASSWORD_MIN=12;
export function passwordProblem(password:string){if(password.length<PASSWORD_MIN)return `Use at least ${PASSWORD_MIN} characters.`;if(/password|changeme|compsoc|qwerty|123456/i.test(password))return 'That’s too easy to guess. Try a few unrelated words.';return null}

// Admin routes. Unknown addresses inside /admin get the admin's own "not found" page.
export type AdminRoute={name:'login'|'set-password'|'overview'|'events'|'new'|'event'|'edit'|'account'|'people'|'committee'|'notfound';id?:string};
export function adminRoute(pathname:string):AdminRoute{const parts=pathname.toLowerCase().split('/').filter(Boolean).slice(1);const [a,b,c,...rest]=parts;if(rest.length)return {name:'notfound'};
 if(!a)return {name:'overview'};if(!b&&(a==='login'||a==='set-password'||a==='account'||a==='people'||a==='committee'))return {name:a};
 if(a==='events'){if(!b)return {name:'events'};if(b==='new'&&!c)return {name:'new'};if(/^[0-9a-f-]{36}$/.test(b)){if(!c)return {name:'event',id:b};if(c==='edit')return {name:'edit',id:b}}}
 return {name:'notfound'}}
// Only ever return to somewhere inside the admin area after signing in.
export const safeNext=(next:string|null)=>next&&/^\/admin(\/|\?|$)/.test(next)&&!next.includes('//')&&!next.startsWith('/admin/login')&&!next.startsWith('/admin/set-password')?next:'/admin';

export const statusLabel={draft:'Draft',published:'Live',cancelled:'Cancelled'} as const;
export type StepId='details'|'native'|'luma'|'socials';
export function detailsMissing(event:AdminEvent){const missing:string[]=[];if(!event.title.trim())missing.push('A title');if(!event.slug)missing.push('A web address');if(!event.starts_at)missing.push('A date and start time');if(!event.ends_at)missing.push('An end time');if(!event.venue.trim())missing.push('A venue');if(!event.description.trim())missing.push('A description');if(!event.cover_path)missing.push('A landscape image');if(!event.square_path)missing.push('A square image');if(!event.cover_alt?.trim())missing.push('A description of the image');return missing}
// The steps that get an event live. Luma only appears when the event needs sign-up.
export function checklist(event:AdminEvent){const steps:{id:StepId;label:string;done:boolean}[]=[{id:'details',label:'Finish the event details',done:!detailsMissing(event).length},{id:'native',label:'Create it on Native',done:isLink(event.native_url)}];if(event.signup_required)steps.push({id:'luma',label:'Create it on Luma',done:isLink(event.luma_url)});steps.push({id:'socials',label:'Tell Amanda and Kevin',done:event.socials_sent});return steps}
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
export function editableFields(event:AdminEvent){const {slug,title,category,level,starts_at,ends_at,venue,description,signup_required,native_url,luma_url,socials_sent,status,cover_alt}=event;return {cover_alt,slug,title,category,level,starts_at,ends_at,venue,description,signup_required,native_url,luma_url,socials_sent,status}}

const uk=(iso:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).format(new Date(iso));
export const shortDate=(iso:string|null)=>iso?`${uk(iso,{day:'2-digit'})} ${uk(iso,{month:'short'}).slice(0,3).toUpperCase()}`:'';
export const fullDate=(iso:string)=>`${uk(iso,{weekday:'long'})} ${uk(iso,{day:'numeric'})} ${uk(iso,{month:'long'})} ${uk(iso,{year:'numeric'})}`;
export const timeRange=(start:string,end:string|null)=>{const at=(iso:string)=>uk(iso,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});return end?`${at(start)}–${at(end)}`:at(start)};

// Has the public site caught up? The site's published list is compared with the saved event, field by field.
export type SiteRow=Pick<AdminEvent,'slug'|'title'|'category'|'level'|'starts_at'|'ends_at'|'venue'|'description'|'signup_required'|'luma_url'|'status'|'cover_path'|'cover_alt'>;
const time=(iso:string|null)=>iso?new Date(iso).getTime():null;
export function matchesSite(event:AdminEvent,row:SiteRow){return row.title===event.title&&row.category===event.category&&row.level===event.level&&time(row.starts_at)===time(event.starts_at)&&time(row.ends_at)===time(event.ends_at)&&row.venue===event.venue&&row.description===event.description&&row.signup_required===event.signup_required&&(row.luma_url??null)===(event.luma_url??null)&&row.status===event.status&&(row.cover_path??null)===(event.cover_path??null)&&(row.cover_alt??'')===(event.cover_alt??'')}
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
export const committeeNameProblem=(name:string,message:string)=>name.trim()?null:message;
export const nextPosition=(rows:{position:number}[])=>Math.max(0,...rows.map(row=>row.position))+1;
// The two rows with their positions swapped, ready to save together, or null if there's nowhere to go.
export function moved<T extends {id:string;position:number}>(rows:T[],id:string,by:-1|1){const at=rows.findIndex(row=>row.id===id);const other=rows[at+by];if(at<0||!other)return null;return [{...rows[at],position:other.position},{...other,position:rows[at].position}]}
