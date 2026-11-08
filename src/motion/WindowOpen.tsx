import {useEffect,useLayoutEffect,useRef} from 'react';
import {animate,type AnimationPlaybackControls} from 'motion/react';
import {dur,ease,insetsAt,insetsOf,pageChange,type Insets} from '../motion';
import {useMotionLevel} from './level';

// A page change, in three phases the parent steps through when onPhaseEnd fires:
//  out:    the old page fades away while a window grows out of the link that was clicked.
//  in:     the new page is in place but still hidden; the window flies on and lands exactly on the new page's own first
//          window (its title window, or the Home hero panel), taking on that window's colours as it goes.
//  settle: the window drops behind the page, exactly under the page's own window, and the page fades in over it. The frame
//          never moves or fades, so the window seems to become the page's own; it's removed once the page covers it.
// The parent fades the page itself (body[data-page-change] in motion.css). Timers, not animation events, end the phases,
// so navigation completes even with animation disabled. The window is clipped layers (hard shadow, border, surface) and a
// title bar riding the top edge: clipping, not resizing, so nothing is laid out again each frame.
export type WindowPhase='idle'|'out'|'in'|'settle';
const px=(n:number)=>`${Math.max(0,n)}px`;
const clip=(i:Insets)=>`inset(${px(i.top)} ${px(i.right)} ${px(i.bottom)} ${px(i.left)})`;
const grow=(i:Insets,by:number):Insets=>({top:i.top-by,right:i.right-by,bottom:i.bottom-by,left:i.left-by});
const shift=(i:Insets,by:number):Insets=>({top:i.top+by,right:i.right-by,bottom:i.bottom-by,left:i.left+by});
const headerHeight=()=>document.querySelector<HTMLElement>('.site-header')?.offsetHeight??0;
type Look={body:string;edge:string;shadow:number;bar:number};

// Where the new page's first window probably is, before it exists: the page column, just under the header.
function guess(width:number,height:number):Insets{const column=document.querySelector('.site-header .wrap');const box=column?.getBoundingClientRect();const pad=column?parseFloat(getComputedStyle(column).paddingLeft):24;
 const left=(box?.left??0)+pad,right=width-((box?.right??width)-pad),top=headerHeight()+(width>540?48:24);return {top,right,bottom:Math.max(0,height-top-260),left}}
// The new page's first window, if it's on screen, and how it looks, so the travelling window can match it before handing over.
function landing(width:number,height:number):{at:Insets;look?:Look}{
 const target=document.querySelector<HTMLElement>('#main-content .intro-window, #main-content .hero-art');const box=target?.getBoundingClientRect();const header=headerHeight();
 if(!target||!box||box.bottom<header+40||box.top>height-40)return {at:{top:header,right:0,bottom:0,left:0}};
 const style=getComputedStyle(target);const bordered=parseFloat(style.borderTopWidth)>0;const bar=target.querySelector<HTMLElement>(':scope>.window-bar');
 return {at:insetsOf(box,width,height),look:{body:style.backgroundColor,edge:bordered?style.borderTopColor:style.backgroundColor,shadow:parseFloat(style.boxShadow.match(/(-?[\d.]+)px/)?.[1]??'0'),bar:bar?.offsetHeight??0}}}

export function WindowOpen({phase,from,onPhaseEnd}:{phase:WindowPhase;from?:DOMRect;onPhaseEnd:(phase:WindowPhase)=>void}){
 const level=useMotionLevel();const full=level==='full';
 const root=useRef<HTMLDivElement>(null),shadow=useRef<HTMLDivElement>(null),edge=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null),bar=useRef<HTMLDivElement>(null);
 const now=useRef<Insets|null>(null),aim=useRef<Insets|null>(null),offset=useRef(12),barHeight=useRef(32),run=useRef<AnimationPlaybackControls|null>(null);
 const length=level==='off'?0:full?pageChange[phase==='idle'?'out':phase]:phase==='in'?0:dur.instant;
 useEffect(()=>{if(phase==='idle')return;const timer=setTimeout(()=>onPhaseEnd(phase),length*1000);return()=>clearTimeout(timer)},[phase,length]);
 function paint(at:Insets){now.current=at;const height=innerHeight;
  if(shadow.current)shadow.current.style.clipPath=clip(shift(at,offset.current));
  if(edge.current)edge.current.style.clipPath=clip(at);
  if(body.current)body.current.style.clipPath=clip(grow(at,-1));
  // The bar is as wide as the screen; clipping its right side (and its bottom, while the window is shorter than it) fits it to the window.
  if(bar.current){bar.current.style.transform=`translate(${at.left+1}px,${at.top+1}px)`;bar.current.style.clipPath=`inset(0 ${px(at.left+at.right+2)} ${px(barHeight.current-(height-at.top-at.bottom-2))} 0)`}}
 function travel(to:Insets,duration:number,curve:typeof ease.enter){run.current?.stop();const start=now.current??to;aim.current=to;run.current=animate(0,1,{duration,ease:curve,onUpdate:t=>paint(insetsAt(start,to,t))})}
 useLayoutEffect(()=>{if(!full||phase==='idle'){if(phase==='idle'){run.current?.stop();now.current=null}return}
  const width=innerWidth,height=innerHeight;
  if(phase==='out'){offset.current=width>540?12:6;
   // A second click while a change is running carries on from where the window is.
   if(!now.current){const start=from&&from.width>0?insetsOf(from,width,height):{top:height/2,right:width/2,bottom:height/2,left:width/2};const style=root.current?.style;style?.removeProperty('--wo-body');style?.removeProperty('--wo-edge');style?.setProperty('--wo-bar','1');barHeight.current=32;bar.current?.style.removeProperty('height');paint(start)}
   travel(guess(width,height),pageChange.out+pageChange.in,ease.move);return}
  if(phase==='in'){
   // Measure after the page's own effects have run and scrolled it, which is after this layout pass.
   const frame=requestAnimationFrame(()=>{const {at,look}=landing(innerWidth,innerHeight);const style=root.current?.style;
    if(look&&style){style.setProperty('--wo-body',look.body);style.setProperty('--wo-edge',look.edge);style.setProperty('--wo-bar',look.bar?'1':'0');offset.current=look.shadow;if(look.bar&&bar.current){barHeight.current=look.bar;bar.current.style.height=`${look.bar}px`}}
    travel(at,pageChange.in-.02,ease.enter)});
   return()=>cancelAnimationFrame(frame)}
  // settle: make sure it sits exactly where it was going before the handover.
  run.current?.stop();if(aim.current)paint(aim.current)},[phase,full]);
 useEffect(()=>()=>run.current?.stop(),[]);
 if(phase==='idle'||!full)return null;
 return <div ref={root} className="window-open" aria-hidden="true" data-phase={phase}>
  <div ref={shadow} className="window-open-shadow"/><div ref={edge} className="window-open-edge"/><div ref={body} className="window-open-body"/>
  {/* Only the three dots: the page's own title bar types its path once it shows, so the path isn't typed twice. */}
  <div ref={bar} className="window-bar window-open-bar"/>
 </div>;
}
