import {useCallback,useEffect,useRef,useState} from 'react';
import {Select} from '../motion/Select';
import {Typed} from '../motion/Typed';

// One copy response for the whole site, so every copy button confirms the same way: the copied text is
// flash-selected, as if by Ctrl+C, and the confirmation types out. `count` goes up on every successful copy.
export function useCopy(ms=2000){
 const [state,setState]=useState<'idle'|'copied'|'failed'>('idle');const [count,setCount]=useState(0);const timer=useRef<number|undefined>(undefined);
 useEffect(()=>()=>window.clearTimeout(timer.current),[]);
 const copy=useCallback(async(text:string)=>{window.clearTimeout(timer.current);
  try{await navigator.clipboard.writeText(text);setState('copied');setCount(n=>n+1);timer.current=window.setTimeout(()=>setState('idle'),ms)}catch{setState('failed')}},[ms]);
 return {copy,count,copied:state==='copied',failed:state==='failed'};
}

// The text that was copied. Each copy remounts the sweep (key), so copying again replays it. Static under reduced motion.
export function CopyFlash({text,count,className}:{text:string;count:number;className?:string}){
 return count?<Select key={count} mode="flash" trigger="manual" play duration={.25} className={className}>{text}</Select>:<span className={className}>{text}</span>;
}

// The confirmation word, typed with no caret.
export function Copied({text='Copied'}:{text?:string}){return <Typed text={text} caret={false} trigger="mount"/>}
