// The publishing rules as the form explains them. The database enforces the same rules, so it has the final say.
export const NATIVE_CREATE='https://promoters.native.fm/event/event/create';
export const LUMA_CREATE='https://luma.com/create';

export type AdminEvent={id?:string;slug:string;title:string;category:string;level:string;starts_at:string|null;ends_at:string|null;venue:string;description:string;signup_required:boolean;native_url:string|null;luma_url:string|null;socials_sent:boolean;status:'draft'|'published'|'cancelled';published_at?:string|null};
export const blankEvent=():AdminEvent=>({slug:'',title:'',category:'Workshop',level:'Everyone welcome',starts_at:null,ends_at:null,venue:'',description:'',signup_required:true,native_url:null,luma_url:null,socials_sent:false,status:'draft'});

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
 return [event.title,event.starts_at?`When: ${when(event.starts_at)}`:'',event.venue?`Where: ${event.venue}`:'',event.description,event.luma_url?`Sign up: ${event.luma_url}`:'',event.slug?`Website: /events/${event.slug}`:''].filter(Boolean).join('\n')}

export const PASSWORD_MIN=12;
export function passwordProblem(password:string){if(password.length<PASSWORD_MIN)return `Use at least ${PASSWORD_MIN} characters.`;if(/password|changeme|compsoc|qwerty|123456/i.test(password))return 'That’s too easy to guess. Try a few unrelated words.';return null}

// Admin routes. Unknown addresses inside /admin get the admin's own "not found" page.
export type AdminRoute={name:'login'|'set-password'|'overview'|'events'|'new'|'event'|'edit'|'account'|'notfound';id?:string};
export function adminRoute(pathname:string):AdminRoute{const parts=pathname.toLowerCase().split('/').filter(Boolean).slice(1);const [a,b,c,...rest]=parts;if(rest.length)return {name:'notfound'};
 if(!a)return {name:'overview'};if(!b&&(a==='login'||a==='set-password'||a==='account'))return {name:a};
 if(a==='events'){if(!b)return {name:'events'};if(b==='new'&&!c)return {name:'new'};if(/^[0-9a-f-]{36}$/.test(b)){if(!c)return {name:'event',id:b};if(c==='edit')return {name:'edit',id:b}}}
 return {name:'notfound'}}
// Only ever return to somewhere inside the admin area after signing in.
export const safeNext=(next:string|null)=>next&&/^\/admin(\/|\?|$)/.test(next)&&!next.includes('//')&&!next.startsWith('/admin/login')&&!next.startsWith('/admin/set-password')?next:'/admin';

export const statusLabel={draft:'Draft',published:'Live',cancelled:'Cancelled'} as const;
export type StepId='details'|'native'|'luma'|'socials';
export function detailsMissing(event:AdminEvent){const missing:string[]=[];if(!event.title.trim())missing.push('A title');if(!event.slug)missing.push('A web address');if(!event.starts_at)missing.push('A date and start time');if(!event.ends_at)missing.push('An end time');if(!event.venue.trim())missing.push('A venue');if(!event.description.trim())missing.push('A description');return missing}
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
export const descriptionProblems=(event:AdminEvent):Problems=>event.description.trim()?{}:{description:'Add a short description.'};
export function whenProblems(when:When,venue:string,required=true){const found:Problems={};if(required){if(!when.date)found.date='Choose a date.';if(!when.start)found.start='Add a start time.';if(!when.end)found.end='Add an end time.';if(!venue.trim())found.venue='Say where it is.'}const {starts_at,ends_at}=whenToIso(when);if(starts_at&&ends_at&&new Date(ends_at)<=new Date(starts_at))found.end='The end must be after the start. If it finishes after midnight, tick the box below.';return found}
export const slugAttempt=(base:string,attempt:number)=>attempt<=1?base:`${base.slice(0,56).replace(/-+$/,'')}-${attempt}`;
// The only fields a form may send: never the id or published time.
export function editableFields(event:AdminEvent){const {slug,title,category,level,starts_at,ends_at,venue,description,signup_required,native_url,luma_url,socials_sent,status}=event;return {slug,title,category,level,starts_at,ends_at,venue,description,signup_required,native_url,luma_url,socials_sent,status}}

const uk=(iso:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).format(new Date(iso));
export const shortDate=(iso:string|null)=>iso?`${uk(iso,{day:'2-digit'})} ${uk(iso,{month:'short'}).slice(0,3).toUpperCase()}`:'';
export const fullDate=(iso:string)=>`${uk(iso,{weekday:'long'})} ${uk(iso,{day:'numeric'})} ${uk(iso,{month:'long'})} ${uk(iso,{year:'numeric'})}`;
export const timeRange=(start:string,end:string|null)=>{const at=(iso:string)=>uk(iso,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});return end?`${at(start)}–${at(end)}`:at(start)};
