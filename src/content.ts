import live from './generated/events.json' with {type:'json'};
import teams from './generated/committee.json' with {type:'json'};
import faqRows from './generated/faqs.json' with {type:'json'};
import guides from './generated/guides.json' with {type:'json'};
import documentRows from './generated/documents.json' with {type:'json'};
import {readingMinutes} from './guide-format.ts';
import {coverThumb} from './supabase-config.ts';
import {resourcesSwitchedOn} from './env.ts';
export const links={discord:'https://discord.gg/VwXhpb7mZW',instagram:'https://www.instagram.com/hwcompsoc',membership:'https://www.hwunion.com/societies/compsci/',email:'compsci.society@hw.ac.uk'};
// What a browser tab or shared link calls each page: the page and then the society, with the home page the other way round. A single event or guide names its section too. The headings on the pages themselves are in `titles`.
const tabTitle=(name:string)=>`${name} | HW CompSoc`;
export const eventTabTitle=(name:string)=>`${tabTitle(name)} Events`;
export const guideTabTitle=(name:string)=>`${tabTitle(name)} Resources`;
export const tabTitles={notfound:tabTitle('File not found'),privacy:tabTitle('Privacy'),home:'HW CompSoc | Heriot-Watt Computer Science Society',join:tabTitle('Join'),events:tabTitle('Events'),resources:tabTitle('Resources'),about:tabTitle('About'),partners:tabTitle('Partners')};
export const titles={notfound:'File not found',privacy:'Privacy',home:'Find your people.',join:'Join the community.',events:'What’s on',resources:'Guides and resources',about:'Built by students. For students.',partners:'Work with us'};
export const pages=[{id:'home',name:'Home'},{id:'join',name:'Join'},{id:'events',name:'Events'},{id:'resources',name:'Resources'},{id:'about',name:'About'},{id:'partners',name:'Partners'}] as const;
export type Page=typeof pages[number]['id'];
export type View=Page|'notfound'|'privacy';
export const pagePath=(page:Page)=>page==='home'?'/':`/${page}`;
export type Event={id:string;title:string;category:'Workshop'|'Talk'|'Social';weekday:string;day:string;month:string;date:string;time:string;venue:string;description:string;level:string;start:string;end:string;past?:boolean;cancelled?:boolean;luma?:string;cover?:string;thumb?:string;coverAlt?:string;cost?:string;openTo?:string};
// Committee (About), from the admin. Roles with nobody in them stay off the page.
export type Member={name:string;photo?:string;bio?:string;studies?:string;askMeAbout?:string;discord?:string;github?:string;linkedin?:string};
export type LiveTeam={name:string;description:string;committee_people:{name:string;photo_path:string|null;bio?:string|null;studies?:string|null;ask_me_about?:string|null;discord?:string|null;github?:string|null;linkedin?:string|null}[]};
export const liveCommittee=(teams:LiveTeam[])=>teams.filter(team=>team.committee_people.length).map(team=>({role:team.name,text:team.description,members:team.committee_people.map(person=>({name:person.name,...person.photo_path?{photo:`/committee-photos/${person.photo_path}`}:{},...person.bio?{bio:person.bio}:{},...person.studies?{studies:person.studies}:{},...person.ask_me_about?{askMeAbout:person.ask_me_about}:{},...person.discord?{discord:person.discord}:{},...person.github?{github:person.github}:{},...person.linkedin?{linkedin:person.linkedin}:{}})) as Member[]}));
// The address of a role or person on the About page, so other pages can link straight to them.
export const anchor=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const committee=liveCommittee(teams as LiveTeam[]);
export type Person=Member&{role:string;title:string;text:string;team:boolean;slug:string;file:string};
// What one person in a team is called. A team not listed here uses its own name.
const memberTitles:Record<string,string>={'Events team':'Event Organiser'};
// Everyone in order, each with their own address. Someone holding two roles gets a second address that names the role.
export const peopleOf=(teams:ReturnType<typeof liveCommittee>):Person[]=>{const taken=new Set<string>();return teams.flatMap(({role,text,members})=>members.map(member=>{const base=anchor(member.name);const slug=taken.has(base)?`${base}-${anchor(role)}`:base;taken.add(slug);const team=members.length>1;return {...member,role,title:team?memberTitles[role]??role:role,text,team,slug,file:`${team?anchor(role)+'/':''}${slug}.md`}}))};
export const committeePeople=peopleOf(committee);
export type Faq={id:string;question:string;answer:string};
export const faqs=faqRows as Faq[];
// Approved documents (About), from the admin.
export type LiveDocument={id:string;title:string;approved_on:string;file_path:string;size_bytes:number};
const fileSize=(bytes:number)=>bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
export const liveDocument=(row:LiveDocument)=>({id:row.id,title:row.title,approved:new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${row.approved_on}T00:00:00Z`)),href:`/documents/${row.file_path}`,size:fileSize(row.size_bytes)});
export const documents=(documentRows as LiveDocument[]).map(liveDocument);
export const initials=(name:string)=>name.split(' ').filter(Boolean).map(w=>w[0]).filter((_,i,a)=>i===0||i===a.length-1).join('').toUpperCase();
// Guides (Resources), from the admin. Anything still a draft never reaches the site.
export type LiveGuide={slug:string;title:string;category:string;kind:string;description:string;body:string;status:string;reviewed_on:string|null};
export const liveGuide=(row:LiveGuide)=>({id:row.slug,title:row.title,category:row.category,description:row.description,type:row.kind,minutes:`${readingMinutes(row.body)} min`,body:row.body,reviewed:row.reviewed_on?new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(`${row.reviewed_on}T00:00:00Z`)):''});
export type Resource=ReturnType<typeof liveGuide>;
// Guides reach the site only while Resources is switched on (src/env.ts).
export const resources=resourcesSwitchedOn?(guides as LiveGuide[]).map(liveGuide):[];
// The pages the site has. Resources exists only while it's switched on and has a guide to find, so nothing links to an empty page, and its address is not found.
export const sitePages=pages.filter(p=>p.id!=='resources'||resources.length>0);
// Events are copied in from Supabase when the site builds.
export type LiveEvent={slug:string;title:string;category:string;level:string;starts_at:string;ends_at:string;venue:string;description:string;signup_required:boolean;luma_url:string|null;status:string;cover_path?:string|null;cover_alt?:string;cost?:string|null;open_to?:string|null};
const icsTime=(ms:number|string)=>new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g,'');
export function liveEvent(row:LiveEvent,now=Date.now()):Event{const part=(iso:string,options:Intl.DateTimeFormatOptions,type:Intl.DateTimeFormatPartTypes)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).formatToParts(new Date(iso)).find(p=>p.type===type)?.value??'';const at=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));const s=row.starts_at;
 return {id:row.slug,title:row.title,category:row.category as Event['category'],level:row.level,venue:row.venue,description:row.description,weekday:part(s,{weekday:'short'},'weekday').slice(0,3).toUpperCase(),day:part(s,{day:'2-digit'},'day'),month:part(s,{month:'short'},'month').slice(0,3).toUpperCase(),date:`${part(s,{weekday:'long'},'weekday')} ${part(s,{day:'numeric'},'day')} ${part(s,{month:'long'},'month')} ${part(s,{year:'numeric'},'year')}`,time:`${at(s)}–${at(row.ends_at)} ${part(s,{timeZoneName:'short'},'timeZoneName')}`,start:icsTime(s),end:icsTime(row.ends_at),past:new Date(row.ends_at).getTime()<now,cancelled:row.status==='cancelled',luma:row.signup_required&&row.luma_url?row.luma_url:undefined,...row.cost?{cost:row.cost}:{},...row.open_to?{openTo:row.open_to}:{},...row.cover_path?{cover:`/event-covers/${row.cover_path}`,thumb:`/event-covers/${coverThumb(row.cover_path)}`,coverAlt:row.cover_alt??''}:{}}}
const inOrder=(list:Event[])=>[...list.filter(e=>!e.past).sort((a,b)=>a.start.localeCompare(b.start)),...list.filter(e=>e.past).sort((a,b)=>b.start.localeCompare(a.start))];
export const events:Event[]=inOrder((live as LiveEvent[]).map(row=>liveEvent(row)));
export function filterEvents(category:string,query:string,past:boolean,list:Event[]=events){return list.filter(e=>!!e.past===past&&(category==='All'||e.category===category)&&`${e.title} ${e.description} ${e.category}`.toLowerCase().includes(query.trim().toLowerCase()))}
export function enquiryMail(org:string,email:string,format:string,message:string){return `mailto:${links.email}?subject=${encodeURIComponent('Partnership enquiry: '+org)}&body=${encodeURIComponent(`Organisation: ${org}\nReply email: ${email}\nInterested in: ${format}\n\n${message}`)}`}
// Routes. `/events/web` and `/resources/git` open one item; a Resources filter is a query (`/resources?category=support`), because "support" is also a guide.
const segments=(path:string)=>path.toLowerCase().split('/').filter(Boolean);
export const canonicalPath=(path:string)=>'/'+segments(path).join('/');
export function route(path:string):{view:View;item:string}{const parts=segments(path);if(!parts.length)return {view:'home',item:''};
 const [first,item='',...rest]=parts;if(first==='privacy'&&!item)return {view:'privacy',item:''};const page=sitePages.find(p=>p.id===first&&p.id!=='home');if(!page||rest.length)return {view:'notfound',item:''};if(!item)return {view:page.id,item:''};
 const found=(page.id==='events'&&events.some(e=>e.id===item))||(page.id==='resources'&&resources.some(r=>r.id===item));return found?{view:page.id,item}:{view:'notfound',item:''}}
// Links shared before paths existed, such as `#events` or `#resources/support`.
export function legacyPath(hash:string):string|null{const [id,param]=hash.slice(1).toLowerCase().split('/');const page=sitePages.find(p=>p.id===id);if(!page)return null;return page.id==='resources'&&param?`/resources?category=${encodeURIComponent(param)}`:pagePath(page.id)}
// Optimal string alignment: a swapped pair of letters ("abuot") counts as one typo.
function typos(a:string,b:string){const d=Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)] as number[]);for(let j=0;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}
 return d[a.length][b.length]}
// Allows about one typo per three letters of the part that could be wrong, so a long path doesn't match anything.
const allowance=(part:string)=>Math.max(1,Math.floor(part.length/3));
function closest(value:string,options:string[],limit:number){let best:string|null=null,score=limit+1;for(const option of options){const t=typos(value,option);if(t<score){best=option;score=t}}return best}
const pagePaths=()=>[...sitePages.filter(p=>p.id!=='home').map(p=>pagePath(p.id)),'/privacy'];
// The real address closest to a wrong one, or null if nothing is close: first the whole path, then just its first part.
export function suggestPath(path:string):string|null{const parts=segments(path);if(!parts.length)return null;if(parts.length===1&&['home','index','index.html'].includes(parts[0]))return '/';
 const whole=closest('/'+parts.join('/'),[...pagePaths(),...events.map(e=>`/events/${e.id}`),...resources.map(r=>`/resources/${r.id}`)],allowance(parts[parts.length-1]));return whole??closest('/'+parts[0],pagePaths(),allowance(parts[0]))}
