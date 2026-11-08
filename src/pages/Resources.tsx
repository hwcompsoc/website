import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AnimatePresence,m} from 'motion/react';
import {ArrowRight,ArrowUpRight,MessageCircle,Search,X} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Label} from '../components/ui/label';
import {Empty,EmptyHeader,EmptyTitle,EmptyDescription,EmptyContent} from '../components/ui/empty';
import {FilterOptions} from '../components/FilterOptions';
import {links,resources,type Resource} from '../content';
import {onRouteChange} from '../router';
import {titles,External,Intro,WindowBar,Highlight} from '../components/shared';
import {dur,spring,type MotionLevel} from '../motion';
import {useMotionLevel} from '../motion/level';
import {FlipText} from '../motion/FlipText';
import {PixelBuild} from '../motion/PixelBuild';
import {Typed} from '../motion/Typed';

// Resources are "files": a window whose title bar filename is selected on hover or focus, the whole card is the
// "Read guide" button's hit area, and the guide grows out of the card it was opened from.
// When a filter changes, leaving cards fade and drop out of the grid, staying cards slide to their new slot and arriving cards build in.
const cardMotion=(level:MotionLevel)=>level==='off'?{initial:false as const,exit:{opacity:0,transition:{duration:0}}}:{...(level==='full'?{layout:'position' as const}:{}),initial:{opacity:0},animate:{opacity:1},exit:{opacity:0,transition:{duration:dur.instant}},transition:{layout:spring.layout,opacity:{duration:dur.instant}}};
function ResourceCard({resource,onOpen,entering,search}:{resource:Resource;onOpen:(resource:Resource,origin:DOMRect)=>void;entering:boolean;search:string}){
 const [over,setOver]=useState(false);const card=useRef<HTMLDivElement>(null);const level=useMotionLevel();const [built]=useState(!entering);
 return <m.div {...cardMotion(level)} className="resource-card" onPointerEnter={()=>setOver(true)} onPointerLeave={()=>setOver(false)} onFocus={()=>setOver(true)} onBlur={()=>setOver(false)}><div className="resource-plain" ref={card}><PixelBuild className="resource-build" cols={8} rows={6} duration={.3} trigger="mount" skip={built}>
  <WindowBar name={`${resource.id}.md`} meta={`${resource.category.toLowerCase()} · ${resource.minutes.toLowerCase()}`} selected={over}/>
  <div className="window-body"><h2><Highlight text={resource.title} query={search}/></h2><p><Highlight text={resource.description} query={search}/></p>
  <div className="resource-bottom"><Button variant="link" className="resource-open" onClick={()=>onOpen(resource,card.current!.getBoundingClientRect())}>Read guide<span className="sr-only">: {resource.title}</span><ArrowRight size={16} aria-hidden="true"/></Button></div></div>
 </PixelBuild></div></m.div>}

// The page's closing call to action: the next file, not yet written. A slim row under the guides with a dashed frame, so it never outweighs them; the whole row is the email link's hit area.
// With no guides published it is the page's empty state, so it says so instead.
function SuggestCard({first=false}:{first?:boolean}){
 const [over,setOver]=useState(false);const level=useMotionLevel();
 return <m.div {...cardMotion(level)} className="resource-card suggest-card" onPointerEnter={()=>setOver(true)} onPointerLeave={()=>setOver(false)} onFocus={()=>setOver(true)} onBlur={()=>setOver(false)}><div className="resource-plain">
  <WindowBar name="untitled.md" meta="new · by you" selected={over}/>
  <div className="window-body suggest-row"><div><h2>{first?'No guides here yet':'Know something useful?'}<span className="caret" aria-hidden="true"/></h2><p>{first?'The first one could be yours.':'Suggest a guide and help the next person out.'}</p></div>
  <a className="resource-open suggest-open" href={`mailto:${links.email}?subject=New%20guide`}>Email your idea<ArrowUpRight size={16} aria-hidden="true"/></a></div>
 </div></m.div>}

// The grid's height follows the same spring as the cards, so what sits below it moves with them rather than jumping.
// Overflow stays visible so card shadows and focus rings aren't clipped. A width change (window resize) applies instantly.
function GridHeight({children}:{children:ReactNode}){
 const level=useMotionLevel();const inner=useRef<HTMLDivElement>(null);const [height,setHeight]=useState<number|'auto'>('auto');const [instant,setInstant]=useState(true);const width=useRef(0);
 useEffect(()=>{const el=inner.current;if(!el||level!=='full')return;const observer=new ResizeObserver(()=>{const box=el.getBoundingClientRect();setInstant(box.width!==width.current);width.current=box.width;setHeight(box.height)});observer.observe(el);return()=>observer.disconnect()},[level]);
 if(level!=='full')return <>{children}</>;
 return <m.div initial={false} animate={{height}} transition={instant?{duration:0}:spring.layout}><div ref={inner}>{children}</div></m.div>;
}

const categories=['All','Learning','Community','Support'];
// The category comes from the URL (`/resources?category=learning`), so the Home resource stack can link straight to a filter.
const fromUrl=()=>categories.find(c=>c.toLowerCase()===new URLSearchParams(location.search).get('category')?.toLowerCase())??'All';
export function Resources({onOpen}:{onOpen:(resource:Resource,origin:DOMRect)=>void}){const [category,setCategory]=useState(fromUrl);
 // While a guide is open the address is the guide's own, so the filter behind it stays as it was.
 useEffect(()=>onRouteChange(()=>{if(location.pathname==='/resources')setCategory(fromUrl())}),[]);
 // replaceState, so picking a filter doesn't trigger the page wipe or add history entries.
 const choose=(next:string)=>{setCategory(next);const url=new URL(location.href);if(next==='All')url.searchParams.delete('category');else url.searchParams.set('category',next.toLowerCase());history.replaceState(history.state,'',url)};const [query,setQuery]=useState('');const [search,setSearch]=useState('');
 // Search filters 120ms after typing stops, so the grid animates once per search rather than per keystroke.
 useEffect(()=>{const timer=setTimeout(()=>setSearch(query),120);return()=>clearTimeout(timer)},[query]);const settled=useRef(false);useEffect(()=>{settled.current=true},[]);const list=resources.filter(r=>(category==='All'||r.category===category)&&`${r.title} ${r.description}`.toLowerCase().includes(search.trim().toLowerCase()));return <><Intro compact path="resources" sub={category==="All"?"":category.toLowerCase()} title={titles.resources}>Guides for getting started, getting unstuck and working out what to try next.</Intro><div className="wrap"><section className="site-section listing-section">{resources.length>0&&<><div className="event-tools"><FilterOptions id="resources" label="Resource category" options={categories} value={category} onChange={choose}/><div className="search-control"><Label htmlFor="resource-search" className="sr-only">Search guides</Label><Search size={16} aria-hidden="true"/><Input id="resource-search" placeholder="Find something useful" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<Button variant="ghost" aria-label="Clear resource search" onClick={()=>{setQuery('');document.getElementById('resource-search')?.focus()}}><X size={16}/></Button>}</div></div><div className="list-status"><span role="status"><FlipText value={String(list.length)} replay={`${category}|${search}`}/> guide{list.length===1?'':'s'}{category!=='All'&&<span className="sr-only"> in {category}</span>}</span></div></>}<GridHeight>{resources.length>0&&!list.length&&<Empty className="site-empty resources-empty"><EmptyHeader><EmptyTitle><Typed text="No resources found." trigger="mount"/></EmptyTitle><EmptyDescription>Try another category or a shorter search.</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={()=>{choose('All');setQuery('');setSearch('');document.getElementById('resource-search')?.focus()}}>Clear filters</Button></EmptyContent></Empty>}<div className="website-bento"><AnimatePresence initial={false} mode="popLayout">{list.map(resource=><ResourceCard key={resource.id} resource={resource} onOpen={onOpen} entering={settled.current} search={search}/>)}<SuggestCard key="suggest" first={!resources.length}/></AnimatePresence></div></GridHeight><div className="quiet-callout"><MessageCircle aria-hidden="true"/><div><h2>Stuck on something?</h2><p>Ask on Discord and someone can point you in the right direction.</p></div><External href={links.discord} className="text-link">Ask on Discord</External></div></section></div></>}
