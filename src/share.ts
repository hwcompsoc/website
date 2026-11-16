// What a link to each address shows when it's posted somewhere or found in a search. Link previews and most crawlers don't run the
// app, so the build writes this into real pages, along with structured data that tells search engines what each page is about.
import {events,links,pagePath,sitePages,resources,eventTabTitle,guideTabTitle,tabTitles,type Event} from './content.ts';

type Data=Record<string,unknown>;
export type Share={path:string;title:string;description:string;image:string;imageAlt:string;type?:'website'|'article';lastModified?:string;data?:(site:string)=>Data[]};
const SITE_NAME='HW CompSoc';
const FULL_NAME='Heriot-Watt Computer Science Society';
export const DEFAULT_IMAGE='/website-assets/share.png';
const DEFAULT_ALT='HW CompSoc: find your people.';
const LOGO='/website-assets/icon-512.png';
const LENGTH=160;
// Search results show about 155 characters, so each one says who we are and where before anything else.
const descriptions={home:'HW CompSoc is Heriot-Watt University’s computer science society in Edinburgh. Join the Discord, come to workshops, talks and socials, and find your people.',join:'Join HW CompSoc, Heriot-Watt’s computer science society: chat on Discord, follow us on Instagram and become a free member through the Heriot-Watt Union.',events:'Workshops, socials and talks with people from industry, run by HW CompSoc, the computer science society at Heriot-Watt University in Edinburgh.',resources:'Beginner guides, notes from workshops and pointers to the right support, from HW CompSoc, Heriot-Watt’s computer science society.',about:'HW CompSoc is Heriot-Watt University’s computer science society, run by a student committee in Edinburgh. Meet the committee and find the society’s records.',partners:'Work with HW CompSoc to reach Heriot-Watt students who are interested in computing, through talks, workshops and project support.'};
const PRIVACY='What the HW CompSoc website stores and who it shares it with. If you’re just visiting, almost nothing.';
// Snippets drop emoji and invisible characters pasted in with event text, which search results show as boxes or not at all.
const shorten=(text:string)=>{const flat=text.replace(/[​-‍⁠﻿]|\p{Extended_Pictographic}️?/gu,'').replace(/\s+/g,' ').trim();if(flat.length<=LENGTH)return flat;return flat.slice(0,LENGTH-1).replace(/\s+\S*$/,'')+'…'};
const iso=(ics:string)=>ics.replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/,'$1-$2-$3T$4:$5:$6Z');
const address=(path:string,site:string)=>site+(path==='/'?'/':path);

// schema.org, as Google reads it. The society and the site are described once, on the home page, and everything else refers to them.
const organisation=(site:string):Data=>({'@type':'Organization','@id':`${site}/#organization`,name:SITE_NAME,alternateName:[FULL_NAME,'CompSoc'],url:`${site}/`,logo:site+LOGO,image:site+DEFAULT_IMAGE,email:links.email,description:descriptions.home,
 memberOf:{'@type':'Organization',name:'Heriot-Watt University Student Union',url:'https://www.hwunion.com/'},
 address:{'@type':'PostalAddress',addressLocality:'Edinburgh',addressRegion:'Scotland',addressCountry:'GB'},
 sameAs:[links.instagram,links.membership,links.source.replace(/\/website$/,'')]});
const website=(site:string):Data=>({'@type':'WebSite','@id':`${site}/#website`,name:SITE_NAME,alternateName:FULL_NAME,url:`${site}/`,inLanguage:'en-GB',publisher:{'@id':`${site}/#organization`}});
const breadcrumbs=(site:string,trail:[string,string][]):Data=>({'@type':'BreadcrumbList',itemListElement:trail.map(([name,path],i)=>({'@type':'ListItem',position:i+1,name,item:address(path,site)}))});
// Free events say so, and a price like "£5" is read from the event's cost. Anything else is left for the description to explain.
function offer(event:Event,url:string):Data|undefined{const cost=event.cost?.trim()??'';const price=/^free\b/i.test(cost)?0:Number(cost.match(/^£\s?(\d+(?:\.\d\d)?)$/)?.[1]??NaN);if(Number.isNaN(price))return;
 return {'@type':'Offer',price,priceCurrency:'GBP',url:event.luma??url,...!event.past&&!event.cancelled?{availability:'https://schema.org/InStock'}:{}}}
// Venues are written by hand, like "Dropkick Murphys, 7 Merchant St, Edinburgh EH1 2QD" or "EM2.50, Earl Mountbatten". Google wants
// a street and postcode for an event, so they're taken from the venue when it gives them: a UK postcode, and the parts between the
// place's name and the city. A room on campus (a code like EM2.50, or a campus building) is at the university's Edinburgh address.
// Anything else stays as just the city, rather than a street that might be wrong.
const POSTCODE=/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
const CAMPUS=/\b[A-Z]{1,3}\s?\d\.\d{1,3}\b|heriot[- ]watt|riccarton|\b(earl mountbatten|james nasmyth|edwin chadwick|hugh nisbet|esm[eé]e fairbairn|mary burton|robert bryson|john coulson|william arrol|william perkin|david brewster|lord balerno|oriam|postgraduate centre)\b/i;
const CITY={addressLocality:'Edinburgh',addressRegion:'Scotland',addressCountry:'GB'};
export function venueAddress(venue:string):Data{const postcode=venue.match(POSTCODE);
 if(postcode){const parts=venue.replace(POSTCODE,'').split(',').map(part=>part.trim()).filter(part=>part&&!/^edinburgh$/i.test(part));const street=parts.slice(1).join(', ');
  return {'@type':'PostalAddress',...street?{streetAddress:street}:{},...CITY,postalCode:`${postcode[1]} ${postcode[2]}`.toUpperCase()}}
 if(CAMPUS.test(venue))return {'@type':'PostalAddress',streetAddress:'Heriot-Watt University, Riccarton',...CITY,postalCode:'EH14 4AS'};
 return {'@type':'PostalAddress',...CITY}}
export function eventData(event:Event,site:string):Data{const url=address(`/events/${event.id}`,site);const price=offer(event,url);
 return {'@type':'Event',name:event.title,description:event.description,url,startDate:iso(event.start),endDate:iso(event.end),
  eventStatus:`https://schema.org/${event.cancelled?'EventCancelled':'EventScheduled'}`,eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
  location:{'@type':'Place',name:event.venue,address:venueAddress(event.venue)},
  image:[site+(event.cover??DEFAULT_IMAGE)],organizer:{'@type':'Organization','@id':`${site}/#organization`,name:SITE_NAME,url:`${site}/`},
  ...event.openTo?{audience:{'@type':'Audience',audienceType:event.openTo}}:{},...price?{offers:price}:{}}}

export function sharePages(list=events):Share[]{return [
 ...sitePages.map(page=>({path:pagePath(page.id),title:tabTitles[page.id],description:descriptions[page.id],image:DEFAULT_IMAGE,imageAlt:DEFAULT_ALT,...page.id==='home'?{data:(site:string)=>[organisation(site),website(site)]}:{}})),
 {path:'/privacy',title:tabTitles.privacy,description:PRIVACY,image:DEFAULT_IMAGE,imageAlt:DEFAULT_ALT},
 ...list.map(event=>({path:`/events/${event.id}`,title:eventTabTitle(event.title),description:shorten(`${event.cancelled?'Cancelled. ':''}${event.date}, ${event.time}, ${event.venue}. ${event.description}`),image:event.cover??DEFAULT_IMAGE,imageAlt:event.cover?event.coverAlt??'':DEFAULT_ALT,...event.updated?{lastModified:event.updated}:{},
  data:(site:string)=>[eventData(event,site),breadcrumbs(site,[['Home','/'],['Events','/events'],[event.title,`/events/${event.id}`]])]})),
 ...resources.map(resource=>({path:`/resources/${resource.id}`,title:guideTabTitle(resource.title),description:shorten(resource.description),image:DEFAULT_IMAGE,imageAlt:DEFAULT_ALT,type:'article' as const,
  data:(site:string)=>[{'@type':'Article',headline:resource.title,description:resource.description,url:address(`/resources/${resource.id}`,site),inLanguage:'en-GB',author:{'@type':'Organization','@id':`${site}/#organization`,name:SITE_NAME},publisher:{'@id':`${site}/#organization`}},breadcrumbs(site,[['Home','/'],['Resources','/resources'],[resource.title,`/resources/${resource.id}`]])]})),
]}

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
// JSON inside a <script> can't contain "</script>" or an HTML comment opener, so < is always escaped.
const json=(data:Data[])=>JSON.stringify({'@context':'https://schema.org','@graph':data}).replaceAll('<','\\u003c');
// `site` is the address the site lives at. Previews, canonical links and structured data need full addresses, so without one they're left out.
export function sharePage(template:string,share:Share,site:string){const meta=(attribute:string,name:string,content:string)=>`<meta ${attribute}="${name}" content="${escape(content)}">`;const url=site+(share.path==='/'?'':share.path)||'/';const shared=share.image===DEFAULT_IMAGE;
 const tags=[meta('property','og:site_name',SITE_NAME),meta('property','og:locale','en_GB'),meta('property','og:type',share.type??'website'),meta('property','og:title',share.title),meta('property','og:description',share.description),meta('name','twitter:title',share.title),meta('name','twitter:description',share.description),
  ...site?[`<link rel="canonical" href="${escape(url)}">`,meta('property','og:url',url),meta('property','og:image',site+share.image),...shared?[meta('property','og:image:width','1200'),meta('property','og:image:height','630')]:[],meta('property','og:image:alt',share.imageAlt),meta('name','twitter:card','summary_large_image'),meta('name','twitter:image',site+share.image),meta('name','twitter:image:alt',share.imageAlt),
   ...share.data?[`<script type="application/ld+json">${json(share.data(site))}</script>`]:[]]:[]].join('');
 return template.replace(/<title>.*?<\/title>/s,()=>`<title>${escape(share.title)}</title>`).replace(/<meta name="description"[^>]*>/,()=>meta('name','description',share.description)).replace('</head>',()=>`${tags}</head>`)}
