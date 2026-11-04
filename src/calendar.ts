// Calendar files and links. The build writes the files: `/events.ics` to subscribe to, and `/events/<id>.ics` for one event.
import type {Event} from './content.ts';

const FEED_NAME='HW CompSoc events';
export const FEED_PATH='/events.ics';
// A subscription stays tied to the address it was made on, so moving to a permanent domain means people subscribing again.
export const ADVERTISE_FEED=true;
export const eventFilePath=(event:Event)=>`/events/${event.id}.ics`;

const icsNow=(now:number)=>new Date(now).toISOString().replace(/[-:]|\.\d{3}/g,'');
const escape=(text:string)=>text.replaceAll('\\','\\\\').replace(/\r?\n/g,'\\n').replaceAll(',','\\,').replaceAll(';','\\;');
// Lines may be at most 75 bytes, carrying on after a space. Counting bytes rather than characters keeps "–" or an emoji in one piece.
function fold(line:string){const encoder=new TextEncoder();const parts:string[]=[];let part='',size=0;for(const character of line){const bytes=encoder.encode(character).length;if(size+bytes>(parts.length?74:75)){parts.push(part);part='';size=0}part+=character;size+=bytes}parts.push(part);return parts.join('\r\n ')}
const details=(event:Event,site:string)=>[event.description,event.luma?`Sign up: ${event.luma}`:'',site?`More: ${site}/events/${event.id}`:''].filter(Boolean).join('\n');
// The ID never changes once an event is published, which is how calendars know a changed event is the same one.
const eventLines=(event:Event,site:string,now:number)=>['BEGIN:VEVENT',`UID:${event.id}@hwcompsoc`,`DTSTAMP:${icsNow(now)}`,`DTSTART:${event.start}`,`DTEND:${event.end}`,`SUMMARY:${escape(`${event.cancelled?'Cancelled: ':''}${event.title}`)}`,`DESCRIPTION:${escape(details(event,site))}`,`LOCATION:${escape(event.venue)}`,...site?[`URL:${site}/events/${event.id}`]:[],`STATUS:${event.cancelled?'CANCELLED':'CONFIRMED'}`,'END:VEVENT'];
const file=(headers:string[],events:Event[],site:string,now:number)=>[...['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//HW CompSoc//Events//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',...headers],...events.flatMap(event=>eventLines(event,site,now)),'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';

export const calendar=(event:Event,site='',now=Date.now())=>file([],[event],site,now);
// Asks calendar apps to check every 6 hours, though each one keeps to its own schedule.
export const calendarFeed=(events:Event[],site='',now=Date.now())=>file([`NAME:${FEED_NAME}`,`X-WR-CALNAME:${FEED_NAME}`,'REFRESH-INTERVAL;VALUE=DURATION:PT6H','X-PUBLISHED-TTL:PT6H'],events,site,now);

export type CalendarLink={label:string;href:string;download?:string;external?:boolean};
const iso=(ics:string)=>ics.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z');
const query=(values:Record<string,string>)=>new URLSearchParams(values).toString();
const OUTLOOK_WORK='https://outlook.office.com',OUTLOOK_HOME='https://outlook.live.com';

export function eventCalendarLinks(event:Event,site:string):CalendarLink[]{const body=details(event,site);const compose=(host:string)=>`${host}/calendar/0/deeplink/compose?${query({path:'/calendar/action/compose',rru:'addevent',subject:event.title,startdt:iso(event.start),enddt:iso(event.end),location:event.venue,body})}`;
 return [{label:'Google Calendar',href:`https://calendar.google.com/calendar/render?${query({action:'TEMPLATE',text:event.title,dates:`${event.start}/${event.end}`,location:event.venue,details:body})}`,external:true},{label:'Outlook (University or Work)',href:compose(OUTLOOK_WORK),external:true},{label:'Outlook (Personal)',href:compose(OUTLOOK_HOME),external:true},{label:'Apple or other (.ics file)',href:eventFilePath(event),download:`${event.id}.ics`}]}

export function feedCalendarLinks(site:string):CalendarLink[]{const feed=site+FEED_PATH;const webcal=feed.replace(/^https?:/,'webcal:');const fromWeb=(host:string)=>`${host}/calendar/0/addfromweb?${query({url:feed,name:FEED_NAME})}`;
 return [{label:'Google Calendar',href:`https://calendar.google.com/calendar/render?${query({cid:webcal})}`,external:true},{label:'Outlook (University or Work)',href:fromWeb(OUTLOOK_WORK),external:true},{label:'Outlook (Personal)',href:fromWeb(OUTLOOK_HOME),external:true},{label:'Apple Calendar or other app',href:webcal}]}
