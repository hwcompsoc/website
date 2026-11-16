import {useEffect,useState} from 'react';
import {typedLength,typing} from '../motion';
import {useMotionLevel,useTrigger,type Trigger} from './level';

// Typing with a block caret. Screen readers get the full text immediately;
// an invisible full-length copy reserves the space so typing never shifts the layout. Both visual copies are drawn from `data-text`
// by CSS (motion.css), so the page's text holds the words once, and search engines and copy-paste don't see them three times.
export function Typed({text,caret=true,speed=typing.char,trigger='inView',play=false,delay=0,instant=false,onDone,className=''}:{text:string;instant?:boolean;caret?:boolean;speed?:number;trigger?:Trigger;play?:boolean;delay?:number;onDone?:()=>void;className?:string}){
 const level=useMotionLevel();const {ref,active}=useTrigger<HTMLSpanElement>(trigger,play);const still=level!=='full'||instant;const [count,setCount]=useState(still?text.length:0);
 useEffect(()=>{if(still){setCount(text.length);if(active)onDone?.();return}if(!active){setCount(0);return}
  let frame=0;const start=performance.now()+delay*1000;
  const tick=(now:number)=>{const next=typedLength(text,Math.max(0,now-start)/1000,speed);setCount(next);if(next<text.length)frame=requestAnimationFrame(tick);else onDone?.()};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[active,still,text,speed,delay]);
 return <span ref={ref} className={`typed ${className}`}><span className="sr-only">{text}</span><span className="typed-visual" aria-hidden="true"><span className="typed-ghost" data-text={text}>{caret&&<span className="caret"/>}</span><span className="typed-live" data-text={text.slice(0,count)}>{caret&&<span className="caret" data-typing={count<text.length||undefined}/>}</span></span></span>;
}
