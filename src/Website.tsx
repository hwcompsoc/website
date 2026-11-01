import {useEffect,useRef,useState} from 'react';
import {LazyMotion,domMax,MotionConfig} from 'motion/react';
import {route,pages,type Page} from './content';
import {titles} from './components/shared';
import {Header} from './components/Header';
import {Footer} from './components/Footer';
import {type Modal,DetailDialog} from './components/DetailDialog';
import {Home} from './pages/Home';
import {Events} from './pages/Events';
import {Join} from './pages/Join';
import {Resources} from './pages/Resources';
import {About} from './pages/About';
import {Partners} from './pages/Partners';
import {MotionLevelProvider,useMotionLevelSetting} from './motion/level';
import {ClickBurstProvider,GlobalBursts} from './motion/ClickBurst';
import {PixelWipe,type WipePhase} from './motion/PixelWipe';
import './cursor';

const position=(page:Page)=>pages.findIndex(p=>p.id===page);
// Route changes run through the pixel wipe (MOTION-PLAN §7.2): cover → swap page → uncover. A new hash during a wipe retargets it.
// The header follows `target` immediately, so its highlight starts sliding before the wipe covers it.
export default function Website(){const [page,setPage]=useState<Page>(()=>route(location.hash));const [modal,setModal]=useState<Modal>(null);const level=useMotionLevelSetting();const animate=level==='full';const main=useRef<HTMLElement>(null);const initial=useRef(true);const current=useRef(page);current.current=page;const pending=useRef(page);const [target,setTarget]=useState(page);const [phase,setPhase]=useState<WipePhase>('idle');const [direction,setDirection]=useState<'ltr'|'rtl'>('ltr');useEffect(()=>{function changed(){const next=route(location.hash);setModal(null);if(next===current.current&&next===pending.current)return;pending.current=next;setTarget(next);if(level==='off'){setPage(next);return}setDirection(position(next)>=position(current.current)?'ltr':'rtl');setPhase('cover')}window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed)},[level]);useEffect(()=>{document.title=`${titles[page]} · HW CompSoc`;window.scrollTo({top:0,behavior:'instant'});if(!initial.current)main.current?.focus({preventScroll:true});initial.current=false},[page]);useEffect(()=>{document.body.dataset.motion=animate?'on':'off'},[animate]);return <LazyMotion features={domMax} strict><MotionConfig reducedMotion="user"><MotionLevelProvider value={level}><ClickBurstProvider><GlobalBursts/><a href="#main-content" className="skip-link" onClick={e=>{e.preventDefault();main.current?.focus();main.current?.scrollIntoView({block:'start'})}}>Skip to content</a><Header page={target}/><main id="main-content" ref={main} tabIndex={-1} key={page} aria-label={titles[page]}>{page==='home'?<Home onEvent={(event,origin)=>setModal({kind:'event',event,origin})}/>:page==='join'?<Join/>:page==='events'?<Events onOpen={(event,origin)=>setModal({kind:'event',event,origin})}/>:page==='resources'?<Resources onOpen={(resource,origin)=>setModal({kind:'resource',resource,origin})}/>:page==='about'?<About onDocument={title=>setModal({kind:'document',title})}/>:<Partners/>}</main><Footer page={page}/><DetailDialog modal={modal} onClose={()=>setModal(null)}/><PixelWipe phase={phase} direction={direction} onCovered={()=>{setPage(pending.current);setPhase('uncover')}} onDone={()=>setPhase('idle')}/></ClickBurstProvider></MotionLevelProvider></MotionConfig></LazyMotion>}
