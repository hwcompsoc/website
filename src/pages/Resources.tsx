import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AnimatePresence,m} from 'motion/react';
import {ArrowRight,ArrowUpRight,Search,X} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Label} from '../components/ui/label';
import {Empty,EmptyHeader,EmptyTitle,EmptyDescription,EmptyContent} from '../components/ui/empty';
import {FilterOptions} from '../components/FilterOptions';
import {links,resources,routeParam,type Resource} from '../content';
import {titles,Intro,SampleNote,WindowBar} from '../components/shared';
import {dur,spring,type MotionLevel} from '../motion';
import {useMotionLevel} from '../motion/level';
import {FlipText} from '../motion/FlipText';
import {PixelBuild} from '../motion/PixelBuild';
import {Typed} from '../motion/Typed';

// Resources are "files" (MOTION-PLAN §8.5, §11.2): a window whose title bar filename is selected on hover or focus, the whole card is the
// "Explore guide" button's hit area, and the guide grows out of the card it was opened from.
// When a filter changes (§8.5), leaving cards fade and drop out of the grid, staying cards slide to their new slot and arriving cards build in.
const cardMotion=(level:MotionLevel)=>level==='off'?{initial:false as const,exit:{opacity:0,transition:{duration:0}}}:{...(level==='full'?{layout:'position' as const}:{}),initial:{opacity:0},animate:{opacity:1},exit:{opacity:0,transition:{duration:dur.instant}},transition:{layout:spring.layout,opacity:{duration:dur.instant}}};
function ResourceCard({resource,onOpen,entering}:{resource:Resource;onOpen:(resource:Resource,origin:DOMRect)=>void;entering:boolean}){
 const [over,setOver]=useState(false);const card=useRef<HTMLDivElement>(null);const level=useMotionLevel();const [built]=useState(!entering);
 return <m.div {...cardMotion(level)} className="resource-card" onPointerEnter={()=>setOver(true)} onPointerLeave={()=>setOver(false)} onFocus={()=>setOver(true)} onBlur={()=>setOver(false)}><div className="resource-plain" ref={card}><PixelBuild className="resource-build" cols={8} rows={6} duration={.3} trigger="mount" skip={built}>
  <WindowBar name={`${resource.id}.md`} meta={`${resource.category.toLowerCase()} · ${resource.minutes.toLowerCase()}`} selected={over}/>
  <div className="window-body"><h2>{resource.title}</h2><p>{resource.description}</p>
  <div className="resource-bottom"><span className="resource-type">{resource.type}</span><Button variant="link" className="resource-open" onClick={()=>onOpen(resource,card.current!.getBoundingClientRect())}>Explore guide<span className="sr-only">: {resource.title}</span><ArrowRight size={17} aria-hidden="true"/></Button></div></div>
 </PixelBuild></div></m.div>}

// The page's closing call to action (R5): the next file in the grid, not yet written. Same window as a guide card, with a dashed frame,
// a faded "Create a new guide" title and placeholder lines; the whole card is the email link's hit area.
function SuggestCard(){
 const [over,setOver]=useState(false);const level=useMotionLevel();
 return <m.div {...cardMotion(level)} className="resource-card suggest-card" onPointerEnter={()=>setOver(true)} onPointerLeave={()=>setOver(false)} onFocus={()=>setOver(true)} onBlur={()=>setOver(false)}><div className="resource-plain">
  <WindowBar name="untitled.md" meta="new · by you" selected={over}/>
  <div className="window-body"><div className="suggest-draft"><h2 className="suggest-title">Create a new guide<span className="caret" aria-hidden="true"/></h2><span className="suggest-line" aria-hidden="true"/><span className="suggest-line short" aria-hidden="true"/></div>
  <div className="resource-bottom"><span className="resource-type">Know something useful?</span><a className="resource-open suggest-open" href={`mailto:${links.email}?subject=New%20guide`}>Email your idea<ArrowUpRight size={17} aria-hidden="true"/></a></div></div>
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
// The category comes from the URL (`#resources/learning`), so the Home resource stack can link straight to a filter.
const fromHash=()=>categories.find(c=>c.toLowerCase()===routeParam(location.hash))??'All';
export function Resources({onOpen}:{onOpen:(resource:Resource,origin:DOMRect)=>void}){const [category,setCategory]=useState(fromHash);useEffect(()=>{const sync=()=>setCategory(fromHash());window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
 // replaceState rather than a hash change, so picking a filter doesn't trigger the page wipe or add history entries.
 const choose=(next:string)=>{setCategory(next);history.replaceState(null,'',`#resources${next==='All'?'':`/${next.toLowerCase()}`}`)};const [query,setQuery]=useState('');const [search,setSearch]=useState('');
 // Search filters 120ms after typing stops, so the grid animates once per search rather than per keystroke.
 useEffect(()=>{const timer=setTimeout(()=>setSearch(query),120);return()=>clearTimeout(timer)},[query]);const settled=useRef(false);useEffect(()=>{settled.current=true},[]);const list=resources.filter(r=>(category==='All'||r.category===category)&&`${r.title} ${r.description}`.toLowerCase().includes(search.trim().toLowerCase()));return <><Intro path="resources" sub={category==="All"?"":category.toLowerCase()} title={titles.resources}>Guides for getting started, getting unstuck and working out what to try next.</Intro><div className="wrap"><section className="site-section listing-section"><div className="event-tools"><FilterOptions id="resources" label="Resource category" options={categories} value={category} onChange={choose}/><div className="search-control"><Label htmlFor="resource-search" className="sr-only">Search sample resources</Label><Search size={18} aria-hidden="true"/><Input id="resource-search" placeholder="Find something useful" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<Button variant="ghost" aria-label="Clear resource search" onClick={()=>{setQuery('');document.getElementById('resource-search')?.focus()}}><X size={16}/></Button>}</div></div><div className="list-status"><span role="status"><FlipText value={String(list.length)} replay={`${category}|${search}`}/> resource preview{list.length===1?'':'s'}{category!=='All'&&<span className="sr-only"> in {category}</span>}</span><span>Learning at your own pace</span></div><SampleNote>Example material for the prototype. Publication needs a named maintainer and review date.</SampleNote><GridHeight>{!list.length&&<Empty className="site-empty resources-empty"><EmptyHeader><EmptyTitle><Typed text="No resources found." trigger="mount"/></EmptyTitle><EmptyDescription>Try another category or a shorter search.</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={()=>{choose('All');setQuery('');setSearch('');document.getElementById('resource-search')?.focus()}}>Clear filters</Button></EmptyContent></Empty>}<div className="website-bento"><AnimatePresence initial={false} mode="popLayout">{list.map(resource=><ResourceCard key={resource.id} resource={resource} onOpen={onOpen} entering={settled.current}/>)}<SuggestCard key="suggest"/></AnimatePresence></div></GridHeight></section></div></>}
