import {Fragment,useEffect,useRef,useState} from 'react';
import {m,animate,useMotionValue,useMotionValueEvent,type Transition} from 'motion/react';
import {MessageCircle,Users} from 'lucide-react';
import {links} from '../content';
import {asset,External,LinkButton} from './shared';
import {dur,ease} from '../motion';
import {useMotionLevel} from '../motion/level';
import {Reveal} from '../motion/Reveal';
import {Select} from '../motion/Select';
import {Typed} from '../motion/Typed';
import {PixelBuild} from '../motion/PixelBuild';
import {useClickBurst} from '../motion/ClickBurst';
import {usePointerLean} from '../motion/usePointerLean';

// Hero sequence (MOTION-PLAN §7.1), in seconds. Each step unlocks when its time is reached.
// The cursor reaches the headline at travel + out.duration (1.6s), presses, drags left to select the phrase
// (drag + drag.duration ≈ 2.32s) and releases; the panel then types and the cursor goes home.
const timeline={grid:0,headline:.3,travel:.7,click:1.6,drag:1.72,release:2.35,caption:2.5,words:2.6,return:3.9,lean:4.8};
type Bezier=[number,number,number,number];
// Hand-on-a-mouse timing: a quick start and a long, soft settle. One easing spans each whole journey.
// The drag eases in and out, like a hand pulling a selection and slowing onto the first letter.
const journey={out:{duration:.9,ease:[.3,0,.15,1] as Bezier},drag:{duration:.6,ease:[.45,0,.25,1] as Bezier},home:{duration:.85,ease:[.45,0,.2,1] as Bezier}};
const WORD_GAP=.2;
type Step=keyof typeof timeline;
const steps=Object.keys(timeline) as Step[];
// Plays once per browser session; later visits (and reduced/off motion) start at the end state.
const STORAGE='hwcs-hero-played';
const alreadyPlayed=()=>{try{return sessionStorage.getItem(STORAGE)==='1'}catch{return false}};
const remember=()=>{try{sessionStorage.setItem(STORAGE,'1')}catch{}};
const words=[['Curiosity'],['looks','good'],['on','you']];

type Path={dx:number;dy:number;dragDx:number;fillLeft:number;fillWidth:number;tipX:number;tipY:number;glyph:number;panel:{left:number;right:number;top:number;bottom:number}};
// Viewport point the cursor tip aims for: just past the phrase, pulled left if the cursor (glyph px wide right of its tip) would leave the hero.
function aim(accent:HTMLElement,glyph:number){const line=(accent.closest('.reveal-line')??accent).getBoundingClientRect(),end=accent.getBoundingClientRect(),hero=(accent.closest('.home-hero')??accent).getBoundingClientRect();return {x:Math.min(end.right+8,hero.right-glyph-4),y:line.top+line.height*.55}}
// Viewport point where the drag ends: the left edge of the highlight, on the same line.
function dragEnd(accent:HTMLElement){const fill=(accent.querySelector('.select-fill')??accent).getBoundingClientRect(),line=(accent.closest('.reveal-line')??accent).getBoundingClientRect();return {x:fill.left,y:line.top+line.height*.55}}
// How far the cursor must travel from its resting box, and where the highlight sits relative to it. Measures untransformed boxes, so it is unaffected by the headline reveal still running.
function measure(accent:HTMLElement,rest:HTMLElement,panel:HTMLElement):Path{
 const box=rest.getBoundingClientRect(),art=panel.getBoundingClientRect(),fill=(accent.querySelector('.select-fill')??accent).getBoundingClientRect();
 const scale=Math.min(box.width/134,box.height/207);// cursor artwork is 134×207 with its tip at (3,2), letterboxed in the box
 const tipX=(box.width-134*scale)/2+3*scale,tipY=(box.height-207*scale)/2+2*scale,glyph=131*scale*.7,point=aim(accent,glyph);
 return {dx:point.x-(box.left+tipX),dy:point.y-(box.top+tipY),dragDx:fill.left-(box.left+tipX),fillLeft:fill.left-box.left,fillWidth:fill.width,tipX,tipY,glyph,panel:{left:art.left-box.left,right:art.right-box.left,top:art.top-box.top,bottom:art.bottom-box.top}};
}

// The cursor's journey, relative to its resting box, as one progress value: 0→1 arcs (quadratic Bézier) from
// off-panel to just past the phrase; 1→2 drags left along the line to the phrase's start; 2→3 arcs home.
// Each segment is animated with a single easing, so the speed is continuous within it.
type Point={x:number;y:number};
const START:Point={x:160,y:60};
const bezier=(a:Point,c:Point,b:Point,t:number):Point=>({x:(1-t)**2*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*c.y+t*t*b.y});
function along(path:Path,progress:number):Point{
 const target={x:path.dx,y:path.dy},dragged={x:path.dragDx,y:path.dy};
 if(progress<=1)return bezier(START,{x:(START.x+target.x)/2,y:Math.min(START.y,target.y)-140},target,progress);
 if(progress<=2)return {x:target.x+(dragged.x-target.x)*(progress-1),y:target.y};
 return bezier(dragged,{x:dragged.x/2,y:Math.min(dragged.y,0)-100},{x:0,y:0},progress-2);
}
// The highlight's left edge sits exactly under the cursor tip while dragging, so the two cannot drift apart.
const UNSELECTED='inset(0px 0px 0px 100%)';
function selection(path:Path,progress:number,tipX:number){
 if(progress<1)return UNSELECTED;
 if(progress>=2)return 'inset(0px)';
 return `inset(0px 0px 0px ${Math.min(path.fillWidth,Math.max(0,tipX-path.fillLeft))}px)`;
}

// Each panel word rises out of its own mask on the headline easing, one every WORD_GAP (an instant on/off pop read as blocky).
function RiseWord({children,order,play,skip,className=''}:{children:string;order:number;play:boolean;skip:boolean;className?:string}){
 return <span className={`art-mask ${className}`}><m.span className="art-rise" initial={skip?false:{transform:'translateY(110%)'}} animate={{transform:play?'translateY(0%)':'translateY(110%)'}} transition={{duration:dur.reveal,ease:ease.enter,delay:skip?0:order*WORD_GAP}}>{children}</m.span></span>;
}

export function Hero(){
 const level=useMotionLevel();const fire=useClickBurst();
 const [skip]=useState(()=>level!=='full'||alreadyPlayed());
 const [reached,setReached]=useState(skip?steps.length:0);const at=(step:Step)=>reached>steps.indexOf(step);
 const accent=useRef<HTMLSpanElement>(null),rest=useRef<HTMLSpanElement>(null),panel=useRef<HTMLDivElement>(null);
 const [path,setPath]=useState<Path|null>(null);const white=useRef<HTMLImageElement>(null),blue=useRef<HTMLImageElement>(null);
 const lean=usePointerLean(rest,at('lean'));

 useEffect(()=>{if(skip)return;remember();const timers=steps.map((step,i)=>setTimeout(()=>setReached(r=>Math.max(r,i+1)),timeline[step]*1000));return()=>timers.forEach(clearTimeout)},[skip]);
 useEffect(()=>{if(!skip&&at('travel')&&accent.current&&rest.current&&panel.current)setPath(measure(accent.current,rest.current,panel.current))},[at('travel')]);
 useEffect(()=>{if(skip||!at('click')||!accent.current||!path)return;const point=aim(accent.current,path.glyph);fire(point.x,point.y,{count:6})},[at('click')]);
 useEffect(()=>{if(skip||!at('release')||!accent.current)return;const point=dragEnd(accent.current);fire(point.x,point.y,{count:4})},[at('release')]);

 // Position follows the arcs via `progress`; scale, rotation and fade are animated as poses alongside it.
 const progress=useMotionValue(skip?3:0),x=useMotionValue(skip?0:START.x),y=useMotionValue(skip?0:START.y),clip=useMotionValue(UNSELECTED);
 const latestPath=useRef(path);latestPath.current=path;
 useMotionValueEvent(progress,'change',value=>{const p=latestPath.current;if(!p)return;const point=along(p,value);x.set(point.x);y.set(point.y);
  // Swap to the blue cursor whenever the tip is off the dark panel, so it stays visible on the white page.
  // Toggled directly on the images: a React render on every crossing stalls frames mid-flight.
  const tipX=p.tipX+point.x,tipY=p.tipY+point.y,b=p.panel;const inside=tipX>=b.left&&tipX<=b.right&&tipY>=b.top&&tipY<=b.bottom;white.current?.toggleAttribute('data-shown',inside);blue.current?.toggleAttribute('data-shown',!inside);clip.set(selection(p,value,tipX))});
 useEffect(()=>{if(!path)return;const run=animate(progress,1,journey.out);return()=>run.stop()},[path]);
 useEffect(()=>{if(skip||!at('drag')||!path)return;const run=animate(progress,2,journey.drag);return()=>run.stop()},[at('drag')]);
 useEffect(()=>{if(skip||!at('return')||!path)return;const run=animate(progress,3,journey.home);return()=>run.stop()},[at('return')]);
 const restPose={scale:1,rotate:-8,opacity:.92};
 const startPose=skip?restPose:{scale:1,rotate:0,opacity:0};
 let pose:Record<string,number|number[]>=startPose,transition:Transition={duration:0};
 // The cursor stays pressed (slightly smaller) for the whole drag and springs back on release.
 if(path&&at('return')){pose=restPose;transition=journey.home}
 else if(path&&at('release')){pose={scale:.7,rotate:0,opacity:1};transition={duration:.15}}
 else if(path&&at('click')){pose={scale:.62,rotate:0,opacity:1};transition={duration:.1}}
 else if(path){pose={scale:.7,rotate:0,opacity:1};transition={...journey.out,opacity:{duration:.2}}}

 return <section className="home-hero wrap"><div className="hero-copy">
  <Reveal as="h1" trigger="manual" play={at('headline')} stagger={.08} lines={['Find your people.',<span className="hero-accent" ref={accent}><Select mode="persist" trigger="manual" play={at('drag')} from="right" instant={skip} driven={skip?undefined:clip}>Build what’s next.</Select></span>]}/>
  <p>Whether you code every day or you’ve never opened a terminal, CompSoc is where Heriot-Watt students meet to learn, build things and hang out.</p><div className="hero-actions"><LinkButton href={links.discord}><MessageCircle aria-hidden="true"/>Join the Discord</LinkButton><External href={links.instagram} className="text-link">Follow our story</External></div><div className="hero-note"><Users size={17} aria-hidden="true"/><span>You don’t need any experience to join in.</span></div></div>
  <div className="hero-art" ref={panel} role="group" aria-label="A community for learning, making and connecting">
   {skip?<div className="art-grid" aria-hidden="true"/>:<PixelBuild className="art-grid" style={{position:'absolute'}} cover="var(--panel)" cols={12} rows={10} trigger="manual" play={at('grid')}>{null}</PixelBuild>}
   <div className="art-caption"><span className="small-dot"/><Typed text="Hello, HW." trigger="manual" play={at('caption')} instant={skip}/></div>
   <m.span className="hero-cursor" ref={rest} style={lean.style} data-bob={lean.bob||undefined}><m.span className="hero-cursor-travel" style={{x,y,...(path&&{transformOrigin:`${path.tipX}px ${path.tipY}px`})}} initial={startPose} animate={pose} transition={transition}>
    <img ref={white} src={asset('cursor-white.svg')} alt="" data-shown=""/><img ref={blue} src={asset('cursor-blue.svg')} alt=""/>
   </m.span></m.span>
   <div className="art-word">{words.map((line,l)=><span className="art-line" key={l}>{line.map((word,w)=>{const order=words.slice(0,l).flat().length+w;return <Fragment key={word}>{w?' ':''}<RiseWord order={order} play={at('words')} skip={skip}>{word}</RiseWord></Fragment>})}{l===words.length-1&&<RiseWord className="art-dot" order={words.flat().length} play={at('words')} skip={skip}>.</RiseWord>}</span>)}</div>
   <div className="art-bottom"><span>01 / MEET</span><span>02 / MAKE</span><span>03 / BELONG</span></div>
  </div></section>;
}
