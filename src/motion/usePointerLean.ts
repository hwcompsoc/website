import {useEffect,useState,type RefObject} from 'react';
import {useSpring} from 'motion/react';
import {spring} from '../motion';

// Drag verb (MOTION-PLAN §4.5): the element leans toward the mouse, up to `distance` px and `angle` degrees,
// on a soft spring. Fine pointers only; on touch, `bob` tells the caller to use its idle bob instead.
export function usePointerLean(ref:RefObject<Element|null>,enabled:boolean,{distance=6,angle=3}={}){
 const soft={stiffness:spring.soft.stiffness,damping:spring.soft.damping};
 const x=useSpring(0,soft),y=useSpring(0,soft),rotate=useSpring(0,soft);
 const [fine]=useState(()=>matchMedia('(hover: hover) and (pointer: fine)').matches);
 useEffect(()=>{if(!enabled||!fine)return;
  const move=(event:PointerEvent)=>{const el=ref.current;if(event.pointerType!=='mouse'||!el)return;const box=el.getBoundingClientRect();
   const vx=event.clientX-(box.left+box.width/2),vy=event.clientY-(box.top+box.height/2),length=Math.hypot(vx,vy)||1,pull=Math.min(1,length/600);
   x.set(vx/length*distance*pull);y.set(vy/length*distance*pull);rotate.set(vx/length*angle*pull)};
  addEventListener('pointermove',move,{passive:true});return()=>{removeEventListener('pointermove',move);x.set(0);y.set(0);rotate.set(0)}},[enabled,fine,distance,angle]);
 return {style:{x,y,rotate},bob:enabled&&!fine};
}
