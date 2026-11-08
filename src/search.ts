// What the command palette searches: pages, events, people, questions, guides, documents and a few actions. Built from the
// same content as the pages, so nothing here needs keeping up to date by hand. Kept free of the DOM so the tests can load it.
import {anchor,committeePeople,discordMembers,documents,events,faqs,links,pagePath,resources,sitePages,type Event} from './content.ts';

export type Group='Pages'|'Events'|'People'|'Questions'|'Guides'|'Documents'|'Actions';
export const groups:Group[]=['Pages','Events','People','Questions','Guides','Documents','Actions'];
export type Action='copy-email'|'theme-light'|'theme-dark';
// `href` is where the entry goes; `external` opens it in a new tab; `action` runs on the page instead.
export type Entry={id:string;group:Group;title:string;detail:string;keywords:string;href?:string;external?:boolean;action?:Action};

const pageDetail:Record<string,string>={home:'Start here',join:'Discord, socials and membership',events:'Workshops, talks and socials',resources:'Guides and useful starting points',about:'The society and its committee',partners:'Sponsor, run a talk or work with us'};
const eventDetail=(e:Event)=>`${e.past?'Past · ':''}${e.weekday} ${e.day} ${e.month} · ${e.venue}`;
// Answers are written with [link](address) markup; the palette only shows their words.
const plain=(text:string)=>text.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1');

export function entries():Entry[]{return [
 ...sitePages.map(p=>({id:`page-${p.id}`,group:'Pages' as const,title:p.name,detail:pageDetail[p.id]??'',keywords:'',href:pagePath(p.id)})),
 {id:'page-privacy',group:'Pages',title:'Privacy',detail:'What this website stores',keywords:'data cookies gdpr',href:'/privacy'},
 // Upcoming first (soonest at the top), then past, most recent first: the order the content already has.
 ...events.map(e=>({id:`event-${e.id}`,group:'Events' as const,title:e.cancelled?`${e.title} (cancelled)`:e.title,detail:eventDetail(e),keywords:`${e.category} ${e.level} ${e.description}`,href:`/events/${e.id}`})),
 ...committeePeople.map(p=>({id:`person-${p.slug}`,group:'People' as const,title:p.name,detail:p.title,keywords:`${p.role} ${p.studies??''} ${p.askMeAbout??''} committee`,href:`/about#${p.slug}`})),
 ...faqs.map(f=>({id:`faq-${f.id}`,group:'Questions' as const,title:f.question,detail:plain(f.answer),keywords:'faq',href:`/join#${anchor(f.question)}`})),
 ...resources.map(r=>({id:`guide-${r.id}`,group:'Guides' as const,title:r.title,detail:r.description,keywords:`${r.category} ${r.type} guide`,href:`/resources/${r.id}`})),
 ...documents.map(d=>({id:`document-${d.id}`,group:'Documents' as const,title:d.title,detail:`PDF · approved ${d.approved}`,keywords:'governance constitution document',href:d.href,external:true})),
 {id:'action-discord',group:'Actions',title:'Join the Discord',detail:discordMembers?`${discordMembers.toLocaleString('en-GB')} members · announcements and chat`:'Announcements and chat',keywords:'chat community server',href:links.discord,external:true},
 {id:'action-instagram',group:'Actions',title:'Follow us on Instagram',detail:'@hwcompsoc',keywords:'socials photos',href:links.instagram,external:true},
 {id:'action-membership',group:'Actions',title:'Become a member',detail:'Free, through the Heriot-Watt Union',keywords:'join union membership sign up',href:links.membership,external:true},
 {id:'action-email',group:'Actions',title:'Copy our email address',detail:links.email,keywords:'contact mail',action:'copy-email'},
 {id:'action-dark',group:'Actions',title:'Switch to dark theme',detail:'Theme',keywords:'mode colour color night',action:'theme-dark'},
 {id:'action-light',group:'Actions',title:'Switch to light theme',detail:'Theme',keywords:'mode colour color day',action:'theme-light'},
]}

// Lower is better: the title starts with the query, then a word in the title does, then the title contains it, then only the details do.
function score(entry:Entry,query:string,words:string[]){const title=entry.title.toLowerCase(),rest=`${entry.detail} ${entry.keywords}`.toLowerCase();
 if(!words.every(word=>title.includes(word)||rest.includes(word)))return -1;
 if(title.startsWith(query))return 0;if(title.split(/[^a-z0-9]+/).some(word=>word.startsWith(words[0])))return 1;if(title.includes(query))return 2;return 3}

// With nothing typed: every page, the next three events, and the actions. Otherwise everything that matches every word,
// best first; ties keep the groups' order and the content's own order.
export function search(query:string,list:Entry[]=entries()):Entry[]{const q=query.trim().toLowerCase();
 if(!q){let upcoming=0;return list.filter(e=>e.group==='Pages'?e.id!=='page-privacy':e.group==='Events'?!e.detail.startsWith('Past')&&!e.title.endsWith('(cancelled)')&&upcoming++<3:e.group==='Actions').sort((a,b)=>groups.indexOf(a.group)-groups.indexOf(b.group))}
 const words=q.split(/\s+/);
 return list.map((entry,i)=>({entry,i,s:score(entry,q,words)})).filter(r=>r.s>=0).sort((a,b)=>a.s-b.s||groups.indexOf(a.entry.group)-groups.indexOf(b.entry.group)||a.i-b.i).map(r=>r.entry)}

// The results in display order, grouped, each group appearing where its best result ranked.
export function grouped(results:Entry[]){const order:Group[]=[];for(const r of results)if(!order.includes(r.group))order.push(r.group);
 return order.map(group=>({group,entries:results.filter(r=>r.group===group)}))}
