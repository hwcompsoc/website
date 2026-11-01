import {createContext,useCallback,useContext,useEffect,useRef,useState,type CSSProperties,type ReactNode,type PointerEvent} from 'react';
import {Slot} from '@radix-ui/react-slot';
import {selectColor} from '../motion';
import {useMotionLevel} from './level';

type Burst={id:number;x:number;y:number;count:number;color:string};
type Fire=(x:number,y:number,options?:{count?:number;color?:string})=>void;
const BurstContext=createContext<Fire>(()=>{});
export const useClickBurst=()=>useContext(BurstContext);
const LIFETIME=220;

// One fixed overlay for every burst on the page (MOTION-PLAN §4.2); components request bursts through useClickBurst().
export function ClickBurstProvider({children}:{children:ReactNode}){
 const level=useMotionLevel();const [bursts,setBursts]=useState<Burst[]>([]);const next=useRef(0);
 const fire=useCallback<Fire>((x,y,{count=5,color=selectColor}={})=>{if(level!=='full')return;const id=next.current++;
  setBursts(old=>[...old,{id,x,y,count,color}]);setTimeout(()=>setBursts(old=>old.filter(b=>b.id!==id)),LIFETIME)},[level]);
 return <BurstContext.Provider value={fire}>{children}<div className="burst-layer" aria-hidden="true">{bursts.map(b=><span key={b.id} className="burst" style={{left:b.x,top:b.y}}>
  {Array.from({length:b.count},(_,i)=>{const angle=-Math.PI/2+i*2*Math.PI/b.count;const distance=14+(i%2)*6;return <span key={i} style={{background:b.color,'--dx':`${Math.round(Math.cos(angle)*distance)}px`,'--dy':`${Math.round(Math.sin(angle)*distance)}px`} as CSSProperties}/>})}
 </span>)}</div></BurstContext.Provider>;
}

const interactive='a[href],button:not(:disabled),summary,label,[role=button],[role=radio],[role=checkbox],[role=tab]';
// Click verb for the whole page (MOTION-PLAN §7.3): five pixels when pressing something interactive,
// a subtle four on the page background (mouse only), nothing inside form fields.
export function GlobalBursts(){
 const fire=useClickBurst();
 useEffect(()=>{const down=(event:globalThis.PointerEvent)=>{const target=event.target as Element|null;if(event.button!==0||!target?.closest||target.closest('input,textarea,select,[contenteditable]'))return;
  if(target.closest(interactive))fire(event.clientX,event.clientY,{count:5});else if(event.pointerType==='mouse')fire(event.clientX,event.clientY,{count:4})};
  addEventListener('pointerdown',down,{passive:true});return()=>removeEventListener('pointerdown',down)},[fire]);
 return null;
}

// Adds the press response and a burst at the pointer to its single child (a Button, link, etc.).
export function BurstButton({children,count,className='',onPointerDown,...props}:{children:ReactNode;count?:number;className?:string;onPointerDown?:(event:PointerEvent<HTMLElement>)=>void}&Record<string,unknown>){
 const fire=useClickBurst();
 return <Slot {...props} className={`burst-press ${className}`} onPointerDown={(event:PointerEvent<HTMLElement>)=>{onPointerDown?.(event);if(event.button===0)fire(event.clientX,event.clientY,{count})}}>{children}</Slot>;
}
