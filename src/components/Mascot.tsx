import {useEffect,useRef,useState} from 'react';
import {useInView} from 'motion/react';
import {byte,byteRest} from '../motion';
import {useMotionLevel} from '../motion/level';
import {Typed} from '../motion/Typed';
import lightArt from '../../public/website-assets/crt-mascot-light-animated.svg?raw';
import darkArt from '../../public/website-assets/crt-mascot-dark-animated.svg?raw';

// Byte, the society's mascot: a pixel CRT monitor. The light artwork has black outlines for light surfaces and the dark one
// cyan outlines for dark surfaces; CSS shows the one that suits the theme, and always the dark one on the footer's panel.
// The artwork is inlined so the site controls its animation. Its own looping style is dropped, along with its title and
// description, whose ids would repeat on a page with more than one Byte; the animations are in motion.css instead.
// Byte comes alive (bobs, waves, blinks) for a few seconds when it first scrolls into view or is pressed, and for as long as
// it's hovered or focused, then stops at a rest point (byteRest), so nothing loops forever and nothing jumps.
// Pressing it also hops (the Click verb) and types a line in a speech bubble (the Type verb). The mood only chooses the
// first line, to suit where Byte sits. With reduced motion Byte stays still but still talks.
const art=(svg:string)=>svg.replace(/<style>[\s\S]*?<\/style>/,'').replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g,'').replace(/\s(role|aria-labelledby|width|height)="[^"]*"/g,'').replace('<svg','<svg aria-hidden="true" focusable="false"');
const LIGHT=art(lightArt),DARK=art(darkArt);

export type Mood='happy'|'sleepy'|'confused';
const FIRST:Record<Mood,string>={happy:'Hi, I’m Byte! I keep this site running. Mostly.',sleepy:'Zzz… Nothing on yet. Discord hears first.',confused:'Hmm. I couldn’t find that either.'};
// Tips cycle after the first line: visitor tips on the site, committee tips in the admin.
const TIPS={site:['Press / or Ctrl K to search the whole site.','Events are announced on Discord first.','Never opened a terminal? Lots of us hadn’t.','The events board works with the arrow keys.','Ow. That’s my screen.'],
 admin:['Drafts never reach the site. Only live events do.','Saved changes reach the site within a few minutes.','Stuck? The Help page explains every page here.','You can’t break anything for good. Change it back.','Ow. That’s my screen.']} as const;
export type Tips=keyof typeof TIPS;
export const mascotLine=(mood:Mood,press:number,first?:string,tips:Tips='site')=>press===0?first??FIRST[mood]:TIPS[tips][(press-1)%TIPS[tips].length];
const BUBBLE_MS=6000;

// `line` replaces the mood's first line. `loop` keeps Byte moving for as long as it's true, which only a loading screen
// should use, since loading indicators are the one loop the motion rules allow. `decorative` drops the button and bubble.
export function Mascot({mood='happy',line:first,tips='site',size='md',align='start',loop=false,decorative=false,className=''}:{mood?:Mood;line?:string;tips?:Tips;size?:'sm'|'md';align?:'start'|'center'|'end';loop?:boolean;decorative?:boolean;className?:string}){
 const level=useMotionLevel();const animate=level==='full';
 const [presses,setPresses]=useState(0);const [line,setLine]=useState<string|null>(null);const said=useRef<ReturnType<typeof setTimeout>>(undefined);
 const [lively,setLively]=useState(false);const live=useRef(false),since=useRef(0),hovered=useRef(false),looping=useRef(false),resting=useRef<ReturnType<typeof setTimeout>>(undefined);
 const box=useRef<HTMLSpanElement>(null);const seen=useInView(box,{once:true,amount:.6});
 // Start the loops if they aren't running, then stop at the first rest point at least `seconds` from now, unless hover, focus or `loop` holds them.
 function wake(seconds:number){if(!animate)return;clearTimeout(resting.current);const now=performance.now()/1000;
  if(!live.current){live.current=true;since.current=now;setLively(true)}if(hovered.current||looping.current)return;const elapsed=now-since.current;
  resting.current=setTimeout(()=>{live.current=false;setLively(false)},(byteRest(elapsed+seconds)-elapsed)*1000)}
 // Letting go lets the loops run on to the next rest point, which can be a few seconds away.
 const hold=(on:boolean)=>{hovered.current=on;wake(0)};
 useEffect(()=>{looping.current=loop;if(loop||live.current)wake(0)},[loop,animate]);
 useEffect(()=>{if(seen)wake(byte.shown)},[seen]);
 useEffect(()=>()=>{clearTimeout(said.current);clearTimeout(resting.current)},[]);
 // The hop remounts the artwork, which restarts its loops, so their clock restarts too.
 function press(){clearTimeout(said.current);setLine(mascotLine(mood,presses,first,tips));setPresses(n=>n+1);said.current=setTimeout(()=>setLine(null),BUBBLE_MS);live.current=false;wake(byte.shown)}
 const sprite=<span key={presses} className="mascot-sprite" data-hop={(presses>0&&animate)||undefined} aria-hidden="true">
  <span className="mascot-light" dangerouslySetInnerHTML={{__html:LIGHT}}/>
  <span className="mascot-dark" dangerouslySetInnerHTML={{__html:DARK}}/>
 </span>;
 if(decorative)return <span ref={box} className={`mascot mascot-${size} ${className}`} data-lively={(lively&&animate)||undefined} aria-hidden="true">{sprite}</span>;
 return <span ref={box} className={`mascot mascot-${size} ${className}`} data-align={align} data-lively={(lively&&animate)||undefined}>
  <button type="button" className="mascot-button" aria-label="Byte, the CompSoc mascot. Press for a tip" onClick={press} onPointerEnter={e=>{if(e.pointerType==='mouse')hold(true)}} onPointerLeave={e=>{if(e.pointerType==='mouse')hold(false)}} onFocus={()=>hold(true)} onBlur={()=>hold(false)}>
   {sprite}
  </button>
  <span role="status" className="mascot-said">{line&&<span className="mascot-bubble" key={presses}><Typed text={line} caret={false} speed={.02} trigger="mount"/></span>}</span>
 </span>;
}
