import {useEffect,useState} from 'react';
import {onRouteChange} from '../router';
import {Bell,CalendarDays,CalendarPlus,Search,X} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Label} from '../components/ui/label';
import {Checkbox} from '../components/ui/checkbox';
import {Empty,EmptyHeader,EmptyTitle,EmptyDescription,EmptyContent} from '../components/ui/empty';
import {links,events,filterEvents,type Event} from '../content';
import {titles,External,Intro,LinkButton} from '../components/shared';
import {FilterOptions} from '../components/FilterOptions';
import {CalendarMenu} from '../components/CalendarMenu';
import {ADVERTISE_FEED,FEED_PATH,feedCalendarLinks} from '../calendar';
import {EventBoard} from '../components/EventBoard';
import {FlipText} from '../motion/FlipText';
import {Typed} from '../motion/Typed';

const CATEGORIES=['All','Workshop','Talk','Social'];
// The type comes from the URL (`/events?category=workshop`), as it does on Resources, so a filtered list can be shared.
const fromUrl=()=>CATEGORIES.find(c=>c.toLowerCase()===new URLSearchParams(location.search).get('category')?.toLowerCase())??'All';
// Search only earns its place once the list is long enough to need it.
const SEARCH_FROM=8;
const upcoming=events.filter(e=>!e.past&&!e.cancelled).length;
// Search filters 120ms after typing stops, so the board animates once per search rather than per keystroke.
export function Events({onOpen}:{onOpen:(event:Event,origin:DOMRect)=>void}){const [category,setCategory]=useState(fromUrl);
 // While an event is open the address is the event's own, so the filter behind it stays as it was.
 useEffect(()=>onRouteChange(()=>{if(location.pathname==='/events')setCategory(fromUrl())}),[]);
 // replaceState, so picking a filter doesn't trigger the page wipe or add history entries.
 const choose=(next:string)=>{setCategory(next);const url=new URL(location.href);if(next==='All')url.searchParams.delete('category');else url.searchParams.set('category',next.toLowerCase());history.replaceState(history.state,'',url)};
 const [query,setQuery]=useState('');const [search,setSearch]=useState('');useEffect(()=>{const timer=setTimeout(()=>setSearch(query),120);return()=>clearTimeout(timer)},[query]);const [past,setPast]=useState(false);const rows=filterEvents(category,search,past);const replay=`${category}|${search}|${past}`;const showing=rows.filter(e=>!e.cancelled).length;const searched=!!search.trim();const filtered=category!=='All'||searched;
 const nothingAtAll=!events.length;const nothingOn=!rows.length&&!filtered&&!past;
 return <><Intro compact path="events" status={upcoming?`${upcoming} upcoming`:undefined} title={titles.events}>Workshops, socials and talks with people from industry. Pick whatever sounds interesting.</Intro><div className="wrap"><section className="site-section listing-section">{!nothingAtAll&&<><div className="event-tools"><FilterOptions id="events" label="Event type" options={CATEGORIES} value={category} onChange={choose}/>{events.length>=SEARCH_FROM&&<div className="search-control"><Label htmlFor="event-search" className="sr-only">Search events</Label><Search aria-hidden="true" size={16}/><Input id="event-search" data-page-search placeholder="Search events" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<Button variant="ghost" aria-label="Clear event search" onClick={()=>{setQuery('');document.getElementById('event-search')?.focus()}}><X size={16}/></Button>}</div>}</div><div className="list-status"><span role="status"><FlipText value={String(showing)} replay={replay}/> {past?'past event':'upcoming event'}{showing===1?'':'s'}{category!=='All'&&<span className="sr-only"> in {category}</span>}</span>{events.some(e=>e.past)&&<label className="checkbox-label"><Checkbox checked={past} onCheckedChange={v=>setPast(v===true)}/>Show past events</label>}</div></>}<h2 className="sr-only">{past?'Past events':'Upcoming events'}</h2>{rows.length>0&&<EventBoard events={rows} onOpen={onOpen} replay={replay} search={search}/>}{!rows.length&&(filtered?<Empty className="site-empty"><EmptyHeader><EmptyTitle><Typed text={searched?'No events match that search.':`No ${past?'past ':''}${category.toLowerCase()} events right now.`} trigger="mount"/></EmptyTitle><EmptyDescription>{searched?'Try a broader term or another event type.':'Try another event type.'}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={()=>{setQuery('');setSearch('');choose('All');setPast(false)}}>Clear filters</Button></EmptyContent></Empty>:<Empty className="site-empty"><EmptyHeader><EmptyTitle><Typed text={past?'No past events yet.':'Nothing announced right now.'} trigger="mount"/></EmptyTitle><EmptyDescription>{past?'Past events will be listed here.':'Announcements happen on Discord, so that’s the place to hear what’s next.'}</EmptyDescription></EmptyHeader>{!past&&<EmptyContent><LinkButton href={links.discord}>Open Discord</LinkButton></EmptyContent>}</Empty>)}{ADVERTISE_FEED&&<div className="quiet-callout"><CalendarDays aria-hidden="true"/><div><h3>See every event in your calendar</h3><p>Subscribe once and new events appear by themselves. Changes can take up to a day to show.</p></div><CalendarMenu label="Subscribe" icon={<CalendarPlus aria-hidden="true"/>} links={feedCalendarLinks(location.origin)} copy={location.origin+FEED_PATH}/></div>}{!nothingOn&&<div className="quiet-callout"><Bell aria-hidden="true"/><div><h3>Want reminders and updates?</h3><p>Discord is the place for reminders, changes and chat about events.</p></div><External href={links.discord} className="text-link">Open Discord</External></div>}</section></div></>}
