export const links={discord:'https://discord.gg/VwXhpb7mZW',instagram:'https://www.instagram.com/hwcompsoc',membership:'https://www.hwunion.com/societies/compsci/',email:'compsci.society@hw.ac.uk'};
export const pages=[{id:'home',name:'Home'},{id:'join',name:'Join'},{id:'events',name:'Events'},{id:'resources',name:'Resources'},{id:'about',name:'About'},{id:'partners',name:'Partners'}] as const;
export type Page=typeof pages[number]['id'];
// `#resources/support` is the Resources page with a filter: the first segment picks the page, the second is for that page to read.
export function route(hash:string):Page{const id=hash.slice(1).split('/')[0];return pages.some(p=>p.id===id)?id as Page:'home'}
export const routeParam=(hash:string)=>hash.slice(1).split('/')[1]??'';
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
 {role:'Treasurer',text:'Helps keep the society’s finances organised.',members:[{name:'Nathan Walker',role:'Treasurer'}]},
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
