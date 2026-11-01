import {useEffect,useState} from 'react';
import {flip,flipFrame} from '../motion';
import {useMotionLevel,useTrigger,type Trigger} from './level';

// Departures-board flip (MOTION-PLAN §8.4): characters cycle through look-alikes and settle left to right.
// Plays when triggered and again whenever `value` or `replay` changes. Screen readers only get the real value.
export function FlipText({value,replay,trigger='inView',play=true,className=''}:{value:string;replay?:unknown;trigger?:Trigger;play?:boolean;className?:string}){
 const level=useMotionLevel();const {ref,active}=useTrigger<HTMLSpanElement>(trigger,play);const [shown,setShown]=useState(value);
 useEffect(()=>{if(level!=='full'||!active){setShown(value);return}
  let tick=0;const total=flip.frames+value.length;
  const timer=setInterval(()=>{tick++;setShown(flipFrame(value,tick));if(tick>=total)clearInterval(timer)},flip.frame*1000);
  return()=>clearInterval(timer)},[value,replay,active,level]);
 return <span ref={ref} className={`flip ${className}`}><span className="sr-only">{value}</span><span aria-hidden="true">{shown}</span></span>;
}
