export const links={discord:'https://discord.gg/VwXhpb7mZW',instagram:'https://www.instagram.com/hwcompsoc',membership:'https://www.hwunion.com/societies/compsci/',email:'compsci.society@hw.ac.uk'};
export const pages=[{id:'home',name:'Home'},{id:'join',name:'Join'},{id:'events',name:'Events'},{id:'resources',name:'Resources'},{id:'about',name:'About'},{id:'partners',name:'Partners'}] as const;
export type Page=typeof pages[number]['id'];
export type View=Page|'notfound';
export const pagePath=(page:Page)=>page==='home'?'/':`/${page}`;
export type Event={id:string;title:string;category:'Workshop'|'Community'|'Industry';day:string;month:string;date:string;time:string;venue:string;description:string;level:string;start:string;end:string;past?:boolean};
export const events:Event[]=[
 {id:'web',title:'Your first web app',category:'Workshop',day:'12',month:'NOV',date:'Thursday 12 November 2026',time:'17:30–19:00 GMT',venue:'Campus venue · placeholder',description:'Bring a laptop and a little curiosity. Explore the building blocks of a simple web page, together.',level:'Beginner friendly',start:'20261112T173000Z',end:'20261112T190000Z'},
 {id:'social',title:'Meet your computing people',category:'Community',day:'19',month:'NOV',date:'Thursday 19 November 2026',time:'18:00–20:00 GMT',venue:'Campus social space · placeholder',description:'An easy way to meet people across courses and years. No coding experience or preparation needed.',level:'Everyone welcome',start:'20261119T180000Z',end:'20261119T200000Z'},
 {id:'industry',title:'A conversation with industry',category:'Industry',day:'26',month:'NOV',date:'Thursday 26 November 2026',time:'17:30–18:30 GMT',venue:'Speaker and venue · placeholders',description:'A proposed informal conversation about working in tech, with time for questions and connections.',level:'Open discussion',start:'20261126T173000Z',end:'20261126T183000Z'},
 {id:'git',title:'Getting started with Git',category:'Workshop',day:'22',month:'OCT',date:'Thursday 22 October 2026',time:'17:30–19:00 BST',venue:'Example campus space',description:'An archive example showing how past activities and their learning material could be presented.',level:'Past example',start:'20261022T163000Z',end:'20261022T180000Z',past:true},
];
// Committee (About). `photo` is the file id in src/website/committee/; people without one get their initials.
export type Member={name:string;role:string;photo?:string};
export const committee:{role:string;text:string;members:Member[]}[]=[
 {role:'President',text:'Helps coordinate the society and its direction.',members:[{name:'Ryan Dawson',role:'President',photo:'rd'}]},
 {role:'Vice President',text:'Supports the president and keeps projects moving.',members:[{name:'Thomas Prowse',role:'Vice President',photo:'tp'}]},
 {role:'Secretary',text:'Helps maintain records and continuity.',members:[{name:'Ella Koleola',role:'Secretary'}]},
 {role:'Treasurer',text:'Helps keep the society’s finances organised.',members:[{name:'Nathan Walker',role:'Treasurer',photo:'nw'}]},
 {role:'Industry Liaison',text:'Helps build conversations with organisations and supporters.',members:[{name:'Lewis Robertson',role:'Industry Liaison',photo:'lmr'}]},
 {role:'Community Manager',text:'Helps people find their place in the community.',members:[{name:'Kevin Paul Job',role:'Community Manager',photo:'kp'}]},
 {role:'Social Media Manager',text:'Shares what’s happening on Instagram and Discord.',members:[{name:'Amanda Zhang',role:'Social Media Manager',photo:'az'}]},
 {role:'Events team',text:'Helps turn activity ideas into welcoming experiences.',members:[{name:'Divine Halim',role:'Events Organiser',photo:'dh'},{name:'Alex Munoz Rueda',role:'Events Organiser',photo:'ar'},{name:'Raymond Shell',role:'Events Organiser',photo:'rs'},{name:'Pierrie Touaro',role:'Events Organiser'}]},
];
export const initials=(name:string)=>name.split(' ').filter(Boolean).map(w=>w[0]).filter((_,i,a)=>i===0||i===a.length-1).join('').toUpperCase();
export const resources=[
 {id:'git',title:'Git, without the guesswork.',category:'Learning',description:'A short introduction to repositories, commits and a useful first workflow.',type:'Starter guide',minutes:'5 min',icon:'code'},
 {id:'web',title:'Make your first web page.',category:'Learning',description:'Meet HTML, CSS and the small steps that turn an idea into something you can open.',type:'Workshop notes',minutes:'6 min',icon:'web'},
 {id:'contribute',title:'Make a small contribution.',category:'Community',description:'Find a manageable task, explain your change and ask someone to review it.',type:'Contribution guide',minutes:'4 min',icon:'branch'},
 {id:'support',title:'You don’t have to figure it out alone.',category:'Support',description:'A proposed home for official academic and wellbeing support destinations.',type:'Support directory',minutes:'Preview',icon:'heart'},
] as const;
export type Resource=typeof resources[number];
export function filterEvents(category:string,query:string,past:boolean){return events.filter(e=>!!e.past===past&&(category==='All'||e.category===category)&&`${e.title} ${e.description} ${e.category}`.toLowerCase().includes(query.trim().toLowerCase()))}
export function calendar(event:Event){const escape=(s:string)=>s.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//HW CompSoc//Local Prototype Examples//EN','BEGIN:VEVENT',`UID:prototype-${event.id}@example.invalid`,'DTSTAMP:20261030T120000Z',`DTSTART:${event.start}`,`DTEND:${event.end}`,`SUMMARY:${escape('[PROTOTYPE EXAMPLE] '+event.title)}`,`DESCRIPTION:${escape('Illustrative event only. This is not a confirmed HW activity. '+event.description)}`,`LOCATION:${escape(event.venue)}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n')}
export function enquiryMail(org:string,email:string,format:string,message:string){return `mailto:${links.email}?subject=${encodeURIComponent('Partnership enquiry: '+org)}&body=${encodeURIComponent(`Organisation: ${org}\nReply email: ${email}\nInterested in: ${format}\n\n${message}`)}`}
// Routes. `/events/web` and `/resources/git` open one item; a Resources filter is a query (`/resources?category=support`), because "support" is also a guide.
const segments=(path:string)=>path.toLowerCase().split('/').filter(Boolean);
export const canonicalPath=(path:string)=>'/'+segments(path).join('/');
export function route(path:string):{view:View;item:string}{const parts=segments(path);if(!parts.length)return {view:'home',item:''};
 const [first,item='',...rest]=parts;const page=pages.find(p=>p.id===first&&p.id!=='home');if(!page||rest.length)return {view:'notfound',item:''};if(!item)return {view:page.id,item:''};
 const found=(page.id==='events'&&events.some(e=>e.id===item))||(page.id==='resources'&&resources.some(r=>r.id===item));return found?{view:page.id,item}:{view:'notfound',item:''}}
// Links shared before paths existed, such as `#events` or `#resources/support`.
export function legacyPath(hash:string):string|null{const [id,param]=hash.slice(1).toLowerCase().split('/');const page=pages.find(p=>p.id===id);if(!page)return null;return page.id==='resources'&&param?`/resources?category=${encodeURIComponent(param)}`:pagePath(page.id)}
// Optimal string alignment: a swapped pair of letters ("abuot") counts as one typo.
function typos(a:string,b:string){const d=Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)] as number[]);for(let j=0;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}
 return d[a.length][b.length]}
// Allows about one typo per three letters of the part that could be wrong, so a long path doesn't match anything.
const allowance=(part:string)=>Math.max(1,Math.floor(part.length/3));
function closest(value:string,options:string[],limit:number){let best:string|null=null,score=limit+1;for(const option of options){const t=typos(value,option);if(t<score){best=option;score=t}}return best}
const pagePaths=()=>pages.filter(p=>p.id!=='home').map(p=>pagePath(p.id));
// The real address closest to a wrong one, or null if nothing is close: first the whole path, then just its first part.
export function suggestPath(path:string):string|null{const parts=segments(path);if(!parts.length)return null;if(parts.length===1&&['home','index','index.html'].includes(parts[0]))return '/';
 const whole=closest('/'+parts.join('/'),[...pagePaths(),...events.map(e=>`/events/${e.id}`),...resources.map(r=>`/resources/${r.id}`)],allowance(parts[parts.length-1]));return whole??closest('/'+parts[0],pagePaths(),allowance(parts[0]))}
