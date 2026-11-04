// What a link to each address shows when it's posted somewhere. Link previews don't run the app, so the build writes this into real pages.
import {events,pagePath,pages,resources,eventTabTitle,guideTabTitle,tabTitles} from './content.ts';

export type Share={path:string;title:string;description:string;image:string;imageAlt:string};
const SITE_NAME='HW CompSoc';
export const DEFAULT_IMAGE='/website-assets/share.png';
const DEFAULT_ALT='HW CompSoc: find your people.';
const LENGTH=200;
const descriptions={home:'Find your people at HW CompSoc. Join the Discord, explore events and learn together at Heriot-Watt.',join:'Chat with us on Discord, follow us on Instagram, and become a member through the Heriot-Watt Union when you’re ready. Membership is free.',events:'Workshops, socials and talks with people from industry. Pick whatever sounds interesting.',resources:'Beginner guides, notes from workshops and pointers to the right support.',about:'CompSoc is Heriot-Watt’s computer science society, run by a student committee.',partners:'We connect organisations with Heriot-Watt students who are interested in computing, through talks, workshops and project support.'};
const PRIVACY='What the HW CompSoc website stores and who it shares it with. If you’re just visiting, almost nothing.';
const shorten=(text:string)=>{const flat=text.replace(/\s+/g,' ').trim();if(flat.length<=LENGTH)return flat;return flat.slice(0,LENGTH-1).replace(/\s+\S*$/,'')+'…'};

export function sharePages(list=events):Share[]{return [
 ...pages.map(page=>({path:pagePath(page.id),title:tabTitles[page.id],description:descriptions[page.id],image:DEFAULT_IMAGE,imageAlt:DEFAULT_ALT})),
 {path:'/privacy',title:tabTitles.privacy,description:PRIVACY,image:DEFAULT_IMAGE,imageAlt:DEFAULT_ALT},
 ...list.map(event=>({path:`/events/${event.id}`,title:eventTabTitle(event.title),description:shorten(`${event.cancelled?'Cancelled. ':''}${event.date}, ${event.time}, ${event.venue}. ${event.description}`),image:event.cover??DEFAULT_IMAGE,imageAlt:event.cover?event.coverAlt??'':DEFAULT_ALT})),
 ...resources.map(resource=>({path:`/resources/${resource.id}`,title:guideTabTitle(resource.title),description:shorten(resource.description),image:DEFAULT_IMAGE,imageAlt:DEFAULT_ALT})),
]}

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
// `site` is the address the site lives at. Previews need full addresses, so without one they're left out.
export function sharePage(template:string,share:Share,site:string){const meta=(attribute:string,name:string,content:string)=>`<meta ${attribute}="${name}" content="${escape(content)}">`;const url=site+(share.path==='/'?'':share.path)||'/';
 const tags=[meta('property','og:site_name',SITE_NAME),meta('property','og:type','website'),meta('property','og:title',share.title),meta('property','og:description',share.description),...site?[`<link rel="canonical" href="${escape(url)}">`,meta('property','og:url',url),meta('property','og:image',site+share.image),meta('property','og:image:alt',share.imageAlt),meta('name','twitter:card','summary_large_image')]:[]].join('');
 return template.replace(/<title>.*?<\/title>/s,()=>`<title>${escape(share.title)}</title>`).replace(/<meta name="description"[^>]*>/,()=>meta('name','description',share.description)).replace('</head>',()=>`${tags}</head>`)}
