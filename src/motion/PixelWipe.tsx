import {useEffect,useMemo,type CSSProperties} from 'react';
import {m} from 'motion/react';
import {cellDelays,dur} from '../motion';
import {useMotionLevel} from './level';

export type WipePhase='idle'|'cover'|'uncover';
// Full-screen pixel transition (MOTION-PLAN §7.2). The parent drives the phases:
// cover → onCovered (swap the page underneath) → uncover → onDone. Timers, not animation events,
// advance the phases, so navigation still completes if CSS animation is disabled.
export function PixelWipe({phase,onCovered,onDone,cols=12,rows=8,direction='ltr',color='#004066'}:{phase:WipePhase;onCovered:()=>void;onDone:()=>void;cols?:number;rows?:number;direction?:'ltr'|'rtl';color?:string}){
 const level=useMotionLevel();
 const delays=useMemo(()=>cellDelays(cols,rows,direction==='ltr'?'diagonal':'diagonal-reverse'),[cols,rows,direction]);
 const half=level==='full'?dur.wipe/2:level==='reduced'?dur.instant:0;
 useEffect(()=>{if(phase==='idle')return;const timer=setTimeout(phase==='cover'?onCovered:onDone,half*1000);return()=>clearTimeout(timer)},[phase,half]);
 if(phase==='idle'||level==='off')return null;
 if(level==='reduced')return <m.div className="pixel-wipe" aria-hidden="true" style={{background:color}} initial={{opacity:phase==='cover'?0:1}} animate={{opacity:phase==='cover'?1:0}} transition={{duration:dur.instant}}/>;
 const cell=half*.35;// each cell flips in a third of the phase; the diagonal spread fills the rest
 return <div className="pixel-wipe" aria-hidden="true" data-phase={phase} style={{gridTemplateColumns:`repeat(${cols},1fr)`,gridTemplateRows:`repeat(${rows},1fr)`}}>
  {delays.map((d,i)=><span key={i} style={{background:color,'--cell-dur':`${cell}s`,'--cell-delay':`${d*(half-cell)}s`} as CSSProperties}/>)}
 </div>;
}
