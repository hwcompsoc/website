import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,m} from 'motion/react';
import {ArrowRight} from 'lucide-react';
import {type Event} from '../content';
import {dur,ease} from '../motion';
import {useMotionLevel} from '../motion/level';
import {FlipText} from '../motion/FlipText';
import {PixelBuild} from '../motion/PixelBuild';
import {Highlight} from './shared';
import {PixelImage} from '../motion/PixelImage';

// Departures board. Rows that leave collapse, rows that arrive open and build in pixel by pixel,
// and dates/times flip whenever `replay` changes (the filter state). Each row opens its event from the date block. `search` marks matches in titles.
export function EventBoard({events,onOpen,replay,search}:{events:Event[];onOpen:(event:Event,origin:DOMRect)=>void;replay?:unknown;search?:string}){
 const level=useMotionLevel();const settled=useRef(false);useEffect(()=>{settled.current=true},[]);
 const anyCover=events.some(e=>e.thumb);const transition=level==='full'?{duration:dur.ui,ease:ease.enter}:level==='reduced'?{duration:dur.instant}:{duration:0};
 return <ul className="event-board"><AnimatePresence initial={false}>{events.map(event=><m.li key={event.id} className="board-item" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={transition}>
  <EventRow event={event} entering={settled.current} replay={replay} onOpen={onOpen} holdCover={anyCover} search={search}/>
 </m.li>)}</AnimatePresence></ul>;
}

// A row with no image keeps its place when others have one, so the titles line up.
function EventRow({event:e,entering,replay,onOpen,holdCover,search}:{event:Event;entering:boolean;replay?:unknown;onOpen:(event:Event,origin:DOMRect)=>void;holdCover:boolean;search?:string}){
 const [built]=useState(!entering);const date=useRef<HTMLSpanElement>(null);const start=e.time.split('–')[0];
 return <PixelBuild className="board-row" cover="var(--surface)" cols={12} rows={1} duration={.3} trigger="mount" skip={built}>
  <span className="board-date" ref={date}><FlipText value={e.weekday} replay={replay}/> <FlipText value={e.day} replay={replay}/> <FlipText value={e.month} replay={replay}/></span>
  <span className="board-time"><FlipText value={start} replay={replay}/></span>
  <span className="board-cat"><Highlight text={e.category} query={search}/></span>
  <div className="board-main">{e.thumb?<PixelImage className="board-cover" src={e.thumb} alt="" width={96} height={54} lazy/>:holdCover&&<span className="board-cover board-cover-empty" aria-hidden="true"/>}<div className="board-text"><h3><button type="button" className="board-open" onClick={()=>onOpen(e,date.current!.getBoundingClientRect())}><Highlight text={e.title} query={search}/><span className="sr-only">, view details</span></button></h3><span className="board-venue">{e.venue}</span></div></div>
  <span className="board-level">{e.level}{e.cancelled?<span className="board-sample">Cancelled</span>:e.luma&&!e.past&&<span className="board-sample">Sign-up needed</span>}</span>
  <ArrowRight className="board-arrow" aria-hidden="true"/>
 </PixelBuild>;
}
