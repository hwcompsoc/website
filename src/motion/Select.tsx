import {useState} from 'react';
import {m,type MotionValue,type Transition} from 'motion/react';
import {ease} from '../motion';
import {useMotionLevel,useTrigger,type Trigger} from './level';

type Mode='persist'|'flash'|'hover';
const clips={hidden:{left:'inset(0% 100% 0% 0%)',right:'inset(0% 0% 0% 100%)'},shown:'inset(0% 0% 0% 0%)'};

// Text selection sweep (MOTION-PLAN §4.1). The real text stays in place; an aria-hidden white-on-cyan copy is clipped over it.
// Best on a phrase that fits one line: the fill covers the phrase's whole box when it wraps.
// Sweeps are smooth (MOTION-PLAN §2). `driven` hands the clip to the caller, e.g. the hero cursor dragging the selection.
export function Select({children,mode='persist',trigger=mode==='hover'?'manual':'inView',play=false,from='left',delay=0,duration=.45,instant=false,driven,className=''}:{children:string;instant?:boolean;driven?:MotionValue<string>;mode?:Mode;trigger?:Trigger;play?:boolean;from?:'left'|'right';delay?:number;duration?:number;className?:string}){
 const level=useMotionLevel();const {ref,active}=useTrigger<HTMLSpanElement>(trigger,play);const [hovered,setHovered]=useState(false);
 const shown=mode==='hover'?hovered||active:active;const hidden=clips.hidden[from];const still=level!=='full'||instant;// instant: show the end state without animating
 const hover=mode==='hover'?{onPointerEnter:()=>setHovered(true),onPointerLeave:()=>setHovered(false)}:{};
 if(still&&mode==='flash')return <span ref={ref} className={`select ${className}`}>{children}</span>;
 if(driven&&!still)return <span ref={ref} className={`select ${className}`}>{children}<m.span className="select-fill" aria-hidden="true" style={{clipPath:driven}}>{children}</m.span></span>;
 const animate=mode==='flash'?(shown?{clipPath:[hidden,clips.shown,clips.shown],opacity:[1,1,0]}:{clipPath:hidden,opacity:1}):{clipPath:shown?clips.shown:hidden};
 const transition:Transition=still?{duration:0}:mode==='flash'?{duration:duration+.6,delay,times:[0,duration/(duration+.6),1],ease:[ease.move,'linear']}:{duration:mode==='hover'?.25:duration,delay:mode==='hover'?0:delay,ease:mode==='hover'?ease.enter:ease.move};
 return <span ref={ref} className={`select ${className}`} {...hover}>{children}<m.span className="select-fill" aria-hidden="true" initial={{clipPath:still&&shown?clips.shown:hidden}} animate={animate} transition={transition}>{children}</m.span></span>;
}
