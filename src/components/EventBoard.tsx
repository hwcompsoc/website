import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {AnimatePresence,m} from 'motion/react';
import {ArrowRight} from 'lucide-react';
import {commitHash,eventStatus,type Event} from '../content';
import {dur,ease} from '../motion';
import {useMotionLevel} from '../motion/level';
import {FlipText} from '../motion/FlipText';
import {PixelBuild} from '../motion/PixelBuild';
import {Highlight} from './shared';
import {PixelImage} from '../motion/PixelImage';

// Departures board. Rows that leave collapse, rows that arrive open and build in pixel by pixel,
// and dates/times flip whenever `replay` changes (the filter state). Each row opens its event from the date block. `search` marks matches in titles.
// Like the committee explorer, the board moves with the keys once a row has focus: ↑ ↓ go between rows, Home and End to the ends,
// and Enter opens (the row is a button). `hint` shows the keys under the board, on screens with a mouse.
// `log` is for past events: the same board read as `git log --graph`, with each event's short commit hash where the time goes, a graph
// line down the left with a node per row, and the year in the date. The hash is made from the event's address, so it never changes.
function moveFocus(event:KeyboardEvent<HTMLUListElement>){const rows=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('.board-open')];const now=rows.indexOf(document.activeElement as HTMLButtonElement);if(now<0)return;
 const next=event.key==='ArrowDown'?Math.min(now+1,rows.length-1):event.key==='ArrowUp'?Math.max(now-1,0):event.key==='Home'?0:event.key==='End'?rows.length-1:-1;if(next<0)return;event.preventDefault();rows[next].focus()}
export function EventBoard({events,onOpen,replay,search,hint=false,log=false}:{events:Event[];onOpen:(event:Event,origin:DOMRect)=>void;replay?:unknown;search?:string;hint?:boolean;log?:boolean}){
 const level=useMotionLevel();const settled=useRef(false);useEffect(()=>{settled.current=true},[]);
 const anyCover=events.some(e=>e.thumb);const transition=level==='full'?{duration:dur.ui,ease:ease.enter}:level==='reduced'?{duration:dur.instant}:{duration:0};
 return <>{log&&<p className="board-log-caption" aria-hidden="true">$ git log --graph --oneline</p>}<ul className="event-board" data-log={log||undefined} onKeyDown={moveFocus}><AnimatePresence initial={false}>{events.map(event=><m.li key={event.id} className="board-item" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={transition}>
  {log&&<span className="board-node" aria-hidden="true"/>}<EventRow event={event} entering={settled.current} replay={replay} onOpen={onOpen} holdCover={anyCover} search={search} log={log}/>
 </m.li>)}</AnimatePresence></ul>{hint&&events.length>1&&<p className="board-keys" aria-hidden="true"><span>↑ ↓ to browse</span><span>enter to open</span><span>/ to search</span></p>}</>;
}

// A row with no image keeps its place when others have one, so the titles line up. The status (On now, Today, Tomorrow) is boxed like a
// departures board and flips with the dates; it's worked out once on mount, so it never ticks.
function EventRow({event:e,entering,replay,onOpen,holdCover,search,log}:{event:Event;entering:boolean;replay?:unknown;onOpen:(event:Event,origin:DOMRect)=>void;holdCover:boolean;search?:string;log:boolean}){
 const [built]=useState(!entering);const [status]=useState(()=>eventStatus(e));const date=useRef<HTMLSpanElement>(null);const start=e.time.split('–')[0];
 return <PixelBuild className="board-row" cover="var(--surface)" cols={12} rows={1} duration={.3} trigger="mount" skip={built}>
  <span className="board-date" ref={date}>{log?<><FlipText value={e.day} replay={replay}/> <FlipText value={e.month} replay={replay}/> <FlipText value={e.date.split(' ').at(-1)!} replay={replay}/></>:<><FlipText value={e.weekday} replay={replay}/> <FlipText value={e.day} replay={replay}/> <FlipText value={e.month} replay={replay}/></>}</span>
  {log?<span className="board-time board-hash" aria-hidden="true"><FlipText value={commitHash(e.id)} replay={replay}/></span>:<span className="board-time"><FlipText value={start} replay={replay}/></span>}
  <span className="board-cat"><Highlight text={e.category} query={search}/></span>
  <div className="board-main">{e.thumb?<PixelImage className="board-cover" src={e.thumb} alt="" width={96} height={54} lazy/>:holdCover&&<span className="board-cover board-cover-empty" aria-hidden="true"/>}<div className="board-text"><h3><button type="button" className="board-open" onClick={()=>onOpen(e,date.current!.getBoundingClientRect())}>{e.cancelled?<span className="board-struck"><Highlight text={e.title} query={search}/></span>:<Highlight text={e.title} query={search}/>}<span className="sr-only">, view details</span></button></h3><span className="board-venue">{e.venue}</span></div></div>
  <span className="board-level">{e.level}{status&&<span className="board-sample board-status" data-live={status!=='Cancelled'||undefined}><FlipText value={status} replay={replay}/></span>}{!e.cancelled&&e.luma&&!e.past&&<span className="board-sample">Sign-up needed</span>}</span>
  <ArrowRight className="board-arrow" aria-hidden="true"/>
 </PixelBuild>;
}
