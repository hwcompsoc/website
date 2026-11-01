import {type ReactNode} from 'react';
import {m} from 'motion/react';
import {dur,ease,stagger as defaultStagger} from '../motion';
import {useMotionLevel,useTrigger,type Trigger} from './level';

type Tag='h1'|'h2'|'h3'|'p'|'span'|'div';
// Line-mask reveal (MOTION-PLAN §6.4): each line rises out of its own overflow mask. Text is in the DOM from the first frame.
export function Reveal({lines,as:As='div',trigger='inView',play=false,delay=0,stagger=defaultStagger,className='',id}:{lines:ReactNode[];as?:Tag;trigger?:Trigger;play?:boolean;delay?:number;stagger?:number;className?:string;id?:string}){
 const level=useMotionLevel();const {ref,active}=useTrigger<HTMLElement>(trigger,play);
 const Root=As as 'div';
 if(level==='off')return <Root ref={ref as React.Ref<HTMLDivElement>} className={className} id={id}>{lines.map((line,i)=><span key={i} className="reveal-line">{line}</span>)}</Root>;
 return <Root ref={ref as React.Ref<HTMLDivElement>} className={className} id={id}>{lines.map((line,i)=><span key={i} className="reveal-line"><m.span className="reveal-inner"
  initial={level==='full'?{transform:'translateY(110%)'}:{opacity:0}} animate={active?(level==='full'?{transform:'translateY(0%)'}:{opacity:1}):undefined}
  transition={level==='full'?{duration:dur.reveal,ease:ease.enter,delay:delay+i*stagger}:{duration:dur.instant,delay}}>{line}</m.span></span>)}</Root>;
}
