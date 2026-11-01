import {Fragment,useEffect,useMemo,useState,type CSSProperties,type ReactNode} from 'react';
import {m} from 'motion/react';
import {cellDelays,dur,type CellOrder} from '../motion';
import {useMotionLevel,useTrigger,type Trigger} from './level';

// Pixel build (MOTION-PLAN §4.4): the content is covered by cells in the surface colour that clear in a
// stepped order, so it appears to assemble on a grid. Content is always rendered underneath.
export function PixelBuild({children,cols=8,rows=6,order='diagonal',seed,duration=.4,cover='var(--surface)',trigger='inView',play=false,delay=0,skip=false,className='',style}:{children:ReactNode;skip?:boolean;cols?:number;rows?:number;order?:CellOrder;seed?:number;duration?:number;cover?:string;trigger?:Trigger;play?:boolean;delay?:number;className?:string;style?:CSSProperties}){
 const level=useMotionLevel();const {ref,active}=useTrigger<HTMLDivElement>(trigger,play);
 const delays=useMemo(()=>cellDelays(cols,rows,order,seed),[cols,rows,order,seed]);
 // Once the build has had time to finish, the cover is removed rather than left as cleared cells: mobile WebKit can
 // fail to paint some cells' end state, leaving stray blocks over the content. A timer keeps this independent of animation events.
 const [done,setDone]=useState(false);
 useEffect(()=>{if(!active||level!=='full')return;const timer=setTimeout(()=>setDone(true),(delay+duration)*1000+50);return()=>clearTimeout(timer)},[active,level,delay,duration]);
 // Content sits in one keyed Fragment in every branch (React unwraps an unkeyed one). Otherwise it changes shape when the cover goes and remounts:
 // focus inside is lost and any role=alert or role=status fires again.
 const content=<Fragment key="content">{children}</Fragment>;
 // skip renders the finished state with the same root element, so content never remounts when it flips.
 if(level==='off'||skip||done)return <div ref={ref} className={`pixel-build ${className}`} style={style}>{content}</div>;
 if(level==='reduced')return <m.div ref={ref} className={`pixel-build ${className}`} style={style} initial={{opacity:0}} animate={active?{opacity:1}:undefined} transition={{duration:dur.instant,delay}}>{content}</m.div>;
 const cell=duration*.3;
 return <div ref={ref} className={`pixel-build ${className}`} style={style}>{content}
  <div className="pixel-build-cover" aria-hidden="true" data-active={active||undefined} style={{gridTemplateColumns:`repeat(${cols},1fr)`,gridTemplateRows:`repeat(${rows},1fr)`}}>
   {delays.map((d,i)=><span key={i} style={{background:cover,'--cell-dur':`${cell}s`,'--cell-delay':`${delay+d*(duration-cell)}s`} as CSSProperties}/>)}
  </div>
 </div>;
}
