import {useEffect,useRef,useState} from 'react';
import {m,animate as run,useMotionValue,useMotionValueEvent} from 'motion/react';
import {ArrowRight} from 'lucide-react';
import {Button} from '../components/ui/button';
import {asset,RouteLink,useNoindex} from '../components/shared';
import {canonicalPath,suggestPath} from '../content';
import {useMotionLevel} from '../motion/level';
import {usePointerLean} from '../motion/usePointerLean';
import {useClickBurst} from '../motion/ClickBurst';
import {FlipText} from '../motion/FlipText';
import {Reveal} from '../motion/Reveal';
import {Select} from '../motion/Select';
import {Typed} from '../motion/Typed';
import {Mascot} from '../components/Mascot';

const MAX_SHOWN=32;
// Milliseconds. With a suggestion the cursor presses at the start of the word and drags across it; "Go home" is a plain click.
const timeline={travel:700,click:1400,drag:1480,release:2000,restDrag:2120,restClick:1560};
const DRAG={duration:.5,ease:[.45,0,.25,1] as [number,number,number,number]};
// Where the pixel cursor's tip goes inside the window: to the press point, across `drag` pixels, then to rest.
type Aim={click:{x:number;y:number};drag:number;rest:{x:number;y:number}};
const START={x:60,y:-40};
const pose=(x:number,y:number,rotate:number,scale:number)=>`translate(${x}px,${y}px) rotate(${rotate}deg) scale(${scale})`;

// The cursor walks over to the best next step: it drags a selection across the suggested word, or clicks "Go home" if there is no suggestion.
// It only shows the way: nothing navigates until the visitor chooses. It then rests beside it and leans toward the mouse, like the hero's cursor.
// The selection's edge and the cursor share one progress value, so the two can't drift apart. The word starts after the slash: /[about].
const parts=(suggestion:string)=>suggestion==='/'?{prefix:'',word:'/'}:{prefix:'/',word:suggestion.slice(1)};
export function NotFound(){const level=useMotionLevel();const fire=useClickBurst();
 const [path]=useState(()=>canonicalPath(location.pathname));const suggestion=suggestPath(path);
 const shown=path.length>MAX_SHOWN?path.slice(0,MAX_SHOWN-1)+'…':path;
 const animate=level==='full';const box=useRef<HTMLDivElement>(null),target=useRef<HTMLSpanElement>(null);
 const lean=useRef<HTMLSpanElement>(null);const [aim,setAim]=useState<Aim|null>(null);const [clicked,setClicked]=useState(!animate);const [resting,setResting]=useState(false);const leaning=usePointerLean(lean,resting);
 const progress=useMotionValue(0),dragX=useMotionValue(0),clip=useMotionValue('inset(0px 100% 0px 0px)');const dragWidth=useRef(0);
 useMotionValueEvent(progress,'change',value=>{dragX.set(value*dragWidth.current);clip.set(`inset(0px ${(1-value)*100}% 0px 0px)`)});

 // A wrong address shouldn't be indexed, even though the host answers it with the app.
 useNoindex();

 useEffect(()=>{if(!animate)return;
  // In viewport pixels. The cursor's outline disappears on the dark "Go home" button, so there it clicks the bottom edge from below and rests underneath.
  const points=()=>{const to=target.current?.getBoundingClientRect();if(!to)return null;const button=suggestion?null:target.current?.closest('a')?.getBoundingClientRect();if(button)return {click:{x:button.right-16,y:button.bottom-2},drag:0,rest:{x:button.right-8,y:button.bottom+6}};const fill=target.current?.querySelector('.select-fill')?.getBoundingClientRect()??to;return {click:{x:fill.left,y:to.top+to.height*.6},drag:fill.width,rest:{x:to.right+14,y:to.top+to.height*.55}}};
  const measure=()=>{const from=box.current?.getBoundingClientRect(),at=points();if(!from||!at)return;dragWidth.current=at.drag;dragX.set(progress.get()*at.drag);setAim({click:{x:at.click.x-from.right,y:at.click.y-from.top},drag:at.drag,rest:{x:at.rest.x-from.right,y:at.rest.y-from.top}})};
  let dragging:ReturnType<typeof run>|undefined;
  const timers=[setTimeout(measure,timeline.travel),
   setTimeout(()=>{setClicked(true);const at=points();if(at)fire(at.click.x,at.click.y,{count:6})},timeline.click),
   ...(suggestion?[setTimeout(()=>{dragging=run(progress,1,DRAG)},timeline.drag),setTimeout(()=>{const at=points();if(at)fire(at.click.x+at.drag,at.click.y,{count:4})},timeline.release)]:[]),
   setTimeout(()=>setResting(true),suggestion?timeline.restDrag:timeline.restClick)];
  // The text can reflow, so the resting spot follows the target.
  window.addEventListener('resize',measure);
  return()=>{timers.forEach(clearTimeout);dragging?.stop();window.removeEventListener('resize',measure)}},[animate,fire,suggestion]);

 return <section className="page-intro not-found"><div className="wrap"><div className="intro-window nf-window" ref={box}>
  <div className="window-bar" aria-hidden="true"><span className="window-name"><Typed text={`~/compsoc${shown}: not found`} speed={.02} delay={.15} trigger="mount"/></span><span className="window-meta">error 404</span></div>
  <div className="intro-body nf-body">
   <div className="nf-side"><div className="nf-code" aria-hidden="true"><FlipText value="404" trigger="mount"/></div><Mascot mood="confused" align="center"/></div>
   <div className="nf-text"><Reveal as="h1" trigger="mount" delay={.15} lines={['File not found.']}/>
    <p>Nothing lives at <code className="nf-path">{shown}</code>. It may have moved, or there might be a typo in the address.</p>
    {suggestion&&<p className="nf-suggest">Did you mean <a href={suggestion} className="nf-suggest-link">{parts(suggestion).prefix}<span ref={target}><Select mode="persist" trigger="manual" play={clicked} driven={clip} className="select-strong">{parts(suggestion).word}</Select></span></a>?</p>}
    <div className="nf-actions"><Button asChild className={suggestion?'site-button secondary':'site-button'}><a href="/" data-pressed={(animate&&!suggestion&&clicked&&!resting)||undefined}><span ref={suggestion?undefined:target} className="nf-home-label">Go home<ArrowRight size={16} aria-hidden="true"/></span></a></Button><RouteLink page="events">See what’s on</RouteLink></div>
   </div>
  </div>
  {aim&&<m.span className="nf-cursor" aria-hidden="true" data-bob={leaning.bob||undefined} style={{x:dragX}}><m.span className="nf-cursor-lean" initial={{opacity:0,transform:pose(START.x,START.y,0,1)}} animate={resting?{opacity:1,transform:pose(aim.rest.x-aim.drag,aim.rest.y,-8,1)}:clicked?{opacity:1,transform:pose(aim.click.x,aim.click.y,0,.85)}:{opacity:1,transform:pose(aim.click.x,aim.click.y,0,1)}} transition={resting?{duration:.5,ease:[.45,0,.2,1]}:clicked?{duration:.1}:{duration:.65,ease:[.3,0,.15,1]}}><m.span ref={lean} className="nf-cursor-lean" style={leaning.style}><img className="nf-cursor-light" src={asset('cursor-blue-small.svg')} alt=""/><img className="nf-cursor-dark" src={asset('cursor-white-small.svg')} alt=""/></m.span></m.span></m.span>}
 </div></div></section>}
